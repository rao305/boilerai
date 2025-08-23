"""
Advanced RAG System with SmartCourse & Echelon-Inspired Intelligence
===================================================================

Implements multi-level reasoning, contextual awareness, and self-reasoning
for CS academic advising with complete CS-MI and CS-SE track intelligence.
"""

import asyncio
import json
import logging
import re
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from pathlib import Path
from enum import Enum
import pandas as pd

from rag.retriever import create_retriever
from rag.indexer import LocalEmbedding, GeminiEmbedding, OpenAIEmbedding
import networkx as nx

logger = logging.getLogger(__name__)

class ReasoningLevel(Enum):
    """Multi-level reasoning hierarchy inspired by Echelon"""
    SURFACE = "surface"      # Direct fact retrieval
    ANALYTICAL = "analytical"  # Analysis and synthesis
    STRATEGIC = "strategic"   # Planning and optimization
    CONTEXTUAL = "contextual" # Deep context awareness

class QueryIntent(Enum):
    """Intent classification for intelligent routing"""
    COURSE_INFO = "course_info"
    PREREQUISITE_CHECK = "prerequisite_check"
    TRACK_PLANNING = "track_planning"  
    GRADUATION_PATH = "graduation_path"
    COURSE_SELECTION = "course_selection"
    ACADEMIC_POLICY = "academic_policy"
    DEGREE_PROGRESS = "degree_progress"
    SCHEDULING = "scheduling"
    COMPARISON = "comparison"

@dataclass
class StudentContext:
    """Rich student context for personalized reasoning"""
    student_id: Optional[str] = None
    completed_courses: List[str] = None
    current_semester: Optional[str] = None
    track: Optional[str] = None  # "machine_intelligence" or "software_engineering"
    gpa: Optional[float] = None
    graduation_target: Optional[str] = None
    preferences: Dict[str, Any] = None
    transcript_data: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.completed_courses is None:
            self.completed_courses = []
        if self.preferences is None:
            self.preferences = {}
        if self.transcript_data is None:
            self.transcript_data = {}

@dataclass
class IntelligentResponse:
    """Structured response with reasoning transparency"""
    answer: str
    reasoning_level: ReasoningLevel
    confidence: float
    sources: List[Dict[str, Any]]
    reasoning_chain: List[str]
    contextual_factors: List[str]
    recommendations: List[str]
    follow_up_questions: List[str]

