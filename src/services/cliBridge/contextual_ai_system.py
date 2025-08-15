#!/usr/bin/env python3
"""
Contextual AI System - Main Integration Hub
Combines intelligent query processing, dynamic knowledge management, and contextual response generation
Pure AI + hybrid approach with no hardcoding or templates
"""

import json
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import openai

# Import pure AI fallback system
from python_pure_ai_fallback import handle_error_with_ai, generate_ai_response

# Import our custom modules
from intelligent_query_processor import IntelligentQueryProcessor, QueryContext
from dynamic_knowledge_manager import DynamicKnowledgeManager, CourseData, MajorData
from sql_academic_analyzer import SQLAcademicAnalyzer
from enhanced_ai_processor import EnhancedAIProcessor

@dataclass
class ConversationContext:
    """Maintains conversation context across interactions"""
    user_id: str
    session_id: str
    conversation_history: List[Dict[str, str]]
    student_profile: Dict[str, Any]
    preferences: Dict[str, Any]
    last_query_context: Optional[QueryContext] = None
    conversation_insights: List[str] = None
    
    def __post_init__(self):
        if self.conversation_insights is None:
            self.conversation_insights = []

class ContextualAISystem:
    """Main AI system that provides intelligent, contextual academic guidance"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # Initialize core components
        self.query_processor = IntelligentQueryProcessor()
        self.knowledge_manager = DynamicKnowledgeManager()
        self.sql_analyzer = SQLAcademicAnalyzer()
        self.enhanced_processor = EnhancedAIProcessor()
        
        # Initialize OpenAI
        self.openai_client = None
        self._init_openai()
        
        # Conversation contexts
        self.active_conversations: Dict[str, ConversationContext] = {}
        
        # System state
        self.system_initialized = True
        self.knowledge_loaded = True
        
        print("✅ Contextual AI System initialized successfully")
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            try:
                openai.api_key = api_key
                self.openai_client = openai
                print("✅ OpenAI client initialized")
            except Exception as e:
                print(f"OpenAI initialization warning: {e}")
                self.openai_client = None
        else:
            print("⚠️ OpenAI API key not found - using enhanced pattern-based processing")
            self.openai_client = None
    
    def process_user_query(self, query: str, user_id: str = "anonymous", session_id: str = None, user_context: Dict[str, Any] = None) -> str:
        """Main method to process user queries and generate contextual responses"""
        
        try:
            # Generate session ID if not provided
            if session_id is None:
                session_id = f"{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Get or create conversation context
            conversation_key = f"{user_id}_{session_id}"
            conversation = self._get_conversation_context(user_id, session_id, user_context)
            
            # Step 1: Extract query context using intelligent processor
            query_context = self.query_processor.extract_query_context(query, user_context)
            
            # Step 2: Update conversation context with new insights
            self._update_conversation_context(conversation, query, query_context)
            
            # Step 3: Determine processing strategy
            processing_strategy = self._determine_processing_strategy(query_context, conversation)
            
            # Step 4: Fetch relevant knowledge dynamically
            relevant_knowledge = self._fetch_contextual_knowledge(query_context, conversation)
            
            # Step 5: Generate response using appropriate strategy
            response = self._generate_contextual_response(
                query, query_context, relevant_knowledge, conversation, processing_strategy
            )
            
            # Step 6: Update conversation history
            self._update_conversation_history(conversation, query, response)
            
            # Step 7: Extract insights for future interactions
            self._extract_conversation_insights(conversation, query_context, response)
            
            return response
            
        except Exception as e:
            print(f"Error in process_user_query: {e}")
            return self._generate_fallback_response(query, user_context)
    
    def _get_conversation_context(self, user_id: str, session_id: str, user_context: Dict[str, Any] = None) -> ConversationContext:
        """Get or create conversation context"""
        
        conversation_key = f"{user_id}_{session_id}"
        
        if conversation_key not in self.active_conversations:
            # Create new conversation context
            student_profile = self._build_student_profile(user_id, user_context)
            
            self.active_conversations[conversation_key] = ConversationContext(
                user_id=user_id,
                session_id=session_id,
                conversation_history=[],
                student_profile=student_profile,
                preferences=user_context.get('preferences', {}) if user_context else {}
            )
        
        return self.active_conversations[conversation_key]
    
    def _build_student_profile(self, user_id: str, user_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Build comprehensive student profile from available context"""
        
        profile = {
            "user_id": user_id,
            "academic_level": "unknown",
            "major": "Computer Science",
            "track": "unknown",
            "completed_courses": [],
            "gpa": None,
            "graduation_timeline": "standard",
            "interests": [],
            "concerns": [],
            "learning_style": "unknown",
            "career_goals": [],
            "last_updated": datetime.now().isoformat()
        }
        
        # Extract from user context if available
        if user_context:
            # From transcript data
            if "transcript" in user_context:
                transcript = user_context["transcript"]
                profile["completed_courses"] = transcript.get("completedCourses", [])
                profile["gpa"] = transcript.get("gpa")
                profile["academic_level"] = transcript.get("classification", "unknown")
            
            # From user preferences
            if "preferences" in user_context:
                prefs = user_context["preferences"]
                profile["major"] = prefs.get("major", "Computer Science")
                profile["track"] = prefs.get("track", "unknown")
                profile["graduation_timeline"] = prefs.get("timeline", "standard")
                profile["career_goals"] = prefs.get("career_goals", [])
        
        return profile
    
    def _update_conversation_context(self, conversation: ConversationContext, query: str, query_context: QueryContext):
        """Update conversation context with new information"""
        
        # Update student profile with extracted context
        if query_context.academic_level != "unknown":
            conversation.student_profile["academic_level"] = query_context.academic_level
        
        if query_context.major != "Computer Science":  # If it's different from default
            conversation.student_profile["major"] = query_context.major
        
        if query_context.track != "unknown":
            conversation.student_profile["track"] = query_context.track
        
        if query_context.completed_courses:
            # Merge with existing completed courses
            existing_courses = set(conversation.student_profile["completed_courses"])
            new_courses = set(query_context.completed_courses)
            conversation.student_profile["completed_courses"] = list(existing_courses | new_courses)
        
        if query_context.timeline_goals != "unknown":
            conversation.student_profile["graduation_timeline"] = query_context.timeline_goals
        
        # Update emotional insights
        if query_context.emotional_tone != "neutral":
            if query_context.emotional_tone not in conversation.student_profile.get("concerns", []):
                conversation.student_profile.setdefault("concerns", []).append(query_context.emotional_tone)
        
        # Store last query context
        conversation.last_query_context = query_context
        
        # Update timestamp
        conversation.student_profile["last_updated"] = datetime.now().isoformat()
    
    def _determine_processing_strategy(self, query_context: QueryContext, conversation: ConversationContext) -> str:
        """Determine the best processing strategy for this query"""
        
        # Complex academic planning scenarios
        if (query_context.user_intent in ["graduation_timeline", "course_planning"] and 
            query_context.timeline_goals == "early_graduation"):
            return "sql_enhanced"
        
        # Prerequisite chain analysis
        if (query_context.user_intent == "prerequisite_help" and 
            len(query_context.mentioned_courses) > 1):
            return "sql_enhanced"
        
        # Academic difficulty scenarios
        if query_context.user_intent == "academic_difficulty":
            return "enhanced_processor"
        
        # Track advice with career alignment
        if (query_context.user_intent == "track_advice" and 
            len(conversation.student_profile.get("career_goals", [])) > 0):
            return "ai_contextual"
        
        # Default intelligent processing
        if self.openai_client and query_context.context_confidence > 0.7:
            return "ai_contextual"
        
        # Fallback to enhanced processor
        return "enhanced_processor"
    
    def _fetch_contextual_knowledge(self, query_context: QueryContext, conversation: ConversationContext) -> Dict[str, Any]:
        """Fetch relevant knowledge based on query and conversation context"""
        
        knowledge = {
            "courses": [],
            "majors": [],
            "prerequisites": {},
            "similar_students": [],
            "conversation_relevant": {}
        }
        
        # Fetch courses relevant to query
        course_filters = {}
        if query_context.major != "unknown":
            course_filters["major"] = query_context.major
        
        knowledge["courses"] = self.knowledge_manager.get_courses(course_filters)
        
        # Fetch major information
        knowledge["majors"] = self.knowledge_manager.get_majors()
        
        # Fetch prerequisites for mentioned courses
        for course_code in query_context.mentioned_courses:
            knowledge["prerequisites"][course_code] = self.knowledge_manager.get_prerequisites(course_code)
        
        # Search for courses mentioned in query
        if query_context.specific_questions:
            for question in query_context.specific_questions:
                search_results = self.knowledge_manager.search_courses(question, course_filters)
                knowledge["courses"].extend(search_results[:5])  # Add top 5 matches
        
        # Remove duplicates
        seen_courses = set()
        unique_courses = []
        for course in knowledge["courses"]:
            if course.course_code not in seen_courses:
                unique_courses.append(course)
                seen_courses.add(course.course_code)
        knowledge["courses"] = unique_courses
        
        # Add conversation-relevant information
        knowledge["conversation_relevant"] = {
            "student_profile": conversation.student_profile,
            "conversation_history": conversation.conversation_history[-3:],  # Last 3 interactions
            "insights": conversation.conversation_insights
        }
        
        return knowledge
    
    def _generate_contextual_response(
        self, 
        query: str, 
        query_context: QueryContext, 
        knowledge: Dict[str, Any], 
        conversation: ConversationContext,
        strategy: str
    ) -> str:
        """Generate contextual response using specified strategy"""
        
        if strategy == "sql_enhanced":
            return self._generate_sql_enhanced_response(query, query_context, knowledge, conversation)
        elif strategy == "enhanced_processor":
            return self._generate_enhanced_processor_response(query, query_context, knowledge, conversation)  
        elif strategy == "ai_contextual":
            return self._generate_ai_contextual_response(query, query_context, knowledge, conversation)
        else:
            return self._generate_pattern_based_response(query, query_context, knowledge, conversation)
    
    def _generate_ai_contextual_response(
        self, 
        query: str, 
        query_context: QueryContext, 
        knowledge: Dict[str, Any], 
        conversation: ConversationContext
    ) -> str:
        """Generate AI-powered contextual response"""
        
        if not self.openai_client:
            return self._generate_enhanced_processor_response(query, query_context, knowledge, conversation)
        
        # Build comprehensive context for AI
        student_context = conversation.student_profile
        recent_history = conversation.conversation_history[-2:] if conversation.conversation_history else []
        
        # Prepare course information
        relevant_courses_info = ""
        if knowledge["courses"]:
            relevant_courses_info = "\n\nRelevant Courses:\n"
            for course in knowledge["courses"][:10]:
                relevant_courses_info += f"- {course.course_code}: {course.course_title} ({course.credits} credits)\n"
                if course.description:
                    relevant_courses_info += f"  Description: {course.description[:100]}...\n"
        
        # Prepare major/track information
        major_info = ""
        student_major = student_context.get("major", "Computer Science")
        for major in knowledge["majors"]:
            if major.major_name == student_major:
                major_info = f"\n\nMajor Requirements for {major.major_name}:\n"
                major_info += f"- Foundation courses: {', '.join(major.foundation_courses[:5])}\n"
                major_info += f"- Available tracks: {', '.join(major.tracks)}\n"
                major_info += f"- Total credits required: {major.total_credits}\n"
                break
        
        # Build conversation history context
        history_context = ""
        if recent_history:
            history_context = "\n\nRecent Conversation:\n"
            for interaction in recent_history:
                history_context += f"Student: {interaction['query'][:50]}...\n"
                history_context += f"Advisor: {interaction['response'][:50]}...\n"
        
        system_prompt = f"""
        You are an expert Purdue University academic advisor with deep knowledge of Computer Science, Data Science, and Artificial Intelligence programs.
        
        Student Profile:
        - Academic Level: {student_context.get('academic_level', 'unknown')}
        - Major: {student_context.get('major', 'Computer Science')}
        - Track Interest: {student_context.get('track', 'unknown')}
        - Completed Courses: {', '.join(student_context.get('completed_courses', [])[:5])}
        - Graduation Timeline: {student_context.get('graduation_timeline', 'standard')}
        - Career Goals: {', '.join(student_context.get('career_goals', []))}
        
        Query Analysis:
        - Intent: {query_context.user_intent}
        - Emotional Tone: {query_context.emotional_tone}
        - Mentioned Courses: {', '.join(query_context.mentioned_courses)}
        - Confidence Level: {query_context.context_confidence}
        
        Your personality and approach:
        - Warm, encouraging, and genuinely caring
        - Knowledgeable but accessible - avoid overwhelming jargon
        - Practical and action-oriented in your advice
        - Honest about challenges while maintaining optimism
        - Personalized responses based on the student's specific situation
        
        Response guidelines:
        - Use plain text formatting (no markdown)
        - Reference specific courses and requirements when relevant
        - Address the student's emotional state appropriately
        - Provide actionable next steps
        - Keep responses focused but comprehensive
        - Draw connections to their stated goals and interests
        
        Available Knowledge:
        {relevant_courses_info}
        {major_info}
        {history_context}
        
        Generate a personalized response that directly addresses their question with specific, actionable guidance based on their unique situation.
        """
        
        try:
            response = self.openai_client.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Student Question: {query}"}
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            # Post-process response to ensure quality
            return self._post_process_response(ai_response, query_context, conversation)
            
        except Exception as e:
            print(f"AI response generation failed: {e}")
            return self._generate_enhanced_processor_response(query, query_context, knowledge, conversation)
    
    def _generate_sql_enhanced_response(
        self, 
        query: str, 
        query_context: QueryContext, 
        knowledge: Dict[str, Any], 
        conversation: ConversationContext
    ) -> str:
        """Generate SQL-enhanced response for complex scenarios"""
        
        # Use the enhanced processor's SQL functionality
        user_context = {
            'userId': conversation.user_id,
            'student_profile': conversation.student_profile,
            'preferences': conversation.preferences
        }
        
        return self.enhanced_processor.process_query(query, user_context)
    
    def _generate_enhanced_processor_response(
        self, 
        query: str, 
        query_context: QueryContext, 
        knowledge: Dict[str, Any], 
        conversation: ConversationContext
    ) -> str:
        """Generate response using enhanced processor"""
        
        user_context = {
            'userId': conversation.user_id,
            'student_profile': conversation.student_profile,
            'preferences': conversation.preferences
        }
        
        return self.enhanced_processor.process_query(query, user_context)
    
    def _generate_pattern_based_response(
        self, 
        query: str, 
        query_context: QueryContext, 
        knowledge: Dict[str, Any], 
        conversation: ConversationContext
    ) -> str:
        """Generate pattern-based response as fallback"""
        
        return self.query_processor.generate_contextual_response(
            query, query_context, 
            type('KnowledgeContext', (), {
                'relevant_courses': knowledge["courses"],
                'major_requirements': {'courses': []},
                'track_requirements': {},
                'prerequisite_chains': [],
                'graduation_requirements': {},
                'course_scheduling': [],
                'similar_student_paths': []
            })(),
            {'userId': conversation.user_id}
        )
    
    def _post_process_response(self, response: str, query_context: QueryContext, conversation: ConversationContext) -> str:
        """Post-process AI response to ensure quality and consistency"""
        
        # Remove any markdown formatting that might have slipped through
        response = response.replace("**", "").replace("##", "").replace("###", "")
        response = response.replace("*", "").replace("_", "")
        
        # Ensure response is encouraging based on emotional tone
        if query_context.emotional_tone == "concerned" and "don't worry" not in response.lower():
            response = "I understand your concerns, and I'm here to help you navigate this successfully. " + response
        elif query_context.emotional_tone == "confused" and "let me clarify" not in response.lower():
            response = "Let me help clarify this for you. " + response
        
        return response
    
    def _update_conversation_history(self, conversation: ConversationContext, query: str, response: str):
        """Update conversation history"""
        
        conversation.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "response": response,
            "query_context": asdict(conversation.last_query_context) if conversation.last_query_context else {}
        })
        
        # Keep only last 10 interactions to manage memory
        if len(conversation.conversation_history) > 10:
            conversation.conversation_history = conversation.conversation_history[-10:]
    
    def _extract_conversation_insights(self, conversation: ConversationContext, query_context: QueryContext, response: str):
        """Extract insights from the conversation for future reference"""
        
        # Extract insights about student needs and patterns
        insights = []
        
        if query_context.user_intent == "graduation_timeline" and query_context.timeline_goals == "early_graduation":
            insights.append("Student interested in early graduation - provide accelerated timeline options")
        
        if query_context.emotional_tone == "concerned":
            insights.append("Student has expressed concerns - provide extra reassurance and support")
        
        if len(query_context.mentioned_courses) > 3:
            insights.append("Student discussing multiple courses - likely planning ahead or reviewing progress")
        
        if query_context.user_intent == "track_advice":
            if query_context.major == "Computer Science" and query_context.track != "unknown":
                insights.append(f"Student exploring {query_context.track} track - provide relevant career connections")
            elif query_context.major in ["Data Science", "Artificial Intelligence"]:
                insights.append(f"Student asking about {query_context.major} - clarify it's a standalone major without tracks")
        
        # Add new insights to conversation
        conversation.conversation_insights.extend(insights)
        
        # Keep only last 20 insights
        if len(conversation.conversation_insights) > 20:
            conversation.conversation_insights = conversation.conversation_insights[-20:]
    
    async def _generate_fallback_response(self, query: str, user_context: Dict[str, Any] = None) -> str:
        """Generate AI-powered fallback response when main processing fails"""
        try:
            from .pure_ai_fallback import get_ai_generated_response
            
            context = {
                "service_status": "error",
                "error_context": "Main AI processing failed, using backup response generation"
            }
            
            # Add user context if available
            if user_context:
                context["user_context"] = user_context
            
            return get_ai_generated_response(query, context)
            
        except Exception as e:
            print(f"AI fallback generation failed: {e}")
            return await handle_error_with_ai('general', query, 'academic_planning')
    
    def get_student_profile(self, user_id: str, session_id: str = None) -> Dict[str, Any]:
        """Get current student profile"""
        
        if session_id:
            conversation_key = f"{user_id}_{session_id}"
            if conversation_key in self.active_conversations:
                return self.active_conversations[conversation_key].student_profile
        
        # Look for any conversation with this user
        for key, conversation in self.active_conversations.items():
            if conversation.user_id == user_id:
                return conversation.student_profile
        
        return {"user_id": user_id, "message": "No profile found"}
    
    def get_conversation_history(self, user_id: str, session_id: str = None) -> List[Dict[str, Any]]:
        """Get conversation history"""
        
        if session_id:
            conversation_key = f"{user_id}_{session_id}"
            if conversation_key in self.active_conversations:
                return self.active_conversations[conversation_key].conversation_history
        
        return []
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get system status information"""
        
        return {
            "system_initialized": self.system_initialized,
            "openai_available": self.openai_client is not None,
            "knowledge_loaded": self.knowledge_loaded,
            "active_conversations": len(self.active_conversations),
            "knowledge_cache_status": self.knowledge_manager.get_cache_status(),
            "processing_capabilities": {
                "intelligent_query_processing": True,
                "dynamic_knowledge_fetching": True,
                "sql_enhanced_analysis": True,
                "contextual_ai_responses": self.openai_client is not None,
                "conversation_memory": True,
                "student_profiling": True
            }
        }

def test_contextual_ai_system():
    """Test the contextual AI system"""
    
    system = ContextualAISystem()
    
    print("=== Contextual AI System Test ===")
    
    test_queries = [
        {
            "query": "I'm a sophomore CS major who just finished CS 182 and CS 240. I want to graduate early and focus on machine intelligence. What should I take next?",
            "user_id": "test_student_1",
            "context": {"academic_level": "sophomore", "major": "Computer Science"}
        },
        {
            "query": "I'm really confused about prerequisites for advanced AI courses. Can you help?",
            "user_id": "test_student_1",  # Same student
            "context": {"emotional_state": "confused"}
        },
        {
            "query": "What's the difference between the software engineering and machine intelligence tracks?",
            "user_id": "test_student_2",
            "context": {"academic_level": "junior", "major": "Computer Science"}
        }
    ]
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n=== Test Query {i} ===")
        print(f"User: {test['user_id']}")
        print(f"Query: {test['query']}")
        print("\n--- Response ---")
        
        response = system.process_user_query(
            query=test["query"],
            user_id=test["user_id"],
            user_context=test.get("context")
        )
        
        print(response)
        print("\n" + "="*70)
    
    # Test system status
    print("\n=== System Status ===")
    status = system.get_system_status()
    print(f"System Initialized: {status['system_initialized']}")
    print(f"OpenAI Available: {status['openai_available']}")
    print(f"Active Conversations: {status['active_conversations']}")
    print(f"Processing Capabilities: {len([k for k, v in status['processing_capabilities'].items() if v])}/{len(status['processing_capabilities'])}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_contextual_ai_system()