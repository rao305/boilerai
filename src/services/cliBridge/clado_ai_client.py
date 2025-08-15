#!/usr/bin/env python3
"""
AI-Powered Clado API Client
Pure AI integration with Clado WebSocket API using OpenAI for intelligent query processing
No hardcoded templates or patterns - all AI-driven logic
"""

import asyncio
import json
import websockets
import openai
import os
import time
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass

# Disable logging for cleaner output
logging.getLogger().setLevel(logging.CRITICAL)

@dataclass
class CladoSearchResult:
    """Result from Clado API search"""
    name: str
    title: str
    company: str
    location: str
    profile_url: str
    relevance_score: float
    context: Dict[str, Any]

class AIQueryProcessor:
    """Uses OpenAI to intelligently process and optimize queries for Clado API"""
    
    def __init__(self, openai_api_key: str):
        self.client = openai.OpenAI(api_key=openai_api_key)
    
    def analyze_user_intent(self, query: str) -> Dict[str, Any]:
        """Analyze user query to understand their networking intent"""
        
        analysis_prompt = f"""Analyze this career networking query and extract the key information:

User Query: "{query}"

Extract and return as JSON:
1. search_type: "alumni" | "professionals" | "mentors" | "specific_person" | "industry_experts"
2. target_criteria: {{
   - company: company name if mentioned
   - role_level: "entry" | "mid" | "senior" | "executive" | "any"
   - industry: industry/field if mentioned
   - skills: list of relevant skills/technologies
   - location: location preference if mentioned
   - education: "purdue" | "any" (assume purdue for alumni searches)
}}
3. intent_description: Brief description of what the user wants to accomplish
4. search_priority: "high" | "medium" | "low" based on specificity

Return only valid JSON without any markdown formatting."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing career networking queries. Return only valid JSON."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            result = json.loads(response.choices[0].message.content.strip())
            return result
            
        except Exception as e:
            # Fallback to basic analysis
            return {
                "search_type": "professionals",
                "target_criteria": {
                    "company": "any",
                    "role_level": "any",
                    "industry": "technology",
                    "skills": ["computer science"],
                    "location": "any",
                    "education": "purdue"
                },
                "intent_description": "General professional networking",
                "search_priority": "medium"
            }
    
    def build_clado_query(self, intent_analysis: Dict[str, Any]) -> str:
        """Use AI to build optimized Clado API query"""
        
        query_prompt = f"""Create an optimized search query for a professional networking database.

Intent Analysis: {json.dumps(intent_analysis, indent=2)}

Build a natural language query that will find relevant professionals. The query should:
1. Be specific enough to find relevant matches
2. Include key criteria like company, role, skills, education
3. Be formatted as a natural search query, not keywords
4. Focus on the most important criteria first

Examples of good queries:
- "Software engineers at Google with computer science background"
- "Purdue alumni working in machine learning at tech companies"
- "Senior developers with Python experience in San Francisco"

Return only the search query string without any formatting or explanation."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert at creating professional search queries. Return only the query string."},
                    {"role": "user", "content": query_prompt}
                ],
                temperature=0.4,
                max_tokens=200
            )
            
            return response.choices[0].message.content.strip().strip('"')
            
        except Exception as e:
            # Fallback query
            criteria = intent_analysis.get("target_criteria", {})
            company = criteria.get("company", "tech companies")
            skills = ", ".join(criteria.get("skills", ["computer science"]))
            return f"Professionals at {company} with {skills} background"
    
    def format_results(self, raw_results: List[Dict], original_query: str, intent_analysis: Dict[str, Any]) -> str:
        """Use AI to format Clado results into natural conversation"""
        
        if not raw_results:
            return self._generate_no_results_response(original_query, intent_analysis)
        
        format_prompt = f"""The user asked: "{original_query}"

Their networking intent: {intent_analysis.get('intent_description', 'Professional networking')}

I found these professionals in the database:
{json.dumps(raw_results, indent=2)}

Format this into a helpful, conversational response that:
1. Acknowledges what they were looking for
2. Presents the results in an organized, readable way
3. Highlights the most relevant matches first
4. Includes practical next steps for connecting
5. Uses natural language, not bullet points or markdown
6. Focuses on actionable information

Make it sound like a knowledgeable career advisor presenting networking opportunities."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a career networking advisor. Format search results into helpful, conversational advice."},
                    {"role": "user", "content": format_prompt}
                ],
                temperature=0.6,
                max_tokens=800
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            # Fallback formatting
            result_count = len(raw_results)
            return f"I found {result_count} relevant professionals matching your search. Here are some potential networking connections you might find valuable for your career goals."
    
    def _generate_no_results_response(self, original_query: str, intent_analysis: Dict[str, Any]) -> str:
        """Generate helpful response when no results found"""
        
        no_results_prompt = f"""The user asked: "{original_query}"

Their networking intent: {intent_analysis.get('intent_description', 'Professional networking')}

I searched the professional database but didn't find specific matches for their criteria.

Generate a helpful, encouraging response that:
1. Acknowledges that I couldn't find exact matches
2. Suggests alternative search approaches
3. Provides general networking advice for their goals
4. Encourages them to try broader or different search terms
5. Maintains a supportive, helpful tone

Make it feel like advice from an experienced career counselor."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a supportive career networking advisor. Provide helpful guidance when searches don't return results."},
                    {"role": "user", "content": no_results_prompt}
                ],
                temperature=0.7,
                max_tokens=400
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return "I wasn't able to find specific matches for your search, but that doesn't mean the connections aren't out there. Try broadening your search criteria or exploring related fields and companies."

