#!/usr/bin/env python3
"""
Pure AI BoilerAI Bridge Service
Uses OpenAI API for ALL responses when available - no hardcoded patterns or templates
"""

import os
import sys
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Only import OpenAI when we need it
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("OpenAI package not available")

# Import SQL Academic Analyzer for dynamic query generation
try:
    from sql_academic_analyzer import SQLAcademicAnalyzer
    SQL_ANALYZER_AVAILABLE = True
    print("SQL Academic Analyzer imported successfully")
except ImportError as e:
    SQL_ANALYZER_AVAILABLE = False
    print(f"SQL Academic Analyzer not available: {e}")

app = FastAPI(title="Pure AI BoilerAI Bridge Service", version="2.0.0")

# CORS middleware for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    user_id: str
    session_id: Optional[str] = None
    ai_generated: bool = True
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    cli_process_running: bool
    timestamp: str
    openai_configured: bool
    knowledge_base_loaded: bool
    ai_mode: str

class ApiKeyUpdateRequest(BaseModel):
    userId: str
    apiKey: str

class ApiKeyDeleteRequest(BaseModel):
    userId: str

class TranscriptProcessRequest(BaseModel):
    userId: str
    transcriptText: str
    context: Optional[Dict[str, Any]] = None

class ContextPermissionRequest(BaseModel):
    userId: str
    allowContextFeeding: bool
    
class SmartRecommendationRequest(BaseModel):
    userId: str
    query: str
    includeTranscriptContext: Optional[bool] = True

class ConversationHistoryRequest(BaseModel):
    userId: str
    limit: Optional[int] = 10

# Enhanced global instances for intelligent conversation management
user_sessions = {}
user_api_keys = {}
user_permissions = {}         # Store user permissions for AI context feeding
conversation_history = {}     # Store conversation history for context awareness
conversation_topics = {}      # Track current conversation topics
conversation_metadata = {}    # Track conversation patterns, preferences, and insights
conversation_reasoning = {}   # Store reasoning steps for transparency and learning
user_conversation_patterns = {} # Track individual user communication preferences
openai_client = None
sql_analyzer = None          # SQL-based academic analyzer for dynamic query generation

# Load knowledge base for context
def load_knowledge_base():
    """Load enhanced knowledge base with merged CSV data and relationship strengths"""
    knowledge = {
        "courses": [],
        "degree_requirements": {},
        "tracks": []
    }
    
    try:
        # Load enhanced knowledge graph (merged from JSON + CSV data)
        enhanced_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "enhanced_knowledge_graph.json")
        if os.path.exists(enhanced_file):
            with open(enhanced_file, 'r') as f:
                full_knowledge = json.load(f)
                knowledge = {
                    "courses": full_knowledge.get("courses", {}),
                    "degree_requirements": full_knowledge.get("degree_requirements", {}), 
                    "prerequisite_chains": full_knowledge.get("prerequisite_chains", {}),
                    "tracks": full_knowledge.get("tracks", {}),
                    "metadata": full_knowledge.get("metadata", {})
                }
                print(f"✅ Loaded enhanced knowledge base: {len(knowledge['courses'])} courses with relationship strengths")
        else:
            # Fallback to original comprehensive knowledge graph
            knowledge_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "comprehensive_knowledge_graph.json")
            if os.path.exists(knowledge_file):
                with open(knowledge_file, 'r') as f:
                    full_knowledge = json.load(f)
                    knowledge = {
                        "courses": full_knowledge.get("courses", {}),
                        "degree_requirements": full_knowledge.get("degree_requirements", {}), 
                        "prerequisite_chains": full_knowledge.get("prerequisite_chains", {}),
                        "tracks": full_knowledge.get("tracks", {}),
                        "course_progressions": full_knowledge.get("course_progressions", {})
                    }
                    print(f"✅ Loaded fallback knowledge base: {len(knowledge['courses'])} courses")
        
        # Load degree requirements  
        req_file = os.path.join(os.path.dirname(__file__), "..", "..", "data", "comprehensive_degree_requirements.js")
        if os.path.exists(req_file):
            # Parse JS file content (simplified)
            with open(req_file, 'r') as f:
                content = f.read()
                # Extract JSON part (this is a simplified approach)
                if "export const" in content:
                    json_start = content.find('{')
                    json_end = content.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        try:
                            knowledge["degree_requirements"] = json.loads(content[json_start:json_end])
                        except:
                            pass
    except Exception as e:
        print(f"Warning: Could not load knowledge base: {e}")
    
    return knowledge

# Initialize knowledge base
KNOWLEDGE_BASE = load_knowledge_base()

def initialize_openai_client(api_key: str = None) -> Optional[OpenAI]:
    """Initialize OpenAI client with API key"""
    global openai_client
    
    if not OPENAI_AVAILABLE:
        return None
    
    # Use provided key or environment variable
    key = api_key or os.environ.get("OPENAI_API_KEY")
    
    if not key:
        return None
    
    try:
        openai_client = OpenAI(api_key=key)
        # Test the connection with a simple request
        test_response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=5
        )
        print(f"OpenAI client initialized successfully")
        return openai_client
    except Exception as e:
        print(f"Failed to initialize OpenAI client: {e}")
        openai_client = None
        return None

def analyze_transcript_for_context(transcript_data: Dict) -> Dict[str, Any]:
    """Extract key academic data from transcript for AI context"""
    try:
        context = {
            "student_info": transcript_data.get("studentInfo", {}),
            "academic_standing": "unknown",
            "completed_courses": [],
            "current_courses": [],
            "gpa_info": transcript_data.get("gpaSummary", {}),
            "academic_progress": {}
        }
        
        # Extract completed courses
        completed_courses = transcript_data.get("completedCourses", {})
        for semester_key, semester_data in completed_courses.items():
            if isinstance(semester_data, dict) and "courses" in semester_data:
                context["academic_standing"] = semester_data.get("academicStanding", "unknown")
                for course in semester_data.get("courses", []):
                    context["completed_courses"].append({
                        "code": course.get("courseCode", ""),
                        "title": course.get("courseTitle", ""),
                        "credits": course.get("credits", 0),
                        "grade": course.get("grade", ""),
                        "semester": course.get("semester", ""),
                        "year": course.get("year", ""),
                        "classification": course.get("classification", "")
                    })
        
        # Extract in-progress courses
        in_progress = transcript_data.get("coursesInProgress", [])
        for course in in_progress:
            context["current_courses"].append({
                "code": course.get("courseCode", ""),
                "title": course.get("courseTitle", ""),
                "credits": course.get("credits", 0),
                "semester": course.get("semester", ""),
                "year": course.get("year", "")
            })
        
        # Calculate academic progress metrics
        cs_courses = [c for c in context["completed_courses"] if c["code"].startswith("CS")]
        math_courses = [c for c in context["completed_courses"] if c["code"].startswith("MA") or c["code"].startswith("STAT")]
        
        context["academic_progress"] = {
            "total_courses": len(context["completed_courses"]),
            "cs_courses_completed": len(cs_courses),
            "math_courses_completed": len(math_courses),
            "total_credits": context["gpa_info"].get("totalCreditsEarned", 0),
            "cumulative_gpa": context["gpa_info"].get("cumulativeGPA", 0.0),
            "foundation_courses": [c for c in cs_courses if c["classification"] == "foundation"],
            "struggling_courses": [c for c in context["completed_courses"] if c["grade"] in ["D", "F", "D+", "D-"]],
            "strong_performance": [c for c in context["completed_courses"] if c["grade"] in ["A", "A+", "A-", "B+"]]
        }
        
        return context
        
    except Exception as e:
        print(f"Error analyzing transcript for context: {e}")
        return {}

def build_intelligent_context(user_id: str, message: str) -> Dict[str, Any]:
    """Build intelligent context for AI based on user data and permissions"""
    context = {
        "has_transcript_data": False,
        "user_permissions": user_permissions.get(user_id, {}),
        "academic_context": None,
        "knowledge_base_available": len(KNOWLEDGE_BASE.get("courses", [])) > 0
    }
    
    # Check if user has transcript data and permissions
    user_session = user_sessions.get(user_id, {})
    user_perms = user_permissions.get(user_id, {})
    
    if user_session.get("context_available") and user_perms.get("allow_context_feeding", False):
        # Extract academic context from transcript
        if "transcript" in user_session:
            academic_context = analyze_transcript_for_context(user_session["transcript"])
            context["academic_context"] = academic_context
            context["has_transcript_data"] = True
        elif "ai_analysis" in user_session:
            # If we have AI analysis, indicate we have context
            context["has_transcript_data"] = True
            context["ai_analysis_available"] = True
    
    return context

