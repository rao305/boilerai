#!/usr/bin/env python3
"""
FastAPI Bridge Service for Enhanced AI Academic Planning
Connects the React web app to the integrated AI reasoning system
"""

import os
import sys
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import our new enhanced AI system
try:
    from integrated_knowledge_manager import get_integrated_knowledge_manager, KnowledgeContext
    from enhanced_ai_reasoning import get_enhanced_ai_reasoning
    print("Enhanced AI system imported successfully")
    AI_SYSTEM_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import enhanced AI system: {e}")
    AI_SYSTEM_AVAILABLE = False

app = FastAPI(title="BoilerAI Bridge Service", version="1.0.0")

# CORS middleware for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
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
    fallback_response: Optional[str] = None
    error: Optional[str] = None

class TranscriptUploadRequest(BaseModel):
    userId: str
    transcript: Dict[str, Any]
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    cli_process_running: bool
    timestamp: str
    openai_configured: bool
    knowledge_base_loaded: bool

class ApiKeyUpdateRequest(BaseModel):
    userId: str
    apiKey: str

class ApiKeyDeleteRequest(BaseModel):
    userId: str

class PersonalizedPlanRequest(BaseModel):
    userId: str
    student_profile: Dict[str, Any]
    preferences: Optional[Dict[str, Any]] = None

class StudentProfileResponse(BaseModel):
    profile: Optional[Dict[str, Any]]
    has_profile: bool
    extracted_data: Optional[Dict[str, Any]] = None

class RecommendationsRequest(BaseModel):
    userId: str
    context: Dict[str, Any]

# Global instances
knowledge_manager = None
ai_reasoning = None
user_sessions = {}
user_api_keys = {}  # Store user-specific API keys

def initialize_ai_systems():
    """Initialize the enhanced AI systems with error handling"""
    global knowledge_manager, ai_reasoning
    
    try:
        if not AI_SYSTEM_AVAILABLE:
            print("Enhanced AI system not available - running in fallback mode")
            return False
        
        # Initialize integrated knowledge manager
        knowledge_manager = get_integrated_knowledge_manager()
        print("Integrated Knowledge Manager initialized successfully")
        
        # Initialize enhanced AI reasoning
        ai_reasoning = get_enhanced_ai_reasoning()
        print("Enhanced AI Reasoning initialized successfully")
        
        # Print knowledge base statistics
        stats = knowledge_manager.get_knowledge_stats()
        print(f"Knowledge Base: {stats['total_courses']} courses, {stats['courses_with_prerequisites']} with prerequisites")
        
        return True
        
    except Exception as e:
        print(f"Failed to initialize enhanced AI systems: {e}")
        traceback.print_exc()
        return False