class KnowledgeBase:
    """Comprehensive CS knowledge base with graph reasoning"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.courses_df = None
        self.tracks_data = None
        self.prereq_graph = None
        self.course_extras = None
        self.load_knowledge_base()
    
    def load_knowledge_base(self):
        """Load all CS data into structured knowledge base"""
        try:
            # Load courses data
            courses_path = self.data_dir / "courses.csv"
            if courses_path.exists():
                self.courses_df = pd.read_csv(courses_path)
                logger.info(f"Loaded {len(self.courses_df)} courses")
            
            # Load track requirements
            tracks_path = self.data_dir / "tracks.json"
            if tracks_path.exists():
                with open(tracks_path) as f:
                    self.tracks_data = json.load(f)
                logger.info(f"Loaded {len(self.tracks_data['tracks'])} tracks")
            
            # Load prerequisites and build graph
            self.build_prerequisite_graph()
            
            # Load course extras
            extras_path = self.data_dir / "course_extras.jsonl"
            if extras_path.exists():
                self.course_extras = {}
                with open(extras_path) as f:
                    for line in f:
                        extra = json.loads(line)
                        self.course_extras[extra['course_id']] = extra
                        
        except Exception as e:
            logger.error(f"Error loading knowledge base: {e}")
    
    def build_prerequisite_graph(self):
        """Build directed graph of course prerequisites"""
        self.prereq_graph = nx.DiGraph()
        
        prereqs_path = self.data_dir / "prereqs.jsonl"
        if not prereqs_path.exists():
            return
            
        with open(prereqs_path) as f:
            for line in f:
                if line.strip():
                    prereq = json.loads(line)
                    dst = prereq['dst']
                    
                    # Add course node
                    self.prereq_graph.add_node(dst)
                    
                    # Process prerequisites
                    if prereq['kind'] == 'allof':
                        for req in prereq['expr']:
                            self.prereq_graph.add_edge(req, dst, 
                                                     type='required', 
                                                     min_grade=prereq.get('min_grade', 'C'))
                    elif prereq['kind'] == 'oneof':
                        for req_group in prereq['expr']:
                            for req in req_group:
                                self.prereq_graph.add_edge(req, dst, 
                                                         type='alternative',
                                                         min_grade=prereq.get('min_grade', 'C'))
    
    def get_course_info(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive course information"""
        if self.courses_df is None:
            return None
            
        course_row = self.courses_df[self.courses_df['id'] == course_id]
        if course_row.empty:
            return None
            
        course_info = course_row.iloc[0].to_dict()
        
        # Add prerequisites
        if self.prereq_graph and course_id in self.prereq_graph:
            prereqs = list(self.prereq_graph.predecessors(course_id))
            course_info['prerequisites'] = prereqs
        
        # Add course extras
        if self.course_extras and course_id in self.course_extras:
            course_info.update(self.course_extras[course_id])
            
        return course_info
    
    def get_track_requirements(self, track_id: str) -> Optional[Dict[str, Any]]:
        """Get track requirements and electives"""
        if not self.tracks_data:
            return None
            
        for track in self.tracks_data['tracks']:
            if track['id'] == track_id:
                return track
        return None
    
    def check_prerequisites(self, course_id: str, completed_courses: List[str]) -> Dict[str, Any]:
        """Check if prerequisites are satisfied"""
        if not self.prereq_graph or course_id not in self.prereq_graph:
            return {"satisfied": True, "missing": [], "alternatives": []}
        
        prereqs = list(self.prereq_graph.predecessors(course_id))
        missing = [req for req in prereqs if req not in completed_courses]
        
        return {
            "satisfied": len(missing) == 0,
            "missing": missing,
            "required": prereqs,
            "alternatives": self._get_prerequisite_alternatives(course_id)
        }
    
    def _get_prerequisite_alternatives(self, course_id: str) -> List[List[str]]:
        """Get alternative prerequisite paths"""
        # Implementation would analyze oneof expressions
        return []

class IntentClassifier:
    """Advanced intent classification with contextual understanding"""
    
    def __init__(self):
        self.intent_patterns = {
            QueryIntent.COURSE_INFO: [
                r"what is (CS\d+|[A-Z]+\d+)",
                r"tell me about (CS\d+|[A-Z]+\d+)",
                r"course description",
                r"credits for",
                r"what does .* cover"
            ],
            QueryIntent.PREREQUISITE_CHECK: [
                r"prerequisites? for",
                r"what do I need before",
                r"can I take",
                r"am I ready for",
                r"requirements? for (CS\d+|[A-Z]+\d+)"
            ],
            QueryIntent.TRACK_PLANNING: [
                r"track requirements?",
                r"machine intelligence",
                r"software engineering", 
                r"MI track",
                r"SE track",
                r"electives",
                r"which track"
            ],
            QueryIntent.GRADUATION_PATH: [
                r"graduation plan",
                r"path to graduation",
                r"how to graduate",
                r"sequence of courses",
                r"course order"
            ],
            QueryIntent.COURSE_SELECTION: [
                r"which course should",
                r"recommend.*course",
                r"choose between",
                r"best course for",
                r"should I take"
            ],
            QueryIntent.ACADEMIC_POLICY: [
                r"policy",
                r"rules",
                r"grade requirement",
                r"minimum grade",
                r"C or better"
            ]
        }
    
    def classify(self, query: str, context: Optional[StudentContext] = None) -> List[Tuple[QueryIntent, float]]:
        """Classify query intent with confidence scores"""
        query_lower = query.lower()
        intent_scores = []
        
        for intent, patterns in self.intent_patterns.items():
            max_score = 0
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    # Simple pattern matching score
                    score = len(pattern) / len(query_lower)
                    max_score = max(max_score, score)
            
            if max_score > 0:
                intent_scores.append((intent, min(max_score, 1.0)))
        
        # Sort by confidence
        intent_scores.sort(key=lambda x: x[1], reverse=True)
        return intent_scores[:3]  # Top 3 intents

