from __future__ import annotations
import os, json
from typing import List, Dict, Any

_PROVIDER = os.getenv("LLM_PROVIDER","none").lower()

def _json_only(text: str) -> dict:
    start = text.find("{"); end = text.rfind("}")
    if start < 0 or end < 0 or end <= start: raise ValueError("llm_output_no_json")
    return json.loads(text[start:end+1])

def call_llm(system: str, user: str, fewshots: List[tuple[str, dict]]|None=None, model: str|None=None, provider: str|None=None, api_key: str|None=None) -> Dict[str,Any]:
    fewshots = fewshots or []
    # Use provided provider or fall back to environment/global
    provider = (provider or _PROVIDER).lower()
    if provider != "gemini": raise RuntimeError("llm_provider_none_or_unsupported")
    
    import google.generativeai as genai
    # Use provided API key or fall back to environment variable
    key = api_key or os.getenv("GEMINI_API_KEY","")
    if not key: raise RuntimeError("missing_gemini_api_key")
    
    genai.configure(api_key=key)
    model_name = model or os.getenv("GEMINI_MODEL","gemini-2.0-flash-exp")
    sys = system.strip()
    shots = "".join([f"\n\nUSER:\n{u}\nASSISTANT(JSON only):\n{json.dumps(js, ensure_ascii=False)}" for u,js in fewshots])
    prompt = f"{sys}\n\nReturn ONLY a JSON object, no code fences.{shots}\n\nUSER:\n{user}\nASSISTANT(JSON only):"
    gmodel = genai.GenerativeModel(model_name=model_name, system_instruction=sys)
    resp = gmodel.generate_content([prompt], generation_config={"temperature":0.2,"top_p":0.9,"top_k":40})
    text = (resp.text or "").strip()
    if os.getenv("LLM_JSON_STRICT","1") == "1":
        return json.loads(text)
    return _json_only(text)

def call_general_chat(user_message: str, provider: str|None=None, api_key: str|None=None, model: str|None=None) -> str:
    """Handle general chat without JSON parsing"""
    # Use provided provider or fall back to environment/global
    provider = (provider or _PROVIDER).lower()
    if provider != "gemini": raise RuntimeError("llm_provider_none_or_unsupported")
    
    import google.generativeai as genai
    # Use provided API key or fall back to environment variable
    key = api_key or os.getenv("GEMINI_API_KEY","")
    if not key: raise RuntimeError("missing_gemini_api_key")
    
    genai.configure(api_key=key)
    model_name = model or os.getenv("GEMINI_MODEL","gemini-2.0-flash-exp")
    
    # Simple chat without JSON requirements
    gmodel = genai.GenerativeModel(model_name=model_name)
    resp = gmodel.generate_content([user_message], generation_config={"temperature":0.7,"top_p":0.9,"top_k":40})
    return (resp.text or "I'm sorry, I couldn't generate a response.").strip()