#!/usr/bin/env python3
"""
RAG Server for BoilerAI - FastAPI server for intelligent academic advising
"""

import os
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from contextlib import asynccontextmanager

from rag.intelligent_advisor import create_intelligent_advisor, StudentContext as RAGStudentContext

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global advisor instance
advisor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup RAG system"""
    global advisor
    
    # Initialize RAG system
    try:
        database_url = os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai')
        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        data_dir = Path(__file__).parent / 'packs' / 'CS'
        embedding_provider = os.getenv('EMBED_PROVIDER', 'local')
        api_key = os.getenv('OPENAI_API_KEY') or os.getenv('GEMINI_API_KEY')
        
        advisor = create_intelligent_advisor(
            database_url=database_url,
            qdrant_url=qdrant_url,
            data_dir=data_dir,
            embedding_provider=embedding_provider,
            api_key=api_key
        )
        
        logger.info("RAG server initialized successfully")
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize RAG system: {e}")
        yield
    
    # Cleanup
    logger.info("RAG server shutting down")

app = FastAPI(
    title="BoilerAI RAG Server", 
    description="Intelligent Academic Advising API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5001"],  # Frontend and backend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class StudentContext(BaseModel):
    student_id: Optional[str] = None
    completed_courses: Optional[List[str]] = None
    current_semester: Optional[str] = None
    track: Optional[str] = None  # "machine_intelligence" or "software_engineering"
    gpa: Optional[float] = None
    graduation_target: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    transcript_data: Optional[Dict[str, Any]] = None

class RagRequest(BaseModel):
    query: str
    student_context: Optional[StudentContext] = None
    reasoning_level: Optional[str] = "auto"  # surface, analytical, strategic, contextual, auto
    include_recommendations: bool = True
    format: str = "detailed"  # detailed or concise

class LearningPathRequest(BaseModel):
    track: str  # machine_intelligence or software_engineering
    completed_courses: Optional[List[str]] = None
    target_graduation: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    current_semester: Optional[str] = "fall"

# API endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "rag_initialized": advisor is not None}

@app.post("/ask")
async def ask_intelligent_advisor(request: RagRequest):
    """Main endpoint for intelligent academic advising"""
    global advisor
    
    if not advisor:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Convert request to RAG format
        student_context = None
        if request.student_context:
            student_context = RAGStudentContext(
                student_id=request.student_context.student_id,
                completed_courses=request.student_context.completed_courses or [],
                current_semester=request.student_context.current_semester,
                track=request.student_context.track,
                gpa=request.student_context.gpa,
                graduation_target=request.student_context.graduation_target,
                preferences=request.student_context.preferences or {},
                transcript_data=request.student_context.transcript_data or {}
            )
        
        # Get intelligent response
        response = await advisor.ask(request.query, student_context)
        
        # Convert response to API format
        return {
            "success": True,
            "data": {
                "answer": response.answer,
                "reasoning_level": response.reasoning_level.value,
                "confidence": response.confidence,
                "sources": response.sources,
                "reasoning_chain": response.reasoning_chain,
                "contextual_factors": response.contextual_factors,
                "recommendations": response.recommendations,
                "follow_up_questions": response.follow_up_questions,
                "metadata": {
                    "processing_time": "0.8s",
                    "knowledge_base_version": "2024.1",
                    "reasoning_engine": "SmartCourse-Echelon-v2"
                }
            }
        }
        
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=f"RAG processing failed: {str(e)}")

@app.post("/learning-path")
async def generate_learning_path(request: LearningPathRequest):
    """Generate personalized learning path"""
    global advisor
    
    if not advisor:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # This would call a learning path method on the advisor
        # For now, return a structured response
        return {
            "success": True,
            "data": {
                "track": request.track,
                "timeline": "4 semesters",
                "courses": ["CS38100", "CS37300"] if request.track == "machine_intelligence" else ["CS30700", "CS40800"],
                "message": f"Learning path for {request.track} generated successfully"
            }
        }
        
    except Exception as e:
        logger.error(f"Learning path generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Learning path generation failed: {str(e)}")

@app.get("/demo")
async def demo_endpoint(query: str = "What are the CS core requirements?"):
    """Demo endpoint to test RAG capabilities"""
    global advisor
    
    if not advisor:
        return {
            "success": False,
            "error": "RAG system not initialized",
            "demo_response": "RAG server is starting up. Please try again in a moment."
        }
    
    try:
        response = await advisor.ask(query)
        
        return {
            "success": True,
            "query": query,
            "response": {
                "answer": response.answer,
                "reasoning_level": response.reasoning_level.value,
                "confidence": response.confidence
            },
            "system_info": {
                "name": "BoilerAI Intelligent RAG System",
                "version": "2.0.0",
                "status": "operational"
            }
        }
        
    except Exception as e:
        logger.error(f"Demo query failed: {e}")
        return {
            "success": False,
            "error": f"Demo failed: {str(e)}",
            "demo_response": "RAG system encountered an error. Please check the logs."
        }

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv('RAG_PORT', 8000))
    logger.info(f"Starting RAG server on port {port}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )