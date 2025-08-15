"""
Pure AI Fallback System - No hardcoded messages, everything AI-generated
Replaces all hardcoded fallback responses with AI-generated contextual responses
"""

import os
import openai
from typing import Dict, Any, Optional
import logging

# Import the comprehensive AI fallback system
from python_pure_ai_fallback import python_ai_fallback, generate_ai_response, handle_error_with_ai, AIContext

logger = logging.getLogger(__name__)

class PureAIFallbackSystem:
    """
    Pure AI-powered fallback system that generates contextual responses
    for all error conditions, offline states, and fallback scenarios.
    """
    
    def __init__(self):
        self.client = None
        self.initialized = False
        self._initialize_openai()
    
    def _initialize_openai(self) -> bool:
        """Initialize OpenAI client for fallback responses"""
        try:
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                logger.warning("No OpenAI API key available for AI fallback system")
                return False
            
            self.client = openai.OpenAI(api_key=api_key)
            self.initialized = True
            logger.info("AI fallback system initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize AI fallback system: {e}")
            return False
    
    def reinitialize(self, api_key: Optional[str] = None) -> bool:
        """Reinitialize with new API key"""
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
        
        self.initialized = False
        return self._initialize_openai()
    
    async def generate_contextual_response(
        self, 
        user_message: str, 
        context: Dict[str, Any]
    ) -> str:
        """Generate AI-powered contextual response based on situation"""
        
        if not self.initialized:
            if not self._initialize_openai():
                return await handle_error_with_ai('api_unavailable', user_message, service_type)
        
        try:
            system_prompt = self._build_system_prompt(context)
            
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"AI fallback generation failed: {e}")
            return await handle_error_with_ai('general', user_message, service_type)
    
    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build dynamic system prompt based on context"""
        
        prompt = "You are BoilerAI, an academic advisor for Purdue University students. "
        
        # Add context about current system state
        service_status = context.get("service_status", "unknown")
        if service_status == "offline":
            prompt += "The main AI system is currently offline. "
        elif service_status == "limited":
            prompt += "You're running in limited mode. "
        elif service_status == "error":
            prompt += "There was a system error. "
        
        # Add specific error context
        error_context = context.get("error_context", "")
        if error_context:
            prompt += f"Context: {error_context}. "
        
        # Core instructions
        prompt += """
Your role:
- Provide helpful academic guidance for Purdue undergraduate programs
- Be encouraging and supportive while being honest about limitations
- Focus on Computer Science, Data Science, and AI programs
- Never use technical jargon or mention system internals
- Keep responses conversational and helpful

Response guidelines:
- Acknowledge the current situation naturally
- Offer to help with what you can
- Ask clarifying questions to better assist
- Be warm and personable, not robotic
- Suggest alternative ways to get help if needed
- Never mention API keys, technical errors, or system details

Generate a natural, helpful response that addresses their query while being transparent about any current limitations."""

        return prompt
    
    async def generate_error_response(
        self, 
        original_message: str, 
        error_type: str, 
        additional_context: Optional[str] = None
    ) -> str:
        """Generate AI response for specific error types"""
        
        error_context_map = {
            "connection": "having trouble connecting to AI services",
            "api_key": "experiencing authentication issues",
            "rate_limit": "receiving high request volume",
            "quota": "approaching service limits",
            "general": "experiencing technical difficulties"
        }
        
        context = {
            "service_status": "error",
            "error_context": f"{error_context_map.get(error_type, 'experiencing issues')}"
        }
        
        if additional_context:
            context["error_context"] += f": {additional_context}"
        
        return await self.generate_contextual_response(original_message, context)
    
    async def generate_limited_mode_response(
        self, 
        user_message: str, 
        missing_capability: str
    ) -> str:
        """Generate response for limited mode scenarios"""
        
        context = {
            "service_status": "limited",
            "error_context": f"Missing capability: {missing_capability}"
        }
        
        return await self.generate_contextual_response(user_message, context)
    
    async def generate_offline_response(
        self, 
        user_message: str, 
        service_info: Optional[str] = None
    ) -> str:
        """Generate response for offline scenarios"""
        
        context = {
            "service_status": "offline",
            "error_context": service_info or "Main AI services are currently offline"
        }
        
        return await self.generate_contextual_response(user_message, context)
    
    def is_available(self) -> bool:
        """Check if AI fallback system is available"""
        return self.initialized

# Global instance
pure_ai_fallback = PureAIFallbackSystem()

def get_ai_generated_response(
    message: str, 
    context: Dict[str, Any] = None
) -> str:
    """
    Get AI-generated response instead of hardcoded fallback
    This replaces all the hardcoded get_fallback_response functions
    """
    try:
        import asyncio
        
        # Default context if none provided
        if context is None:
            context = {
                "service_status": "limited",
                "error_context": "Running in fallback mode"
            }
        
        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            response = loop.run_until_complete(
                pure_ai_fallback.generate_contextual_response(message, context)
            )
            return response
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to generate AI response: {e}")
        return await handle_error_with_ai('general', user_message, service_type)

async def get_ai_error_response(
    message: str, 
    error_type: str, 
    additional_context: str = None
) -> str:
    """Get AI-generated error response"""
    try:
        import asyncio
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            response = loop.run_until_complete(
                pure_ai_fallback.generate_error_response(message, error_type, additional_context)
            )
            return response
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Failed to generate AI error response: {e}")
        return await handle_error_with_ai(error_type, message, service_type)