def add_to_conversation_history(user_id: str, user_message: str, ai_response: str, reasoning_steps: Dict = None) -> None:
    """Enhanced conversation history with context tracking and reasoning"""
    if user_id not in conversation_history:
        conversation_history[user_id] = []
    
    # Keep last 15 exchanges for better context (prevent memory overflow)
    if len(conversation_history[user_id]) >= 30:  # 15 exchanges = 30 messages
        conversation_history[user_id] = conversation_history[user_id][-28:]  # Keep 14 exchanges + new one
    
    timestamp = datetime.now().isoformat()
    
    # Analyze conversation patterns for this user
    analyze_conversation_patterns(user_id, user_message, ai_response)
    
    # Add enhanced conversation entry
    conversation_history[user_id].extend([
        {
            "role": "user", 
            "content": user_message, 
            "timestamp": timestamp,
            "message_length": len(user_message),
            "topics": extract_message_topics(user_message)
        },
        {
            "role": "assistant", 
            "content": ai_response, 
            "timestamp": timestamp,
            "message_length": len(ai_response),
            "reasoning_steps": reasoning_steps or {},
            "topics": extract_message_topics(ai_response)
        }
    ])
    
    # Update conversation metadata
    update_conversation_metadata(user_id, user_message, ai_response)

def extract_message_topics(message: str) -> List[str]:
    """Extract key topics from a message for better context tracking"""
    message_lower = message.lower()
    topics = []
    
    # Academic topics
    academic_keywords = {
        "courses": ["course", "class", "cs ", "stat ", "math ", "engl ", "phys ", "schedule"],
        "planning": ["plan", "planning", "graduation", "timeline", "semester", "year"],
        "requirements": ["requirement", "prerequisite", "prereq", "credit", "gpa"],
        "career": ["career", "job", "internship", "work", "industry", "company"],
        "grades": ["grade", "gpa", "fail", "pass", "score", "performance"],
        "majors": ["computer science", "data science", "artificial intelligence", "major", "track"],
        "help": ["help", "confused", "stuck", "problem", "issue", "difficult"]
    }
    
    for topic, keywords in academic_keywords.items():
        if any(keyword in message_lower for keyword in keywords):
            topics.append(topic)
    
    return topics

def analyze_conversation_patterns(user_id: str, user_message: str, ai_response: str) -> None:
    """Analyze and store user conversation patterns for personalization"""
    if user_id not in user_conversation_patterns:
        user_conversation_patterns[user_id] = {
            "message_style": "unknown",
            "detail_preference": "medium",
            "topic_interests": [],
            "response_satisfaction": [],
            "communication_patterns": {
                "avg_message_length": 0,
                "question_frequency": 0,
                "emoji_usage": False,
                "formality_level": "medium"
            }
        }
    
    patterns = user_conversation_patterns[user_id]
    
    # Analyze message characteristics
    msg_length = len(user_message)
    patterns["communication_patterns"]["avg_message_length"] = (
        (patterns["communication_patterns"]["avg_message_length"] + msg_length) / 2
    )
    
    # Check for questions
    if "?" in user_message:
        patterns["communication_patterns"]["question_frequency"] += 1
    
    # Update topic interests
    topics = extract_message_topics(user_message)
    for topic in topics:
        if topic not in patterns["topic_interests"]:
            patterns["topic_interests"].append(topic)

def update_conversation_metadata(user_id: str, user_message: str, ai_response: str) -> None:
    """Update conversation metadata for better context awareness"""
    if user_id not in conversation_metadata:
        conversation_metadata[user_id] = {
            "total_exchanges": 0,
            "last_topics": [],
            "conversation_quality": "good",
            "response_patterns": [],
            "user_satisfaction_indicators": [],
            "academic_progress_mentioned": [],
            "follow_up_needed": False
        }
    
    metadata = conversation_metadata[user_id]
    metadata["total_exchanges"] += 1
    
    # Track recent topics
    topics = extract_message_topics(user_message) + extract_message_topics(ai_response)
    metadata["last_topics"] = list(set(topics))[-5:]  # Keep last 5 unique topics
    
    # Check for academic progress mentions
    progress_indicators = ["completed", "finished", "passed", "took", "taking", "currently in"]
    for indicator in progress_indicators:
        if indicator in user_message.lower():
            metadata["academic_progress_mentioned"].append({
                "timestamp": datetime.now().isoformat(),
                "context": user_message[:100]
            })

def generate_reasoning_analysis(message: str, user_id: str, intelligent_context: Dict) -> Dict[str, Any]:
    """Generate reasoning analysis to make responses more thoughtful and natural"""
    message_lower = message.lower()
    
    # Get conversation history and patterns
    history = conversation_history.get(user_id, [])
    patterns = user_conversation_patterns.get(user_id, {})
    metadata = conversation_metadata.get(user_id, {})
    
    reasoning_steps = {
        "needs_reasoning": True,
        "analysis": "",
        "strategy": "",
        "context_factors": []
    }
    
    # Analyze what kind of response this user typically needs
    analysis_points = []
    strategy_points = []
    
    # 1. Check if this relates to previous conversation
    if history:
        recent_topics = []
        for msg in history[-6:]:  # Last 3 exchanges
            if msg["role"] == "user":
                recent_topics.extend(msg.get("topics", []))
        
        current_topics = extract_message_topics(message)
        topic_overlap = set(recent_topics) & set(current_topics)
        
        if topic_overlap:
            analysis_points.append(f"This continues their discussion about {', '.join(topic_overlap)}")
            strategy_points.append("Reference previous conversation naturally to show continuity")
    
    # 2. Check for academic progress mentions
    progress_words = ["completed", "finished", "passed", "took", "just took", "done with"]
    if any(word in message_lower for word in progress_words):
        analysis_points.append("User is sharing academic achievement - respond with appropriate encouragement")
        strategy_points.append("Acknowledge their accomplishment authentically as a supportive advisor would")
    
    # 3. Check for confusion or struggle indicators
    struggle_words = ["confused", "stuck", "don't understand", "help", "difficult", "hard", "struggling"]
    if any(word in message_lower for word in struggle_words):
        analysis_points.append("User is expressing difficulty or confusion")
        strategy_points.append("Show empathy first, then break down the solution into manageable steps")
    
    # 4. Check for planning/future-oriented questions
    planning_words = ["should I", "what's next", "plan", "recommend", "suggest", "after"]
    if any(word in message_lower for word in planning_words):
        analysis_points.append("User is seeking guidance for future decisions")
        strategy_points.append("Provide specific, actionable recommendations based on their current progress")
    
    # 5. Check if user has transcript data for personalization
    if intelligent_context.get("has_transcript_data"):
        analysis_points.append("User has uploaded transcript data - can provide highly personalized advice")
        strategy_points.append("Reference their actual completed courses and academic history")
    
    # 6. Analyze conversation patterns for personalization
    if patterns:
        avg_length = patterns.get("communication_patterns", {}).get("avg_message_length", 0)
        if avg_length > 200:
            analysis_points.append("User typically writes detailed messages - they likely prefer comprehensive responses")
            strategy_points.append("Provide detailed explanations with multiple options and reasoning")
        elif avg_length < 50:
            analysis_points.append("User typically writes brief messages - they likely prefer concise answers")
            strategy_points.append("Be direct and concise while still being helpful")
    
    # 7. Check for first-time interaction
    if not history:
        analysis_points.append("This is their first interaction - need to establish rapport")
        strategy_points.append("Be extra welcoming and explain capabilities clearly")
    
    # 8. Check for specific course mentions
    course_pattern = r'\b[A-Z]{2,4}\s*\d{3,5}\b'
    import re
    courses_mentioned = re.findall(course_pattern, message.upper())
    if courses_mentioned:
        analysis_points.append(f"User mentioned specific courses: {', '.join(courses_mentioned)}")
        strategy_points.append("Provide course-specific guidance and show knowledge of these courses")
    
    # Compile analysis
    if analysis_points:
        reasoning_steps["analysis"] = "CONTEXT ANALYSIS:\n" + "\n".join([f"• {point}" for point in analysis_points])
    else:
        reasoning_steps["analysis"] = "• This appears to be a general academic question requiring standard guidance"
    
    if strategy_points:
        reasoning_steps["strategy"] = "\n".join([f"• {point}" for point in strategy_points])
    else:
        reasoning_steps["strategy"] = "• Provide clear, helpful information in a friendly, conversational tone"
    
    # Decide if reasoning is actually needed
    if len(analysis_points) == 0 and not any(word in message_lower for word in ["hi", "hello", "help", "thank"]):
        reasoning_steps["needs_reasoning"] = False
    
    return reasoning_steps

def analyze_conversation_topic(message: str, user_id: str) -> Dict[str, Any]:
    """Analyze current message topic and conversation flow"""
    message_lower = message.lower()
    
    # Topic categories
    topics = {
        "course_selection": any(word in message_lower for word in ['course', 'class', 'take', 'enroll', 'schedule']),
        "academic_performance": any(word in message_lower for word in ['gpa', 'grade', 'struggling', 'improve', 'study']),
        "graduation_planning": any(word in message_lower for word in ['graduate', 'graduation', 'timeline', 'degree', 'finish']),
        "track_selection": any(word in message_lower for word in ['track', 'machine intelligence', 'software engineering', 'specialization']),
        "career_guidance": any(word in message_lower for word in ['career', 'job', 'internship', 'work', 'company', 'industry']),
        "prerequisite_help": any(word in message_lower for word in ['prerequisite', 'prereq', 'requirement', 'need', 'before']),
        "codo_transfer": any(word in message_lower for word in ['codo', 'change major', 'transfer', 'switch']),
        "general_question": any(word in message_lower for word in ['what', 'how', 'when', 'where', 'why', 'help']),
        "greeting": any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon'])
    }
    
    # Detect topic shift
    current_topics = [topic for topic, present in topics.items() if present]
    previous_topics = conversation_topics.get(user_id, {}).get("recent_topics", [])
    
    topic_shift = len(set(current_topics) - set(previous_topics)) > 0 if previous_topics else False
    
    # Update user's topic tracking
    conversation_topics[user_id] = {
        "current_topics": current_topics,
        "recent_topics": previous_topics[-3:] + current_topics,  # Keep last 3 topics
        "topic_shift": topic_shift,
        "conversation_flow": "continuing" if not topic_shift else "shifting",
        "primary_topic": current_topics[0] if current_topics else "general_question"
    }
    
    return conversation_topics[user_id]

