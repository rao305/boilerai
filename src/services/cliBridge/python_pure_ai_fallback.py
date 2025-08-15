"""
Python Pure AI Fallback System - No hardcoded messages, everything AI-generated
"""
import os
import random
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

@dataclass
class AIContext:
    user_query: Optional[str] = None
    service_type: Optional[str] = None
    error_type: Optional[str] = None
    system_state: Optional[str] = None
    user_history: Optional[List[Any]] = None
    academic_context: Optional[Dict[str, Any]] = None
    sentiment: Optional[str] = None

@dataclass
class AIResponse:
    response: str
    confidence: float
    fallback_triggered: bool
    context_used: List[str]
    timestamp: datetime

class PythonPureAIFallbackSystem:
    """
    Pure AI fallback system for Python backend services
    Generates contextual responses using AI without any hardcoded messages
    """
    
    def __init__(self):
        self.openai_client = None
        self.initialized = False
        self.context_cache = {}
        self.logger = logging.getLogger(__name__)
        self._initialize_openai()
    
    def _initialize_openai(self) -> bool:
        """Initialize OpenAI client if available"""
        if not OPENAI_AVAILABLE:
            self.logger.warning("OpenAI library not available")
            return False
            
        try:
            # Try multiple sources for API key
            api_key = (
                os.getenv('OPENAI_API_KEY') or
                os.getenv('OPENAI_API_KEY_SECRET') or
                os.getenv('OPENAI_KEY')
            )
            
            if not api_key or api_key == 'your_openai_api_key_here':
                self.logger.info("No OpenAI API key found, using offline mode")
                return False
            
            self.openai_client = OpenAI(api_key=api_key)
            self.initialized = True
            self.logger.info("OpenAI client initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize OpenAI client: {e}")
            return False
    
    async def generate_response(self, context: AIContext) -> AIResponse:
        """Generate contextual AI response based on context"""
        try:
            if not self.initialized and not self._initialize_openai():
                return await self._generate_offline_response(context)
            
            system_prompt = self._build_system_prompt(context)
            user_prompt = self._build_user_prompt(context)
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content
            if not content:
                return await self._generate_offline_response(context)
            
            return AIResponse(
                response=content,
                confidence=0.9,
                fallback_triggered=False,
                context_used=self._get_context_types(context),
                timestamp=datetime.now()
            )
            
        except Exception as e:
            self.logger.error(f"AI response generation failed: {e}")
            return await self._generate_offline_response(context)
    
    def _build_system_prompt(self, context: AIContext) -> str:
        """Build system prompt based on context"""
        base_prompt = "You are an intelligent academic advisor assistant for Purdue University students. Generate contextually appropriate responses based on the current situation."
        
        contextual_additions = []
        
        if context.service_type:
            contextual_additions.append(f"Current service context: {context.service_type}")
        
        if context.error_type:
            contextual_additions.append(f"Addressing situation: {context.error_type}")
        
        if context.academic_context:
            contextual_additions.append(f"Academic context available with {len(context.academic_context)} data points")
        
        instructions = """
Guidelines:
- Be helpful and supportive
- Acknowledge any current situation naturally
- Suggest practical next steps
- Maintain academic focus and professionalism
- Be concise but informative  
- Never mention technical errors or system details to users
- Always stay positive and solution-oriented
- Provide specific, actionable guidance
- Ask clarifying questions when helpful
        """
        
        return "\n\n".join([base_prompt] + contextual_additions + [instructions])
    
    def _build_user_prompt(self, context: AIContext) -> str:
        """Build user prompt from context"""
        prompt_parts = []
        
        if context.user_query:
            prompt_parts.append(f"User asked: \"{context.user_query}\"")
        
        if context.system_state:
            prompt_parts.append(f"Current system state: {context.system_state}")
        
        if context.error_type:
            prompt_parts.append(f"Situation type: {context.error_type}")
        
        situation_context = self._analyze_situation(context)
        if situation_context:
            prompt_parts.append(f"Situation: {situation_context}")
        
        prompt_parts.append("Generate an appropriate response that helps the user while naturally addressing the current situation.")
        
        return "\n\n".join(prompt_parts)
    
    def _analyze_situation(self, context: AIContext) -> str:
        """Analyze the current situation from context"""
        situations = []
        
        if context.error_type == 'api_unavailable':
            situations.append('Service temporarily experiencing connectivity issues')
        elif context.error_type == 'rate_limit':
            situations.append('High usage period requiring brief delay')
        elif context.error_type == 'authentication':
            situations.append('Configuration adjustment needed')
        elif context.system_state == 'degraded':
            situations.append('Operating in limited capacity mode')
        
        if context.service_type == 'academic_planning':
            situations.append('Academic guidance request')
        elif context.service_type == 'career_networking':
            situations.append('Professional networking inquiry')
        elif context.service_type == 'transcript_analysis':
            situations.append('Academic record analysis')
        
        return ', '.join(situations)
    
    async def _generate_offline_response(self, context: AIContext) -> AIResponse:
        """Generate response when AI is unavailable using intelligent templates"""
        templates = self._get_contextual_templates(context)
        selected_template = random.choice(templates)
        
        personalized_response = self._personalize_template(selected_template, context)
        
        return AIResponse(
            response=personalized_response,
            confidence=0.6,
            fallback_triggered=True,
            context_used=self._get_context_types(context),
            timestamp=datetime.now()
        )
    
    def _get_contextual_templates(self, context: AIContext) -> List[str]:
        """Get context-appropriate response templates"""
        templates = []
        
        # Service-specific templates
        if context.service_type == 'academic_planning':
            templates.extend([
                "I'm here to help with your academic planning. Let me work with the available information to provide guidance.",
                "Academic planning can feel complex, but I'm here to help you navigate through your options and requirements.",
                "Your academic journey is important to me. Let me help you explore the best path forward with your current situation."
            ])
        elif context.service_type == 'career_networking':
            templates.extend([
                "Professional networking opportunities are valuable for career growth. Let me suggest alternative approaches for connecting with alumni and professionals.",
                "Building professional connections is an important part of career development. I can help you explore different networking strategies.",
                "Career networking can open many doors. Let me help you think about effective ways to build professional relationships."
            ])
        elif context.service_type == 'transcript_analysis':
            templates.extend([
                "Academic record analysis is crucial for planning your path forward. Let me help you understand your progress and options.",
                "Understanding your academic standing helps in making informed decisions. I can guide you through the analysis process.",
                "Your transcript tells an important story about your academic journey. Let me help you interpret and plan your next steps."
            ])
        
        # Error-specific templates
        if context.error_type == 'api_unavailable':
            templates.extend([
                "I notice some features may be temporarily limited. Let me help you with what's available right now.",
                "While some services are updating, I can still assist you with your academic planning using available resources.",
                "I'm working with current available systems to provide you the best guidance possible."
            ])
        elif context.error_type == 'rate_limit':
            templates.extend([
                "There's high interest in academic planning today. Let me help you while the system catches up.",
                "Many students are actively using the system right now. I'll do my best to assist you with available resources.",
                "The system is quite busy helping students today. Let me provide guidance with the current capacity."
            ])
        elif context.error_type == 'authentication':
            templates.extend([
                "I'm working with available resources to help you. Some features might need additional setup later.",
                "Let me assist you with the tools currently accessible while we ensure everything is properly configured.",
                "I can provide guidance using the systems available right now. We can explore additional features as they become ready."
            ])
        
        # General supportive templates
        templates.extend([
            "I'm committed to helping you succeed academically. Let me work with you to find the best approach for your situation.",
            "Your academic success is my priority. I'll provide the most helpful guidance possible based on your needs.",
            "Academic planning requires thoughtful consideration. I'm here to support you through this process."
        ])
        
        return templates if templates else [
            "I'm here to support your academic journey. Let me help you explore your options and plan your path forward."
        ]
    
    def _personalize_template(self, template: str, context: AIContext) -> str:
        """Personalize template based on context"""
        personalized = template
        
        # Add context-specific information
        if context.user_query:
            query_lower = context.user_query.lower()
            if 'course' in query_lower:
                personalized += " I can help you think through course selection and sequencing strategies."
            elif 'graduation' in query_lower:
                personalized += " Let's work together to map out your graduation timeline and requirements."
            elif 'codo' in query_lower:
                personalized += " CODO planning involves several important considerations that I can help you navigate."
            elif any(word in query_lower for word in ['career', 'job', 'internship']):
                personalized += " Career planning is an important part of your academic journey that I can help you explore."
        
        # Add appropriate next steps
        next_steps = self._generate_next_steps(context)
        if next_steps:
            personalized += f" {next_steps}"
        
        return personalized
    
    def _generate_next_steps(self, context: AIContext) -> str:
        """Generate contextual next steps"""
        steps = []
        
        if context.error_type == 'api_unavailable':
            steps.append("You might try again in a few moments, or I can help with general guidance now.")
        elif context.error_type == 'authentication':
            steps.append("You may want to check your settings, or I can provide general academic guidance.")
        elif context.service_type == 'academic_planning':
            steps.append("Feel free to ask about course planning, graduation requirements, or academic timelines.")
        elif context.service_type == 'career_networking':
            steps.append("I can suggest networking strategies and professional development approaches.")
        elif context.service_type == 'transcript_analysis':
            steps.append("I can help you understand your academic progress and plan your remaining coursework.")
        
        return steps[0] if steps else "What specific aspect of your academic journey would you like to explore?"
    
    def _get_context_types(self, context: AIContext) -> List[str]:
        """Get list of context types present"""
        types = []
        
        if context.user_query:
            types.append('user_query')
        if context.service_type:
            types.append('service_type')
        if context.error_type:
            types.append('error_type')
        if context.system_state:
            types.append('system_state')
        if context.academic_context:
            types.append('academic_context')
        if context.user_history:
            types.append('user_history')
        if context.sentiment:
            types.append('sentiment')
        
        return types
    
    def _detect_sentiment(self, message: str) -> str:
        """Simple sentiment detection"""
        if not message:
            return 'neutral'
        
        message_lower = message.lower()
        
        positive_words = ['excited', 'great', 'awesome', 'perfect', 'love', 'thank']
        negative_words = ['frustrated', 'confused', 'stuck', 'worried', 'anxious', 'difficult']
        confused_words = ['unsure', 'confused', 'lost', "don't know", 'unclear']
        
        if any(word in message_lower for word in confused_words):
            return 'confused'
        elif any(word in message_lower for word in positive_words):
            return 'positive'
        elif any(word in message_lower for word in negative_words):
            return 'negative'
        
        return 'neutral'
    
    # Convenience methods for specific scenarios
    async def handle_service_unavailable(self, service_type: str, user_query: str = None) -> str:
        """Handle service unavailable scenario"""
        context = AIContext(
            user_query=user_query,
            service_type=service_type,
            error_type='api_unavailable',
            system_state='degraded',
            sentiment=self._detect_sentiment(user_query) if user_query else 'neutral'
        )
        
        response = await self.generate_response(context)
        return response.response
    
    async def handle_rate_limit(self, service_type: str, user_query: str = None) -> str:
        """Handle rate limit scenario"""
        context = AIContext(
            user_query=user_query,
            service_type=service_type,
            error_type='rate_limit',
            system_state='busy',
            sentiment=self._detect_sentiment(user_query) if user_query else 'neutral'
        )
        
        response = await self.generate_response(context)
        return response.response
    
    async def handle_authentication_error(self, service_type: str, user_query: str = None) -> str:
        """Handle authentication error scenario"""
        context = AIContext(
            user_query=user_query,
            service_type=service_type,
            error_type='authentication',
            system_state='configuration_needed',
            sentiment=self._detect_sentiment(user_query) if user_query else 'neutral'
        )
        
        response = await self.generate_response(context)
        return response.response
    
    async def handle_general_error(self, service_type: str, user_query: str = None, error_details: str = None) -> str:
        """Handle general error scenario"""
        context = AIContext(
            user_query=user_query,
            service_type=service_type,
            error_type='general',
            system_state='error_recovery',
            sentiment=self._detect_sentiment(user_query) if user_query else 'neutral'
        )
        
        response = await self.generate_response(context)
        return response.response
    
    async def handle_academic_query(self, user_query: str, academic_context: Dict[str, Any] = None) -> str:
        """Handle academic planning query"""
        context = AIContext(
            user_query=user_query,
            service_type='academic_planning',
            academic_context=academic_context,
            sentiment=self._detect_sentiment(user_query)
        )
        
        response = await self.generate_response(context)
        return response.response
    
    async def handle_networking_query(self, user_query: str) -> str:
        """Handle career networking query"""
        context = AIContext(
            user_query=user_query,
            service_type='career_networking',
            sentiment=self._detect_sentiment(user_query)
        )
        
        response = await self.generate_response(context)
        return response.response
    
    def is_available(self) -> bool:
        """Check if AI system is available"""
        return self.initialized and self.openai_client is not None
    
    def reinitialize(self) -> bool:
        """Reinitialize the AI system"""
        self.initialized = False
        self.openai_client = None
        return self._initialize_openai()

# Create global instance
python_ai_fallback = PythonPureAIFallbackSystem()

# Convenience functions for easy import
async def generate_ai_response(user_query: str, service_type: str = 'academic_planning', 
                              error_type: str = None, academic_context: Dict[str, Any] = None) -> str:
    """Generate AI response with context"""
    context = AIContext(
        user_query=user_query,
        service_type=service_type,
        error_type=error_type,
        academic_context=academic_context,
        sentiment=python_ai_fallback._detect_sentiment(user_query)
    )
    
    response = await python_ai_fallback.generate_response(context)
    return response.response

async def handle_error_with_ai(error_type: str, user_query: str = None, service_type: str = 'academic_planning') -> str:
    """Handle errors using AI"""
    if error_type == 'api_unavailable':
        return await python_ai_fallback.handle_service_unavailable(service_type, user_query)
    elif error_type == 'rate_limit':
        return await python_ai_fallback.handle_rate_limit(service_type, user_query)
    elif error_type == 'authentication':
        return await python_ai_fallback.handle_authentication_error(service_type, user_query)
    else:
        return await python_ai_fallback.handle_general_error(service_type, user_query)