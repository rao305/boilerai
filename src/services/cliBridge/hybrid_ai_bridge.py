#!/usr/bin/env python3
"""
Hybrid AI Bridge - FastAPI Service Integration
Integrates the new contextual AI system with the existing FastAPI bridge
Provides seamless connection between frontend and advanced AI backend
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path for imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime
import uvicorn

# Import our advanced AI system
from contextual_ai_system import ContextualAISystem
from feature_flags import get_feature_manager
from career_networking import get_career_networking_service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str
    user_id: str
    session_id: Optional[str] = None
    processing_strategy: Optional[str] = None
    confidence_score: Optional[float] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    cli_process_running: bool
    timestamp: str
    openai_configured: bool
    knowledge_base_loaded: bool
    system_capabilities: Dict[str, Any]

class TranscriptUploadRequest(BaseModel):
    userId: str
    transcript: Dict[str, Any]
    timestamp: str

class ProfileResponse(BaseModel):
    profile: Dict[str, Any]
    last_updated: str

class RecommendationsRequest(BaseModel):
    userId: str
    context: Dict[str, Any]

# Initialize FastAPI app
app = FastAPI(
    title="Hybrid AI Academic Advisor Bridge",
    description="Advanced AI-powered academic advisory service for Purdue University",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the contextual AI system
ai_system: Optional[ContextualAISystem] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the AI system on startup"""
    global ai_system
    
    try:
        logger.info("🚀 Initializing Hybrid AI Bridge Service...")
        ai_system = ContextualAISystem()
        logger.info("✅ Contextual AI System initialized successfully")
        
        # Test system functionality
        status = ai_system.get_system_status()
        logger.info(f"📊 System Status: {status['processing_capabilities']}")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI system: {e}")
        # Continue with limited functionality
        ai_system = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    
    timestamp = datetime.now().isoformat()
    
    if ai_system is None:
        return HealthResponse(
            status="error",
            cli_process_running=False,
            timestamp=timestamp,
            openai_configured=False,
            knowledge_base_loaded=False,
            system_capabilities={}
        )
    
    try:
        system_status = ai_system.get_system_status()
        
        # Add feature flag information to capabilities
        capabilities = system_status["processing_capabilities"].copy()
        feature_manager = get_feature_manager()
        capabilities["career_networking_enabled"] = feature_manager.is_enabled("career_networking")
        capabilities["feature_flags_available"] = True
        
        return HealthResponse(
            status="healthy" if system_status["system_initialized"] else "limited",
            cli_process_running=system_status["system_initialized"],
            timestamp=timestamp,
            openai_configured=system_status["openai_available"],
            knowledge_base_loaded=system_status["knowledge_loaded"],
            system_capabilities=capabilities
        )
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthResponse(
            status="error",
            cli_process_running=False,
            timestamp=timestamp,
            openai_configured=False,
            knowledge_base_loaded=False,
            system_capabilities={}
        )

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint for AI academic advisory"""
    
    if ai_system is None:
        raise HTTPException(status_code=503, detail="AI system not available")
    
    try:
        # Extract user context
        user_id = request.context.get("userId", "anonymous") if request.context else "anonymous"
        session_id = request.context.get("sessionId") if request.context else None
        
        logger.info(f"💬 Processing query from user {user_id}: {request.message[:50]}...")
        
        # Check for admin /clado commands
        if request.message.strip().lower().startswith('/clado'):
            return await _handle_clado_command(request.message, user_id)
        
        # Check for career networking queries first
        career_service = get_career_networking_service()
        if career_service.is_career_query(request.message):
            career_response = career_service.process_career_query(request.message, request.context)
            if career_response:
                return ChatResponse(
                    response=career_response,
                    timestamp=datetime.now().isoformat(),
                    user_id=user_id,
                    session_id=session_id,
                    processing_strategy="career_networking",
                    confidence_score=0.8
                )
        
        # Process the query using our advanced AI system
        response_text = ai_system.process_user_query(
            query=request.message,
            user_id=user_id,
            session_id=session_id,
            user_context=request.context
        )
        
        # Get processing metadata
        system_status = ai_system.get_system_status()
        
        return ChatResponse(
            response=response_text,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            session_id=session_id,
            processing_strategy="contextual_ai",
            confidence_score=0.9 if system_status["openai_available"] else 0.7
        )
        
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        
        # Generate fallback response
        fallback_response = _generate_fallback_response(request.message, request.context)
        
        return ChatResponse(
            response=fallback_response,
            timestamp=datetime.now().isoformat(),
            user_id=user_id if 'user_id' in locals() else "anonymous",
            processing_strategy="fallback",
            confidence_score=0.5,
            error=str(e)
        )

@app.post("/transcript/upload")
async def upload_transcript(request: TranscriptUploadRequest):
    """Upload transcript context for personalized guidance"""
    
    if ai_system is None:
        raise HTTPException(status_code=503, detail="AI system not available")
    
    try:
        logger.info(f"📝 Uploading transcript context for user {request.userId}")
        
        # Process transcript data and update user context
        user_context = {
            "userId": request.userId,
            "transcript": request.transcript,
            "hasTranscript": True,
            "timestamp": request.timestamp
        }
        
        # Initialize conversation with transcript context
        ai_system.process_user_query(
            query="Context initialization from transcript upload",
            user_id=request.userId,
            user_context=user_context
        )
        
        return {
            "success": True,
            "message": "Transcript context uploaded successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Transcript upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload transcript: {e}")

@app.get("/users/{user_id}/context")
async def get_user_context(user_id: str):
    """Get user context information"""
    
    if ai_system is None:
        return {"has_context": False}
    
    try:
        profile = ai_system.get_student_profile(user_id)
        
        has_context = (
            profile.get("academic_level") != "unknown" or
            len(profile.get("completed_courses", [])) > 0 or
            profile.get("major") != "Computer Science"  # Default changed
        )
        
        context_keys = []
        if has_context:
            context_keys = [k for k, v in profile.items() if v and k != "user_id"]
        
        return {
            "has_context": has_context,
            "context_keys": context_keys
        }
        
    except Exception as e:
        logger.error(f"Get context error: {e}")
        return {"has_context": False}

@app.get("/profile/{user_id}", response_model=ProfileResponse)
async def get_student_profile(user_id: str):
    """Get comprehensive student profile"""
    
    if ai_system is None:
        raise HTTPException(status_code=503, detail="AI system not available")
    
    try:
        profile = ai_system.get_student_profile(user_id)
        
        return ProfileResponse(
            profile=profile,
            last_updated=profile.get("last_updated", datetime.now().isoformat())
        )
        
    except Exception as e:
        logger.error(f"Profile fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {e}")

@app.post("/recommendations")
async def get_personalized_recommendations(request: RecommendationsRequest):
    """Get personalized course and academic recommendations"""
    
    if ai_system is None:
        raise HTTPException(status_code=503, detail="AI system not available")
    
    try:
        logger.info(f"💡 Generating recommendations for user {request.userId}")
        
        # Generate recommendations query
        recommendations_query = "Based on my current academic situation, what specific courses and strategies do you recommend for me?"
        
        response = ai_system.process_user_query(
            query=recommendations_query,
            user_id=request.userId,
            user_context=request.context
        )
        
        return {
            "recommendations": response,
            "timestamp": datetime.now().isoformat(),
            "user_id": request.userId,
            "based_on_context": bool(request.context)
        }
        
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {e}")

@app.post("/generate-plan")
async def generate_personalized_plan(request: dict):
    """Generate comprehensive personalized graduation plan"""
    
    if ai_system is None:
        raise HTTPException(status_code=503, detail="AI system not available")
    
    try:
        user_id = request.get("userId", "anonymous")
        student_profile = request.get("student_profile", {})
        preferences = request.get("preferences", {})
        
        logger.info(f"📊 Generating personalized plan for user {user_id}")
        
        # Build comprehensive planning query
        academic_level = student_profile.get("academic_level", "unknown")
        major = student_profile.get("major", "Computer Science")
        track = student_profile.get("track", "unknown")
        timeline = preferences.get("graduation_timeline", "standard")
        
        planning_query = f"""
        I need a comprehensive graduation plan. Here's my situation:
        - I'm a {academic_level} {major} student
        - Interested in {track} track
        - Want to graduate on a {timeline} timeline
        - Completed courses: {', '.join(student_profile.get('completed_courses', [])[:5])}
        
        Please provide a detailed semester-by-semester plan with specific course recommendations, 
        prerequisite considerations, and timeline optimization strategies.
        """
        
        user_context = {
            "userId": user_id,
            "student_profile": student_profile,
            "preferences": preferences,
            "planning_request": True
        }
        
        comprehensive_plan = ai_system.process_user_query(
            query=planning_query,
            user_id=user_id,
            user_context=user_context
        )
        
        return {
            "success": True,
            "plan": comprehensive_plan,
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "based_on_profile": bool(student_profile)
        }
        
    except Exception as e:
        logger.error(f"Plan generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate plan: {e}")

@app.get("/system/status")
async def get_system_status():
    """Get detailed system status and capabilities"""
    
    if ai_system is None:
        return {
            "status": "error",
            "message": "AI system not initialized",
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        status = ai_system.get_system_status()
        status["timestamp"] = datetime.now().isoformat()
        status["service_version"] = "2.0.0"
        return status
        
    except Exception as e:
        logger.error(f"Status fetch error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/conversation/{user_id}/history")
async def get_conversation_history(user_id: str, session_id: Optional[str] = None):
    """Get conversation history for a user"""
    
    if ai_system is None:
        return {"history": []}
    
    try:
        history = ai_system.get_conversation_history(user_id, session_id)
        return {
            "history": history,
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"History fetch error: {e}")
        return {"history": [], "error": str(e)}

async def _handle_clado_command(message: str, user_id: str) -> ChatResponse:
    """Handle /clado admin commands"""
    
    command = message.strip().lower()
    feature_manager = get_feature_manager()
    
    try:
        if command == '/clado on':
            response_text = feature_manager.toggle_career_networking(True)
            logger.info(f"Career networking enabled by user {user_id}")
            
        elif command == '/clado off':
            response_text = feature_manager.toggle_career_networking(False)
            logger.info(f"Career networking disabled by user {user_id}")
            
        elif command == '/clado status':
            response_text = feature_manager.get_career_networking_status()
            
        elif command == '/clado help':
            response_text = """🎛️ Clado Command Help