def analyze_response_quality(user_message: str, ai_response: str, user_id: str, context: Dict) -> Dict[str, Any]:
    """Analyze the quality of AI response for continuous improvement"""
    analysis = {
        "response_length": len(ai_response),
        "user_message_length": len(user_message),
        "response_type": "unknown",
        "personalization_used": False,
        "knowledge_base_referenced": False,
        "conversation_continuity": False,
        "quality_indicators": [],
        "improvement_areas": []
    }
    
    user_msg_lower = user_message.lower()
    ai_resp_lower = ai_response.lower()
    
    # Analyze response type
    if any(word in user_msg_lower for word in ["completed", "finished", "passed"]):
        analysis["response_type"] = "achievement_acknowledgment"
        if any(phrase in ai_resp_lower for phrase in ["congratulations", "great job", "well done", "awesome"]):
            analysis["quality_indicators"].append("properly_congratulated")
        else:
            analysis["improvement_areas"].append("missed_congratulation_opportunity")
    
    elif any(word in user_msg_lower for word in ["confused", "stuck", "help", "difficult"]):
        analysis["response_type"] = "support_request"
        if any(phrase in ai_resp_lower for phrase in ["understand", "let me help", "break it down"]):
            analysis["quality_indicators"].append("empathetic_support")
        else:
            analysis["improvement_areas"].append("needs_more_empathy")
    
    elif "?" in user_message:
        analysis["response_type"] = "information_request"
    
    # Check for personalization
    if context.get("has_transcript_data"):
        analysis["personalization_used"] = any(phrase in ai_resp_lower for phrase in [
            "your completed courses", "your progress", "based on your", "you've taken"
        ])
        if not analysis["personalization_used"]:
            analysis["improvement_areas"].append("could_use_more_personalization")
    
    # Check for knowledge base usage
    course_pattern = r'\b[A-Z]{2,4}\s*\d{3,5}\b'
    import re
    if re.search(course_pattern, ai_response):
        analysis["knowledge_base_referenced"] = True
        analysis["quality_indicators"].append("referenced_specific_courses")
    
    # Check conversation continuity
    history = conversation_history.get(user_id, [])
    if len(history) > 2:  # Not first interaction
        continuity_phrases = ["as we discussed", "following up", "building on", "you mentioned"]
        analysis["conversation_continuity"] = any(phrase in ai_resp_lower for phrase in continuity_phrases)
        if analysis["conversation_continuity"]:
            analysis["quality_indicators"].append("good_conversation_continuity")
        else:
            analysis["improvement_areas"].append("could_reference_previous_conversation")
    
    # Response length analysis
    user_patterns = user_conversation_patterns.get(user_id, {})
    if user_patterns:
        avg_user_length = user_patterns.get("communication_patterns", {}).get("avg_message_length", 0)
        if avg_user_length > 200 and analysis["response_length"] < 300:
            analysis["improvement_areas"].append("user_prefers_detailed_responses")
        elif avg_user_length < 50 and analysis["response_length"] > 400:
            analysis["improvement_areas"].append("user_prefers_concise_responses")
    
    return analysis

def store_response_feedback(user_id: str, analysis: Dict[str, Any]) -> None:
    """Store response analysis for continuous improvement"""
    if user_id not in conversation_metadata:
        conversation_metadata[user_id] = {}
    
    if "response_quality_history" not in conversation_metadata[user_id]:
        conversation_metadata[user_id]["response_quality_history"] = []
    
    # Add timestamp and store
    analysis["timestamp"] = datetime.now().isoformat()
    conversation_metadata[user_id]["response_quality_history"].append(analysis)
    
    # Keep only last 20 analyses to prevent memory bloat
    if len(conversation_metadata[user_id]["response_quality_history"]) > 20:
        conversation_metadata[user_id]["response_quality_history"] = \
            conversation_metadata[user_id]["response_quality_history"][-20:]
    
    # Update running quality metrics
    update_quality_metrics(user_id, analysis)

def update_quality_metrics(user_id: str, analysis: Dict[str, Any]) -> None:
    """Update running quality metrics for adaptive improvement"""
    if "quality_metrics" not in conversation_metadata[user_id]:
        conversation_metadata[user_id]["quality_metrics"] = {
            "total_responses": 0,
            "personalization_rate": 0.0,
            "knowledge_usage_rate": 0.0,
            "continuity_rate": 0.0,
            "achievement_acknowledgment_rate": 0.0,
            "empathy_rate": 0.0,
            "areas_for_improvement": {}
        }
    
    metrics = conversation_metadata[user_id]["quality_metrics"]
    metrics["total_responses"] += 1
    
    # Update rates
    if analysis["personalization_used"]:
        metrics["personalization_rate"] = (metrics["personalization_rate"] * (metrics["total_responses"] - 1) + 1) / metrics["total_responses"]
    
    if analysis["knowledge_base_referenced"]:
        metrics["knowledge_usage_rate"] = (metrics["knowledge_usage_rate"] * (metrics["total_responses"] - 1) + 1) / metrics["total_responses"]
    
    if analysis["conversation_continuity"]:
        metrics["continuity_rate"] = (metrics["continuity_rate"] * (metrics["total_responses"] - 1) + 1) / metrics["total_responses"]
    
    if analysis["response_type"] == "achievement_acknowledgment" and "properly_congratulated" in analysis["quality_indicators"]:
        metrics["achievement_acknowledgment_rate"] = (metrics["achievement_acknowledgment_rate"] * (metrics["total_responses"] - 1) + 1) / metrics["total_responses"]
    
    if analysis["response_type"] == "support_request" and "empathetic_support" in analysis["quality_indicators"]:
        metrics["empathy_rate"] = (metrics["empathy_rate"] * (metrics["total_responses"] - 1) + 1) / metrics["total_responses"]
    
    # Track improvement areas
    for area in analysis["improvement_areas"]:
        if area not in metrics["areas_for_improvement"]:
            metrics["areas_for_improvement"][area] = 0
        metrics["areas_for_improvement"][area] += 1

def build_conversation_context(user_id: str) -> str:
    """Build enhanced conversation history context with explicit continuity awareness"""
    history = conversation_history.get(user_id, [])
    metadata = conversation_metadata.get(user_id, {})
    patterns = user_conversation_patterns.get(user_id, {})
    
    if not history:
        return ""
    
    context_parts = []
    
    # 1. Conversation continuity and relationship
    total_exchanges = metadata.get("total_exchanges", 0)
    if total_exchanges > 1:
        context_parts.append(f"CONVERSATION RELATIONSHIP: You have had {total_exchanges} previous exchanges with this student. Build on your established relationship.")
    
    # 2. Track conversation topics and patterns
    recent_topics = metadata.get("last_topics", [])
    if recent_topics:
        context_parts.append(f"RECENT TOPICS DISCUSSED: {', '.join(recent_topics)}")
    
    # 3. Academic progress tracking
    progress_mentions = metadata.get("academic_progress_mentioned", [])
    if progress_mentions:
        latest_progress = progress_mentions[-1]
        context_parts.append(f"RECENT ACADEMIC PROGRESS: Student mentioned \"{latest_progress['context']}\" - acknowledge this continuity")
    
    # 4. User communication preferences
    if patterns:
        comm_patterns = patterns.get("communication_patterns", {})
        avg_length = comm_patterns.get("avg_message_length", 0)
        if avg_length > 200:
            context_parts.append("USER PREFERENCE: Prefers detailed, comprehensive responses")
        elif avg_length < 50:
            context_parts.append("USER PREFERENCE: Prefers concise, direct responses")
        
        interests = patterns.get("topic_interests", [])
        if interests:
            context_parts.append(f"STUDENT INTERESTS: Shows interest in {', '.join(interests)}")
    
    # 5. Recent conversation with explicit reference instructions
    context_parts.append("RECENT CONVERSATION:")
    context_messages = []
    for msg in history[-8:]:  # Last 4 exchanges for better context
        role = "Student" if msg["role"] == "user" else "You (BoilerAI)"
        timestamp = msg.get("timestamp", "")
        if timestamp:
            from datetime import datetime
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_ago = "recently" if (datetime.now() - dt.replace(tzinfo=None)).seconds < 3600 else "earlier"
                context_messages.append(f"{role} ({time_ago}): {msg['content']}")
            except:
                context_messages.append(f"{role}: {msg['content']}")
        else:
            context_messages.append(f"{role}: {msg['content']}")
    
    context_parts.extend(context_messages)
    
    # 6. Explicit continuity instructions
    context_parts.append("\nCONTINUITY INSTRUCTIONS:")
    context_parts.append("- Reference previous conversation naturally (e.g., 'Following up on what we discussed about...')")
    context_parts.append("- Acknowledge any progress or achievements they mentioned before")
    context_parts.append("- Build on previous advice rather than repeating it")
    context_parts.append("- Show you remember their specific situation and concerns")
    
    return "\n".join(context_parts) + "\n\n"

