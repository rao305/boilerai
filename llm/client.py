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
    """Handle general chat with academic advisor persona and knowledge boundaries"""
    # Use provided provider or fall back to environment/global
    provider = (provider or _PROVIDER).lower()
    if provider != "gemini": raise RuntimeError("llm_provider_none_or_unsupported")
    
    import google.generativeai as genai
    # Use provided API key or fall back to environment variable
    key = api_key or os.getenv("GEMINI_API_KEY","")
    if not key: raise RuntimeError("missing_gemini_api_key")
    
    genai.configure(api_key=key)
    model_name = model or os.getenv("GEMINI_MODEL","gemini-2.0-flash-exp")
    
    # Academic advisor system instruction
    system_instruction = """You are a Computer Science Academic Advisor at Purdue University.

Your expertise covers:
- Computer Science major requirements and course information  
- Machine Intelligence (MI) and Software Engineering (SE) tracks
- CS course prerequisites and sequencing
- CS program policies and graduation requirements

CRITICAL LIMITATIONS:
- You ONLY have information about the Computer Science program
- You do NOT have information about Data Science or AI programs as standalone majors
- You cannot advise on non-CS programs

When students ask about programs outside CS (like Data Science or AI majors), respond with:
"I'm a Computer Science academic advisor, and I only have detailed information about the CS program with its Machine Intelligence and Software Engineering tracks. For other programs, you'll need to contact those specific departments."

Always be specific about CS courses (use course codes like CS 180, CS 182) and clearly distinguish between the CS program's tracks versus other standalone programs."""
    
    # Create model with academic advisor persona
    gmodel = genai.GenerativeModel(
        model_name=model_name, 
        system_instruction=system_instruction
    )
    resp = gmodel.generate_content([user_message], generation_config={"temperature":0.3,"top_p":0.9,"top_k":40})
    return (resp.text or "I'm sorry, I couldn't generate a response. As your CS academic advisor, please feel free to ask about Computer Science program requirements.").strip()