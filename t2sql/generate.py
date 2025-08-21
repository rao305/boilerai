from __future__ import annotations
import os, re
from typing import Dict, Any
from t2sql.prompts import SYSTEM_T2SQL, FEWSHOTS, COURSE_ID_REGEX
from llm.client import call_llm

def _normalize_course_id(text: str) -> str | None:
    import re
    m = re.search(COURSE_ID_REGEX, text, flags=re.I)
    if not m: return None
    core = re.sub(r"[\s-]","", m.group(0).upper())
    if re.fullmatch(r"[A-Z]{2,4}\d{5}", core): return core
    num = re.sub(r"\D","", core); prefix = re.sub(r"\d","", core)
    if len(num) == 3: num += "00"
    return f"{prefix}{num}"

def _fallback_ast(question: str) -> Dict[str,Any] | None:
    q = question.lower(); cid = _normalize_course_id(question)
    if "prereq" in q and cid:
        return {"select":["p.kind","p.expr","p.min_grade"],"from":"prereqs p","joins":[],
                "where":[{"op":"=","left":"p.major_id","right":{"value":"CS"}},
                         {"op":"=","left":"p.dst_course","right":{"param":"course_id"}}],
                "group_by":[],"order_by":[],"limit":100,"params":{"course_id":cid}}
    if ("tell me about" in q or "description" in q or "more about" in q) and cid:
        return {"select":["c.id","c.title","c.credits","cd.description"],
                "from":"courses c",
                "joins":[{"table":"course_details cd","on":"cd.course_id = c.id","type":"left"}],
                "where":[{"op":"=","left":"c.id","right":{"param":"course_id"}}],
                "group_by":[],"order_by":[],"limit":1,"params":{"course_id":cid}}
    return None

def generate_ast(question: str) -> Dict[str,Any]:
    provider = os.getenv("LLM_PROVIDER","none").lower()
    if provider == "none":
        ast = _fallback_ast(question)
        if ast: return ast
        raise RuntimeError("t2sql_fallback_exhausted_and_no_llm")
    try:
        return call_llm(SYSTEM_T2SQL, question, FEWSHOTS)
    except Exception:
        ast = _fallback_ast(question)
        if ast: return ast
        raise