class IntelligentAdvisor:
    """Advanced RAG system with multi-level reasoning and contextual awareness"""
    
    def __init__(self, database_url: str, qdrant_url: str, data_dir: Path, 
                 embedding_provider: str = "local", api_key: Optional[str] = None):
        self.database_url = database_url
        self.qdrant_url = qdrant_url
        self.data_dir = data_dir
        
        # Initialize components
        self.knowledge_base = KnowledgeBase(data_dir)
        self.intent_classifier = IntentClassifier()
        self.retriever = self._create_retriever(embedding_provider, api_key)
        
        logger.info("Intelligent Advisor initialized")
    
    def _create_retriever(self, provider: str, api_key: Optional[str]):
        """Create RAG retriever with specified embedding provider"""
        if provider == "gemini" and api_key:
            embedding = GeminiEmbedding(api_key)
        elif provider == "openai" and api_key:
            embedding = OpenAIEmbedding(api_key)
        else:
            embedding = LocalEmbedding()
            
        return create_retriever(
            database_url=self.database_url,
            vector_backend="qdrant",
            qdrant_url=self.qdrant_url,
            embedding_provider=embedding
        )
    
    async def ask(self, query: str, student_context: Optional[StudentContext] = None) -> IntelligentResponse:
        """Main entry point for intelligent academic advising"""
        
        # 1. Intent Classification
        intents = self.intent_classifier.classify(query, student_context)
        primary_intent = intents[0][0] if intents else QueryIntent.COURSE_INFO
        
        # 2. Determine reasoning level needed
        reasoning_level = self._determine_reasoning_level(query, primary_intent, student_context)
        
        # 3. Multi-level reasoning chain
        response = await self._process_with_reasoning_level(
            query, primary_intent, reasoning_level, student_context
        )
        
        return response
    
    def _determine_reasoning_level(self, query: str, intent: QueryIntent, 
                                   context: Optional[StudentContext]) -> ReasoningLevel:
        """Determine appropriate reasoning level based on query complexity"""
        
        # Strategic reasoning for planning queries
        if intent in [QueryIntent.GRADUATION_PATH, QueryIntent.TRACK_PLANNING]:
            return ReasoningLevel.STRATEGIC
        
        # Contextual reasoning when student context is available
        if context and (context.completed_courses or context.transcript_data):
            return ReasoningLevel.CONTEXTUAL
            
        # Analytical reasoning for complex comparisons
        if any(word in query.lower() for word in ['compare', 'versus', 'vs', 'better', 'choose']):
            return ReasoningLevel.ANALYTICAL
            
        # Surface level for simple facts
        return ReasoningLevel.SURFACE
    
    async def _process_with_reasoning_level(self, query: str, intent: QueryIntent, 
                                           level: ReasoningLevel, 
                                           context: Optional[StudentContext]) -> IntelligentResponse:
        """Process query with appropriate reasoning level"""
        
        reasoning_chain = []
        
        if level == ReasoningLevel.SURFACE:
            return await self._surface_reasoning(query, intent, reasoning_chain)
        elif level == ReasoningLevel.ANALYTICAL:
            return await self._analytical_reasoning(query, intent, context, reasoning_chain)
        elif level == ReasoningLevel.STRATEGIC:
            return await self._strategic_reasoning(query, intent, context, reasoning_chain)
        elif level == ReasoningLevel.CONTEXTUAL:
            return await self._contextual_reasoning(query, intent, context, reasoning_chain)
    
    async def _surface_reasoning(self, query: str, intent: QueryIntent, 
                                reasoning_chain: List[str]) -> IntelligentResponse:
        """Direct fact retrieval and simple Q&A"""
        reasoning_chain.append("Performing direct knowledge retrieval")
        
        # Use RAG retrieval for document-based information
        retrieval_result = await self.retriever.retrieve(query, top_k=3)
        
        # Extract course IDs from query
        course_ids = re.findall(r'\b(CS\d+|[A-Z]+\d+)\b', query.upper())
        
        sources = []
        answer_parts = []
        
        # Add RAG sources
        for chunk in retrieval_result.chunks:
            sources.append({
                "type": "document",
                "text": chunk.text[:200] + "...",
                "score": chunk.score
            })
        
        # Add structured data sources
        for course_id in course_ids:
            course_info = self.knowledge_base.get_course_info(course_id)
            if course_info:
                sources.append({
                    "type": "course_data",
                    "course_id": course_id,
                    "info": course_info
                })
                answer_parts.append(f"{course_id}: {course_info.get('title', 'Unknown')} ({course_info.get('credits', '?')} credits)")
        
        # Combine RAG and structured answers
        if retrieval_result.chunks:
            rag_answer = "\n".join([chunk.text for chunk in retrieval_result.chunks[:2]])
            answer_parts.insert(0, rag_answer)
        
        return IntelligentResponse(
            answer="\n\n".join(answer_parts) if answer_parts else "No specific information found.",
            reasoning_level=ReasoningLevel.SURFACE,
            confidence=0.8 if sources else 0.3,
            sources=sources,
            reasoning_chain=reasoning_chain,
            contextual_factors=[],
            recommendations=[],
            follow_up_questions=self._generate_follow_up_questions(intent)
        )
    
    async def _analytical_reasoning(self, query: str, intent: QueryIntent, 
                                   context: Optional[StudentContext],
                                   reasoning_chain: List[str]) -> IntelligentResponse:
        """Analysis, synthesis, and comparison reasoning"""
        reasoning_chain.append("Performing analytical reasoning and synthesis")
        
        # Get base information through surface reasoning
        surface_response = await self._surface_reasoning(query, intent, reasoning_chain)
        
        # Add analytical layers
        reasoning_chain.append("Analyzing relationships and patterns")
        
        # Extract course comparisons if present
        course_ids = re.findall(r'\b(CS\d+|[A-Z]+\d+)\b', query.upper())
        
        analytical_insights = []
        
        if len(course_ids) >= 2:
            reasoning_chain.append(f"Comparing courses: {', '.join(course_ids)}")
            
            for course_id in course_ids:
                course_info = self.knowledge_base.get_course_info(course_id)
                if course_info:
                    level = course_info.get('level', 0)
                    credits = course_info.get('credits', 0)
                    analytical_insights.append(
                        f"- {course_id} is a {level}-level course worth {credits} credits"
                    )
        
        # Track analysis insights
        if intent == QueryIntent.TRACK_PLANNING:
            reasoning_chain.append("Analyzing track requirements and optimization")
            
            mi_track = self.knowledge_base.get_track_requirements("machine_intelligence")
            se_track = self.knowledge_base.get_track_requirements("software_engineering")
            
            if mi_track and se_track:
                analytical_insights.extend([
                    "Track Comparison:",
                    f"- MI Track has {len(mi_track['groups'])} requirement groups",
                    f"- SE Track has {len(se_track['groups'])} requirement groups",
                    "- Both tracks require CS38100 (Algorithms)"
                ])
        
        enhanced_answer = surface_response.answer
        if analytical_insights:
            enhanced_answer += "\n\n**Analysis:**\n" + "\n".join(analytical_insights)
        
        return IntelligentResponse(
            answer=enhanced_answer,
            reasoning_level=ReasoningLevel.ANALYTICAL,
            confidence=min(surface_response.confidence + 0.1, 0.95),
            sources=surface_response.sources,
            reasoning_chain=reasoning_chain,
            contextual_factors=analytical_insights,
            recommendations=self._generate_recommendations(intent, course_ids),
            follow_up_questions=surface_response.follow_up_questions
        )
    
    async def _strategic_reasoning(self, query: str, intent: QueryIntent,
                                  context: Optional[StudentContext], 
                                  reasoning_chain: List[str]) -> IntelligentResponse:
        """Strategic planning and optimization reasoning"""
        reasoning_chain.append("Engaging strategic planning and optimization")
        
        # Get analytical baseline
        analytical_response = await self._analytical_reasoning(query, intent, context, reasoning_chain)
        
        strategic_insights = []
        recommendations = []
        
        if intent == QueryIntent.GRADUATION_PATH:
            reasoning_chain.append("Optimizing graduation pathway")
            
            # Analyze both tracks
            mi_reqs = self.knowledge_base.get_track_requirements("machine_intelligence")
            se_reqs = self.knowledge_base.get_track_requirements("software_engineering")
            
            strategic_insights.extend([
                "**Strategic Graduation Planning:**",
                "1. Complete CS core requirements first (CS18000, CS18200, CS24000, CS25000, CS25100, CS25200)",
                "2. Take CS38100 (required for both tracks) in junior year",
                "3. Choose track based on career goals and interests"
            ])
            
            if mi_reqs:
                mi_courses = set()
                for group in mi_reqs['groups']:
                    mi_courses.update(group['from'])
                
                strategic_insights.append(f"4. MI Track requires {len(mi_courses)} unique courses")
                recommendations.append("Consider MI track if interested in AI/ML career path")
            
            if se_reqs:
                se_courses = set()
                for group in se_reqs['groups']:
                    se_courses.update(group['from'])
                
                strategic_insights.append(f"5. SE Track requires {len(se_courses)} unique courses")
                recommendations.append("Consider SE track for software development career")
        
        elif intent == QueryIntent.TRACK_PLANNING:
            reasoning_chain.append("Strategic track selection analysis")
            
            strategic_insights.extend([
                "**Track Selection Strategy:**",
                "- MI Track focuses on algorithms, AI, and machine learning",
                "- SE Track emphasizes software development, testing, and systems",
                "- Both tracks share core computer science fundamentals"
            ])
            
            recommendations.extend([
                "Take CS31400 (Numerical Methods) if considering MI track",
                "Take CS30700 (Software Engineering I) early if considering SE track",
                "Consider your math background for track selection"
            ])
        
        enhanced_answer = analytical_response.answer
        if strategic_insights:
            enhanced_answer += "\n\n" + "\n".join(strategic_insights)
        
        return IntelligentResponse(
            answer=enhanced_answer,
            reasoning_level=ReasoningLevel.STRATEGIC,
            confidence=min(analytical_response.confidence + 0.05, 0.98),
            sources=analytical_response.sources,
            reasoning_chain=reasoning_chain,
            contextual_factors=analytical_response.contextual_factors + strategic_insights,
            recommendations=recommendations,
            follow_up_questions=[
                "What are your career goals?",
                "Do you prefer theoretical or practical coursework?",
                "What's your target graduation timeline?"
            ]
        )
    
    async def _contextual_reasoning(self, query: str, intent: QueryIntent,
                                   context: StudentContext,
                                   reasoning_chain: List[str]) -> IntelligentResponse:
        """Deep contextual awareness with personalized reasoning"""
        reasoning_chain.append("Applying deep contextual awareness and personalization")
        
        # Get strategic baseline
        strategic_response = await self._strategic_reasoning(query, intent, context, reasoning_chain)
        
        contextual_factors = []
        personalized_recommendations = []
        
        if context.completed_courses:
            reasoning_chain.append(f"Analyzing {len(context.completed_courses)} completed courses")
            
            # Analyze completion progress
            core_courses = ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"]
            completed_core = [c for c in core_courses if c in context.completed_courses]
            
            contextual_factors.extend([
                f"**Your Progress:**",
                f"- Completed {len(completed_core)}/6 core courses: {', '.join(completed_core)}",
                f"- Total courses completed: {len(context.completed_courses)}"
            ])
            
            # Prerequisites analysis
            if intent == QueryIntent.COURSE_SELECTION:
                reasoning_chain.append("Checking prerequisites for course recommendations")
                
                available_courses = []
                for course_id in ["CS30700", "CS31400", "CS37300", "CS38100", "CS41100"]:
                    prereq_check = self.knowledge_base.check_prerequisites(
                        course_id, context.completed_courses
                    )
                    if prereq_check["satisfied"]:
                        available_courses.append(course_id)
                
                if available_courses:
                    contextual_factors.append(f"- Eligible for: {', '.join(available_courses)}")
                    personalized_recommendations.append(
                        f"Based on your progress, consider taking: {', '.join(available_courses[:2])}"
                    )
        
        if context.track:
            reasoning_chain.append(f"Personalizing for {context.track} track")
            track_reqs = self.knowledge_base.get_track_requirements(context.track)
            
            if track_reqs and context.completed_courses:
                # Calculate track progress
                track_courses = set()
                for group in track_reqs['groups']:
                    track_courses.update(group['from'])
                
                completed_track = [c for c in track_courses if c in context.completed_courses]
                remaining_track = track_courses - set(context.completed_courses)
                
                contextual_factors.extend([
                    f"**{context.track.replace('_', ' ').title()} Track Progress:**",
                    f"- Completed track courses: {len(completed_track)}",
                    f"- Remaining: {', '.join(sorted(remaining_track)[:5])}{'...' if len(remaining_track) > 5 else ''}"
                ])
                
                if remaining_track:
                    next_courses = sorted(remaining_track)[:3]
                    personalized_recommendations.append(
                        f"Next recommended courses for your track: {', '.join(next_courses)}"
                    )
        
        if context.graduation_target:
            reasoning_chain.append(f"Optimizing for {context.graduation_target} graduation")
            contextual_factors.append(f"- Target graduation: {context.graduation_target}")
            
            # Add timeline-based recommendations
            personalized_recommendations.append(
                "Consider course load and prerequisite chains for your timeline"
            )
        
        # Enhance answer with personalized context
        enhanced_answer = strategic_response.answer
        if contextual_factors:
            enhanced_answer += "\n\n" + "\n".join(contextual_factors)
        
        return IntelligentResponse(
            answer=enhanced_answer,
            reasoning_level=ReasoningLevel.CONTEXTUAL,
            confidence=min(strategic_response.confidence + 0.02, 1.0),
            sources=strategic_response.sources,
            reasoning_chain=reasoning_chain,
            contextual_factors=strategic_response.contextual_factors + contextual_factors,
            recommendations=personalized_recommendations,
            follow_up_questions=[
                "Would you like a personalized graduation timeline?",
                "Should I analyze your remaining requirements?",
                "Do you want course scheduling recommendations?"
            ]
        )
    
    def _generate_recommendations(self, intent: QueryIntent, course_ids: List[str]) -> List[str]:
        """Generate contextual recommendations"""
        recommendations = []
        
        if intent == QueryIntent.COURSE_INFO and course_ids:
            recommendations.append("Check prerequisites before enrolling")
            recommendations.append("Consider your course load for the semester")
        
        elif intent == QueryIntent.TRACK_PLANNING:
            recommendations.extend([
                "Meet with your academic advisor to discuss track selection",
                "Consider your career goals when choosing a track",
                "Look at graduate school requirements if planning to continue"
            ])
        
        return recommendations
    
    def _generate_follow_up_questions(self, intent: QueryIntent) -> List[str]:
        """Generate relevant follow-up questions"""
        follow_ups = {
            QueryIntent.COURSE_INFO: [
                "Do you need prerequisite information?",
                "Would you like to see similar courses?"
            ],
            QueryIntent.TRACK_PLANNING: [
                "Which track interests you more?",
                "What are your career goals?",
                "Do you want to see a comparison?"
            ],
            QueryIntent.GRADUATION_PATH: [
                "What's your current academic status?",
                "When do you plan to graduate?",
                "Do you need a detailed timeline?"
            ]
        }
        
        return follow_ups.get(intent, [
            "Is there anything else you'd like to know?",
            "Do you need more specific information?"
        ])

# Factory function for easy integration
def create_intelligent_advisor(database_url: str, qdrant_url: str, 
                              data_dir: Union[str, Path],
                              embedding_provider: str = "local",
                              api_key: Optional[str] = None) -> IntelligentAdvisor:
    """Create an intelligent advisor instance"""
    if isinstance(data_dir, str):
        data_dir = Path(data_dir)
    
    return IntelligentAdvisor(
        database_url=database_url,
        qdrant_url=qdrant_url,
        data_dir=data_dir,
        embedding_provider=embedding_provider,
        api_key=api_key
    )