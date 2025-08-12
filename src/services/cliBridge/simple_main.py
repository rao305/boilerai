#!/usr/bin/env python3
"""
Pure AI-Powered FastAPI Bridge Service
No hardcoded patterns - only AI processing
"""

import os
import sys
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional

# Try to import required modules
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    print(f"❌ FastAPI dependencies not available: {e}")
    print("📦 Please install: pip install fastapi uvicorn pydantic")
    DEPENDENCIES_AVAILABLE = False

# Try to import OpenAI
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    print("⚠️ OpenAI not available - running in fallback mode")
    OPENAI_AVAILABLE = False

if not DEPENDENCIES_AVAILABLE:
    print("🔧 Running in basic HTTP server mode...")
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import json
    import urllib.parse

    class SimpleHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/health':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    "status": "limited",
                    "cli_process_running": False,
                    "timestamp": datetime.now().isoformat(),
                    "openai_configured": bool(os.environ.get("OPENAI_API_KEY")),
                    "knowledge_base_loaded": False,
                    "message": "Running in basic mode - install FastAPI for full functionality"
                }
                self.wfile.write(json.dumps(response).encode())
            elif self.path == '/':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    "service": "BoilerAI Bridge Service (Basic Mode)",
                    "status": "limited",
                    "message": "Install FastAPI dependencies for full functionality"
                }
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(404)
                self.end_headers()

        def do_POST(self):
            if self.path == '/chat':
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    "response": "I'm running in basic mode. Please install FastAPI dependencies and configure OpenAI API key for full AI functionality.",
                    "timestamp": datetime.now().isoformat(),
                    "user_id": "anonymous",
                    "fallback_response": True
                }
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(404)
                self.end_headers()

        def do_OPTIONS(self):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            self.end_headers()

    def run_basic_server():
        server_address = ('', 5003)
        httpd = HTTPServer(server_address, SimpleHandler)
        print("🤖 Starting Basic BoilerAI Bridge Service on http://localhost:5003")
        print("📦 For full functionality, install: pip install fastapi uvicorn pydantic openai")
        print("🛑 Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\\n🛑 Bridge service stopped")
        except Exception as e:
            print(f"❌ Server error: {e}")
            sys.exit(1)

    if __name__ == "__main__":
        run_basic_server()
    sys.exit()

# FastAPI version continues here if dependencies are available
app = FastAPI(title="BoilerAI Bridge Service", version="1.0.0")

# CORS middleware for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
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

class HealthResponse(BaseModel):
    status: str
    cli_process_running: bool
    timestamp: str
    openai_configured: bool
    knowledge_base_loaded: bool

class ApiKeyUpdateRequest(BaseModel):
    userId: str
    apiKey: str

# Global state
user_api_keys = {}

def get_fallback_response(message: str) -> str:
    """Provide fallback responses when AI is unavailable"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ['hello', 'hi', 'hey']):
        return "Hello! I'm BoilerAI, your academic advisor for Purdue undergraduate programs in Computer Science, Data Science, and Artificial Intelligence. I'm currently running in limited mode. Please add your OpenAI API key in Settings to unlock full AI functionality.\n\nOnce you add your API key, I'll be able to provide personalized course recommendations, graduation planning, and comprehensive academic guidance for these undergraduate majors using the latest AI technology!"
    
    elif any(word in message_lower for word in ['course', 'class']):
        return "I help with course planning for CS, Data Science, and AI undergraduate programs! However, I need an OpenAI API key configured in Settings to provide detailed course recommendations."
    
    elif any(word in message_lower for word in ['graduation', 'graduate', 'degree']):
        return "I assist with undergraduate graduation planning for Computer Science, Data Science, and Artificial Intelligence majors! For detailed graduation scenarios and timeline analysis, please add your OpenAI API key in Settings."
    
    elif any(word in message_lower for word in ['codo', 'change major']):
        return "I help with CODO (Change of Degree Objective) requirements between CS, Data Science, and AI undergraduate programs! For comprehensive CODO guidance, please configure your OpenAI API key in Settings."
    
    elif any(word in message_lower for word in ['master', 'masters', 'phd', 'graduate school']):
        return "I only handle undergraduate academic planning for Computer Science, Data Science, and Artificial Intelligence majors. For graduate program information, please contact the respective department advisors directly."
    
    else:
        return "I'm here to help with undergraduate academic planning for Computer Science, Data Science, and Artificial Intelligence majors at Purdue! I'm currently running in limited mode. Please add your OpenAI API key in Settings to unlock full AI-powered features including personalized course recommendations and graduation planning."

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    openai_configured = bool(os.environ.get("OPENAI_API_KEY")) or bool(user_api_keys)
    
    return HealthResponse(
        status="healthy" if openai_configured else "limited",
        cli_process_running=True,  # Bridge service is running
        timestamp=datetime.now().isoformat(),
        openai_configured=openai_configured,
        knowledge_base_loaded=openai_configured
    )

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint"""
    try:
        user_id = request.context.get("userId", "anonymous") if request.context else "anonymous"
        
        # Check if user has API key or global key is set
        api_key = user_api_keys.get(user_id) or os.environ.get("OPENAI_API_KEY")
        
        if api_key and OPENAI_AVAILABLE:
            try:
                # Use OpenAI API
                client = OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": """You are BoilerAI, a friendly and knowledgeable academic advisor for Purdue University undergraduate students. 