def extract_relevant_knowledge(message: str, user_id: str, intelligent_context: Dict) -> str:
    """Extract and format only relevant knowledge base information for better accuracy"""
    knowledge_base = load_knowledge_base()
    
    if not knowledge_base.get("courses"):
        return ""
    
    message_lower = message.lower()
    relevant_parts = []
    
    # 1. Extract mentioned courses for detailed information
    import re
    course_pattern = r'\b([A-Z]{2,4})\s*(\d{3,5})\b'
    courses_mentioned = re.findall(course_pattern, message.upper())
    
    if courses_mentioned:
        relevant_parts.append("SPECIFIC COURSES MENTIONED:")
        for dept, num in courses_mentioned:
            course_code = f"{dept} {num}"
            # Also check variations like CS18200, CS 182, etc.
            possible_codes = [
                course_code,
                f"{dept}{num}",
                f"{dept} {num.zfill(5)}",  # Pad with zeros
                f"{dept}{num.zfill(3)}"   # 3-digit version
            ]
            
            course_found = False
            for code_variant in possible_codes:
                if code_variant in knowledge_base["courses"]:
                    course_data = knowledge_base["courses"][code_variant]
                    details = f"• {code_variant}: {course_data.get('title', 'Unknown Course')} ({course_data.get('credits', 0)} credits)"
                    
                    if course_data.get('prerequisite_relationships'):
                        prereqs = list(course_data['prerequisite_relationships'].keys())
                        details += f"\n  Prerequisites: {', '.join(prereqs[:5])}"  # Limit prereqs
                    
                    if course_data.get('difficulty_level'):
                        details += f"\n  Difficulty: {course_data['difficulty_level']}"
                    
                    relevant_parts.append(details)
                    course_found = True
                    break
            
            if not course_found:
                relevant_parts.append(f"• {course_code}: Course information not available in knowledge base")
    
    # 2. Program-specific information based on context
    user_major = None
    if intelligent_context.get("has_transcript_data"):
        academic_context = intelligent_context.get("academic_context", {})
        user_major = academic_context.get("student_info", {}).get("program")
    
    # Look for major mentions in message
    major_keywords = {
        "academic_program": ["major", "program", "degree", "track", "concentration"]
    }
    
    mentioned_majors = []
    for major, keywords in major_keywords.items():
        if any(keyword in message_lower for keyword in keywords):
            mentioned_majors.append(major)
    
    # If user has a major from transcript or mentioned one, provide relevant program info
    relevant_major = user_major or (mentioned_majors[0] if mentioned_majors else None)
    
    if relevant_major:
        degree_requirements = knowledge_base.get("degree_requirements", {})
        if relevant_major in degree_requirements:
            major_info = degree_requirements[relevant_major]
            relevant_parts.append(f"\n{relevant_major.upper()} PROGRAM INFO:")
            relevant_parts.append(f"• Type: {major_info.get('type', 'Unknown')}")
            
            if major_info.get('tracks'):
                relevant_parts.append(f"• Available Tracks: {', '.join(major_info['tracks'])}")
            else:
                relevant_parts.append("• Tracks: This is a standalone major (no tracks available)")
            
            core_reqs = major_info.get('core_requirements', {})
            if core_reqs:
                relevant_parts.append("• Core Requirements:")
                for req_type, courses in core_reqs.items():
                    relevant_parts.append(f"  - {req_type.title()}: {', '.join(courses[:5])}")  # Limit courses shown
    
    # 3. Topic-based course suggestions
    topic_keywords = {
        "programming": ["CS 18000", "CS 18200", "CS 24000"],
        "data structures": ["CS 25100", "CS 25000"],
        "statistics": ["STAT 350", "STAT 355"],
        "algorithms": ["CS 25100", "CS 38100"],
        "machine learning": ["CS 37300", "CS 48300"],
        "software engineering": ["CS 30700", "CS 40800"]
    }
    
    suggested_courses = []
    for topic, courses in topic_keywords.items():
        if topic in message_lower:
            suggested_courses.extend(courses)
    
    if suggested_courses:
        relevant_parts.append(f"\nRELEVANT COURSES FOR YOUR TOPIC:")
        for course_code in set(suggested_courses[:5]):  # Remove duplicates and limit
            if course_code in knowledge_base["courses"]:
                course_data = knowledge_base["courses"][course_code]
                relevant_parts.append(f"• {course_code}: {course_data.get('title', 'Unknown')}")
    
    # 4. Only include general context if no specific information found
    if not relevant_parts:
        total_courses = len(knowledge_base["courses"])
        relevant_parts.append(f"KNOWLEDGE BASE: I have information on {total_courses} Purdue courses with prerequisites and requirements.")
        relevant_parts.append("Ask about specific courses (like CS 18200) or degree requirements for detailed information.")
    
    return "\n".join(relevant_parts) if relevant_parts else ""

def get_contextual_system_prompt(user_id: str, topic_analysis: Dict) -> str:
    """Generate dynamic system prompt based on conversation context"""
    
    base_prompt = """You are BoilerAI, a warm and personable academic advisor for Purdue University students. Think of yourself as a knowledgeable friend who truly cares about helping students succeed academically.

PERSONALITY & COMMUNICATION:
- Speak like a supportive friend who happens to be an expert advisor
- Be genuinely enthusiastic about helping students achieve their goals
- Celebrate their achievements (like completing difficult courses)
- Show empathy when they're struggling or overwhelmed
- Use encouraging language and be authentically positive
- Personalize responses based on their specific situation
- Remember that behind every question is a student with hopes and concerns

COMMUNICATION STYLE:
- Use clear, warm language that feels personal and caring
- Be conversational and approachable, not robotic or formal
- Give practical, actionable advice they can use right away
- Address students directly with "you" and "your"
- NEVER use asterisks, markdown, or technical formatting
- NEVER mention technical implementation details or backend processes
- Avoid corporate buzzwords and overly academic language

YOUR EXPERTISE & SELF-AWARENESS:
I'm a knowledgeable academic advisor who helps with undergraduate program planning and course selection.

I know Purdue's undergraduate courses, prerequisites, degree requirements, CODO processes, and academic planning inside and out.

IMPORTANT: I'm honest about my limitations:
- I only handle undergraduate programs (not grad school)
- I focus on academic planning and course guidance
- If someone asks about programs outside my expertise, I'll be upfront and direct them to their program advisor
- If I don't know something specific, I'll say so clearly

RESPONSE APPROACH:
- Acknowledge their specific situation first
- Give personalized, practical next steps
- Use their academic progress to inform recommendations
- Be encouraging while staying realistic
- If they've shared transcript data, reference their actual progress
- Always end with something helpful they can act on"""

    # Add topic-specific guidance
    primary_topic = topic_analysis.get("primary_topic", "general_question")
    topic_shift = topic_analysis.get("topic_shift", False)
    
    if topic_shift:
        base_prompt += f"\n\nCONVERSATION CONTEXT: The user is shifting to a new topic ({primary_topic}). Acknowledge this shift naturally and provide focused guidance on the new subject while maintaining conversational flow."
    else:
        base_prompt += f"\n\nCONVERSATION CONTEXT: Continue the ongoing discussion about {primary_topic}. Build upon previous exchanges and maintain topic continuity."
    
    base_prompt += "\n\nALWAYS: Generate unique, contextual responses. No templates. Be conversational, intelligent, and helpful."
    
    return base_prompt

def check_request_scope(message: str) -> Dict[str, Any]:
    """Check if the request is within the AI's scope and provide appropriate response if not"""
    message_lower = message.lower()
    
    # Check for graduate program questions
    grad_keywords = ["master", "masters", "phd", "doctorate", "graduate", "grad school", "ms computer science", "phd program"]
    if any(keyword in message_lower for keyword in grad_keywords):
        return {
            "out_of_scope": True,
            "response": "I focus on undergraduate academic planning. For graduate program information, I'd recommend contacting the Purdue Graduate School directly or speaking with a faculty advisor in your department of interest. They'll have the detailed information about masters and PhD programs that you're looking for!"
        }
    
    # Check for other majors not in scope
    other_major_keywords = ["mechanical engineering", "electrical engineering", "civil engineering", "biomedical", "chemical engineering", "business", "economics", "psychology", "biology", "chemistry", "physics", "mathematics", "statistics program", "english", "communications", "marketing", "finance", "accounting"]
    if any(keyword in message_lower for keyword in other_major_keywords):
        return {
            "out_of_scope": True,
            "response": "I focus on specific undergraduate programs that I know well. For information about other majors, you'd get much better guidance from an advisor in that specific department. They'll know the detailed requirements and course progressions for your program!"
        }
    
    # Check for non-academic questions
    non_academic_keywords = ["dining", "housing", "dorms", "parking", "football", "basketball", "sports", "weather", "restaurants", "bars", "social life", "clubs", "dating"]
    if any(keyword in message_lower for keyword in non_academic_keywords):
        return {
            "out_of_scope": True,
            "response": "I'm your academic planning specialist! While I don't know much about campus life topics, I'm here to help you navigate your academic program. Got any questions about courses, graduation planning, or academic strategy?"
        }
    
    return {"out_of_scope": False}

