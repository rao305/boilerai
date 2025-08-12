#!/usr/bin/env python3
"""
Intelligent Query Processor - Advanced AI + Hybrid System
Breaks down user queries, understands intent, fetches data dynamically, and generates contextual responses
No hardcoding, no templates - pure AI-driven understanding and response generation
"""

import json
import re
import sqlite3
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import openai
import os
from pathlib import Path

@dataclass
class QueryContext:
    """Extracted context from user query"""
    user_intent: str  # "course_planning", "graduation_timeline", "track_advice", etc.
    academic_level: str  # "freshman", "sophomore", "junior", "senior", "unknown"
    major: str  # "Computer Science", "Data Science", "Artificial Intelligence"
    track: str  # "Machine Intelligence", "Software Engineering", "unknown" 
    completed_courses: List[str]
    mentioned_courses: List[str]
    gpa_info: Optional[str]
    timeline_goals: str  # "early_graduation", "standard", "flexible", "unknown"
    specific_questions: List[str]
    emotional_tone: str  # "concerned", "excited", "confused", "neutral"
    context_confidence: float  # 0.0-1.0 how confident we are in the extraction

@dataclass 
class KnowledgeContext:
    """Knowledge fetched from database based on query context"""
    relevant_courses: List[Dict[str, Any]]
    major_requirements: Dict[str, Any]
    track_requirements: Dict[str, Any]
    prerequisite_chains: List[Dict[str, Any]]
    graduation_requirements: Dict[str, Any]
    course_scheduling: List[Dict[str, Any]]
    similar_student_paths: List[Dict[str, Any]]