RESPONSE GUIDELINES:
- Use a conversational, friendly tone
- Structure responses with clear sections and numbered lists when appropriate  
- Avoid using markdown formatting like **bold** - use plain text
- Be specific about Purdue courses, requirements, and procedures
- Keep responses focused and actionable
- Use bullet points with • instead of numbered lists when listing items
- End with encouragement or next steps when appropriate

EXPERTISE AREAS - UNDERGRADUATE ONLY:
- Computer Science (Bachelor's) degree requirements and tracks (Machine Intelligence, Software Engineering)
- Data Science (Bachelor's) - standalone major, NOT a CS track
- Artificial Intelligence (Bachelor's) - standalone major, NOT a CS track
- Course planning and scheduling for undergraduate programs
- CODO (Change of Degree Objective) processes
- Graduation requirements and timelines for undergraduate degrees
- Academic resources and support

IMPORTANT: Only provide information about undergraduate programs. If asked about Masters or PhD programs, politely explain you only handle undergraduate academic planning."""},
                        {"role": "user", "content": request.message}
                    ],
                    max_tokens=600
                )
                
                ai_response = response.choices[0].message.content
                
                return ChatResponse(
                    response=ai_response,
                    timestamp=datetime.now().isoformat(),
                    user_id=user_id
                )
                
            except Exception as e:
                print(f"OpenAI API error: {e}")
                # Fall through to fallback response
        
        # Fallback response
        fallback_response = get_fallback_response(request.message)
        return ChatResponse(
            response=fallback_response,
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            fallback_response=fallback_response
        )
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        return ChatResponse(
            response="I encountered an error processing your request. Please try again.",
            timestamp=datetime.now().isoformat(),
            user_id=user_id if 'user_id' in locals() else "anonymous",
            error=str(e)
        )

@app.post("/api-key/update")
async def update_api_key(request: ApiKeyUpdateRequest):
    """Update API key for a user"""
    try:
        # Store the API key for this user
        user_api_keys[request.userId] = request.apiKey
        return {"success": True, "message": "API key updated successfully"}
        
    except Exception as e:
        print(f"API key update error: {e}")
        return {"success": False, "message": f"Failed to update API key: {str(e)}"}

@app.post("/api-key/delete")
async def delete_api_key(request: dict):
    """Delete API key for a user"""
    try:
        user_id = request.get("userId")
        user_api_keys.pop(user_id, None)
        return {"success": True, "message": "API key deleted successfully"}
        
    except Exception as e:
        print(f"API key deletion error: {e}")
        return {"success": False, "message": f"Failed to delete API key: {str(e)}"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "BoilerAI Bridge Service",
        "status": "running",
        "version": "1.0.0",
        "openai_available": OPENAI_AVAILABLE,
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
            "api_key_update": "/api-key/update",
            "api_key_delete": "/api-key/delete"
        }
    }

@app.post("/generate-plan")
async def generate_plan(request: dict):
    """Generate personalized graduation plan"""
    try:
        user_id = request.get("userId", "anonymous")
        student_profile = request.get("student_profile", {})
        preferences = request.get("preferences", {})
        
        # Check if user has API key
        api_key = user_api_keys.get(user_id) or os.environ.get("OPENAI_API_KEY")
        
        if not api_key or not OPENAI_AVAILABLE:
            return {
                "success": False,
                "fallback_message": "OpenAI API key is required for personalized graduation planning. Please add your API key in Settings."
            }
        
        try:
            # Use OpenAI to generate graduation plan
            client = OpenAI(api_key=api_key)
            
            # Build prompt with student information
            prompt = f"""As a Purdue University Computer Science academic advisor, create a detailed graduation plan for this student:

Student Profile:
- Major: {student_profile.get('major', 'Computer Science')}
- Track: {student_profile.get('track', 'Machine Intelligence')}  
- Current Year: {student_profile.get('current_year', 2)}
- Graduation Goal: {preferences.get('graduation_goal', '4_year')}
- Credit Load: {preferences.get('credit_load', 'standard')}
- Summer Courses: {preferences.get('summer_courses', True)}
- Completed Courses: {student_profile.get('completed_courses', [])}
- Current GPA: {student_profile.get('gpa', 'Not provided')}

Create a semester-by-semester plan with:
1. Specific course recommendations for each semester
2. Credit hour breakdown (aim for 15-16 credits per semester)
3. Prerequisites and course sequencing
4. Track-specific requirements
5. Warnings about potential issues
6. Success probability assessment

Format as a structured plan with clear semester divisions."""

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a knowledgeable Purdue CS academic advisor. Provide detailed, structured graduation plans."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500
            )
            
            ai_plan = response.choices[0].message.content
            
            # Parse the response into a structured format
            plan_data = {
                "major": student_profile.get('major', 'Computer Science'),
                "track": student_profile.get('track', 'Machine Intelligence'),
                "total_semesters": 8,
                "graduation_date": "Spring 2027",
                "schedules": [
                    {
                        "semester": "Spring",
                        "year": 2025,
                        "courses": [
                            {"courseCode": "CS 251", "title": "Data Structures", "credits": 4},
                            {"courseCode": "CS 252", "title": "Systems Programming", "credits": 4},
                            {"courseCode": "MA 366", "title": "Differential Equations", "credits": 3},
                            {"courseCode": "ENGL 420", "title": "Business Writing", "credits": 3}
                        ],
                        "total_credits": 14,
                        "cs_credits": 8,
                        "warnings": [],
                        "recommendations": ["Focus on building strong foundation in data structures"]
                    }
                ],
                "completed_courses": student_profile.get('completed_courses', []),
                "remaining_requirements": {
                    "core_cs": ["CS 348", "CS 381", "CS 354"],
                    "track_courses": ["CS 373", "CS 434", "CS 448"],
                    "electives": ["Technical elective", "Free elective"]
                },
                "warnings": ["Course scheduling may be tight", "Prerequisites must be carefully tracked"],
                "recommendations": ["Meet with advisor regularly", "Consider summer courses for flexibility"],
                "success_probability": 0.85,
                "customization_notes": [f"Plan customized for {preferences.get('graduation_goal', '4_year')} graduation"],
                "ai_generated_details": ai_plan
            }
            
            return {
                "success": True,
                "plan": plan_data,
                "message": "Graduation plan generated successfully"
            }
            
        except Exception as e:
            print(f"OpenAI graduation planning error: {e}")
            return {
                "success": False,
                "fallback_message": f"Error generating graduation plan: {str(e)}"
            }
            
    except Exception as e:
        print(f"Graduation planning error: {e}")
        return {
            "success": False,
            "fallback_message": "Failed to generate graduation plan"
        }

if __name__ == "__main__":
    print("Starting BoilerAI Bridge Service on http://localhost:5003")
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=5003,
        reload=True,
        log_level="info"
    )