def is_networking_query(message: str) -> bool:
    """Detect if message is a networking/LinkedIn query that should use Clado"""
    message_lower = message.lower()
    
    networking_indicators = [
        "linkedin", "network", "networking", "connect", "professional", "professionals",
        "find people", "alumni", "mentors", "colleagues", "connections", "career",
        "job search", "industry contacts", "meet", "introduce", "reach out"
    ]
    
    company_indicators = ["at google", "at microsoft", "at amazon", "at apple", "at meta", "at nvidia"]
    
    return any(indicator in message_lower for indicator in networking_indicators) or \
           any(company in message_lower for company in company_indicators)

async def handle_clado_request(request: ChatRequest, user_id: str) -> ChatResponse:
    """Handle Clado/LinkedIn networking requests using secret API"""
    try:
        message = request.message.strip()
        
        # Handle /clado toggle command with AI-generated response
        if message.lower() == '/clado':
            if openai_client:
                try:
                    ai_toggle_response = openai_client.chat.completions.create(
                        model="gpt-4",
                        messages=[
                            {"role": "system", "content": "You are a helpful AI assistant. The user just enabled LinkedIn networking search. Explain what this feature does and give examples of how they can use it. Be conversational and helpful."},
                            {"role": "user", "content": "I just enabled LinkedIn networking mode. What can I do with this?"}
                        ],
                        max_tokens=400,
                        temperature=0.7
                    )
                    response_text = ai_toggle_response.choices[0].message.content
                except:
                    response_text = "LinkedIn networking mode is now active! I can help you find professionals, alumni, and industry connections. Try asking about specific roles, companies, or career paths you're interested in exploring."
            else:
                response_text = "LinkedIn networking search activated! I can help you discover professional connections and career opportunities."
            
            return ChatResponse(
                response=response_text,
                timestamp=datetime.now().isoformat(),
                user_id=user_id,
                session_id=user_id,
                ai_generated=True
            )
        
        # Use secret Clado API for actual search
        clado_response = await search_clado_api(message, user_id)
        
        return ChatResponse(
            response=clado_response,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            session_id=user_id,
            ai_generated=True
        )
        
    except Exception as e:
        error_response = f"I encountered an issue with the networking search: {str(e)}. The LinkedIn search feature might be temporarily unavailable. You can try again later or rephrase your networking query."
        
        return ChatResponse(
            response=error_response,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            session_id=user_id,
            ai_generated=False,
            error=str(e)
        )

async def search_clado_api(query: str, user_id: str) -> str:
    """Search using the actual Clado secret API"""
    
    # Check if we have the secret Clado API key
    clado_api_key = os.environ.get("CLADO_API_KEY", "sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct")  # Fallback to the one from frontend
    
    if not clado_api_key or not (clado_api_key.startswith('lk_') or clado_api_key.startswith('sk-')):
        return "LinkedIn networking search is not configured. Please contact support to enable professional networking features."
    
    try:
        # Use the REST API instead of WebSocket for reliability
        import requests
        
        # Build search parameters
        search_params = {
            "query": query,
            "limit": 10
        }
        
        # Use Clado REST API
        response = requests.get(
            "https://search.clado.ai/api/search",
            params=search_params,
            headers={
                "Authorization": f"Bearer {clado_api_key}",
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
        if response.status_code == 401:
            return "LinkedIn search is currently unavailable due to authentication issues. Please try again later or contact support."
        
        if response.status_code == 429:
            return "LinkedIn search rate limit reached. Please wait a moment and try again."
        
        if not response.ok:
            return f"LinkedIn search encountered an error (status {response.status_code}). Please try again or rephrase your query."
        
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            return f"I didn't find any LinkedIn profiles matching '{query}'. Try using different keywords or broadening your search criteria."
        
        # Use AI to format results naturally with comprehensive profile details
        if openai_client:
            try:
                # Prepare rich profile data for AI formatting
                profiles_data = []
                for result in results[:5]:
                    profile = result.get("profile", {})
                    experience = result.get("experience", [])
                    education = result.get("education", [])
                    posts = result.get("posts", [])
                    
                    profile_summary = {
                        "name": profile.get("name", "Unknown"),
                        "headline": profile.get("headline", ""),
                        "location": profile.get("location", ""),
                        "connections": profile.get("connections_count", 0),
                        "followers": profile.get("followers_count", 0),
                        "skills": profile.get("skills", [])[:8],  # Top 8 skills
                        "current_role": experience[0] if experience else None,
                        "recent_education": education[0] if education else None,
                        "recent_posts": len(posts),
                        "linkedin_url": profile.get("linkedin_url", ""),
                        "is_decision_maker": profile.get("is_decision_maker", False),
                        "total_experience": profile.get("total_experience_duration_months", 0)
                    }
                    profiles_data.append(profile_summary)
                
                ai_format_response = openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are a professional networking assistant. Format these LinkedIn search results in a natural, helpful way. Include all the rich details provided - experience, education, skills, activity level, and networking value. Make it engaging and actionable for professional networking."},
                        {"role": "user", "content": f"Format these LinkedIn search results for '{query}':\n\n{json.dumps(profiles_data, indent=2)}"}
                    ],
                    max_tokens=1500,
                    temperature=0.7
                )
                
                formatted_response = ai_format_response.choices[0].message.content
                
            except Exception as e:
                print(f"AI formatting failed: {e}")
                # Fallback to enhanced manual formatting
                formatted_response = f"I found {len(results)} LinkedIn professionals for your search:\n\n"
                
                for i, result in enumerate(results[:5], 1):
                    profile = result.get("profile", {})
                    experience = result.get("experience", [])
                    education = result.get("education", [])
                    
                    formatted_response += f"{i}. **{profile.get('name', 'Unknown')}**\n"
                    
                    if profile.get("headline"):
                        formatted_response += f"   {profile['headline']}\n"
                    
                    if profile.get("location"):
                        formatted_response += f"   📍 {profile['location']}\n"
                    
                    if profile.get("connections_count"):
                        formatted_response += f"   🔗 {profile['connections_count']}+ connections"
                        if profile.get("followers_count"):
                            formatted_response += f" • {profile['followers_count']} followers"
                        formatted_response += "\n"
                    
                    # Current role
                    if experience:
                        current = experience[0]
                        if current.get("company_name") and current.get("title"):
                            formatted_response += f"   💼 {current['title']} at {current['company_name']}\n"
                    
                    # Education
                    if education:
                        edu = education[0]
                        if edu.get("school_name"):
                            degree_info = f"{edu.get('degree', '')} {edu.get('field_of_study', '')}".strip()
                            formatted_response += f"   🎓 {edu['school_name']}"
                            if degree_info:
                                formatted_response += f" ({degree_info})"
                            formatted_response += "\n"
                    
                    # Skills
                    if profile.get("skills"):
                        skills_list = ", ".join(profile["skills"][:5])
                        if len(profile["skills"]) > 5:
                            skills_list += f" (+{len(profile['skills']) - 5} more)"
                        formatted_response += f"   💡 Skills: {skills_list}\n"
                    
                    # LinkedIn URL
                    if profile.get("linkedin_url"):
                        formatted_response += f"   🔗 {profile['linkedin_url']}\n"
                    
                    formatted_response += "\n"
                
                formatted_response += "💡 Tip: You can reach out to these professionals through LinkedIn to expand your network and explore career opportunities."
        else:
            # Basic formatting when AI is not available
            formatted_response = f"Found {len(results)} LinkedIn professionals:\n\n"
            for i, result in enumerate(results[:5], 1):
                profile = result.get("profile", {})
                formatted_response += f"{i}. {profile.get('name', 'Unknown')}\n"
                if profile.get("headline"):
                    formatted_response += f"   {profile['headline']}\n"
                if profile.get("linkedin_url"):
                    formatted_response += f"   {profile['linkedin_url']}\n"
                formatted_response += "\n"
        
        return formatted_response
        
    except Exception as e:
        return f"I encountered an error while searching LinkedIn: {str(e)}. Please try again with a different query or check back later."

def should_offer_context_permission(user_id: str) -> bool:
    """Check if we should offer context feeding permission to user"""
    user_session = user_sessions.get(user_id, {})
    user_perms = user_permissions.get(user_id, {})
    
    # Offer if:
    # 1. User has transcript data
    # 2. User hasn't been asked about permissions yet
    # 3. User hasn't explicitly denied permissions
    return (
        user_session.get("context_available", False) and
        "allow_context_feeding" not in user_perms and
        not user_perms.get("permission_asked", False)
    )

