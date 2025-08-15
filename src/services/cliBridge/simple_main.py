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

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print(f"Environment loaded. OpenAI configured: {bool(os.environ.get('OPENAI_API_KEY'))}")
except ImportError:
    print("python-dotenv not available. Set OPENAI_API_KEY manually.")

# No hardcoded API key - will be set dynamically by user input
# if not os.environ.get('OPENAI_API_KEY'):
#     print("No OpenAI API key set - user will provide via frontend")

print(f"OPENAI_API_KEY set: {bool(os.environ.get('OPENAI_API_KEY'))}")

# Try to import required modules
try:
    from fastapi import FastAPI, HTTPException, File, UploadFile, Form
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    # Import pure AI fallback system
    from python_pure_ai_fallback import python_ai_fallback, generate_ai_response, handle_error_with_ai
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
    allow_origins=["http://localhost:3000", "http://localhost:3002", "http://localhost:3003", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
    """Provide AI-generated fallback responses when AI is unavailable"""
    try:
        from .pure_ai_fallback import get_ai_generated_response
        
        context = {
            "service_status": "limited", 
            "error_context": "OpenAI API key needed for full functionality"
        }
        
        return get_ai_generated_response(message, context)
        
    except Exception as e:
        print(f"AI fallback failed: {e}")
        # Last resort minimal response
        return "I'm currently unable to process your request. Please configure an OpenAI API key in the settings to enable AI functionality."

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    openai_key = os.environ.get("OPENAI_API_KEY")
    openai_configured = bool(openai_key) or bool(user_api_keys)
    
    # For development testing, consider the development placeholder as configured
    if openai_key and openai_key.startswith("sk-development"):
        openai_configured = True
    
    print(f"Health check - OpenAI key exists: {bool(openai_key)}, starts with sk-: {openai_key.startswith('sk-') if openai_key else False}")
    
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
async def delete_api_key(request: dict):
    """Delete API key for a user"""
    try:
        user_id = request.get("userId")
        user_api_keys.pop(user_id, None)
        success_message = await generate_ai_response(
            "API key has been removed successfully",
            service_type='academic_planning'
        )
        return {"success": True, "message": success_message}
        
    except Exception as e:
        print(f"API key deletion error: {e}")
        error_message = await handle_error_with_ai('general', 'API key deletion failed', 'academic_planning')
        return {"success": False, "message": error_message}

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
            
            # Parse the AI response to extract structured data
            try:
                import json
                # Try to extract JSON from the AI response
                if '```json' in ai_plan:
                    json_start = ai_plan.find('```json') + 7
                    json_end = ai_plan.find('```', json_start)
                    json_str = ai_plan[json_start:json_end].strip()
                elif '{' in ai_plan:
                    json_start = ai_plan.find('{')
                    json_end = ai_plan.rfind('}') + 1
                    json_str = ai_plan[json_start:json_end]
                else:
                    raise ValueError("No JSON structure found in AI response")
                
                plan_data = json.loads(json_str)
                # Ensure we have the raw AI response
                plan_data["ai_generated_details"] = ai_plan
                
            except Exception as parse_error:
                print(f"⚠️ Could not parse AI plan as JSON: {parse_error}")
                # Return the raw AI response with minimal structure
                plan_data = {
                    "major": student_profile.get('major', 'Unknown'),
                    "track": student_profile.get('track', 'Unknown'),
                    "raw_plan": ai_plan,
                    "parsing_error": str(parse_error),
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

@app.options("/api/transcript/upload")
async def transcript_upload_options():
    """Handle CORS preflight for transcript upload"""
    return {"status": "ok"}

@app.post("/api/transcript/upload")
async def transcript_upload(transcript: UploadFile = File(...), apiKey: str = Form(...)):
    """Upload and process transcript file"""
    try:
        print(f"📄 Received transcript upload: {transcript.filename}")
        print(f"🔑 API Key provided: {apiKey[:10]}..." if apiKey else "❌ No API Key")
        
        # Read file content
        file_content = await transcript.read()
        
        # Handle different file types
        if transcript.filename.lower().endswith('.pdf'):
            # For PDF files, we'd need a PDF processing library
            # For now, return an error for PDFs since we don't have PDF processing
            return {
                "success": False,
                "error": "PDF processing not yet implemented in this backend"
            }
        else:
            # Assume text file
            try:
                transcript_text = file_content.decode('utf-8')
            except UnicodeDecodeError:
                return {
                    "success": False,
                    "error": "Could not decode file as text. Please ensure it's a valid text file."
                }
        
        if not transcript_text.strip():
            return {
                "success": False,
                "error": "Transcript file appears to be empty"
            }
        
        if not apiKey and not os.environ.get("OPENAI_API_KEY"):
            return {
                "success": False,
                "error": "OpenAI API key is required for transcript processing"
            }
        
        # Use provided API key or fallback to environment
        openai_key = apiKey or os.environ.get("OPENAI_API_KEY")
        
        if OPENAI_AVAILABLE and openai_key:
            try:
                print("🤖 Processing transcript with OpenAI...")
                # Use OpenAI API for transcript processing
                client = OpenAI(api_key=openai_key)
                
                # Create a prompt for transcript processing
                prompt = f"""You are an academic transcript analyzer for Purdue University. Please extract and structure the following transcript information:

Transcript text:
{transcript_text[:3000]}  

Please return a JSON structure with:
1. courses: Array of courses with courseCode, title, grade, and credits
2. gpa: Overall GPA if mentioned
3. total_credits: Total credits earned
4. warnings: Any issues found in the transcript
5. summary: Brief summary of academic progress

Focus on Computer Science, Mathematics, and Engineering courses particularly. Extract course codes like "CS 18000", "MA 16100" etc."""

                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a transcript processing AI that extracts structured course data from Purdue University transcripts. Always return valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1500
                )
                
                ai_response = response.choices[0].message.content
                print(f"🤖 AI Response: {ai_response[:200]}...")
                
                # Try to parse the AI response as JSON, or return as text
                try:
                    import json
                    # Clean up the response to extract JSON
                    if '```json' in ai_response:
                        json_start = ai_response.find('```json') + 7
                        json_end = ai_response.find('```', json_start)
                        json_str = ai_response[json_start:json_end].strip()
                    elif '{' in ai_response:
                        json_start = ai_response.find('{')
                        json_end = ai_response.rfind('}') + 1
                        json_str = ai_response[json_start:json_end]
                    else:
                        raise ValueError("No JSON found")
                    
                    parsed_data = json.loads(json_str)
                    result_data = parsed_data
                    print("✅ Successfully parsed AI JSON response")
                except Exception as parse_error:
                    print(f"⚠️ JSON parsing failed: {parse_error}")
                    # Return only the raw AI response without any predefined structure
                    result_data = {
                        "raw_analysis": ai_response,
                        "parsing_note": "AI provided unstructured response - see raw_analysis for full details"
                    }
                
                return {
                    "success": True,
                    "data": result_data,
                    "message": "Transcript processed successfully"
                }
                
            except Exception as e:
                print(f"❌ OpenAI transcript processing error: {e}")
                return {
                    "success": False,
                    "error": f"AI processing failed: {str(e)}"
                }
        else:
            # Fallback processing without AI
            print("⚠️ OpenAI not available, using fallback")
            return {
                "success": False,
                "error": "OpenAI API is not available for transcript processing. Please check your API key."
            }
            
    except Exception as e:
        print(f"❌ Transcript upload error: {e}")
        return {
            "success": False,
            "error": f"Failed to process transcript upload: {str(e)}"
        }

@app.options("/api/settings/validate-openai-key")
async def validate_openai_key_options():
    """Handle CORS preflight for OpenAI key validation"""
    return {"status": "ok"}

@app.post("/api/settings/validate-openai-key")
async def validate_openai_key(request: dict):
    """Validate OpenAI API key for the UI settings"""
    try:
        api_key = request.get("apiKey")
        
        if not api_key:
            return {
                "success": False,
                "valid": False,
                "reason": "No API key provided"
            }
        
        # Basic format validation
        if not api_key.startswith('sk-') or len(api_key) < 20:
            return {
                "success": False,
                "valid": False,
                "reason": "Invalid API key format"
            }
        
        if OPENAI_AVAILABLE:
            try:
                # Test the API key with a simple request
                client = OpenAI(api_key=api_key)
                
                # Make a minimal test request
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Test"}],
                    max_tokens=1
                )
                
                return {
                    "success": True,
                    "valid": True,
                    "reason": "API key validated successfully"
                }
                
            except Exception as e:
                return {
                    "success": False,
                    "valid": False,
                    "reason": f"API key validation failed: {str(e)}"
                }
        else:
            return {
                "success": False,
                "valid": False,
                "reason": "OpenAI library not available"
            }
            
    except Exception as e:
        print(f"❌ API key validation error: {e}")
        return {
            "success": False,
            "valid": False,
            "reason": "Validation service error"
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