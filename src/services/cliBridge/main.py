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

# Import pure AI fallback system
from python_pure_ai_fallback import python_ai_fallback, generate_ai_response, handle_error_with_ai

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
    """Provide AI-generated fallback responses when main AI is unavailable"""
    try:
        from .pure_ai_fallback import get_ai_generated_response
        
        context = {
            "service_status": "limited",
            "error_context": "Main AI system unavailable, running in fallback mode"
        }
        
        return get_ai_generated_response(message, context)
        
    except Exception as e:
        print(f"AI fallback failed: {e}")
        # Last resort minimal response
        return handle_error_with_ai('api_unavailable', user_query=message, service_type='academic_planning')

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
        
        success_message = await generate_ai_response(
            "Transcript has been uploaded and is ready for analysis",
            service_type='transcript_analysis'
        )
        return {"message": success_message, "success": True}
        
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
        error_message = await handle_error_with_ai('general', 'check user context', 'academic_planning')
        return {"has_context": False, "error": error_message}

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
            error_message = await handle_error_with_ai('authentication', 'API key configuration', 'academic_planning')
            return {"success": False, "message": error_message}
        
        success_message = await generate_ai_response(
            "API key has been configured successfully",
            service_type='academic_planning'
        )
        return {"success": True, "message": success_message}
        
    except Exception as e:
        print(f"API key update error: {e}")
        error_message = await handle_error_with_ai('general', 'API key update failed', 'academic_planning')
        return {"success": False, "message": error_message}

@app.post("/api-key/delete")
async def delete_api_key(request: ApiKeyDeleteRequest):
    """Delete API key for a user"""
    try:
        # Remove user's API key
        user_api_keys.pop(request.userId, None)
        
        # If no users have API keys, remove from environment
        if not user_api_keys:
            os.environ.pop("OPENAI_API_KEY", None)
        
        success_message = await generate_ai_response(
            "API key has been removed successfully",
            service_type='academic_planning'
        )
        return {"success": True, "message": success_message}
        
    except Exception as e:
        print(f"API key deletion error: {e}")
        error_message = await handle_error_with_ai('general', 'API key deletion failed', 'academic_planning')
        return {"success": False, "message": error_message}

# Frontend-compatible endpoint
@app.post("/api/settings/validate-openai-key")
async def validate_openai_key(request: dict):
    """Validate OpenAI API key (frontend-compatible endpoint)"""
    return await test_api_key_internal(request)

@app.post("/test-key")
async def test_api_key(request: dict):
    """Legacy test endpoint"""
    return await test_api_key_internal(request)