Available commands:
• /clado on     - Enable career networking and alumni discovery
• /clado off    - Disable career networking (academic advising only)  
• /clado status - Check current status of career networking
• /clado help   - Show this help message

When enabled, students can ask career-related questions like:
• "Find Purdue CS alumni working at Google"
• "Connect me with software engineers in machine learning"
• "I need mentors in data science"

When disabled, only academic advising features are active."""
            
        else:
            response_text = "❌ Unknown clado command. Use '/clado help' to see available commands."
        
        return ChatResponse(
            response=response_text,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            processing_strategy="admin_command",
            confidence_score=1.0
        )
        
    except Exception as e:
        logger.error(f"Clado command error: {e}")
        return ChatResponse(
            response="❌ Error processing clado command. Please try again.",
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            processing_strategy="admin_command",
            confidence_score=0.5,
            error=str(e)
        )

def _generate_fallback_response(message: str, context: Dict[str, Any] = None) -> str:
    """Generate fallback response when AI system fails"""
    
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["course", "class", "take", "schedule", "plan"]):
        return ("I'm here to help with course planning! While I'm experiencing some technical difficulties "
               "with my advanced systems, I can still provide basic guidance. For the most accurate and "
               "personalized advice, could you tell me your current year and major?")
    
    elif any(word in message_lower for word in ["graduate", "graduation", "timeline"]):
        return ("I can help with graduation planning! The typical CS program takes 4 years, but there are "
               "options for acceleration or flexible timelines. For detailed planning, I'll need to know "
               "your current academic standing and any specific goals you have.")
    
    elif any(word in message_lower for word in ["track", "specialization", "machine intelligence", "software engineering"]):
        return ("Great question about CS tracks! We offer Machine Intelligence (AI/ML focus) and Software "
               "Engineering (industry development focus) tracks. You typically choose in junior year. "
               "What type of career interests you most?")
    
    else:
        return ("I'm your academic advisor for Purdue CS programs! I can help with course selection, "
               "graduation planning, track decisions, and academic strategies. I'm currently running "
               "in limited mode, but I'm here to help. What would you like to discuss?")

# Health check for the service itself
@app.get("/ping")
async def ping():
    """Simple ping endpoint"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    print("🚀 Starting Hybrid AI Academic Advisor Bridge Service...")
    print("📍 Service will be available at: http://localhost:5003")
    print("📋 API documentation: http://localhost:5003/docs")
    
    uvicorn.run(
        "hybrid_ai_bridge:app",
        host="127.0.0.1",
        port=5003,
        reload=False,
        log_level="info"
    )