def get_fallback_response(message: str) -> str:
    """Provide fallback responses when AI is unavailable"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['hello', 'hi', 'hey']):
        return "Hello! I'm BoilerAI, your academic advisor for Purdue undergraduate programs. I specialize in Computer Science, Data Science, and Artificial Intelligence majors. I'm currently running in limited mode - please configure the OpenAI API key for full AI functionality."
    
    elif any(word in message_lower for word in ['course', 'class']):
        return "I help with course planning for Computer Science, Data Science, and AI undergraduate programs! I need the full AI system to provide detailed course recommendations. Please check the system configuration."
    
    elif any(word in message_lower for word in ['graduation', 'graduate', 'degree']):
        return "I assist with undergraduate graduation planning for CS, Data Science, and AI majors! For detailed graduation scenarios and timeline analysis, please ensure the full AI system is running."
    
    elif any(word in message_lower for word in ['codo', 'change major']):
        return "I help with CODO (Change of Degree Objective) requirements for undergraduate programs! For comprehensive CODO guidance between CS, Data Science, and AI majors, please ensure the AI system is fully configured."
    
    elif any(word in message_lower for word in ['master', 'masters', 'phd', 'graduate school']):
        return "I only handle undergraduate academic planning for Computer Science, Data Science, and Artificial Intelligence majors. For graduate program information, please contact the respective department advisors directly."
    
    else:
        return "I'm here to help with undergraduate academic planning for Computer Science, Data Science, and Artificial Intelligence majors at Purdue! I'm currently running in limited mode. For full AI functionality including personalized course recommendations and graduation planning, please ensure the system is properly configured."

@app.on_event("startup")
async def startup_event():
    """Initialize systems on startup"""
    print("Starting BoilerAI Bridge Service...")
    success = initialize_ai_systems()
    if success:
        print("All systems initialized successfully")
    else:
        print("Running in fallback mode")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    openai_configured = bool(os.environ.get("OPENAI_API_KEY"))
    ai_system_running = knowledge_manager is not None and ai_reasoning is not None
    
    return HealthResponse(
        status="healthy" if ai_system_running else "limited",
        cli_process_running=ai_system_running,  # Keeping same field name for compatibility
        timestamp=datetime.now().isoformat(),
        openai_configured=openai_configured,
        knowledge_base_loaded=ai_system_running
    )

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint with enhanced AI processing"""
    try:
        user_id = request.context.get("userId", "anonymous") if request.context else "anonymous"
        
        # Check if user has their own API key
        user_api_key = user_api_keys.get(user_id)
        if user_api_key:
            # Temporarily set the user's API key for this request
            temp_old_key = os.environ.get("OPENAI_API_KEY")
            os.environ["OPENAI_API_KEY"] = user_api_key
            
            # Ensure AI systems are initialized with user's key
            if not (ai_reasoning and knowledge_manager):
                initialize_ai_systems()
        
        # Use enhanced AI reasoning system if available
        if ai_reasoning and knowledge_manager:
            try:
                # Process query with enhanced AI reasoning
                smart_response = ai_reasoning.process_intelligent_query(
                    query=request.message,
                    user_id=user_id,
                    context=request.context
                )
                
                # Restore original API key if we switched
                if user_api_key and temp_old_key:
                    os.environ["OPENAI_API_KEY"] = temp_old_key
                elif user_api_key and not temp_old_key:
                    # Keep user's key active as there was no global key
                    pass
                
                return ChatResponse(
                    response=smart_response.response_text,
                    timestamp=datetime.now().isoformat(),
                    user_id=user_id,
                    session_id=user_id
                )
                
            except Exception as e:
                print(f"Enhanced AI reasoning failed: {e}")
                # Restore original API key on error
                if user_api_key and temp_old_key:
                    os.environ["OPENAI_API_KEY"] = temp_old_key
                # Fall through to fallback
        
        # Try direct knowledge manager query as fallback
        if knowledge_manager:
            try:
                # Create knowledge context
                knowledge_context = KnowledgeContext(
                    query_type="general_query",
                    user_profile=request.context.get('user_profile') if request.context else None,
                    student_transcript=request.context.get('transcript_data') if request.context else None
                )
                
                smart_response = knowledge_manager.smart_query(request.message, knowledge_context)
                
                return ChatResponse(
                    response=smart_response.response_text,
                    timestamp=datetime.now().isoformat(),
                    user_id=user_id,
                    session_id=user_id
                )
                
            except Exception as e:
                print(f"Knowledge manager query failed: {e}")
        
        # Ultimate fallback
        fallback_response = get_fallback_response(request.message)
        return ChatResponse(
            response=fallback_response,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            fallback_response=fallback_response
        )
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        traceback.print_exc()
        
        return ChatResponse(
            response="I encountered an error processing your request. Please try again.",
            timestamp=datetime.now().isoformat(),
            user_id=user_id if 'user_id' in locals() else "anonymous",
            error=str(e)
        )

@app.post("/transcript/upload")
async def upload_transcript(request: TranscriptUploadRequest):
    """Upload transcript context for personalized responses"""
    try:
        # Store transcript context for this user
        user_sessions[request.userId] = {
            "transcript": request.transcript,
            "uploaded_at": request.timestamp,
            "context_available": True
        }
        
        # If conversation manager is available, update context
        if conversation_manager:
            try:
                # Create context string from transcript data
                context_info = f"""
Student Information:
- Name: {request.transcript.get('studentInfo', {}).get('name', 'N/A')}
- Program: {request.transcript.get('studentInfo', {}).get('program', 'N/A')}
- GPA: {request.transcript.get('studentInfo', {}).get('gpa', 'N/A')}
- Credits Completed: {request.transcript.get('studentInfo', {}).get('totalCredits', 'N/A')}

Completed Courses: {len(request.transcript.get('courses', []))} courses
"""
                # Update user context in conversation manager
                conversation_manager.update_user_context(request.userId, context_info)
                
            except Exception as e:
                print(f"Failed to update conversation context: {e}")
        
        return {"message": "Transcript context uploaded successfully", "success": True}
        
    except Exception as e:
        print(f"Transcript upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload transcript: {str(e)}")

