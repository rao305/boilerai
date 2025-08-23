"""
RAG-ON Orchestrator - coordinates SQL, planning, RAG, and LLM for grounded responses.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
import asyncpg
from datetime import datetime

# Import system components
from .intent import classify_intent
from ..advisor.memory import AdvisorMemory
from ..rag.retriever import create_retriever
from ..t2sql.generate import generate_sql, execute_sql
from ..planner.core import compute_plan
from ..llm.client import LLMClient

logger = logging.getLogger(__name__)

class RAGOrchestrator:
    """Orchestrates the complete RAG-ON pipeline."""
    
    def __init__(self, database_url: str, config: Dict[str, Any]):
        self.database_url = database_url
        self.config = config
        
        # Initialize components
        self.memory = AdvisorMemory(database_url)
        self.retriever = create_retriever(
            database_url=database_url,
            vector_backend=config.get('vector_backend', 'qdrant'),
            qdrant_url=config.get('qdrant_url'),
            enable_reranking=True
        )
        self.llm_client = LLMClient(
            provider=config.get('llm_provider', 'gemini'),
            api_key=config.get('api_key'),
            model=config.get('model')
        )
    
    async def process_query(self, user_id: str, query: str, session_id: str = None) -> Dict[str, Any]:
        """Main orchestration pipeline."""
        
        try:
            # 1. Build Profile Context
            profile = await self.memory.get_profile(user_id)
            
            # 2. Classify Intent
            intent_result = classify_intent(query)
            
            # 3. Execute based on intents
            context_data = {
                'sql_facts': None,
                'planning_data': None,
                'rag_chunks': None,
                'citations': []
            }
            
            # Execute SQL queries if needed
            if intent_result['requires_sql']:
                context_data['sql_facts'] = await self._execute_sql_queries(query, profile)
            
            # Execute planning if needed
            if intent_result['requires_planning']:
                context_data['planning_data'] = await self._execute_planning(query, profile)
            
            # Execute RAG retrieval if needed
            if intent_result['requires_rag']:
                rag_result = await self._execute_rag_retrieval(query, profile)
                context_data['rag_chunks'] = rag_result.chunks
                context_data['citations'] = rag_result.citations
            
            # 4. Compose Answer Prompt
            answer_prompt = self._compose_answer_prompt(query, profile, context_data, intent_result)
            
            # 5. Generate Response
            response = await self.llm_client.generate_response(answer_prompt)
            
            # 6. Grounding Check
            grounded_response = self._perform_grounding_check(response, context_data)
            
            # 7. Update Memory
            await self._update_session_memory(user_id, session_id, query, grounded_response, context_data)
            
            return {
                'response': grounded_response,
                'citations': context_data['citations'],
                'intents': intent_result['intents'],
                'confidence': intent_result['confidence'],
                'sources': {
                    'sql_used': context_data['sql_facts'] is not None,
                    'planning_used': context_data['planning_data'] is not None,
                    'rag_used': len(context_data['rag_chunks'] or []) > 0
                }
            }
            
        except Exception as e:
            logger.error(f"Orchestration failed: {e}")
            return {
                'response': "I encountered an error processing your request. Please try again.",
                'citations': [],
                'intents': ['error'],
                'confidence': 0.0,
                'error': str(e)
            }
    
    async def _execute_sql_queries(self, query: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Execute relevant SQL queries for factual data."""
        try:
            # Generate SQL based on query
            sql_query = generate_sql(query)
            if sql_query:
                result = execute_sql(sql_query, self.database_url)
                return {
                    'query': sql_query,
                    'results': result,
                    'summary': f"Found {len(result.get('rows', []))} results"
                }
        except Exception as e:
            logger.error(f"SQL execution failed: {e}")
        
        return None
    
    async def _execute_planning(self, query: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Execute planning computations."""
        try:
            transcript = profile.get('transcript')
            goals = profile.get('goals', {})
            
            if transcript:
                plan_result = compute_plan(
                    transcript=transcript,
                    target_graduation=goals.get('target_grad_term'),
                    max_credits=goals.get('max_credits', 15),
                    preferred_track=goals.get('chosen_track')
                )
                return plan_result
        except Exception as e:
            logger.error(f"Planning failed: {e}")
        
        return None
    
    async def _execute_rag_retrieval(self, query: str, profile: Dict[str, Any]) -> Any:
        """Execute RAG retrieval."""
        try:
            # Build filters based on profile
            filters = {}
            if profile.get('goals', {}).get('chosen_track'):
                filters['track_id'] = profile['goals']['chosen_track']
            
            result = await self.retriever.retrieve(
                query=query,
                top_k=6,
                filters=filters
            )
            return result
        except Exception as e:
            logger.error(f"RAG retrieval failed: {e}")
            return None
    
    def _compose_answer_prompt(self, query: str, profile: Dict[str, Any], 
                              context_data: Dict[str, Any], intent_result: Dict[str, Any]) -> str:
        """Compose the fused context prompt for LLM."""
        
        # System message
        system_msg = """You are BoilerAI Academic Advisor for Purdue CS.

CRITICAL RULES:
- Never reveal chain-of-thought. Think privately and only output conclusions.
- Use structured SQL facts and planner output as authoritative.
- Use RAG snippets for explanations/policies/descriptions, always cite [doc#].
- If user wants "just the prereq" or any atomic fact, answer tersely from SQL facts only.
- If not modeled in SQL or RAG, say: "Not modeled in the structured KB yet—please add it to packs or docs."
- Every non-obvious claim must be backed by SQL facts or RAG citations [doc#].

RESPONSE STYLE: Academic advisor, precise, cite when using RAG."""
        
        # User question
        prompt_parts = [f"User Question: {query}"]
        
        # Profile snapshot
        if profile.get('transcript'):
            transcript_summary = self._summarize_transcript(profile['transcript'])
            prompt_parts.append(f"Student Profile: {transcript_summary}")
        
        if profile.get('goals'):
            goals_text = ", ".join([f"{k}: {v}" for k, v in profile['goals'].items()])
            prompt_parts.append(f"Student Goals: {goals_text}")
        
        # SQL fact pack
        if context_data['sql_facts']:
            sql_summary = self._format_sql_facts(context_data['sql_facts'])
            prompt_parts.append(f"SQL Facts:\n{sql_summary}")
        
        # Planner snapshot
        if context_data['planning_data']:
            plan_summary = self._format_planning_data(context_data['planning_data'])
            prompt_parts.append(f"Academic Plan:\n{plan_summary}")
        
        # RAG snippets
        if context_data['rag_chunks']:
            rag_content = self._format_rag_chunks(context_data['rag_chunks'], context_data['citations'])
            prompt_parts.append(f"Reference Documents:\n{rag_content}")
        
        # Final instructions
        prompt_parts.append("Provide a grounded response using only the information above. Cite sources with [doc#] when using RAG content.")
        
        return f"{system_msg}\n\n" + "\n\n".join(prompt_parts)
    
    def _summarize_transcript(self, transcript: Dict[str, Any]) -> str:
        """Create a brief transcript summary."""
        if not transcript or not transcript.get('terms'):
            return "No transcript available"
        
        total_credits = sum(len(term.get('courses', [])) for term in transcript['terms'])
        gpa = transcript.get('gpa', {}).get('cumulative', 'Unknown')
        latest_term = transcript['terms'][-1].get('term', 'Unknown') if transcript['terms'] else 'Unknown'
        
        return f"Credits: {total_credits}, GPA: {gpa}, Latest: {latest_term}"
    
    def _format_sql_facts(self, sql_data: Dict[str, Any]) -> str:
        """Format SQL results as bullet points."""
        if not sql_data or not sql_data.get('results'):
            return "No SQL facts available"
        
        results = sql_data['results']
        if isinstance(results, dict) and 'rows' in results:
            rows = results['rows'][:5]  # Limit to 5 rows
            formatted = []
            for row in rows:
                if isinstance(row, dict):
                    formatted.append("• " + ", ".join([f"{k}: {v}" for k, v in row.items()]))
                else:
                    formatted.append(f"• {row}")
            return "\n".join(formatted)
        
        return f"• {sql_data['summary']}"
    
    def _format_planning_data(self, planning_data: Dict[str, Any]) -> str:
        """Format planning results."""
        if not planning_data:
            return "No planning data available"
        
        parts = []
        if planning_data.get('unmet_requirements'):
            parts.append(f"• Unmet: {', '.join(planning_data['unmet_requirements'][:3])}")
        
        if planning_data.get('recommended_courses'):
            parts.append(f"• Recommended: {', '.join(planning_data['recommended_courses'][:3])}")
        
        if planning_data.get('graduation_estimate'):
            parts.append(f"• Graduation: {planning_data['graduation_estimate']}")
        
        return "\n".join(parts) if parts else "• Planning analysis complete"
    
    def _format_rag_chunks(self, chunks: List[Any], citations: List[Any]) -> str:
        """Format RAG chunks with citations."""
        if not chunks:
            return "No reference documents available"
        
        # Create citation tag map
        citation_map = {citation.doc_id: citation.tag for citation in citations}
        
        formatted_chunks = []
        for i, chunk in enumerate(chunks[:4]):  # Limit to 4 chunks
            tag = citation_map.get(chunk.doc_id, f"[doc{i+1}]")
            text = chunk.text[:300] + "..." if len(chunk.text) > 300 else chunk.text
            formatted_chunks.append(f"{tag}: {text}")
        
        return "\n\n".join(formatted_chunks)
    
    def _perform_grounding_check(self, response: str, context_data: Dict[str, Any]) -> str:
        """Basic grounding check - ensure citations are present for RAG content."""
        # This is a simplified check - in production would be more sophisticated
        
        if context_data['rag_chunks'] and context_data['citations']:
            # Check if response contains citation patterns
            citation_pattern = r'\[doc\d+\]'
            import re
            citations_in_response = re.findall(citation_pattern, response)
            
            if not citations_in_response and len(context_data['rag_chunks']) > 0:
                # Add a note about missing citations
                response += "\n\n*Note: This response uses information from academic documents.*"
        
        return response
    
    async def _update_session_memory(self, user_id: str, session_id: str, 
                                   query: str, response: str, context_data: Dict[str, Any]):
        """Update session memory with conversation context."""
        try:
            # Extract and remember any new facts mentioned
            await self._extract_and_remember_facts(user_id, query, response)
            
            # Update session if provided
            if session_id:
                delta = {
                    'topics_discussed': [self._extract_topic(query)],
                    'questions_asked': [query],
                    'context_used': list(context_data.keys())
                }
                await self.memory.session_rollup(session_id, delta)
        
        except Exception as e:
            logger.error(f"Memory update failed: {e}")
    
    async def _extract_and_remember_facts(self, user_id: str, query: str, response: str):
        """Extract and store facts from conversation."""
        # Simple fact extraction - in production would use NER/LLM
        
        # Extract graduation goals
        import re
        grad_match = re.search(r'graduate.*?by.*?([SF]\d{4})', query, re.I)
        if grad_match:
            await self.memory.remember_fact(user_id, 'goal', 'target_grad_term', grad_match.group(1))
        
        # Extract track preferences
        track_match = re.search(r'\b(MI|SE|machine intelligence|software engineering)\b', query, re.I)
        if track_match:
            track = 'MI' if 'MI' in track_match.group(1).upper() or 'machine' in track_match.group(1).lower() else 'SE'
            await self.memory.remember_fact(user_id, 'goal', 'chosen_track', track)
        
        # Extract credit preferences
        credit_match = re.search(r'(\d+)\s*credits?', query, re.I)
        if credit_match:
            await self.memory.remember_fact(user_id, 'preference', 'max_credits', int(credit_match.group(1)))
    
    def _extract_topic(self, query: str) -> str:
        """Extract main topic from query."""
        # Simple topic extraction
        course_match = re.search(r'\b(CS\d{3,5})\b', query, re.I)
        if course_match:
            return course_match.group(1).upper()
        
        if any(word in query.lower() for word in ['plan', 'schedule', 'graduation']):
            return 'academic_planning'
        elif any(word in query.lower() for word in ['track', 'concentration']):
            return 'track_selection'
        elif any(word in query.lower() for word in ['policy', 'rule']):
            return 'academic_policy'
        else:
            return 'general_advising'