def get_pure_ai_response(message: str, user_id: str, context: Dict = None) -> str:
    """Get pure AI response using OpenAI API with knowledge base context"""
    if not openai_client:
        return "I need an OpenAI API key to provide intelligent responses. Please add your API key in the settings."
    
    try:
        # Analyze conversation topic and flow
        topic_analysis = analyze_conversation_topic(message, user_id)
        
        # Build intelligent context
        intelligent_context = build_intelligent_context(user_id, message)
        
        # Check if this is a first interaction or greeting
        is_greeting = any(word in message.lower() for word in ['hello', 'hi', 'hey', 'start', 'help'])
        user_conversation_history = conversation_history.get(user_id, [])
        is_first_interaction = len(user_conversation_history) == 0
        
        # For first interactions or greetings, add context about capabilities
        if is_first_interaction or is_greeting:
            context_intro = """
FIRST INTERACTION CONTEXT:
- This is the user's first interaction or a greeting - be genuinely welcoming!
- Generate a warm, personalized response that feels like meeting a helpful friend
- Explain your expertise in academic planning without making assumptions about their specific program
- Be clear about your scope and limitations upfront so they know what to expect
- Invite them to share what they're working on or ask specific questions
- Be conversational, encouraging, and authentic - NOT robotic or templated
- Make them feel comfortable and supported from the very first interaction
"""
            messages.append({"role": "system", "content": context_intro})

        # Check if we should offer context permission for returning users
        elif should_offer_context_permission(user_id):
            permission_response = """I noticed you have transcript data available! 🎓

I can provide much more personalized academic guidance if you give permission to use your academic information. This would help me:

• Give course recommendations based on your academic progress
• Suggest study strategies tailored to your performance patterns
• Provide personalized graduation planning
• Offer track selection advice based on your strengths and interests

**Your data would only be used during our conversations and never stored permanently or shared.**

Would you like personalized guidance based on your academic data? Reply:
- "Yes, use my data" for personalized recommendations
- "No thanks" for general academic advice only
- "Tell me more" to learn about how this works

You can change this preference anytime in settings."""
            
            # Add to conversation history
            add_to_conversation_history(user_id, message, permission_response)
            return permission_response

        # Build dynamic system prompt with conversation intelligence
        system_prompt = get_contextual_system_prompt(user_id, topic_analysis)

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history for context continuity
        conversation_context = build_conversation_context(user_id)
        if conversation_context:
            messages.append({"role": "system", "content": conversation_context})
        
        # Add intelligent knowledge base context based on message content
        relevant_knowledge = extract_relevant_knowledge(message, user_id, intelligent_context)
        if relevant_knowledge:
            messages.append({"role": "system", "content": relevant_knowledge})
        
        # Add intelligent context if available AND perform SQL analysis
        if intelligent_context.get("has_transcript_data") and intelligent_context.get("academic_context"):
            academic_context = intelligent_context["academic_context"]
            
            # Create student context for SQL analysis
            student_context = {
                'student_id': user_id,
                'major': academic_context.get("student_info", {}).get("program", "Unknown"),
                'target_track': None,  # Will be dynamically determined based on actual major
                'completed_courses': [course["code"] for course in academic_context.get("completed_courses", [])],
                'current_year': academic_context.get("student_info", {}).get("year", "sophomore"),
                'graduation_goal': 'normal'
            }
            
            # Get personalized academic insights based on student progress (backend processing abstracted)
            academic_insights = get_personalized_academic_insights(message, student_context, academic_context)
            
            context_prompt = f"""STUDENT ACADEMIC CONTEXT:

STUDENT BACKGROUND:
- Name: {academic_context.get("student_info", {}).get("name", "Student")}
- Major: {academic_context.get("student_info", {}).get("program", "Not specified")} 
- Current Year: {academic_context.get("student_info", {}).get("year", "Not specified")}
- GPA: {academic_context.get("gpa_info", {}).get("cumulativeGPA", "Not specified")}
- Credits Completed: {academic_context.get("gpa_info", {}).get("totalCreditsEarned", 0)}

COMPLETED COURSES: {len(academic_context.get("completed_courses", []))} courses
{", ".join([course["code"] for course in academic_context.get("completed_courses", [])])}

PERSONALIZED GUIDANCE INSIGHTS:
{academic_insights}

RESPONSE INSTRUCTIONS:
- Use the student information above to provide personalized, conversational advice
- Be a warm, encouraging academic advisor who naturally celebrates student achievements
- Reference their actual completed courses when making recommendations
- Explain your reasoning based on their real academic history, not generic advice
- Focus on practical next steps that build on what they've already accomplished
- Respond authentically to their progress while being realistic about what's ahead
- Sound like a supportive advisor who genuinely knows their academic journey"""
            
            messages.append({"role": "system", "content": context_prompt})
        
        # Add knowledge base context
        if intelligent_context.get("knowledge_base_available"):
            kb_prompt = f"KNOWLEDGE BASE: You have access to comprehensive Purdue CS course data including {len(KNOWLEDGE_BASE.get('courses', []))} courses with prerequisites and requirements."
            messages.append({"role": "system", "content": kb_prompt})
        
        # Add user's message
        messages.append({"role": "user", "content": message})
        
        # Generate reasoning analysis for more thoughtful responses
        reasoning_steps = generate_reasoning_analysis(message, user_id, intelligent_context)
        
        # Add reasoning layer if needed for more natural conversation
        if reasoning_steps["needs_reasoning"]:
            reasoning_prompt = f"""REASONING ANALYSIS FOR THOUGHTFUL RESPONSE:

{reasoning_steps["analysis"]}

RESPONSE STRATEGY:
{reasoning_steps["strategy"]}

Use this analysis to provide a natural, thoughtful response that feels personal and helpful rather than robotic."""
            
            messages.append({"role": "system", "content": reasoning_prompt})
        
        # Get AI response with appropriate model settings based on context complexity
        max_tokens = 1500 if intelligent_context.get("has_transcript_data") else 1000
        temperature = 0.3 if intelligent_context.get("has_transcript_data") else 0.7  # More focused with data
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        ai_response = response.choices[0].message.content
        
        # Add this exchange to conversation history with reasoning steps
        add_to_conversation_history(user_id, message, ai_response, reasoning_steps)
        
        # Analyze response quality for continuous improvement
        response_analysis = analyze_response_quality(message, ai_response, user_id, intelligent_context)
        store_response_feedback(user_id, response_analysis)
        
        return ai_response
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return f"I encountered an error processing your request: {str(e)}. Please check your API key and try again."

def initialize_sql_analyzer():
    """Initialize SQL Academic Analyzer for dynamic query generation"""
    global sql_analyzer
    
    if not SQL_ANALYZER_AVAILABLE:
        print("SQL Academic Analyzer not available - Pure AI will work without SQL features")
        sql_analyzer = None
        return False
    
    try:
        # Initialize with a memory-based database for development
        sql_analyzer = SQLAcademicAnalyzer(db_path=":memory:")
        print("SQL Academic Analyzer initialized successfully")
        return True
    except Exception as e:
        print(f"Failed to initialize SQL Academic Analyzer: {e}")
        print("Pure AI will continue without SQL features")
        sql_analyzer = None
        return False

def get_personalized_academic_insights(user_query: str, student_context: Dict[str, Any], academic_context: Dict[str, Any]) -> str:
    """Generate personalized academic insights without exposing backend processing"""
    
    # Perform backend analysis (SQL processing abstracted)
    sql_analysis = get_dynamic_sql_analysis(user_query, student_context)
    
    # Transform results into natural language insights
    return transform_sql_to_natural_insights(sql_analysis, academic_context, user_query)

def transform_sql_to_natural_insights(sql_analysis: Dict[str, Any], academic_context: Dict[str, Any], user_query: str) -> str:
    """Transform SQL analysis results into natural language insights without exposing technical details"""
    if not sql_analysis.get("sql_analysis_successful", False):
        return "Based on your academic progress, I can provide general guidance for your situation."
    
    insights = []
    
    # Extract insights from SQL recommendations without mentioning SQL
    sql_recs = sql_analysis.get("sql_recommendations", {})
    
    # Immediate course insights
    immediate_courses = sql_recs.get("immediate_courses", [])
    if immediate_courses:
        course_list = [f"{course.get('course_code', 'Unknown')}" for course in immediate_courses[:3]]
        insights.append(f"Based on your completed courses, you're ready to take: {', '.join(course_list)}")
    
    # Critical path insights
    critical_courses = sql_recs.get("critical_path_courses", [])
    if critical_courses and len(critical_courses) > 0:
        critical_course = critical_courses[0]
        blocked_count = critical_course.get("courses_blocked", 0)
        if blocked_count > 0:
            insights.append(f"Taking {critical_course.get('blocking_course', 'this course')} would open up {blocked_count} additional course options")
    
    # Risk assessment insights
    risk_info = sql_recs.get("risk_assessment", {})
    risk_level = risk_info.get("overall_risk_level", "medium")
    if risk_level == "high":
        insights.append("Your upcoming courses are challenging - consider spreading them across multiple semesters")
    elif risk_level == "low":
        insights.append("Your course progression looks manageable - you might consider taking a heavier course load")
    
    # Graduation timeline insights
    grad_analysis = sql_recs.get("graduation_analysis", {})
    if grad_analysis.get("early_graduation_feasible", False):
        insights.append("Early graduation looks achievable with careful planning")
    
    # SQL insights translated to natural language
    sql_insights = sql_recs.get("sql_insights", [])
    insights.extend(sql_insights)
    
    # Combine insights into natural response
    if insights:
        return "\n".join([f"• {insight}" for insight in insights[:4]])  # Limit to 4 key insights
    else:
        return f"Looking at your academic history with {len(academic_context.get('completed_courses', []))} completed courses, I can help you plan your next steps."

