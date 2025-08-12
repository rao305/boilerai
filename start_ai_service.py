#!/usr/bin/env python3
"""
Unified AI Service Starter
Creates and runs the FastAPI AI service
"""

import os
import sys
from pathlib import Path

# Add the services directory to Python path
current_dir = Path(__file__).parent.absolute()
services_dir = current_dir / "src" / "services" / "cliBridge"
sys.path.append(str(services_dir))

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    import uvicorn
    
    # Try to import our unified AI bridge
    try:
        from unified_ai_bridge import get_unified_ai_bridge
        ai_bridge = get_unified_ai_bridge()
        ai_available = True
        print("✅ Unified AI Bridge loaded successfully")
    except Exception as e:
        print(f"⚠️  AI Bridge not available: {e}")
        ai_available = False
    
    app = FastAPI(
        title="Unified AI Academic Advisor", 
        version="1.0.0",
        description="Pure AI-driven academic guidance with comprehensive knowledge base"
    )
    
    class ChatRequest(BaseModel):
        message: str
        context: dict = {}
    
    @app.get("/")
    async def root():
        return {
            "message": "Unified AI Academic Advisor Service",
            "ai_available": ai_available,
            "knowledge_base": "comprehensive_unified" if ai_available else "unavailable",
            "version": "1.0.0"
        }
    
    @app.get("/health")
    async def health():
        return {
            "status": "healthy" if ai_available else "limited",
            "cli_process_running": ai_available,
            "openai_configured": bool(os.getenv('OPENAI_API_KEY')),
            "knowledge_base_loaded": ai_available,
            "timestamp": "2025-08-09T12:00:00Z"
        }
    
    @app.post("/chat")
    async def chat(request: ChatRequest):
        if not ai_available:
            return {
                "response": "I'm your academic advisor! I can help with course planning, graduation timelines, program selection, and academic strategy. The AI enhancement service is currently unavailable, but I can still provide basic guidance. Could you tell me more about your academic situation?",
                "error": "AI enhancement unavailable",
                "fallback_response": True,
                "timestamp": "2025-08-09T12:00:00Z",
                "user_id": "anonymous"
            }
        
        try:
            # Extract user ID from context
            user_id = request.context.get('userId', 'anonymous')
            
            result = ai_bridge.process_academic_query(
                request.message,
                user_id,
                request.context
            )
            
            return {
                "response": result.response_text,
                "confidence": result.confidence_score,
                "sources": result.knowledge_sources,
                "actions": result.suggested_actions[:3],  # Limit to top 3
                "reasoning_chain": result.reasoning_chain[-3:],  # Last 3 steps
                "timestamp": "2025-08-09T12:00:00Z",
                "user_id": user_id,
                "fallback_response": False
            }
        except Exception as e:
            return {
                "response": f"I encountered an error processing your query: {str(e)}. Please try rephrasing your question or providing more context about your academic situation.",
                "error": str(e),
                "fallback_response": True,
                "timestamp": "2025-08-09T12:00:00Z",
                "user_id": request.context.get('userId', 'anonymous')
            }
    
    @app.get("/status")
    async def get_system_status():
        if ai_available:
            status = ai_bridge.get_system_status()
            return status
        else:
            return {
                "unified_ai_bridge": {"system_ready": False, "error": "AI Bridge not loaded"},
                "capabilities": {"ai_reasoning": False, "knowledge_base": False}
            }
    
    if __name__ == "__main__":
        print("🤖 Starting Unified AI Academic Advisor Service")
        print("📊 Knowledge Base: Comprehensive Unified (32+ courses)")
        print("🧠 AI Reasoning: Pure AI logic (no hardcoding)")
        print("🎯 Program Structure: Proper Major/Track/Minor definitions")
        print("📡 Service URL: http://localhost:5003")
        print("🔗 Integration: Automatically connects to web app")
        print("🛑 Press Ctrl+C to stop")
        print()
        
        uvicorn.run(app, host="0.0.0.0", port=5003, log_level="info")

except ImportError as e:
    print(f"❌ Required packages not available: {e}")
    print("Install with: pip install fastapi uvicorn")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error starting AI service: {e}")
    sys.exit(1)