@app.get("/users/{user_id}/context")
async def get_user_context(user_id: str):
    """Get user context information"""
    try:
        user_session = user_sessions.get(user_id, {})
        
        return {
            "has_context": user_session.get("context_available", False),
            "context_keys": list(user_session.get("transcript", {}).keys()) if user_session.get("transcript") else [],
            "uploaded_at": user_session.get("uploaded_at")
        }
        
    except Exception as e:
        print(f"Get context error: {e}")
        return {"has_context": False, "error": str(e)}

@app.post("/api-key/update")
async def update_api_key(request: ApiKeyUpdateRequest):
    """Update API key for a user"""
    try:
        # Store the API key for this user
        user_api_keys[request.userId] = request.apiKey
        
        # Update the global environment variable temporarily for initialization
        old_key = os.environ.get("OPENAI_API_KEY")
        os.environ["OPENAI_API_KEY"] = request.apiKey
        
        # Reinitialize AI systems with new key
        success = initialize_ai_systems()
        
        if not success:
            # Restore old key if initialization failed
            if old_key:
                os.environ["OPENAI_API_KEY"] = old_key
            else:
                os.environ.pop("OPENAI_API_KEY", None)
            return {"success": False, "message": "Failed to initialize AI with provided key"}
        
        return {"success": True, "message": "API key updated successfully"}
        
    except Exception as e:
        print(f"API key update error: {e}")
        return {"success": False, "message": f"Failed to update API key: {str(e)}"}

@app.post("/api-key/delete")
async def delete_api_key(request: ApiKeyDeleteRequest):
    """Delete API key for a user"""
    try:
        # Remove user's API key
        user_api_keys.pop(request.userId, None)
        
        # If no users have API keys, remove from environment
        if not user_api_keys:
            os.environ.pop("OPENAI_API_KEY", None)
        
        return {"success": True, "message": "API key deleted successfully"}
        
    except Exception as e:
        print(f"API key deletion error: {e}")
        return {"success": False, "message": f"Failed to delete API key: {str(e)}"}

@app.post("/test-key")
async def test_api_key(request: dict):
    """Test and validate an OpenAI API key"""
    try:
        api_key = request.get("apiKey")
        if not api_key:
            return {"success": False, "message": "API key is required"}
        
        # Test the API key by making a request to OpenAI
        import requests
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        
        # Use the models endpoint as it's lightweight and reliable
        response = requests.get('https://api.openai.com/v1/models', headers=headers, timeout=10)
        
        if response.status_code == 200:
            # API key is valid, temporarily store it for this validation
            temp_old_key = os.environ.get("OPENAI_API_KEY")
            os.environ["OPENAI_API_KEY"] = api_key
            
            # Try to initialize AI systems with this key
            success = initialize_ai_systems()
            
            if success:
                # If initialization was successful, keep the key active
                return {
                    "success": True, 
                    "message": "API key validated successfully", 
                    "ai_features_available": True,
                    "service_status": "fully_operational"
                }
            else:
                # Restore old key if initialization failed
                if temp_old_key:
                    os.environ["OPENAI_API_KEY"] = temp_old_key
                else:
                    os.environ.pop("OPENAI_API_KEY", None)
                
                return {
                    "success": False, 
                    "message": "API key is valid but AI service initialization failed",
                    "ai_features_available": False,
                    "service_status": "limited_functionality"
                }
        
        elif response.status_code == 401:
            return {"success": False, "message": "Invalid API key"}
        elif response.status_code == 429:
            return {"success": False, "message": "Rate limit exceeded - API key may be valid but currently throttled"}
        else:
            return {"success": False, "message": f"OpenAI API error: {response.status_code}"}
            
    except requests.exceptions.Timeout:
        return {"success": False, "message": "Connection timeout - please check your internet connection"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "message": "Connection error - unable to reach OpenAI API"}
    except Exception as e:
        print(f"API key test error: {e}")
        return {"success": False, "message": f"Failed to test API key: {str(e)}"}

