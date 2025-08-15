#!/usr/bin/env python3
"""
Career Networking Integration for Hybrid AI System
Provides professional networking and alumni discovery capabilities
"""

import asyncio
import json
import os
import logging
from typing import Dict, Any, Optional, List
from feature_flags import is_career_networking_enabled

logger = logging.getLogger(__name__)

class CareerNetworkingService:
    """Service for handling career networking queries"""
    
    def __init__(self):
        self.clado_api_key = os.environ.get("CLADO_API_KEY")
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.enabled = is_career_networking_enabled()
    
    def is_available(self) -> bool:
        """Check if career networking is available"""
        return self.enabled and bool(self.clado_api_key)
    
    def is_career_query(self, query: str) -> bool:
        """Determine if a query is career/networking related"""
        career_keywords = [
            'alumni', 'networking', 'career', 'job', 'internship', 'mentor',
            'professional', 'industry', 'company', 'employer', 'connection',
            'graduate', 'purdue grad', 'working at', 'employed at',
            'find someone', 'connect me', 'introduce me', 'know anyone'
        ]
        
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in career_keywords)
    
    def process_career_query(self, query: str, user_context: Dict[str, Any] = None) -> str:
        """Process a career networking query"""
        
        # Check if feature is enabled
        if not is_career_networking_enabled():
            return self._generate_disabled_response(query)
        
        # Check if we have necessary API keys
        if not self.is_available():
            return self._generate_unavailable_response(query)
        
        try:
            # Import simple clado client here to avoid import errors when not available
            from simple_clado_client import search_professionals_simple
            
            logger.info(f"Processing career networking query: {query[:50]}...")
            
            # Use the simple Clado client (no OpenAI required)
            result = search_professionals_simple(query)
            
            return result
            
        except ImportError:
            logger.warning("Simple Clado client not available")
            return self._generate_unavailable_response(query)
        except Exception as e:
            logger.error(f"Career networking error: {e}")
            return self._generate_error_response(query, str(e))
    
    def _generate_disabled_response(self, query: str) -> str:
        """Generate response when career networking is disabled"""
        return (
            "Career networking features are currently disabled. I'm focused on academic "
            "advising for your Purdue CS journey. I can help with course planning, "
            "graduation timelines, track selection, and CODO requirements. "
            "\n\nFor career networking and alumni connections, please contact your "
            "academic advisor or the Purdue CS Career Services team."
        )
    
    def _generate_unavailable_response(self, query: str) -> str:
        """Generate response when career networking is unavailable"""
        return (
            "I'd love to help you with career networking, but the alumni discovery "
            "service is currently unavailable. This could be due to API configuration "
            "or connectivity issues.\n\nIn the meantime, I recommend:"
            "\n• Checking the Purdue CS Alumni Network on LinkedIn"
            "\n• Contacting the CS Career Services office"
            "\n• Attending department networking events"
            "\n• Reaching out to professors for industry connections"
            "\n\nI'm still here to help with your academic planning and course selection!"
        )
    
    def _generate_error_response(self, query: str, error: str) -> str:
        """Generate response when there's an error"""
        return (
            "I encountered an issue while searching for professional connections. "
            "This might be a temporary problem with the networking service.\n\n"
            "Please try again in a few minutes, or contact support if the issue persists. "
            "I'm still available to help with your academic planning and course guidance!"
        )

# Global service instance
_career_service = None

def get_career_networking_service() -> CareerNetworkingService:
    """Get the global career networking service instance"""
    global _career_service
    if _career_service is None:
        _career_service = CareerNetworkingService()
    return _career_service

def process_career_query(query: str, user_context: Dict[str, Any] = None) -> Optional[str]:
    """Process career networking query if applicable"""
    service = get_career_networking_service()
    
    if service.is_career_query(query):
        return service.process_career_query(query, user_context)
    
    return None