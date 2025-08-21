"""
LLM Client for API Gateway - supports Gemini and OpenAI
"""

import os
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class LLMResponse:
    """Standardized LLM response"""
    content: str
    model: str
    usage_tokens: int = 0
    success: bool = True
    error: Optional[str] = None

class LLMClient:
    """Unified LLM client supporting Gemini and OpenAI"""
    
    def __init__(self):
        self.gemini_client = None
        self.openai_client = None
        
    def _init_gemini(self, api_key: str) -> bool:
        """Initialize Gemini client"""
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self.gemini_client = genai
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            return False
    
    def _init_openai(self, api_key: str) -> bool:
        """Initialize OpenAI client"""
        try:
            import openai
            self.openai_client = openai.OpenAI(api_key=api_key)
            return True
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI: {e}")
            return False
    
    def _extract_json_from_text(self, text: str) -> str:
        """Extract first JSON object from text"""
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("No JSON object found in response")
        return text[start:end+1]
    
    async def call_llm(
        self, 
        provider: str,
        api_key: str, 
        system_prompt: str, 
        user_message: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000
    ) -> LLMResponse:
        """
        Call LLM with provider-specific handling
        
        Args:
            provider: 'gemini' or 'openai'
            api_key: User's API key
            system_prompt: System instructions
            user_message: User query
            model: Specific model to use (optional)
            temperature: Generation temperature
            max_tokens: Maximum response tokens
        """
        provider = provider.lower()
        
        if provider == "gemini":
            return await self._call_gemini(api_key, system_prompt, user_message, model, temperature)
        elif provider == "openai":
            return await self._call_openai(api_key, system_prompt, user_message, model, temperature, max_tokens)
        else:
            return LLMResponse(
                content="", 
                model="error",
                success=False,
                error=f"Unsupported provider: {provider}"
            )
    
    async def _call_gemini(
        self, 
        api_key: str, 
        system_prompt: str, 
        user_message: str,
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> LLMResponse:
        """Call Gemini API"""
        try:
            if not self._init_gemini(api_key):
                return LLMResponse(
                    content="",
                    model="gemini-error",
                    success=False,
                    error="Failed to initialize Gemini client"
                )
            
            model_name = model or "gemini-1.5-flash"
            
            # Combine system prompt and user message for Gemini
            full_prompt = f"{system_prompt}\n\nUser Query: {user_message}\n\nRespond with valid JSON only:"
            
            genai_model = self.gemini_client.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt
            )
            
            response = genai_model.generate_content(
                full_prompt,
                generation_config={
                    "temperature": temperature,
                    "top_p": 0.9,
                    "top_k": 40,
                    "max_output_tokens": 1000
                }
            )
            
            content = response.text or ""
            if not content:
                return LLMResponse(
                    content="",
                    model=model_name,
                    success=False,
                    error="Empty response from Gemini"
                )
            
            # Try to extract JSON if response contains extra text
            try:
                json.loads(content)  # Validate it's already clean JSON
                final_content = content
            except json.JSONDecodeError:
                try:
                    final_content = self._extract_json_from_text(content)
                    json.loads(final_content)  # Validate extracted JSON
                except (ValueError, json.JSONDecodeError):
                    # Try one repair attempt
                    repair_prompt = f"Convert this to strict JSON only, no explanations:\n{content}"
                    repair_response = genai_model.generate_content(
                        repair_prompt,
                        generation_config={"temperature": 0.0}
                    )
                    final_content = self._extract_json_from_text(repair_response.text or "")
            
            return LLMResponse(
                content=final_content,
                model=model_name,
                usage_tokens=getattr(response, 'usage_metadata', {}).get('total_token_count', 0),
                success=True
            )
            
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return LLMResponse(
                content="",
                model=model or "gemini-1.5-flash",
                success=False,
                error=str(e)
            )
    
    async def _call_openai(
        self, 
        api_key: str, 
        system_prompt: str, 
        user_message: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000
    ) -> LLMResponse:
        """Call OpenAI API"""
        try:
            if not self._init_openai(api_key):
                return LLMResponse(
                    content="",
                    model="openai-error",
                    success=False,
                    error="Failed to initialize OpenAI client"
                )
            
            model_name = model or "gpt-3.5-turbo"
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            response = self.openai_client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"}  # Force JSON response
            )
            
            content = response.choices[0].message.content or ""
            if not content:
                return LLMResponse(
                    content="",
                    model=model_name,
                    success=False,
                    error="Empty response from OpenAI"
                )
            
            # Validate JSON
            try:
                json.loads(content)
            except json.JSONDecodeError as e:
                return LLMResponse(
                    content="",
                    model=model_name,
                    success=False,
                    error=f"Invalid JSON response: {e}"
                )
            
            return LLMResponse(
                content=content,
                model=model_name,
                usage_tokens=response.usage.total_tokens if response.usage else 0,
                success=True
            )
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return LLMResponse(
                content="",
                model=model or "gpt-3.5-turbo",
                success=False,
                error=str(e)
            )

# Global instance
llm_client = LLMClient()