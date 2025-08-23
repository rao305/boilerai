from __future__ import annotations
import os
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from api_gateway.db import db_query
from router.intent import classify_intent
from router.router import route_to_handler, route_with_context
from router.orchestrator import RAGOrchestrator
from planner.core import compute_plan
from t2sql.compiler import compile_ast_to_sql
from t2sql.generate import generate_ast
from transcript.ingest import TranscriptIngester
from advisor.memory import AdvisorMemory
import asyncio
import json

app = FastAPI(title="Boiler AI – RAG-ON")

# Initialize RAG orchestrator
rag_config = {
    'vector_backend': os.getenv('VECTOR_BACKEND', 'qdrant'),
    'qdrant_url': os.getenv('QDRANT_URL', 'http://localhost:6333'),
    'llm_provider': os.getenv('LLM_PROVIDER', 'gemini'),
    'api_key': os.getenv('GEMINI_API_KEY') if os.getenv('LLM_PROVIDER', 'gemini') == 'gemini' else os.getenv('OPENAI_API_KEY'),
    'model': os.getenv('GEMINI_MODEL', 'gemini-1.5-flash') if os.getenv('LLM_PROVIDER', 'gemini') == 'gemini' else os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
}

database_url = os.getenv('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai')
orchestrator = RAGOrchestrator(database_url, rag_config)

# Initialize transcript ingester
transcript_ingester = TranscriptIngester(
    llm_provider=rag_config['llm_provider'],
    api_key=rag_config['api_key'],
    course_aliases_file='packs/CS/course_aliases.csv'
)

# Initialize advisor memory
advisor_memory = AdvisorMemory(database_url)

# Import SmartCourse integration
try:
    from api_gateway.smartcourse_handler import smartcourse_handler
    SMARTCOURSE_ENABLED = True
except ImportError:
    SMARTCOURSE_ENABLED = False
    print("SmartCourse integration not available")

class QARequest(BaseModel):
    question: str
    profile_json: Optional[Dict[str, Any]] = None

class AdvisorChatRequest(BaseModel):
    user_id: str
    query: str
    session_id: Optional[str] = None

class SQLRequest(BaseModel):
    ast: Dict[str, Any]

class PlanRequest(BaseModel):
    profile_json: Dict[str, Any]

class SmartCourseQARequest(BaseModel):
    question: str
    profile_json: Optional[Dict[str, Any]] = None
    context_mode: str = "full"
    enable_metrics: bool = True

@app.get("/healthz")
def healthz(): return {"ok": True}

@app.post("/qa")
def qa(req: QARequest, request: Request):
    # Try SmartCourse contextual routing first if enabled
    if SMARTCOURSE_ENABLED and req.profile_json:
        dest = route_with_context(req.question, req.profile_json)
    else:
        # Fallback to traditional intent-based routing
        intent = classify_intent(req.question)
        dest = route_to_handler(intent, req.question)
    if dest == "planner":
        if not req.profile_json:
            raise HTTPException(400, "planner_requires_profile_json")
        return {"mode":"planner","plan": compute_plan(req.profile_json)}
    if dest == "t2sql":
        # Extract LLM configuration from headers
        llm_provider = request.headers.get("X-LLM-Provider")
        llm_api_key = request.headers.get("X-LLM-Api-Key") 
        llm_model = request.headers.get("X-LLM-Model")
        
        ast = generate_ast(req.question, llm_provider, llm_api_key, llm_model)
        sql, params = compile_ast_to_sql(ast)
        rows = db_query(sql, params)
        return {"mode":"t2sql","ast":ast,"sql":sql,"rows":rows}
    if dest == "general_chat":
        # Extract LLM configuration from headers for general chat
        llm_provider = request.headers.get("X-LLM-Provider")
        llm_api_key = request.headers.get("X-LLM-Api-Key") 
        llm_model = request.headers.get("X-LLM-Model")
        
        # For general chat, use a simple LLM call without T2SQL
        from llm.client import call_general_chat
        response = call_general_chat(req.question, llm_provider, llm_api_key, llm_model)
        return {"mode":"general_chat","response":response}
    raise HTTPException(400, "unsupported_query_or_rag_disabled")

@app.post("/sql/query")
def sql_query(req: SQLRequest):
    sql, params = compile_ast_to_sql(req.ast)
    rows = db_query(sql, params)
    return {"sql": sql, "rows": rows}

@app.post("/plan/compute")
def plan_compute(req: PlanRequest):
    return compute_plan(req.profile_json)

@app.get("/tracks/{track_id}")
def get_track(track_id: str):
    track = db_query("SELECT * FROM tracks WHERE id = %s", [track_id])
    if not track:
        raise HTTPException(404, "track_not_found")
    
    track_groups = db_query("""SELECT key, need, course_list 
                              FROM track_groups WHERE track_id = %s
                              ORDER BY key""", [track_id])
    
    return {
        "track": track[0],
        "groups": track_groups
    }

@app.get("/courses/{course_id}")
def get_course(course_id: str):
    # Handle aliases
    resolved_id = course_id
    alias_result = db_query("SELECT course_id FROM course_aliases WHERE alias = %s", [course_id])
    if alias_result:
        resolved_id = alias_result[0]["course_id"]
    
    course = db_query("SELECT * FROM courses WHERE id = %s", [resolved_id])
    if not course:
        raise HTTPException(404, "course_not_found")
    
    # Get detailed information
    details = db_query("SELECT * FROM course_details WHERE course_id = %s", [resolved_id])
    levels = db_query("SELECT level_name FROM course_levels WHERE course_id = %s", [resolved_id])
    schedule_types = db_query("SELECT schedule_type FROM course_schedule_types WHERE course_id = %s", [resolved_id])
    campuses = db_query("SELECT campus FROM course_campuses WHERE course_id = %s", [resolved_id])
    outcomes = db_query("SELECT outcome_no, text FROM course_outcomes WHERE course_id = %s ORDER BY outcome_no", [resolved_id])
    restrictions = db_query("SELECT program, allow FROM course_program_restrictions WHERE course_id = %s", [resolved_id])
    
    return {
        "course": course[0],
        "details": details[0] if details else None,
        "levels": [l["level_name"] for l in levels],
        "schedule_types": [s["schedule_type"] for s in schedule_types],
        "campuses": [c["campus"] for c in campuses],
        "outcomes": [{"number": o["outcome_no"], "text": o["text"]} for o in outcomes],
        "program_restrictions": restrictions
    }

