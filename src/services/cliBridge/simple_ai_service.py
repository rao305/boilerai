#!/usr/bin/env python3
"""
Simple AI Service for BoilerAI
Provides basic API endpoints for AI functionality
"""

import os
import sys
import asyncio
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BoilerAI Simple Service",
    description="Academic planning AI service",
    version="1.0.0"
)

class ChatRequest(BaseModel):
    message: str
    userId: str = "anonymous"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    confidence: float = 0.8
    sources: list = []
    actions: list = []
    timestamp: str
    user_id: str

@app.get("/")
async def root():
    return {
        "message": "BoilerAI Simple Service",
        "status": "running",
        "version": "1.0.0",
        "ai_available": True
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "ai_available": True,
        "timestamp": "2025-08-16T02:15:00Z",
        "service": "simple"
    }

@app.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        # Simple rule-based responses for academic planning
        message = request.message.lower()
        
        if any(word in message for word in ["course", "class", "requirements"]):
            response = "I can help you with course planning and degree requirements. What specific area are you interested in?"
            actions = ["view_degree_requirements", "explore_courses"]
            
        elif any(word in message for word in ["data science", "ai", "machine learning", "ml"]):
            response = "For Data Science and AI, I recommend considering the Computer Science track with a focus on machine learning courses. Key courses include CS 180, CS 240, CS 348, and STAT 416."
            actions = ["view_cs_track", "explore_ml_courses"]
            
        elif any(word in message for word in ["career", "job", "internship"]):
            response = "I can help you plan your academic path based on career goals. What field are you interested in pursuing?"
            actions = ["career_planning", "internship_prep"]
            
        elif any(word in message for word in ["transcript", "upload", "parse"]):
            response = "I can help analyze your transcript to track progress and identify remaining requirements. Please upload your transcript for analysis."
            actions = ["upload_transcript", "view_progress"]
            
        elif any(word in message for word in ["schedule", "plan", "semester"]):
            response = "I can help you plan your semester schedule and course sequence. What semester are you planning for?"
            actions = ["plan_semester", "view_schedule"]
            
        else:
            response = "I'm here to help with academic planning, course selection, and degree requirements. How can I assist you today?"
            actions = ["explore_features", "get_help"]
        
        return ChatResponse(
            response=response,
            confidence=0.85,
            sources=["academic_database", "course_catalog"],
            actions=actions[:3],  # Limit to top 3
            timestamp="2025-08-16T02:15:00Z",
            user_id=request.userId
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing request: {str(e)}"
        )

@app.get("/api/academic/courses")
async def get_courses():
    """Get available courses"""
    return {
        "courses": [
            {"code": "CS 180", "name": "Problem Solving And Object-Oriented Programming", "credits": 4},
            {"code": "CS 240", "name": "Programming in C", "credits": 3},
            {"code": "CS 348", "name": "Information Systems", "credits": 3},
            {"code": "STAT 416", "name": "Probability Theory", "credits": 3}
        ]
    }

@app.get("/api/academic/tracks")
async def get_tracks():
    """Get available academic tracks"""
    return {
        "tracks": [
            {"id": "computer_science", "name": "Computer Science", "description": "Core CS curriculum"},
            {"id": "data_science", "name": "Data Science", "description": "Data analysis and ML focus"},
            {"id": "software_engineering", "name": "Software Engineering", "description": "Software development focus"}
        ]
    }

if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 5003))
    host = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    
    logger.info(f"🤖 Starting BoilerAI Simple Service on {host}:{port}")
    logger.info("🔧 Service provides basic academic planning assistance")
    
    uvicorn.run(
        app, 
        host=host, 
        port=port, 
        log_level="info",
        access_log=True
    )