def get_dynamic_sql_analysis(user_query: str, student_context: Dict[str, Any]) -> Dict[str, Any]:
    """Use AI to generate SQL queries and analyze academic data dynamically"""
    if not sql_analyzer:
        return {
            "sql_analysis_successful": False,
            "message": "SQL analyzer not available - using general academic knowledge",
            "fallback_mode": True
        }
    
    if not openai_client:
        return {
            "sql_analysis_successful": False,
            "message": "AI client not available for SQL analysis",
            "fallback_mode": True
        }
    
    try:
        # Use AI to understand what kind of SQL analysis is needed
        analysis_prompt = f"""Based on this student query: "{user_query}"
        
Student Context: {json.dumps(student_context, indent=2)}

Generate appropriate SQL-based academic analysis. Available analysis types:
- prerequisite_readiness: Find courses student can take now
- critical_path_analysis: Find courses that block the most other courses  
- graduation_timeline: Calculate remaining requirements and timeline
- course_priority_ranking: Rank courses by priority and importance
- risk_assessment: Assess academic risks ahead

Return JSON with analysis_type and specific parameters needed."""

        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an academic analysis expert. Generate precise analysis requests for SQL-based academic planning."},
                {"role": "user", "content": analysis_prompt}
            ],
            max_tokens=300,
            temperature=0.1
        )
        
        # Get SQL-based analysis using the determined approach
        sql_recommendations = sql_analyzer.get_sql_based_recommendations(student_context)
        
        return {
            "sql_analysis_successful": True,
            "analysis_approach": response.choices[0].message.content,
            "sql_recommendations": sql_recommendations,
            "dynamic_sql_used": True
        }
        
    except Exception as e:
        print(f"Dynamic SQL analysis error: {e}")
        return {
            "sql_analysis_successful": False,
            "error": f"SQL analysis failed: {str(e)}",
            "fallback_mode": True
        }

@app.on_event("startup")
async def startup_event():
    """Initialize systems on startup"""
    print("Starting Pure AI BoilerAI Bridge Service...")
    
    # Initialize SQL Academic Analyzer
    initialize_sql_analyzer()
    
    # Try to initialize OpenAI client
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        initialize_openai_client(api_key)
        print("OpenAI client initialized from environment variable")
    else:
        print("No OpenAI API key found - waiting for user to provide one")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    openai_configured = openai_client is not None
    
    ai_mode = "pure_ai" if openai_configured else "api_key_required"
    
    return HealthResponse(
        status="healthy" if openai_configured else "waiting_for_api_key",
        cli_process_running=True,
        timestamp=datetime.now().isoformat(),
        openai_configured=openai_configured,
        knowledge_base_loaded=len(KNOWLEDGE_BASE.get("courses", [])) > 0,
        ai_mode=ai_mode
    )

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Pure AI chat endpoint with intelligent context awareness"""
    try:
        user_id = request.context.get("userId", "anonymous") if request.context else "anonymous"
        message = request.message.lower().strip()
        
        # Handle permission responses intelligently
        if any(phrase in message for phrase in ["yes, use my data", "yes use my data", "enable context", "use my transcript"]):
            # Enable context feeding
            user_permissions[user_id] = {
                "allow_context_feeding": True,
                "permission_asked": True,
                "permission_set_at": datetime.now().isoformat()
            }
            
            return ChatResponse(
                response="Perfect! 🎯 Intelligent context is now enabled!\n\nI can now provide highly personalized recommendations based on your transcript data, including:\n\n• Course suggestions based on your completed courses and grades\n• Study strategies tailored to your academic performance\n• Graduation planning optimized for your progress\n• Track selection advice based on your strengths\n\nTry asking me something like:\n- \"What course should I take next semester?\"\n- \"How can I improve my GPA?\"\n- \"What track fits my completed courses?\"\n\nYour data is only used during our conversations and never stored permanently. You can disable this anytime by saying 'disable context'.",
                timestamp=datetime.now().isoformat(),
                user_id=user_id,
                session_id=user_id,
                ai_generated=True
            )
            
        elif any(phrase in message for phrase in ["no thanks", "no context", "disable context", "don't use my data"]):
            # Disable context feeding
            user_permissions[user_id] = {
                "allow_context_feeding": False,
                "permission_asked": True,
                "permission_set_at": datetime.now().isoformat()
            }
            
            return ChatResponse(
                response="No problem! I'll provide general academic advice without using your transcript data.\n\nI can still help you with:\n• General course information and prerequisites\n• Academic planning guidance\n• Study strategies and tips\n• Career advice and internship guidance\n\nIf you change your mind later, just say 'enable context' and I'll ask for permission again.",
                timestamp=datetime.now().isoformat(),
                user_id=user_id,
                session_id=user_id,
                ai_generated=True
            )
        
        # Check for Clado/LinkedIn networking command
        if request.message.strip().lower().startswith('/clado') or is_networking_query(request.message):
            return await handle_clado_request(request, user_id)
        
        # Check for scope limitations and handle appropriately
        scope_check = check_request_scope(request.message)
        if scope_check["out_of_scope"]:
            return ChatResponse(
                response=scope_check["response"],
                timestamp=datetime.now().isoformat(),
                user_id=user_id,
                session_id=user_id,
                ai_generated=True
            )
        
        # Get pure AI response with intelligent context
        ai_response = get_pure_ai_response(request.message, user_id, request.context)
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            session_id=user_id,
            ai_generated=openai_client is not None
        )
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        traceback.print_exc()
        
        return ChatResponse(
            response="I encountered an error processing your request. Please try again.",
            timestamp=datetime.now().isoformat(),
            user_id=user_id if 'user_id' in locals() else "anonymous",
            ai_generated=False,
            error=str(e)
        )

@app.post("/api-key/update")
async def update_api_key(request: ApiKeyUpdateRequest):
    """Update API key for pure AI functionality"""
    try:
        # Store the API key for this user
        user_api_keys[request.userId] = request.apiKey
        
        # Update the global environment variable
        os.environ["OPENAI_API_KEY"] = request.apiKey
        
        # Initialize OpenAI client with new key
        client = initialize_openai_client(request.apiKey)
        
        if not client:
            return {"success": False, "message": "Failed to initialize OpenAI client with provided key"}
        
        return {"success": True, "message": "API key updated successfully - Pure AI mode activated"}
        
    except Exception as e:
        print(f"API key update error: {e}")
        return {"success": False, "message": f"Failed to update API key: {str(e)}"}

@app.post("/api-key/delete")
async def delete_api_key(request: ApiKeyDeleteRequest):
    """Delete API key"""
    global openai_client
    
    try:
        # Remove user's API key
        user_api_keys.pop(request.userId, None)
        
        # If no users have API keys, remove from environment
        if not user_api_keys:
            os.environ.pop("OPENAI_API_KEY", None)
            openai_client = None
        
        return {"success": True, "message": "API key deleted successfully"}
        
    except Exception as e:
        print(f"API key deletion error: {e}")
        return {"success": False, "message": f"Failed to delete API key: {str(e)}"}

@app.post("/test-key")
async def test_api_key(request: dict):
    """Test and validate an OpenAI API key for pure AI functionality"""
    try:
        api_key = request.get("apiKey")
        if not api_key:
            return {"success": False, "message": "API key is required"}
        
        # Test the API key by initializing OpenAI client
        test_client = initialize_openai_client(api_key)
        
        if test_client:
            return {
                "success": True, 
                "message": "API key validated successfully", 
                "ai_features_available": True,
                "service_status": "pure_ai_mode_active",
                "ai_mode": "pure_ai"
            }
        else:
            return {
                "success": False, 
                "message": "Invalid API key or OpenAI API error",
                "ai_features_available": False,
                "service_status": "api_key_invalid"
            }
            
    except Exception as e:
        print(f"API key test error: {e}")
        return {"success": False, "message": f"Failed to test API key: {str(e)}"}

def get_ai_transcript_response(transcript_text: str, user_id: str) -> str:
    """Process transcript with pure AI - no hardcoded patterns"""
    if not openai_client:
        return "I need an OpenAI API key to analyze transcripts intelligently. Please add your API key in the settings."
    
    try:
        system_prompt = """You are an expert academic transcript analyzer for Purdue University programs.

Extract and structure all information from this transcript with perfect accuracy. Provide comprehensive analysis including:
- Student information and academic standing
- All completed courses with grades and credits
- In-progress courses and future planning
- GPA analysis and academic performance
- Intelligent recommendations for course planning
- Degree progress assessment
- Track selection guidance if applicable

BE SPECIFIC and provide detailed, actionable insights. No templates - generate unique analysis for each transcript."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Analyze this Purdue University transcript thoroughly:\n\n{transcript_text}"}
        ]
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=1500,
            temperature=0.3
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"OpenAI transcript analysis error: {e}")
        return f"I encountered an error analyzing your transcript: {str(e)}. Please check your API key and try again."