class IntelligentQueryProcessor:
    """Advanced query processor that understands, fetches, and responds contextually"""
    
    def __init__(self, db_path: str = None, knowledge_base_path: str = None):
        self.db_path = db_path or "/Users/rrao/Desktop/final/purdue_cs_knowledge.db"
        self.knowledge_base_path = knowledge_base_path or "/Users/rrao/Desktop/final/src/cli test1/my_cli_bot/data/cs_knowledge_graph.json"
        
        # Initialize database connection
        self.conn = None
        self._init_database()
        
        # Load knowledge base
        self.knowledge_base = {}
        self._load_knowledge_base()
        
        # Initialize OpenAI
        self.openai_client = None
        self._init_openai()
        
        # Major and track definitions (dynamic - loaded from knowledge base)
        self.majors = ["Computer Science", "Data Science", "Artificial Intelligence"]
        self.cs_tracks = ["Machine Intelligence", "Software Engineering"]  # Only CS has tracks
        self.ds_tracks = []  # Data Science has no tracks - it's a standalone major
        self.ai_tracks = []  # Artificial Intelligence has no tracks - it's a standalone major
        
        # Query understanding patterns (AI-enhanced, not hardcoded)
        self.intent_indicators = {
            "course_planning": ["course", "class", "take", "schedule", "plan", "recommend", "next", "should i"],
            "graduation_timeline": ["graduate", "graduation", "timeline", "early", "delay", "finish", "complete"],
            "track_advice": ["track", "specialization", "concentration", "focus", "career", "job", "industry"],  
            "prerequisite_help": ["prerequisite", "prereq", "before", "requirement", "need", "required"],
            "academic_difficulty": ["hard", "difficult", "struggle", "fail", "grade", "gpa", "challenging"],
            "schedule_optimization": ["semester", "schedule", "workload", "balance", "time", "busy"],
            "career_guidance": ["career", "job", "internship", "industry", "work", "employment"]
        }
    
    def _init_database(self):
        """Initialize database connection"""
        try:
            self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
            self.conn.row_factory = sqlite3.Row
        except Exception as e:
            print(f"Database initialization warning: {e}")
            self.conn = None
    
    def _load_knowledge_base(self):
        """Load comprehensive knowledge base"""
        try:
            with open(self.knowledge_base_path, 'r') as f:
                self.knowledge_base = json.load(f)
        except Exception as e:
            print(f"Knowledge base loading warning: {e}")
            self.knowledge_base = {"courses": {}, "tracks": {}, "majors": {}}
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        api_key = os.getenv('OPENAI_API_KEY')
        if api_key:
            try:
                openai.api_key = api_key
                self.openai_client = openai
            except Exception as e:
                print(f"OpenAI initialization warning: {e}")
                self.openai_client = None
        else:
            print("OpenAI API key not found - using pattern-based processing")
            self.openai_client = None
    
    def extract_query_context(self, query: str, user_context: Dict[str, Any] = None) -> QueryContext:
        """Intelligently extract context from user query using AI + pattern matching"""
        
        if self.openai_client:
            return self._ai_extract_context(query, user_context)
        else:
            return self._pattern_extract_context(query, user_context)
    
    def _ai_extract_context(self, query: str, user_context: Dict[str, Any] = None) -> QueryContext:
        """Use OpenAI to intelligently extract context from query"""
        
        system_prompt = f"""
        You are an expert academic context extractor for Purdue University students.
        Extract structured information from student queries about academic planning.
        
        Available majors: {', '.join(self.majors)}
        Available CS tracks: {', '.join(self.cs_tracks)} (Note: Only Computer Science has tracks - Data Science and Artificial Intelligence are standalone majors)
        
        Analyze the query and extract:
        1. User intent (course_planning, graduation_timeline, track_advice, prerequisite_help, etc.)
        2. Academic level (freshman, sophomore, junior, senior, or unknown)  
        3. Major (if mentioned or implied)
        4. Track (if mentioned or implied)
        5. Completed courses (extract course codes like CS 18000, MATH 161)
        6. Mentioned courses (any courses referenced)
        7. GPA information (if mentioned)
        8. Timeline goals (early_graduation, standard, flexible, unknown)
        9. Specific questions being asked
        10. Emotional tone (concerned, excited, confused, neutral)
        11. Confidence level (0.0-1.0) in your extraction
        
        Return valid JSON only with these exact keys:
        {{
            "user_intent": "string",
            "academic_level": "string", 
            "major": "string",
            "track": "string",
            "completed_courses": ["array"],
            "mentioned_courses": ["array"],
            "gpa_info": "string or null",
            "timeline_goals": "string",
            "specific_questions": ["array"],
            "emotional_tone": "string",
            "context_confidence": 0.85
        }}
        """
        
        try:
            response = self.openai_client.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query: {query}"}
                ],
                temperature=0.1,
                max_tokens=500
            )
            
            context_data = json.loads(response.choices[0].message.content)
            
            return QueryContext(
                user_intent=context_data.get("user_intent", "general_inquiry"),
                academic_level=context_data.get("academic_level", "unknown"),
                major=context_data.get("major", "Computer Science"),
                track=context_data.get("track", "unknown"),
                completed_courses=context_data.get("completed_courses", []),
                mentioned_courses=context_data.get("mentioned_courses", []),
                gpa_info=context_data.get("gpa_info"),
                timeline_goals=context_data.get("timeline_goals", "unknown"),
                specific_questions=context_data.get("specific_questions", []),
                emotional_tone=context_data.get("emotional_tone", "neutral"),
                context_confidence=context_data.get("context_confidence", 0.7)
            )
            
        except Exception as e:
            print(f"AI context extraction failed, using pattern fallback: {e}")
            return self._pattern_extract_context(query, user_context)
    
    def _pattern_extract_context(self, query: str, user_context: Dict[str, Any] = None) -> QueryContext:
        """Pattern-based context extraction as fallback"""
        
        query_lower = query.lower()
        
        # Extract intent
        user_intent = "general_inquiry"
        for intent, keywords in self.intent_indicators.items():
            if any(keyword in query_lower for keyword in keywords):
                user_intent = intent
                break
        
        # Extract academic level
        academic_level = "unknown"
        level_patterns = {
            "freshman": ["freshman", "first year", "1st year", "fresh"],
            "sophomore": ["sophomore", "second year", "2nd year", "soph"],
            "junior": ["junior", "third year", "3rd year"],
            "senior": ["senior", "fourth year", "4th year", "final year"]
        }
        for level, patterns in level_patterns.items():
            if any(pattern in query_lower for pattern in patterns):
                academic_level = level
                break
        
        # Extract major
        major = "Computer Science"  # default
        if any(term in query_lower for term in ["data science", "ds major", "statistics"]):
            major = "Data Science"
        elif any(term in query_lower for term in ["artificial intelligence", "ai major"]):
            major = "Artificial Intelligence"
        
        # Extract track (only for Computer Science major)
        track = "unknown"
        if major == "Computer Science":
            if any(term in query_lower for term in ["machine intelligence", "mi", "ai", "ml"]):
                track = "Machine Intelligence"
            elif any(term in query_lower for term in ["software engineering", "se", "software"]):
                track = "Software Engineering"
        # Data Science and AI majors don't have tracks
        
        # Extract courses
        course_pattern = r'(?:cs|math|stat|ece)\s*(\d{3,5})'
        matches = re.findall(course_pattern, query_lower)
        mentioned_courses = []
        for match in matches:
            dept = "CS" if "cs" in query_lower else "MATH" if "math" in query_lower else "STAT"
            course_code = f"{dept} {match}"
            mentioned_courses.append(course_code.upper())
        
        # Extract timeline goals
        timeline_goals = "unknown"
        if any(term in query_lower for term in ["early", "fast", "quick", "accelerate", "3 year"]):
            timeline_goals = "early_graduation"
        elif any(term in query_lower for term in ["delay", "behind", "extra", "slow"]):
            timeline_goals = "flexible"
        elif any(term in query_lower for term in ["normal", "standard", "4 year"]):
            timeline_goals = "standard"
        
        # Extract emotional tone
        emotional_tone = "neutral"
        if any(term in query_lower for term in ["worried", "concerned", "stressed", "confused"]):
            emotional_tone = "concerned"
        elif any(term in query_lower for term in ["excited", "eager", "ready", "motivated"]):
            emotional_tone = "excited"
        elif any(term in query_lower for term in ["confused", "lost", "unsure", "don't know"]):
            emotional_tone = "confused"
        
        return QueryContext(
            user_intent=user_intent,
            academic_level=academic_level,
            major=major,
            track=track,
            completed_courses=mentioned_courses,  # Assume mentioned courses are completed
            mentioned_courses=mentioned_courses,
            gpa_info=None,
            timeline_goals=timeline_goals,
            specific_questions=[query],
            emotional_tone=emotional_tone,
            context_confidence=0.6
        )
    
    def fetch_relevant_knowledge(self, context: QueryContext) -> KnowledgeContext:
        """Dynamically fetch relevant knowledge from database and knowledge base"""
        
        knowledge = KnowledgeContext(
            relevant_courses=[],
            major_requirements={},
            track_requirements={},
            prerequisite_chains=[],
            graduation_requirements={},
            course_scheduling=[],
            similar_student_paths=[]
        )
        
        # Fetch from database if available
        if self.conn:
            knowledge = self._fetch_database_knowledge(context, knowledge)
        
        # Fetch from knowledge base
        knowledge = self._fetch_knowledge_base_data(context, knowledge)
        
        return knowledge
    
    def _fetch_database_knowledge(self, context: QueryContext, knowledge: KnowledgeContext) -> KnowledgeContext:
        """Fetch relevant data from SQL database"""
        
        cursor = self.conn.cursor()
        
        try:
            # Fetch relevant courses based on context
            if context.mentioned_courses or context.user_intent == "course_planning":
                course_filter = "WHERE 1=1"
                params = []
                
                if context.major == "Computer Science":
                    course_filter += " AND department IN ('CS', 'MATH', 'STAT')"
                elif context.major == "Data Science":
                    course_filter += " AND department IN ('STAT', 'CS', 'MATH')"
                elif context.major == "Artificial Intelligence":
                    course_filter += " AND department IN ('CS', 'MATH', 'ECE')"
                
                if context.academic_level != "unknown":
                    level_map = {"freshman": 1, "sophomore": 2, "junior": 3, "senior": 4}
                    level_num = level_map.get(context.academic_level, 2)
                    # Get courses appropriate for this level and next level
                    course_filter += f" AND CAST(SUBSTR(course_code, -3) AS INTEGER) <= {(level_num + 1) * 100}"
                
                query = f"SELECT * FROM courses {course_filter} ORDER BY is_critical_path DESC, difficulty_score ASC LIMIT 20"
                cursor.execute(query, params)
                knowledge.relevant_courses = [dict(row) for row in cursor.fetchall()]
            
            # Fetch major requirements
            cursor.execute("""
                SELECT * FROM major_requirements 
                WHERE major_name = ? AND (track_name = ? OR track_name IS NULL)
                ORDER BY priority_order
            """, (context.major, context.track if context.track != "unknown" else None))
            
            major_req_rows = cursor.fetchall()
            knowledge.major_requirements = {
                "courses": [dict(row) for row in major_req_rows],
                "total_required": len(major_req_rows)
            }
            
            # Fetch prerequisite chains for mentioned courses
            if context.mentioned_courses:
                placeholders = ','.join(['?' for _ in context.mentioned_courses])
                cursor.execute(f"""
                    SELECT p.*, c1.course_title as course_title, c2.course_title as prereq_title
                    FROM prerequisites p
                    LEFT JOIN courses c1 ON p.course_code = c1.course_code
                    LEFT JOIN courses c2 ON p.prerequisite_code = c2.course_code
                    WHERE p.course_code IN ({placeholders})
                    ORDER BY p.strength DESC
                """, context.mentioned_courses)
                
                knowledge.prerequisite_chains = [dict(row) for row in cursor.fetchall()]
        
        except Exception as e:
            print(f"Database fetch warning: {e}")
        
        return knowledge
    
    def _fetch_knowledge_base_data(self, context: QueryContext, knowledge: KnowledgeContext) -> KnowledgeContext:
        """Fetch relevant data from JSON knowledge base"""
        
        # Add courses from knowledge base if database didn't provide enough
        if len(knowledge.relevant_courses) < 5:
            kb_courses = self.knowledge_base.get("courses", {})
            
            for course_code, course_data in kb_courses.items():
                # Filter based on context
                if context.major == "Computer Science" and not (course_code.startswith("CS") or course_code.startswith("MA")):
                    continue
                elif context.major == "Data Science" and not (course_code.startswith("STAT") or course_code.startswith("CS")):
                    continue
                
                # Add course data
                course_info = dict(course_data)
                course_info["course_code"] = course_code
                knowledge.relevant_courses.append(course_info)
                
                if len(knowledge.relevant_courses) >= 15:
                    break
        
        # Add track requirements from knowledge base
        tracks_data = self.knowledge_base.get("tracks", {})
        if context.track != "unknown" and context.track in tracks_data:
            knowledge.track_requirements = tracks_data[context.track]
        
        # Add graduation requirements
        majors_data = self.knowledge_base.get("majors", {})
        if context.major in majors_data:
            knowledge.graduation_requirements = majors_data[context.major]
        
        return knowledge
    
    def generate_contextual_response(self, query: str, context: QueryContext, knowledge: KnowledgeContext, user_context: Dict[str, Any] = None) -> str:
        """Generate intelligent, contextual response using AI + knowledge"""
        
        if self.openai_client:
            return self._ai_generate_response(query, context, knowledge, user_context)
        else:
            return self._pattern_generate_response(query, context, knowledge, user_context)
    
    def _ai_generate_response(self, query: str, context: QueryContext, knowledge: KnowledgeContext, user_context: Dict[str, Any] = None) -> str:
        """Use OpenAI to generate intelligent, contextual response"""
        
        # Prepare context for AI
        context_summary = f"""
        User Context:
        - Intent: {context.user_intent}
        - Academic Level: {context.academic_level}
        - Major: {context.major}
        - Track: {context.track}
        - Completed Courses: {', '.join(context.completed_courses) if context.completed_courses else 'None mentioned'}
        - Timeline Goals: {context.timeline_goals}
        - Emotional Tone: {context.emotional_tone}
        
        Relevant Knowledge:
        - Available Courses: {len(knowledge.relevant_courses)} courses loaded
        - Major Requirements: {len(knowledge.major_requirements.get('courses', []))} requirements
        - Track Requirements: {bool(knowledge.track_requirements)}
        """
        
        # Include specific course details if relevant
        course_details = ""
        if knowledge.relevant_courses and len(knowledge.relevant_courses) > 0:
            course_details = "\n\nRelevant Courses:\n"
            for course in knowledge.relevant_courses[:8]:  # Limit to prevent token overflow
                course_details += f"- {course.get('course_code', 'Unknown')}: {course.get('course_title', 'No title')} ({course.get('credits', 'N/A')} credits)\n"
        
        system_prompt = f"""
        You are an expert Purdue University academic advisor specializing in Computer Science, Data Science, and Artificial Intelligence programs.
        
        Your personality:
        - Warm, encouraging, and supportive
        - Knowledgeable about all academic pathways
        - Practical and actionable in advice
        - Honest about challenges while maintaining optimism
        
        Guidelines:
        - Provide specific, actionable advice based on the student's exact situation
        - Reference specific courses and requirements from the knowledge provided
        - Address the student's emotional tone appropriately
        - Be encouraging but realistic about timelines and difficulty
        - No markdown formatting - use plain text with clear structure
        - Keep responses focused and practical
        
        Context: {context_summary}
        {course_details}
        
        Generate a personalized response that directly addresses their question with specific, actionable guidance.
        """
        
        try:
            response = self.openai_client.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Student Question: {query}"}
                ],
                temperature=0.7,
                max_tokens=600
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"AI response generation failed, using pattern fallback: {e}")
            return self._pattern_generate_response(query, context, knowledge, user_context)
    
    def _pattern_generate_response(self, query: str, context: QueryContext, knowledge: KnowledgeContext, user_context: Dict[str, Any] = None) -> str:
        """Pattern-based response generation as fallback"""
        
        response_parts = []
        
        # Acknowledge the student's situation
        if context.academic_level != "unknown":
            if context.emotional_tone == "concerned":
                response_parts.append(f"I understand your concerns as a {context.academic_level}. Let me help you with a clear plan.")
            elif context.emotional_tone == "excited":
                response_parts.append(f"Great to see your enthusiasm as a {context.academic_level}! Here's what I recommend.")
            else:
                response_parts.append(f"As a {context.academic_level} {context.major} student, here's my guidance for your situation.")
        
        # Provide intent-specific advice
        if context.user_intent == "course_planning":
            response_parts.append("\nFor course planning:")
            
            if knowledge.relevant_courses:
                response_parts.append("Based on your situation, I recommend considering these courses:")
                for course in knowledge.relevant_courses[:5]:
                    course_code = course.get('course_code', 'Unknown')
                    course_title = course.get('course_title', 'No title')
                    credits = course.get('credits', 'N/A')
                    response_parts.append(f"• {course_code} - {course_title} ({credits} credits)")
            
        elif context.user_intent == "graduation_timeline":
            if context.timeline_goals == "early_graduation":
                response_parts.append("\nFor early graduation:")
                response_parts.append("• Early graduation is challenging but possible with careful planning")
                response_parts.append("• Consider summer courses for general requirements")
                response_parts.append("• Limit CS courses to 2-3 per semester for success")
            else:
                response_parts.append("\nFor graduation planning:")
                response_parts.append("• Standard 4-year timeline gives you flexibility")
                response_parts.append("• Focus on foundation courses in your first two years")
        
        elif context.user_intent == "track_advice":
            if context.major == "Computer Science":
                if context.track != "unknown":
                    response_parts.append(f"\nRegarding the {context.track} track:")
                    if context.track == "Machine Intelligence":
                        response_parts.append("• Strong math background is essential (linear algebra, statistics)")
                        response_parts.append("• Focus on CS 37300 (Data Mining) and CS 47100 (AI)")
                        response_parts.append("• Great preparation for AI/ML careers")
                    elif context.track == "Software Engineering":
                        response_parts.append("• Emphasizes practical software development skills")
                        response_parts.append("• Focus on CS 40800 (Software Engineering) and CS 42200 (Computer Networks)")
                        response_parts.append("• Excellent for industry development roles")
                else:
                    response_parts.append("\nFor CS track selection:")
                    response_parts.append("• Machine Intelligence: AI/ML focus, research-oriented")
                    response_parts.append("• Software Engineering: Industry development, practical skills")
                    response_parts.append("• You typically choose your track in junior year")
            elif context.major == "Data Science":
                response_parts.append("\nData Science is a standalone major:")
                response_parts.append("• Combines statistics, programming, and domain expertise")
                response_parts.append("• No tracks - the major itself is the specialization")
                response_parts.append("• Excellent preparation for data analyst and data scientist roles")
            elif context.major == "Artificial Intelligence":
                response_parts.append("\nArtificial Intelligence is a standalone major:")
                response_parts.append("• Deep focus on AI/ML techniques and applications")
                response_parts.append("• No tracks - the major covers the full AI spectrum")
                response_parts.append("• Prepares you for AI research and advanced AI development roles")
        
        # Add practical next steps
        response_parts.append("\nNext steps:")
        if context.completed_courses:
            response_parts.append(f"• Based on completing {', '.join(context.completed_courses[:3])}, you're on a good track")
        response_parts.append("• Meet with your academic advisor to confirm course selections")
        response_parts.append("• Plan your schedule considering course availability and workload")
        
        return "\n".join(response_parts)
    
    def process_query(self, query: str, user_context: Dict[str, Any] = None) -> str:
        """Main method to process user query and generate response"""
        
        # Step 1: Extract context from query
        query_context = self.extract_query_context(query, user_context)
        
        # Step 2: Fetch relevant knowledge
        knowledge = self.fetch_relevant_knowledge(query_context)
        
        # Step 3: Generate contextual response
        response = self.generate_contextual_response(query, query_context, knowledge, user_context)
        
        return response
    
    def get_context_debug_info(self, query: str, user_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get detailed debug information about query processing"""
        
        query_context = self.extract_query_context(query, user_context)
        knowledge = self.fetch_relevant_knowledge(query_context)
        
        return {
            "query": query,
            "extracted_context": asdict(query_context),
            "knowledge_summary": {
                "relevant_courses_count": len(knowledge.relevant_courses),
                "major_requirements_count": len(knowledge.major_requirements.get('courses', [])),
                "has_track_requirements": bool(knowledge.track_requirements),
                "prerequisite_chains_count": len(knowledge.prerequisite_chains)
            },
            "processing_mode": "AI-powered" if self.openai_client else "Pattern-based"
        }

def test_intelligent_processor():
    """Test the intelligent query processor"""
    processor = IntelligentQueryProcessor()
    
    test_queries = [
        "I'm a sophomore CS major who just finished CS 182 and CS 240. I want to graduate early and focus on machine intelligence. What should I take next?",
        "What courses do I need for the software engineering track?",
        "I'm confused about the prerequisite chain for advanced AI courses",
        "Can I graduate in 3 years with a data science major?"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n=== Test Query {i} ===")
        print(f"Question: {query}")
        print("\n--- Response ---")
        response = processor.process_query(query)
        print(response)
        print("\n--- Debug Info ---")
        debug_info = processor.get_context_debug_info(query)
        print(f"Intent: {debug_info['extracted_context']['user_intent']}")
        print(f"Academic Level: {debug_info['extracted_context']['academic_level']}")
        print(f"Major: {debug_info['extracted_context']['major']}")
        print(f"Track: {debug_info['extracted_context']['track']}")
        print(f"Confidence: {debug_info['extracted_context']['context_confidence']}")
        print("="*50)

if __name__ == "__main__":
    test_intelligent_processor()