async def test_api_key_internal(request: dict):
    """Test and validate an OpenAI API key with comprehensive edge case handling"""
    try:
        api_key = request.get("apiKey")
        
        # Edge Case 1: Missing API key
        if not api_key:
            return {"success": False, "valid": False, "message": "No API key provided", "reason": "API key is required"}
        
        # Edge Case 2: Empty string or whitespace only
        if not api_key.strip():
            return {"success": False, "valid": False, "message": "Empty API key provided", "reason": "API key cannot be empty or whitespace only"}
        
        # Clean the API key
        api_key = api_key.strip()
        
        # Edge Case 3: Basic format validation
        if not api_key.startswith("sk-"):
            return {"success": False, "valid": False, "message": "Invalid API key format. OpenAI API keys start with 'sk-'", "reason": "Invalid API key format. OpenAI keys must start with 'sk-' and be at least 20 characters long."}
        
        # Edge Case 4: Length validation
        if len(api_key) < 20:
            return {"success": False, "valid": False, "message": "API key too short", "reason": "OpenAI API keys must be at least 20 characters long."}
        
        # Edge Case 5: Length validation (too long - potential attack)
        if len(api_key) > 200:
            return {"success": False, "valid": False, "message": "API key too long", "reason": "API key exceeds maximum length limit."}
        
        # Edge Case 6: Character validation (basic security check)
        import re
        if not re.match(r'^sk-[a-zA-Z0-9_-]+$', api_key):
            return {"success": False, "valid": False, "message": "Invalid characters in API key", "reason": "API key contains invalid characters. Only alphanumeric, hyphens, and underscores are allowed."}
        
        # Test the API key by making a request to OpenAI
        import requests
        
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        
        print(f"Testing API key: {api_key[:15]}...")
        
        # Use the models endpoint as it's lightweight and reliable
        response = requests.get('https://api.openai.com/v1/models', headers=headers, timeout=10)
        
        print(f"OpenAI API response status: {response.status_code}")
        
        if response.status_code == 200:
            # API key is valid, temporarily store it for this validation
            temp_old_key = os.environ.get("OPENAI_API_KEY")
            os.environ["OPENAI_API_KEY"] = api_key
            
            # Try to initialize AI systems with this key
            print("API key valid, initializing AI systems...")
            success = initialize_ai_systems()
            
            if success:
                # If initialization was successful, keep the key active
                print("AI systems initialized successfully")
                return {
                    "success": True, 
                    "valid": True,
                    "message": "API key validated successfully and AI systems initialized", 
                    "reason": "API key is valid and authenticated with OpenAI.",
                    "ai_features_available": True,
                    "service_status": "fully_operational",
                    "status": 200
                }
            else:
                # Restore old key if initialization failed
                if temp_old_key:
                    os.environ["OPENAI_API_KEY"] = temp_old_key
                else:
                    os.environ.pop("OPENAI_API_KEY", None)
                
                print("AI system initialization failed")
                return {
                    "success": False, 
                    "valid": True,
                    "message": "API key is valid but AI service initialization failed. Check console for details.",
                    "reason": "API key validated with OpenAI but internal services failed to initialize.",
                    "ai_features_available": False,
                    "service_status": "limited_functionality"
                }
        
        elif response.status_code == 401:
            error_detail = ""
            try:
                error_data = response.json()
                error_detail = error_data.get('error', {}).get('message', '')
            except:
                pass
            return {"success": False, "valid": False, "message": f"Invalid API key. {error_detail}".strip(), "reason": f"API key authentication failed: {error_detail}".strip()}
        elif response.status_code == 429:
            return {"success": False, "valid": False, "message": "Rate limit exceeded. Please try again later.", "reason": "OpenAI API rate limit exceeded"}
        elif response.status_code == 403:
            return {"success": False, "valid": False, "message": "API key lacks required permissions.", "reason": "API key does not have required permissions"}
        else:
            return {"success": False, "valid": False, "message": f"OpenAI API error: {response.status_code}", "reason": f"HTTP {response.status_code}: {response.reason}"}
            
    # Edge Case 7: Network timeout
    except requests.exceptions.Timeout:
        return {"success": False, "valid": False, "message": "Request timeout. Please check your internet connection.", "reason": "Connection timeout - OpenAI API not reachable"}
    
    # Edge Case 8: Connection errors (DNS, network issues)
    except requests.exceptions.ConnectionError as e:
        if "Name or service not known" in str(e) or "DNS" in str(e):
            return {"success": False, "valid": False, "message": "DNS resolution failed. Check internet connection.", "reason": "DNS resolution error - cannot reach OpenAI API"}
        return {"success": False, "valid": False, "message": "Connection error. Please check your internet connection.", "reason": "Network connection error"}
    
    # Edge Case 9: SSL/TLS errors
    except requests.exceptions.SSLError:
        return {"success": False, "valid": False, "message": "SSL certificate verification failed.", "reason": "SSL/TLS connection error"}
    
    # Edge Case 10: HTTP errors (500, 502, 503, etc.)
    except requests.exceptions.HTTPError as e:
        return {"success": False, "valid": False, "message": f"HTTP error occurred: {e}", "reason": f"OpenAI API HTTP error: {e}"}
    
    # Edge Case 11: Request too large
    except requests.exceptions.RequestException as e:
        return {"success": False, "valid": False, "message": "Request failed.", "reason": f"Request error: {str(e)}"}
    
    # Edge Case 12: JSON parsing errors
    except ValueError as e:
        if "JSON" in str(e):
            return {"success": False, "valid": False, "message": "Invalid response from OpenAI API.", "reason": "JSON parsing error in API response"}
        return {"success": False, "valid": False, "message": f"Data processing error: {str(e)}", "reason": f"Value error: {str(e)}"}
    
    # Edge Case 13: Missing dependencies
    except ImportError as e:
        return {"success": False, "valid": False, "message": "Required Python packages not available.", "reason": f"Missing dependencies: {str(e)}"}
    
    # Edge Case 14: Memory errors (large responses)
    except MemoryError:
        return {"success": False, "valid": False, "message": "Insufficient memory to process request.", "reason": "Memory error during API validation"}
    
    # Edge Case 15: Unexpected errors
    except Exception as e:
        print(f"❌ Unexpected API key validation error: {e}")
        import traceback
        traceback.print_exc()
        
        # Don't expose internal error details to frontend for security
        error_type = type(e).__name__
        return {"success": False, "valid": False, "message": "API key validation failed due to an unexpected error.", "reason": f"Internal error ({error_type})"}

