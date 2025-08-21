from __future__ import annotations
import os
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from api_gateway.db import db_query
from router.intent import classify_intent
from router.router import route_to_handler
from planner.core import compute_plan
from t2sql.compiler import compile_ast_to_sql
from t2sql.generate import generate_ast

app = FastAPI(title="Boiler AI – Scaffold")

class QARequest(BaseModel):
    question: str
    profile_json: Optional[Dict[str, Any]] = None

class SQLRequest(BaseModel):
    ast: Dict[str, Any]

class PlanRequest(BaseModel):
    profile_json: Dict[str, Any]

@app.get("/healthz")
def healthz(): return {"ok": True}

@app.post("/qa")
def qa(req: QARequest):
    intent = classify_intent(req.question)
    dest = route_to_handler(intent, req.question)
    if dest == "planner":
        if not req.profile_json:
            raise HTTPException(400, "planner_requires_profile_json")
        return {"mode":"planner","plan": compute_plan(req.profile_json)}
    if dest == "t2sql":
        ast = generate_ast(req.question)
        sql, params = compile_ast_to_sql(ast)
        rows = db_query(sql, params)
        return {"mode":"t2sql","ast":ast,"sql":sql,"rows":rows}
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

@app.exception_handler(Exception)
async def any_err(req: Request, exc: Exception):
    msg = str(exc)
    if "missing_gemini_api_key" in msg:
        return JSONResponse(status_code=400, content={"error":"Missing GEMINI_API_KEY; set it in .env"})
    if "t2sql_fallback_exhausted_and_no_llm" in msg:
        return JSONResponse(status_code=400, content={"error":"No LLM and no fallback matched. Set LLM_PROVIDER=gemini and GEMINI_API_KEY."})
    return JSONResponse(status_code=500, content={"error": msg[:500]})