@app.post("/generate-plan")
async def generate_personalized_plan(request: PersonalizedPlanRequest):
    """Generate a personalized graduation plan"""
    try:
        if not personalized_planner:
            return {
                "success": False,
                "error": "PersonalizedGraduationPlanner not available",
                "fallback_message": "The personalized planning service is not currently available. Please ensure the CLI system is properly configured."
            }
        
        # Extract transcript data from user session if available
        user_session = user_sessions.get(request.userId, {})
        transcript_data = user_session.get("transcript", {})
        
        # Build comprehensive student profile
        student_profile = request.student_profile.copy()
        
        # Add transcript data to profile if available
        if transcript_data:
            student_info = transcript_data.get("studentInfo", {})
            courses = transcript_data.get("courses", [])
            
            student_profile.update({
                "name": student_info.get("name", ""),
                "gpa": student_info.get("gpa", 0.0),
                "major": student_info.get("program", "Computer Science"),
                "completed_courses": [course.get("courseCode", "") for course in courses if course.get("grade") and course.get("grade") not in ["F", "W"]],
                "total_credits": student_info.get("totalCredits", 0)
            })
        
        # Generate the plan
        plan = personalized_planner.create_personalized_plan(
            student_profile, 
            request.preferences
        )
        
        return {
            "success": True,
            "plan": {
                "major": plan.major,
                "track": plan.track,
                "total_semesters": plan.total_semesters,
                "graduation_date": plan.graduation_date,
                "schedules": [
                    {
                        "semester": schedule.semester,
                        "year": schedule.year,
                        "courses": schedule.courses,
                        "total_credits": schedule.total_credits,
                        "cs_credits": schedule.cs_credits,
                        "warnings": schedule.warnings,
                        "recommendations": schedule.recommendations
                    } for schedule in plan.schedules
                ],
                "completed_courses": plan.completed_courses,
                "remaining_requirements": plan.remaining_requirements,
                "warnings": plan.warnings,
                "recommendations": plan.recommendations,
                "success_probability": plan.success_probability,
                "customization_notes": plan.customization_notes
            },
            "personalization_applied": True,
            "data_sources": ["transcript", "user_preferences", "academic_history"]
        }
        
    except Exception as e:
        print(f"Personalized plan generation error: {e}")
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "fallback_message": "I encountered an error generating your personalized plan. Please try again or contact support."
        }

@app.get("/profile/{user_id}")
async def get_student_profile(user_id: str):
    """Get extracted student profile from conversation manager"""
    try:
        # Get basic session data
        user_session = user_sessions.get(user_id, {})
        has_transcript = "transcript" in user_session
        
        # Try to get profile from conversation manager
        extracted_profile = None
        if conversation_manager:
            try:
                # Get conversation context which includes extracted student profile
                context = conversation_manager.get_conversation_context(user_id)
                if context and hasattr(context, 'student_profile'):
                    profile = context.student_profile
                    if profile:
                        extracted_profile = {
                            "student_id": profile.student_id,
                            "name": profile.name,
                            "current_year": profile.current_year,
                            "target_track": profile.target_track,
                            "completed_courses": profile.completed_courses,
                            "gpa": profile.gpa,
                            "graduation_goals": profile.graduation_goals
                        }
            except Exception as e:
                print(f"Failed to extract profile from conversation: {e}")
        
        # Build response
        response_data = {
            "has_profile": extracted_profile is not None or has_transcript,
            "profile": extracted_profile,
        }
        
        # Add transcript-derived data if available
        if has_transcript:
            transcript = user_session["transcript"]
            student_info = transcript.get("studentInfo", {})
            courses = transcript.get("courses", [])
            
            response_data["extracted_data"] = {
                "academic_performance": {
                    "gpa": student_info.get("gpa", 0.0),
                    "total_credits": student_info.get("totalCredits", 0),
                    "completed_courses": len(courses),
                    "program": student_info.get("program", "Unknown")
                },
                "course_performance": {
                    "high_grades": len([c for c in courses if c.get("gradePoints", 0) >= 3.5]),
                    "struggling_areas": len([c for c in courses if c.get("gradePoints", 0) < 2.0]),
                    "recent_semester_gpa": student_info.get("gpa", 0.0)  # Simplified
                },
                "learning_patterns": {
                    "course_load_preference": "standard",  # Could be calculated from transcript
                    "summer_courses_taken": len([c for c in courses if "Summer" in c.get("term", "")]),
                    "track_indicators": _analyze_track_indicators(courses)
                }
            }
        
        return StudentProfileResponse(**response_data)
        
    except Exception as e:
        print(f"Get student profile error: {e}")
        return StudentProfileResponse(
            has_profile=False,
            profile=None,
            extracted_data={"error": str(e)}
        )