# RAG-ON Endpoints

@app.post("/advisor/chat")
async def advisor_chat(req: AdvisorChatRequest):
    """Main RAG-ON orchestrator endpoint for grounded academic advising."""
    try:
        result = await orchestrator.process_query(
            user_id=req.user_id,
            query=req.query,
            session_id=req.session_id
        )
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Advisor chat failed: {str(e)}"}
        )

@app.post("/transcript/ingest")
async def ingest_transcript(user_id: str, file: UploadFile = File(...)):
    """Ingest transcript from uploaded file (PDF/PNG/CSV/MD)."""
    try:
        # Read file data
        file_data = await file.read()
        
        # Ingest transcript
        profile = await transcript_ingester.ingest_file(file.filename, file_data)
        
        # Store profile in advisor memory
        await advisor_memory.remember_fact(
            user_id=user_id,
            kind="profile",
            key="transcript",
            value=profile.to_dict(),
            source="transcript_upload"
        )
        
        # Validate profile
        is_valid, issues = transcript_ingester.validate_profile(profile)
        
        return {
            "profile": profile.to_dict(),
            "validation": {
                "is_valid": is_valid,
                "issues": issues
            },
            "message": "Transcript ingested successfully" if is_valid else "Transcript ingested with validation issues"
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Transcript ingestion failed: {str(e)}"}
        )

@app.get("/me/profile")
async def get_user_profile(user_id: str):
    """Get user's complete profile including transcript and goals."""
    try:
        profile = await advisor_memory.get_profile(user_id)
        return profile
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Profile retrieval failed: {str(e)}"}
        )

# SmartCourse Intelligence Endpoints

@app.post("/smartcourse/qa")
async def smartcourse_qa(req: SmartCourseQARequest):
    """Enhanced Q&A with SmartCourse intelligence features."""
    if not SMARTCOURSE_ENABLED:
        return JSONResponse(
            status_code=501,
            content={"error": "SmartCourse integration not available"}
        )
    
    try:
        result = await smartcourse_handler.enhanced_qa_endpoint(
            question=req.question,
            profile_json=req.profile_json,
            context_mode=req.context_mode,
            enable_metrics=req.enable_metrics,
            llm_client=None  # Would integrate with actual LLM client
        )
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"SmartCourse QA failed: {str(e)}"}
        )

@app.post("/smartcourse/ablation")
async def smartcourse_ablation(req: QARequest):
    """Run SmartCourse context ablation study."""
    if not SMARTCOURSE_ENABLED:
        return JSONResponse(
            status_code=501,
            content={"error": "SmartCourse integration not available"}
        )
    
    if not req.profile_json:
        raise HTTPException(400, "Profile data required for ablation study")
    
    try:
        result = await smartcourse_handler.context_ablation_study(
            question=req.question,
            profile_json=req.profile_json,
            llm_client=None
        )
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Ablation study failed: {str(e)}"}
        )

@app.get("/smartcourse/insights/{user_id}")
async def smartcourse_insights(user_id: str, time_window: Optional[int] = None):
    """Get SmartCourse quality insights for a user."""
    if not SMARTCOURSE_ENABLED:
        return JSONResponse(
            status_code=501,
            content={"error": "SmartCourse integration not available"}
        )
    
    try:
        result = await smartcourse_handler.get_quality_insights(
            student_id=user_id,
            time_window_hours=time_window
        )
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Quality insights failed: {str(e)}"}
        )

@app.get("/smartcourse/analytics")
async def smartcourse_analytics():
    """Get SmartCourse performance analytics."""
    if not SMARTCOURSE_ENABLED:
        return JSONResponse(
            status_code=501,
            content={"error": "SmartCourse integration not available"}
        )
    
    try:
        result = await smartcourse_handler.get_performance_analytics()
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Analytics failed: {str(e)}"}
        )

@app.post("/smartcourse/track-interaction")
async def track_interaction(
    recommendation_id: str,
    interaction_type: str,
    student_id: str
):
    """Track recommendation interaction for learning."""
    if not SMARTCOURSE_ENABLED:
        return JSONResponse(
            status_code=501,
            content={"error": "SmartCourse integration not available"}
        )
    
    try:
        result = await smartcourse_handler.track_recommendation_interaction(
            recommendation_id=recommendation_id,
            interaction_type=interaction_type,
            student_id=student_id
        )
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Interaction tracking failed: {str(e)}"}
        )

@app.exception_handler(Exception)
async def any_err(req: Request, exc: Exception):
    msg = str(exc)
    if "missing_gemini_api_key" in msg:
        return JSONResponse(status_code=400, content={"error":"Missing GEMINI_API_KEY; set it in .env"})
    if "t2sql_fallback_exhausted_and_no_llm" in msg:
        return JSONResponse(status_code=400, content={"error":"No LLM and no fallback matched. Set LLM_PROVIDER=gemini and GEMINI_API_KEY."})
    return JSONResponse(status_code=500, content={"error": msg[:500]})