@app.get("/api-key/help")
async def api_key_help():
    """Provide guidance on obtaining and configuring OpenAI API key"""
    return {
        "title": "OpenAI API Key Setup Guide",
        "steps": [
            {
                "step": 1,
                "title": "Create OpenAI Account",
                "description": "Go to https://platform.openai.com/ and create an account"
            },
            {
                "step": 2,
                "title": "Access API Keys",
                "description": "Navigate to https://platform.openai.com/account/api-keys"
            },
            {
                "step": 3,
                "title": "Create New Key",
                "description": "Click 'Create new secret key' and give it a name"
            },
            {
                "step": 4,
                "title": "Copy Your Key",
                "description": "Copy the key (starts with 'sk-') and store it safely"
            },
            {
                "step": 5,
                "title": "Test Your Key",
                "description": "Use the 'Test API Key' feature in the app to validate"
            }
        ],
        "key_format": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "validation_endpoint": "/test-key",
        "security_notes": [
            "Never share your API key publicly",
            "Store it securely in environment variables",
            "Regenerate if compromised",
            "Monitor usage at https://platform.openai.com/usage"
        ],
        "troubleshooting": {
            "invalid_format": "Keys must start with 'sk-'",
            "401_unauthorized": "Key is invalid or revoked",
            "403_forbidden": "Key lacks required permissions",
            "429_rate_limit": "Too many requests, try again later"
        }
    }

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
                    "track_indicators": await _analyze_track_indicators(courses)
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

async def _analyze_track_indicators(courses):
    """Use AI to analyze courses and suggest track preferences"""
    if not conversation_manager:
        return await generate_ai_response(
            "No clear track preference detected from academic context",
            service_type='academic_planning'
        )
    
    try:
        courses_text = ", ".join([c.get("courseCode", "") for c in courses])
        query = f"Based on these completed courses: {courses_text}, what CS track (Machine Intelligence, Software Engineering, or Undecided) would you recommend and why?"
        
        ai_response = conversation_manager.process_query("track_analysis", query)
        
        # Extract track preference from AI response
        response_lower = ai_response.lower()
        if "machine intelligence" in response_lower or "ai" in response_lower or "ml" in response_lower:
            return await generate_ai_response(
                "Academic pattern suggests interest in machine intelligence track",
                service_type='academic_planning'
            )
        elif "software engineering" in response_lower or "se" in response_lower:
            return await generate_ai_response(
                "Academic pattern suggests interest in software engineering track",
                service_type='academic_planning'
            )
        else:
            return await generate_ai_response(
            "No clear track preference detected from academic context",
            service_type='academic_planning'
        )
    except Exception as e:
        print(f"AI track analysis failed: {e}")
        return await generate_ai_response(
            "No clear track preference detected from academic context",
            service_type='academic_planning'
        )

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