def _analyze_track_indicators(courses):
    """Use AI to analyze courses and suggest track preferences"""
    if not conversation_manager:
        return "undecided"
    
    try:
        courses_text = ", ".join([c.get("courseCode", "") for c in courses])
        query = f"Based on these completed courses: {courses_text}, what CS track (Machine Intelligence, Software Engineering, or Undecided) would you recommend and why?"
        
        ai_response = conversation_manager.process_query("track_analysis", query)
        
        # Extract track preference from AI response
        response_lower = ai_response.lower()
        if "machine intelligence" in response_lower or "ai" in response_lower or "ml" in response_lower:
            return "machine_intelligence_leaning"
        elif "software engineering" in response_lower or "se" in response_lower:
            return "software_engineering_leaning"
        else:
            return "undecided"
    except Exception as e:
        print(f"AI track analysis failed: {e}")
        return "undecided"

@app.post("/recommendations")
async def get_personalized_recommendations(request: RecommendationsRequest):
    """Get personalized course recommendations using enhanced AI processing"""
    try:
        user_session = user_sessions.get(request.userId, {})
        transcript_data = user_session.get("transcript", {})
        
        # Check if user has their own API key
        user_api_key = user_api_keys.get(request.userId)
        if user_api_key:
            # Temporarily set the user's API key for this request
            temp_old_key = os.environ.get("OPENAI_API_KEY")
            os.environ["OPENAI_API_KEY"] = user_api_key
            
            # Ensure AI systems are initialized with user's key
            if not (ai_reasoning and knowledge_manager):
                initialize_ai_systems()
        
        # Use enhanced AI reasoning for recommendations
        if ai_reasoning:
            try:
                # Create a recommendation query
                if transcript_data:
                    student_info = transcript_data.get("studentInfo", {})
                    courses = transcript_data.get("courses", [])
                    
                    recommendation_query = f"""Based on my academic history, what courses should I take next semester? 
                    I'm a {student_info.get('program', 'Computer Science')} student with a {student_info.get('gpa', 'unknown')} GPA. 
                    I've completed {len(courses)} courses. Please provide specific course recommendations and explain your reasoning."""
                else:
                    recommendation_query = "I'm a computer science student looking for course recommendations. What should I consider when choosing my next courses?"
                
                # Get enhanced AI recommendations
                smart_response = ai_reasoning.process_intelligent_query(
                    query=recommendation_query,
                    user_id=request.userId,
                    context={"transcript_data": transcript_data} if transcript_data else None
                )
                
                # Restore original API key if we switched
                if user_api_key and temp_old_key:
                    os.environ["OPENAI_API_KEY"] = temp_old_key
                
                return {
                    "success": True,
                    "ai_recommendations": smart_response.response_text,
                    "reasoning_chain": smart_response.reasoning_chain,
                    "confidence_score": smart_response.confidence_score,
                    "follow_up_suggestions": smart_response.follow_up_suggestions,
                    "related_courses": smart_response.related_courses or [],
                    "personalization_applied": True,
                    "ai_generated": True,
                    "knowledge_sources": smart_response.knowledge_sources
                }
                
            except Exception as e:
                print(f"Enhanced AI recommendations failed: {e}")
                # Restore original API key on error
                if user_api_key and temp_old_key:
                    os.environ["OPENAI_API_KEY"] = temp_old_key
                # Fall through to knowledge manager fallback
        
        # Fallback to direct knowledge manager query
        if knowledge_manager:
            try:
                knowledge_context = KnowledgeContext(
                    query_type="course_recommendation",
                    student_transcript=transcript_data
                )
                
                smart_response = knowledge_manager.smart_query(
                    "What courses should I take next based on my academic progress?",
                    knowledge_context
                )
                
                return {
                    "success": True,
                    "ai_recommendations": smart_response.response_text,
                    "reasoning_chain": smart_response.reasoning_chain,
                    "confidence_score": smart_response.confidence_score,
                    "follow_up_suggestions": smart_response.follow_up_suggestions,
                    "personalization_applied": bool(transcript_data),
                    "ai_generated": False,
                    "knowledge_sources": smart_response.knowledge_sources
                }
                
            except Exception as e:
                print(f"Knowledge manager recommendations failed: {e}")
        
        # Ultimate fallback
        if not transcript_data:
            return {
                "success": False,
                "message": "No transcript data available and AI services unavailable",
                "general_recommendations": [
                    "Upload your transcript for personalized course recommendations",
                    "Consider taking CS 18000 if you're a beginner",
                    "Focus on foundation courses like CS 18200 and CS 24000",
                    "Balance difficult CS courses with easier general education requirements"
                ]
            }
        else:
            # Basic analysis without AI
            student_info = transcript_data.get("studentInfo", {})
            courses = transcript_data.get("courses", [])
            cs_courses = [c for c in courses if c.get('courseCode', '').startswith('CS')]
            
            return {
                "success": True,
                "ai_recommendations": f"""Based on your academic record:
                
**Your Progress:**
- GPA: {student_info.get('gpa', 'Not specified')}
- Total Courses: {len(courses)}
- CS Courses Completed: {len(cs_courses)}
                
**General Recommendations:**
- Continue building your CS foundation with core courses
- Balance challenging CS courses with supporting coursework
- Consider your track selection (Machine Intelligence vs Software Engineering)
- Plan for prerequisites when selecting advanced courses
                
For specific course recommendations, please ensure the AI system is properly configured.""",
                "personalization_applied": True,
                "ai_generated": False,
                "message": "Basic analysis provided - AI system needed for detailed recommendations"
            }
        
    except Exception as e:
        print(f"Recommendations error: {e}")
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to generate recommendations"
        }

