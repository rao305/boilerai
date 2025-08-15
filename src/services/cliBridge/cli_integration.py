#!/usr/bin/env python3
"""
CLI Integration Wrapper
Provides a clean interface to the CLI BoilerAI system
"""

import os
import sys
import json
import logging
from typing import Dict, Any, Optional, List

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CLIIntegration:
    """Wrapper for CLI BoilerAI system with enhanced functionality"""
    
    def __init__(self):
        self.ai_engine = None
        self.conversation_manager = None
        self.knowledge_base = None
        self.is_initialized = False
        
        # Initialize systems
        self._initialize_systems()
    
    def _initialize_systems(self):
        """Initialize CLI systems with error handling"""
        try:
            # Add CLI bot path - try multiple possible locations
            possible_paths = [
                os.path.join(os.path.dirname(__file__), '..', '..', 'cli test1', 'my_cli_bot'),
                os.path.join(os.getcwd(), 'src', 'cli test1', 'my_cli_bot'),
                os.path.join(os.path.dirname(__file__), '..', '..', '..', 'cli test1', 'my_cli_bot')
            ]
            
            cli_bot_path = None
            for path in possible_paths:
                abs_path = os.path.abspath(path)
                if os.path.exists(abs_path):
                    cli_bot_path = abs_path
                    break
            
            if cli_bot_path:
                if cli_bot_path not in sys.path:
                    sys.path.insert(0, cli_bot_path)
                logger.info(f"✅ Found CLI bot at: {cli_bot_path}")
            else:
                logger.warning("⚠️ CLI bot path not found, checking possible locations:")
                for path in possible_paths:
                    logger.warning(f"   Checked: {os.path.abspath(path)}")
                    
            # Change working directory to CLI bot for data files
            if cli_bot_path:
                os.chdir(cli_bot_path)
            
            # Import CLI components
            try:
                from simple_boiler_ai import SimpleBoilerAI
                from intelligent_conversation_manager import IntelligentConversationManager
                
                # Initialize AI engine
                if os.environ.get("OPENAI_API_KEY"):
                    self.ai_engine = SimpleBoilerAI()
                    self.conversation_manager = IntelligentConversationManager()
                    logger.info("✅ CLI systems initialized successfully")
                    self.is_initialized = True
                else:
                    logger.warning("⚠️ OPENAI_API_KEY not set - running in limited mode")
                    
            except ImportError as e:
                logger.error(f"❌ Failed to import CLI components: {e}")
                
        except Exception as e:
            logger.error(f"❌ System initialization failed: {e}")
    
    def load_knowledge_base(self) -> Optional[Dict]:
        """Load the CLI knowledge base"""
        try:
            knowledge_path = os.path.join(
                os.path.dirname(__file__), 
                '..', '..', 
                'cli test1', 'my_cli_bot', 'data', 
                'cs_knowledge_graph.json'
            )
            
            if os.path.exists(knowledge_path):
                with open(knowledge_path, 'r') as f:
                    self.knowledge_base = json.load(f)
                logger.info(f"✅ Loaded knowledge base with {len(self.knowledge_base.get('courses', {}))} courses")
                return self.knowledge_base
            else:
                logger.warning(f"⚠️ Knowledge base not found at {knowledge_path}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to load knowledge base: {e}")
            return None
    
    def process_chat_message(self, message: str, user_id: str = "anonymous") -> str:
        """Process a chat message through the CLI system"""
        try:
            # Try conversation manager first (maintains context)
            if self.conversation_manager:
                return self.conversation_manager.process_query(user_id, message)
            
            # Fallback to simple AI engine
            elif self.ai_engine:
                return self.ai_engine.process_query(message)
            
            # Ultimate fallback
            else:
                return self._get_fallback_response(message)
                
        except Exception as e:
            logger.error(f"❌ Chat processing failed: {e}")
            return f"I encountered an error processing your request: {str(e)}"
    
    def get_course_info(self, course_code: str) -> Optional[Dict]:
        """Get detailed course information"""
        try:
            if not self.knowledge_base:
                self.load_knowledge_base()
            
            if self.knowledge_base and 'courses' in self.knowledge_base:
                return self.knowledge_base['courses'].get(course_code)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get course info for {course_code}: {e}")
            return None
    
    def get_prerequisite_chain(self, course_code: str) -> List[str]:
        """Get prerequisite chain for a course"""
        try:
            if not self.knowledge_base:
                self.load_knowledge_base()
            
            chain = []
            if self.knowledge_base and 'prerequisites' in self.knowledge_base:
                prereqs = self.knowledge_base['prerequisites'].get(course_code, [])
                chain.extend(prereqs)
            
            return chain
            
        except Exception as e:
            logger.error(f"❌ Failed to get prerequisite chain for {course_code}: {e}")
            return []
    
    def get_graduation_scenarios(self, student_profile: Dict) -> Dict:
        """Get graduation scenarios for a student"""
        try:
            # This would integrate with the CLI's graduation planner
            scenarios = {
                "early_graduation": {
                    "possible": True,
                    "timeline": "3.5 years",
                    "requirements": ["Summer courses", "18+ credit semesters", "AP credits"]
                },
                "standard_graduation": {
                    "possible": True,
                    "timeline": "4 years",
                    "requirements": ["Standard course load", "No major setbacks"]
                },
                "extended_graduation": {
                    "reasons": ["Course failures", "CODO process", "Part-time enrollment"],
                    "timeline": "4.5-5 years"
                }
            }
            
            return scenarios
            
        except Exception as e:
            logger.error(f"❌ Failed to get graduation scenarios: {e}")
            return {}
    
    def update_user_context(self, user_id: str, context: Dict):
        """Update user context in conversation manager"""
        try:
            if self.conversation_manager:
                # Convert context dict to string for the conversation manager
                context_str = json.dumps(context, indent=2)
                self.conversation_manager.update_user_context(user_id, context_str)
                logger.info(f"✅ Updated context for user {user_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to update user context: {e}")
    
    def _get_fallback_response(self, message: str) -> str:
        """Provide intelligent fallback responses"""
        message_lower = message.lower()
        
        # Course-related queries
        if any(word in message_lower for word in ['cs 180', 'cs180', 'programming']):
            return "CS 18000 (Problem Solving and Object-Oriented Programming) is the foundational programming course for CS majors. It covers Java programming, object-oriented design, and problem-solving techniques. Prerequisites include high school programming experience or CS 17700."
        
        elif any(word in message_lower for word in ['cs 251', 'cs251', 'data structures']):
            return "CS 25100 (Data Structures and Algorithms) covers fundamental data structures like arrays, linked lists, stacks, queues, trees, and graphs, plus algorithmic analysis. Prerequisites: CS 18000 and CS 18200."
        
        elif any(word in message_lower for word in ['codo', 'change major']):
            return "CODO (Change of Degree Objective) to Computer Science requires: 2.75+ GPA, CS 18000 with B+ or better, required math courses with B+ or better, and available space in the program. Apply during designated CODO periods."
        
        elif any(word in message_lower for word in ['graduation', 'graduate']):
            return "Typical CS graduation timeline is 4 years (8 semesters). Early graduation in 3-3.5 years is possible with summer courses and higher course loads. I can help you plan your specific timeline!"
        
        elif any(word in message_lower for word in ['track', 'specialization', 'machine intelligence', 'software engineering']):
            return "CS offers two tracks: Machine Intelligence (AI/ML focus) and Software Engineering (industry development focus). You choose your track in junior year after completing foundation courses."
        
        else:
            return "I'm your BoilerAI academic advisor! I can help with course planning, graduation timelines, CODO requirements, and CS track information. What would you like to know about your academic journey?"
    
    def get_system_status(self) -> Dict:
        """Get system status information"""
        return {
            "initialized": self.is_initialized,
            "ai_engine_available": self.ai_engine is not None,
            "conversation_manager_available": self.conversation_manager is not None,
            "knowledge_base_loaded": self.knowledge_base is not None,
            "openai_configured": bool(os.environ.get("OPENAI_API_KEY"))
        }