class CladoAIClient:
    """AI-powered Clado API client using WebSocket connection"""
    
    def __init__(self, clado_api_key: str, openai_api_key: str):
        self.clado_api_key = clado_api_key
        self.ai_processor = AIQueryProcessor(openai_api_key)
        self.websocket_url = "wss://api.clado.ai/api/search/ws"
        self.timeout = 30  # seconds
    
    async def search_professionals(self, user_query: str) -> str:
        """Main entry point for professional search using AI processing"""
        
        try:
            # Step 1: Analyze user intent with AI
            print("🧠 Analyzing your networking intent...")
            intent_analysis = self.ai_processor.analyze_user_intent(user_query)
            
            # Step 2: Build optimized Clado query with AI
            print("🔍 Building optimized search query...")
            clado_query = self.ai_processor.build_clado_query(intent_analysis)
            print(f"   Search query: {clado_query}")
            
            # Step 3: Execute search via WebSocket
            print("📡 Searching professional database...")
            raw_results = await self._execute_websocket_search(clado_query)
            
            # Step 4: Format results with AI
            print("📋 Formatting results...")
            formatted_response = self.ai_processor.format_results(raw_results, user_query, intent_analysis)
            
            return formatted_response
            
        except Exception as e:
            return self._handle_search_error(user_query, str(e))
    
    async def _execute_websocket_search(self, query: str) -> List[Dict]:
        """Execute search via Clado WebSocket API"""
        
        try:
            headers = {
                "Authorization": f"Bearer {self.clado_api_key}",
                "Content-Type": "application/json"
            }
            
            async with websockets.connect(
                self.websocket_url,
                extra_headers=headers,
                timeout=self.timeout
            ) as websocket:
                
                # Send search request
                search_message = {
                    "type": "search",
                    "query": query,
                    "filters": {
                        "limit": 10,
                        "include_profile": True
                    }
                }
                
                await websocket.send(json.dumps(search_message))
                
                # Wait for response
                response = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=self.timeout
                )
                
                result = json.loads(response)
                
                # Extract results from response
                if result.get("type") == "search_results":
                    return result.get("data", [])
                elif result.get("type") == "error":
                    raise Exception(f"Clado API error: {result.get('message', 'Unknown error')}")
                else:
                    return []
                    
        except asyncio.TimeoutError:
            raise Exception("Search request timed out")
        except websockets.exceptions.ConnectionClosed:
            raise Exception("Connection to Clado API was closed")
        except Exception as e:
            raise Exception(f"WebSocket search failed: {str(e)}")
    
    def _handle_search_error(self, original_query: str, error_msg: str) -> str:
        """Use AI to handle search errors gracefully"""
        
        error_prompt = f"""The user asked: "{original_query}"

A technical error occurred while searching: {error_msg}

Generate a helpful response that:
1. Doesn't mention technical details or API errors
2. Acknowledges that the search couldn't be completed right now
3. Suggests they try again or rephrase their query
4. Provides general networking advice for their type of query
5. Maintains a helpful, supportive tone

Make it sound like a career advisor dealing with a temporary system issue."""

        try:
            response = self.ai_processor.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a career advisor handling a technical issue gracefully."},
                    {"role": "user", "content": error_prompt}
                ],
                temperature=0.6,
                max_tokens=300
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception:
            return "I'm having trouble accessing the professional database right now. Please try your search again in a moment, or feel free to rephrase your networking query."

# Integration function for existing system
def create_clado_client() -> Optional[CladoAIClient]:
    """Create Clado client if API keys are available"""
    
    clado_api_key = os.environ.get("CLADO_API_KEY")
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    
    if not openai_api_key or not clado_api_key:
        return None
    
    return CladoAIClient(clado_api_key, openai_api_key)

# Async wrapper for synchronous integration
def search_professionals_sync(user_query: str) -> str:
    """Synchronous wrapper for async search function"""
    
    client = create_clado_client()
    if not client:
        # Generate AI response for unavailable service
        try:
            import openai
            openai_key = os.environ.get("OPENAI_API_KEY")
            if openai_key:
                ai_client = openai.OpenAI(api_key=openai_key)
                response = ai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": f"Generate a helpful response explaining that career networking is temporarily unavailable. The user was trying to: {user_query}. Suggest they try again later or contact support."}],
                    temperature=0.5,
                    max_tokens=150
                )
                return response.choices[0].message.content.strip()
        except:
            pass
        return "Career networking is currently unavailable. This might be because API keys aren't configured. Please try again later or contact support for assistance."
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(client.search_professionals(user_query))
        loop.close()
        return result
    except Exception as e:
        # Generate AI response for search errors
        try:
            import openai
            openai_key = os.environ.get("OPENAI_API_KEY")
            if openai_key:
                ai_client = openai.OpenAI(api_key=openai_key)
                response = ai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": f"Generate a helpful response for a career networking search that failed. The user was searching for: {user_query}. Provide encouragement and suggest alternative approaches."}],
                    temperature=0.6,
                    max_tokens=150
                )
                return response.choices[0].message.content.strip()
        except:
            pass
        return "I encountered an issue while searching for professionals. This could be a temporary connectivity issue. Please try rephrasing your query or check back in a few minutes."

# Test function
async def test_clado_integration():
    """Test the Clado integration"""
    
    client = create_clado_client()
    if not client:
        print("❌ Cannot test - OpenAI API key not found")
        return
    
    test_queries = [
        "Find me a recent Purdue grad who landed a role at NVIDIA",
        "I need mentors in machine learning",
        "Connect me with software engineers at Google"
    ]
    
    for query in test_queries:
        print(f"\n🔍 Testing query: {query}")
        try:
            result = await client.search_professionals(query)
            print(f"✅ Result: {result[:200]}...")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Run test
    asyncio.run(test_clado_integration())