@app.get("/knowledge-stats")
async def get_knowledge_stats():
    """Get comprehensive statistics about the integrated knowledge bases"""
    try:
        if not knowledge_manager:
            return {
                "error": "Knowledge manager not available",
                "status": "unavailable"
            }
        
        stats = knowledge_manager.get_knowledge_stats()
        return {
            "status": "available",
            "knowledge_base_stats": stats,
            "ai_system_status": {
                "enhanced_reasoning": ai_reasoning is not None,
                "knowledge_integration": True,
                "openai_available": bool(os.environ.get("OPENAI_API_KEY"))
            }
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        }

@app.get("/sample-queries")
async def get_sample_queries():
    """Get sample queries to demonstrate AI capabilities"""
    return {
        "course_info_queries": [
            "Tell me about CS 25000",
            "What are the prerequisites for CS 38100?",
            "How difficult is CS 35200?",
            "Compare CS 25000 and CS 25100"
        ],
        "academic_planning_queries": [
            "I want to graduate in 3.5 years, is that possible?",
            "What's the best course sequence for Machine Intelligence track?",
            "I'm struggling with my GPA, what should I do?",
            "Should I take CS 18200 or CS 24000 first?"
        ],
        "strategic_queries": [
            "What track should I choose if I want to work at Google?",
            "How can I prepare for graduate school in AI?",
            "I'm behind on my degree plan, how can I catch up?",
            "What courses should I take if I want to do research?"
        ]
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Enhanced BoilerAI Bridge Service",
        "status": "running",
        "version": "2.0.0",
        "description": "Intelligent academic planning with integrated knowledge bases",
        "features": [
            "Integrated knowledge base management",
            "Enhanced AI reasoning with context awareness",
            "Smart course recommendations",
            "Prerequisite chain analysis",
            "Graduation planning optimization",
            "Conversational memory and learning"
        ],
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
            "transcript_upload": "/transcript/upload",
            "user_context": "/users/{user_id}/context",
            "recommendations": "/recommendations",
            "knowledge_stats": "/knowledge-stats",
            "sample_queries": "/sample-queries",
            "api_key_update": "/api-key/update",
            "api_key_delete": "/api-key/delete"
        }
    }

if __name__ == "__main__":
    print("Starting BoilerAI Bridge Service on http://localhost:5003")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5003,
        reload=True,
        log_level="info"
    )