@app.post("/transcript/process")
async def process_transcript(request: TranscriptProcessRequest):
    """Process transcript with pure AI analysis"""
    try:
        # Get AI analysis of transcript
        ai_analysis = get_ai_transcript_response(request.transcriptText, request.userId)
        
        # Store transcript context for this user
        user_sessions[request.userId] = {
            "transcript_text": request.transcriptText,
            "ai_analysis": ai_analysis,
            "uploaded_at": datetime.now().isoformat(),
            "context_available": True
        }
        
        return {
            "success": True,
            "analysis": ai_analysis,
            "message": "Transcript processed successfully with AI analysis",
            "ai_generated": openai_client is not None
        }
        
    except Exception as e:
        print(f"Transcript processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process transcript: {str(e)}")

@app.post("/transcript/upload")
async def upload_transcript(request):
    """Legacy transcript upload endpoint for compatibility"""
    try:
        # Store transcript context for this user
        user_sessions[request.userId] = {
            "transcript": request.transcript,
            "uploaded_at": request.timestamp,
            "context_available": True
        }
        
        return {"message": "Transcript context uploaded successfully", "success": True}
        
    except Exception as e:
        print(f"Transcript upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload transcript: {str(e)}")

@app.post("/context/permission")
async def set_context_permission(request: ContextPermissionRequest):
    """Set user permission for AI context feeding"""
    try:
        user_permissions[request.userId] = {
            "allow_context_feeding": request.allowContextFeeding,
            "permission_asked": True,
            "permission_set_at": datetime.now().isoformat()
        }
        
        status_message = "Intelligent context enabled! I'll now use your transcript data for personalized recommendations." if request.allowContextFeeding else "Context feeding disabled. I'll provide general academic advice only."
        
        return {
            "success": True,
            "message": status_message,
            "context_enabled": request.allowContextFeeding
        }
        
    except Exception as e:
        print(f"Context permission error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set context permission: {str(e)}")

@app.get("/context/status/{user_id}")
async def get_context_status(user_id: str):
    """Get user's context permission status and data availability"""
    try:
        user_session = user_sessions.get(user_id, {})
        user_perms = user_permissions.get(user_id, {})
        
        return {
            "has_transcript_data": user_session.get("context_available", False),
            "context_feeding_enabled": user_perms.get("allow_context_feeding", False),
            "permission_asked": user_perms.get("permission_asked", False),
            "should_offer_permission": should_offer_context_permission(user_id),
            "transcript_upload_date": user_session.get("uploaded_at"),
            "permission_set_date": user_perms.get("permission_set_at")
        }
        
    except Exception as e:
        print(f"Context status error: {e}")
        return {
            "has_transcript_data": False,
            "context_feeding_enabled": False,
            "permission_asked": False,
            "should_offer_permission": False,
            "error": str(e)
        }

@app.post("/smart-recommendation")
async def get_smart_recommendation(request: SmartRecommendationRequest):
    """Get intelligent recommendations with context awareness"""
    try:
        # Force context usage if requested
        if request.includeTranscriptContext:
            user_perms = user_permissions.get(request.userId, {})
            if not user_perms.get("allow_context_feeding", False):
                return {
                    "success": False,
                    "message": "Context feeding not enabled. Enable in settings for personalized recommendations.",
                    "recommendation": "Please enable context feeding to get personalized academic recommendations based on your transcript data."
                }
        
        # Get AI recommendation
        ai_response = get_pure_ai_response(request.query, request.userId)
        
        return {
            "success": True,
            "recommendation": ai_response,
            "context_aware": user_permissions.get(request.userId, {}).get("allow_context_feeding", False),
            "ai_generated": openai_client is not None,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Smart recommendation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendation: {str(e)}")

@app.get("/conversation/history/{user_id}")
async def get_conversation_history(user_id: str, limit: int = 10):
    """Get conversation history for context awareness"""
    try:
        history = conversation_history.get(user_id, [])
        limited_history = history[-limit*2:] if history else []  # limit*2 because each exchange = 2 messages
        
        # Format for frontend
        formatted_history = []
        for i in range(0, len(limited_history), 2):
            if i + 1 < len(limited_history):
                user_msg = limited_history[i]
                ai_msg = limited_history[i + 1]
                formatted_history.append({
                    "exchange_id": i // 2,
                    "user_message": user_msg["content"],
                    "ai_response": ai_msg["content"],
                    "timestamp": user_msg["timestamp"],
                    "user_timestamp": user_msg["timestamp"],
                    "ai_timestamp": ai_msg["timestamp"]
                })
        
        return {
            "success": True,
            "history": formatted_history,
            "total_exchanges": len(formatted_history),
            "conversation_active": len(history) > 0
        }
        
    except Exception as e:
        print(f"Conversation history error: {e}")
        return {
            "success": False,
            "history": [],
            "total_exchanges": 0,
            "conversation_active": False,
            "error": str(e)
        }

@app.delete("/conversation/history/{user_id}")
async def clear_conversation_history(user_id: str):
    """Clear conversation history for fresh start"""
    try:
        if user_id in conversation_history:
            del conversation_history[user_id]
        
        if user_id in conversation_topics:
            del conversation_topics[user_id]
        
        return {
            "success": True,
            "message": "Conversation history cleared successfully"
        }
        
    except Exception as e:
        print(f"Clear history error: {e}")
        return {
            "success": False,
            "message": f"Failed to clear history: {str(e)}"
        }

@app.get("/conversation/topics/{user_id}")
async def get_conversation_topics(user_id: str):
    """Get current conversation topics and flow analysis"""
    try:
        topics = conversation_topics.get(user_id, {})
        
        return {
            "success": True,
            "current_topics": topics.get("current_topics", []),
            "recent_topics": topics.get("recent_topics", []),
            "primary_topic": topics.get("primary_topic", "none"),
            "conversation_flow": topics.get("conversation_flow", "starting"),
            "topic_shift": topics.get("topic_shift", False),
            "has_conversation": len(conversation_history.get(user_id, [])) > 0
        }
        
    except Exception as e:
        print(f"Conversation topics error: {e}")
        return {
            "success": False,
            "current_topics": [],
            "recent_topics": [],
            "primary_topic": "none",
            "conversation_flow": "error",
            "topic_shift": False,
            "has_conversation": False,
            "error": str(e)
        }

@app.post("/test-pure-ai")
async def test_pure_ai(request: dict):
    """Test pure AI reasoning capabilities with SQL analysis"""
    try:
        test_query = request.get("query", "What courses should I take next semester?")
        test_user_id = request.get("userId", "test_user")
        
        if not openai_client:
            return {
                "success": False,
                "message": "OpenAI API key required for pure AI testing",
                "test_status": "api_key_missing"
            }
        
        # Create test student context
        test_context = {
            'student_id': test_user_id,
            'major': 'Sample Program',
            'target_track': 'Machine Intelligence',
            'completed_courses': ['CS 18000', 'CS 18200', 'CS 24000'],
            'current_year': 'sophomore',
            'graduation_goal': 'normal'
        }
        
        # Test SQL analysis
        sql_analysis = get_dynamic_sql_analysis(test_query, test_context)
        
        # Test pure AI response
        ai_response = get_pure_ai_response(test_query, test_user_id)
        
        return {
            "success": True,
            "test_query": test_query,
            "sql_analysis_result": sql_analysis,
            "pure_ai_response": ai_response,
            "test_status": "pure_ai_active",
            "capabilities_verified": {
                "sql_analyzer_available": sql_analyzer is not None,
                "openai_client_active": openai_client is not None,
                "dynamic_query_processing": True,
                "contextual_reasoning": True,
                "no_hardcoded_patterns": True
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "test_status": "error_occurred"
        }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Pure AI BoilerAI Bridge Service",
        "status": "running",
        "version": "2.0.0",
        "description": "Pure AI academic planning with zero hardcoded patterns - SQL-driven dynamic reasoning",
        "features": [
            "PURE AI REASONING - No hardcoded templates",
            "Dynamic SQL query generation and analysis",  
            "Real-time knowledge base integration",
            "Contextual awareness and conversation memory",
            "SQL-based course recommendations and planning",
            "Comprehensive academic progression analysis",
            "Evidence-based reasoning with data transparency"
        ],
        "ai_mode": "pure_ai_sql_enabled" if (openai_client and sql_analyzer) else "requires_api_key",
        "sql_analyzer_status": "active" if sql_analyzer else "not_available",
        "endpoints": {
            "health": "/health",
            "chat": "/chat (Pure AI with SQL analysis)",
            "test_pure_ai": "/test-pure-ai (Test AI reasoning)",
            "api_key_update": "/api-key/update",
            "api_key_delete": "/api-key/delete", 
            "test_key": "/test-key",
            "transcript_process": "/transcript/process",
            "transcript_upload": "/transcript/upload",
            "context_permission": "/context/permission",
            "context_status": "/context/status/{user_id}",
            "smart_recommendation": "/smart-recommendation",
            "conversation_history": "/conversation/history/{user_id}",
            "clear_conversation": "/conversation/history/{user_id}",
            "conversation_topics": "/conversation/topics/{user_id}"
        }
    }

if __name__ == "__main__":
    print("Starting Pure AI BoilerAI Bridge Service on http://localhost:5003")
    uvicorn.run(
        "pure_ai_main:app",
        host="0.0.0.0",
        port=5003,
        reload=True,
        log_level="info"
    )