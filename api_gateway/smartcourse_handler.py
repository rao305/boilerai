"""
SmartCourse Handler for API Gateway

Provides SmartCourse-inspired intelligence endpoints for the FastAPI gateway.
Integrates contextual routing, recommendation evaluation, and quality metrics.
"""

from fastapi import HTTPException, Request
from typing import Dict, List, Optional, Any
import time
import logging
import json
from datetime import datetime

# Import our SmartCourse components
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from router.contextual_router import (
    contextual_router, 
    create_student_context_from_profile,
    ContextMode,
    RoutingDecision
)
from advisor.recommendation_evaluator import (
    recommendation_evaluator,
    create_plan_context_from_profile
)
from advisor.contextual_advisor import (
    contextual_advisor,
    create_enhanced_advisory_prompt,
    evaluate_existing_recommendations
)

logger = logging.getLogger(__name__)

class SmartCourseHandler:
    """
    Enhanced handler that provides SmartCourse-level intelligence to the API gateway.
    
    Key features:
    - Contextual routing with transcript + degree plan awareness
    - Recommendation quality evaluation using SmartCourse metrics
    - Context ablation testing capabilities
    - Performance analytics and optimization
    """
    
    def __init__(self):
        self.request_count = 0
        self.total_response_time = 0.0
        self.quality_metrics_history = []
    
    async def enhanced_qa_endpoint(
        self, 
        question: str, 
        profile_json: Optional[Dict[str, Any]] = None,
        context_mode: str = "full",
        enable_metrics: bool = True,
        llm_client: Any = None
    ) -> Dict[str, Any]:
        """
        Enhanced Q&A endpoint with SmartCourse intelligence.
        
        Provides contextual routing, enhanced prompting, and quality evaluation.
        """
        
        start_time = time.time()
        self.request_count += 1
        
        try:
            # Create student context if profile is provided
            if profile_json:
                student_context = create_student_context_from_profile(profile_json)
                student_context.context_mode = ContextMode(context_mode)
                
                # Get intelligent routing decision
                routing_decision = contextual_router.route_query(question, student_context)
                
                # Build enhanced prompt for LLM
                enhanced_prompt = create_enhanced_advisory_prompt(
                    question, profile_json, context_mode
                )
                
                logger.info(f"SmartCourse routing: {routing_decision.handler} "
                           f"(confidence: {routing_decision.confidence:.2f})")
                
                # Generate response using the routed handler
                response_content = await self._generate_contextual_response(
                    enhanced_prompt, routing_decision, llm_client
                )
                
                # Extract and evaluate recommendations if enabled
                evaluation_metrics = {}
                recommendations = []
                
                if enable_metrics and routing_decision.handler in ["personalized_advisor", "transcript_aware"]:
                    recommendations = contextual_advisor.extract_course_recommendations(response_content)
                    
                    if recommendations:
                        evaluation_metrics = evaluate_existing_recommendations(
                            recommendations, profile_json, question, time.time() - start_time
                        )
                
                response_time = time.time() - start_time
                self.total_response_time += response_time
                
                return {
                    "content": response_content,
                    "mode": "smartcourse_enhanced",
                    "routing": {
                        "handler": routing_decision.handler,
                        "confidence": routing_decision.confidence,
                        "reasoning": routing_decision.reasoning,
                        "context_mode": context_mode
                    },
                    "recommendations": recommendations,
                    "evaluation_metrics": evaluation_metrics,
                    "personalization_score": routing_decision.personalization_score,
                    "expected_quality": routing_decision.expected_quality_metrics,
                    "response_time": response_time,
                    "timestamp": datetime.now().isoformat()
                }
            
            else:
                # Fallback to basic response without context
                response_content = await self._generate_basic_response(question, llm_client)
                response_time = time.time() - start_time
                
                return {
                    "content": response_content,
                    "mode": "basic_advisor",
                    "routing": {
                        "handler": "generic_advisor",
                        "confidence": 0.3,
                        "reasoning": "No student context provided",
                        "context_mode": "question_only"
                    },
                    "recommendations": [],
                    "evaluation_metrics": {},
                    "personalization_score": 0.0,
                    "response_time": response_time,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"SmartCourse enhanced QA failed: {e}")
            response_time = time.time() - start_time
            
            return {
                "content": f"I apologize, but I'm experiencing technical difficulties. Please try again later. Error: {str(e)}",
                "mode": "error_fallback",
                "routing": {
                    "handler": "error",
                    "confidence": 0.0,
                    "reasoning": "System error occurred",
                    "context_mode": context_mode
                },
                "recommendations": [],
                "evaluation_metrics": {},
                "personalization_score": 0.0,
                "response_time": response_time,
                "timestamp": datetime.now().isoformat()
            }
    
    async def context_ablation_study(
        self,
        question: str,
        profile_json: Dict[str, Any],
        llm_client: Any = None
    ) -> Dict[str, Any]:
        """
        Run SmartCourse-style context ablation study.
        
        Tests recommendation quality under different context conditions.
        """
        
        context_modes = ["full", "no_transcript", "no_plan", "question_only"]
        results = {}
        
        for mode in context_modes:
            try:
                result = await self.enhanced_qa_endpoint(
                    question, profile_json, context_mode=mode, 
                    enable_metrics=True, llm_client=llm_client
                )
                results[mode] = result
                
            except Exception as e:
                logger.warning(f"Ablation study failed for mode {mode}: {e}")
                results[mode] = {
                    "content": f"Ablation test failed for {mode} mode",
                    "mode": "ablation_error",
                    "evaluation_metrics": {},
                    "response_time": 0.0
                }
        
        # Analyze ablation results
        analysis = self._analyze_ablation_results(results)
        
        return {
            "ablation_results": results,
            "analysis": analysis,
            "timestamp": datetime.now().isoformat()
        }
    
    async def get_quality_insights(
        self,
        student_id: str,
        time_window_hours: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get recommendation quality insights for a student.
        """
        
        try:
            # Get performance summary from evaluator
            performance_summary = recommendation_evaluator.get_performance_summary(
                time_window_hours=time_window_hours
            )
            
            # Get routing analytics
            routing_analytics = contextual_router.get_routing_analytics()
            
            # Generate recommendations report
            recommendations_report = recommendation_evaluator.generate_recommendations_report(
                student_id, include_context_analysis=True
            )
            
            return {
                "performance_summary": performance_summary,
                "routing_analytics": routing_analytics,
                "recommendations_report": recommendations_report,
                "system_health": {
                    "total_requests": self.request_count,
                    "average_response_time": self.total_response_time / max(self.request_count, 1),
                    "quality_metrics_available": len(self.quality_metrics_history)
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Quality insights generation failed: {e}")
            return {
                "error": "Unable to generate quality insights",
                "detail": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_performance_analytics(self) -> Dict[str, Any]:
        """
        Get system performance analytics for monitoring.
        """
        
        return {
            "routing_analytics": contextual_router.get_routing_analytics(),
            "evaluator_performance": recommendation_evaluator.get_performance_summary(),
            "advisor_performance": contextual_advisor.get_performance_summary(),
            "system_metrics": {
                "total_requests": self.request_count,
                "average_response_time": self.total_response_time / max(self.request_count, 1),
                "uptime": "system_uptime_placeholder"  # Could be implemented
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def track_recommendation_interaction(
        self,
        recommendation_id: str,
        interaction_type: str,
        student_id: str
    ) -> Dict[str, Any]:
        """
        Track recommendation interaction for learning.
        """
        
        try:
            # Log interaction for future learning
            interaction_data = {
                "recommendation_id": recommendation_id,
                "interaction_type": interaction_type,
                "student_id": student_id,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Recommendation interaction tracked: {interaction_data}")
            
            # In a production system, this would be stored in a database
            # For now, we'll just log it
            
            return {
                "success": True,
                "message": "Interaction tracked successfully",
                "interaction_data": interaction_data
            }
            
        except Exception as e:
            logger.error(f"Failed to track recommendation interaction: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _generate_contextual_response(
        self, 
        enhanced_prompt: str, 
        routing_decision: RoutingDecision,
        llm_client: Any = None
    ) -> str:
        """
        Generate response using the enhanced contextual prompt.
        """
        
        # This is a placeholder for LLM integration
        # In a real implementation, this would call the appropriate LLM client
        
        if llm_client and hasattr(llm_client, 'generate_response'):
            try:
                return await llm_client.generate_response(enhanced_prompt)
            except Exception as e:
                logger.error(f"LLM client failed: {e}")
                return f"I apologize, but I'm unable to generate a response at this time. Please try again later."
        
        # Fallback response
        handler_responses = {
            "personalized_advisor": f"Based on your academic record and degree plan, I can provide personalized recommendations. However, I need an LLM client to generate specific advice.",
            "plan_focused": f"Looking at your degree plan requirements, I can help you plan your academic path. However, I need an LLM client to generate specific recommendations.",
            "transcript_aware": f"Considering your completed courses and grades, I can suggest improvements. However, I need an LLM client to generate specific advice.",
            "generic_advisor": f"I can provide general academic advice. However, I need an LLM client to generate specific recommendations.",
            "t2sql": f"For factual course information, please use the structured query endpoint.",
            "planner": f"For academic planning, please use the planner endpoint."
        }
        
        return handler_responses.get(
            routing_decision.handler, 
            "I can help with academic advising, but I need an LLM client to generate responses."
        )
    
    async def _generate_basic_response(self, question: str, llm_client: Any = None) -> str:
        """
        Generate basic response without student context.
        """
        
        if llm_client and hasattr(llm_client, 'generate_response'):
            try:
                basic_prompt = f"Please answer this academic question: {question}"
                return await llm_client.generate_response(basic_prompt)
            except Exception as e:
                logger.error(f"LLM client failed: {e}")
        
        return f"I can help answer academic questions, but I need more context about your academic background to provide personalized advice. Please provide your transcript or degree plan information for better recommendations."
    
    def _analyze_ablation_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze ablation study results to show context impact.
        """
        
        analysis = {
            "context_impact": {},
            "best_performing_mode": "",
            "quality_degradation": {},
            "recommendations": []
        }
        
        # Find best performing mode
        best_score = 0.0
        best_mode = "full"
        
        for mode, result in results.items():
            metrics = result.get("evaluation_metrics", {})
            personal_score = metrics.get("personal_score", 0.0)
            
            if personal_score > best_score:
                best_score = personal_score
                best_mode = mode
            
            analysis["context_impact"][mode] = {
                "plan_score": metrics.get("plan_score", 0.0),
                "personal_score": personal_score,
                "lift": metrics.get("lift", 0.0),
                "recall": metrics.get("recall", 0.0),
                "response_time": result.get("response_time", 0.0)
            }
        
        analysis["best_performing_mode"] = best_mode
        
        # Calculate quality degradation compared to full context
        if "full" in results:
            full_metrics = results["full"].get("evaluation_metrics", {})
            full_personal_score = full_metrics.get("personal_score", 0.0)
            
            for mode, result in results.items():
                if mode != "full":
                    mode_score = result.get("evaluation_metrics", {}).get("personal_score", 0.0)
                    degradation = full_personal_score - mode_score
                    analysis["quality_degradation"][mode] = degradation
        
        # Generate recommendations based on results
        if analysis["quality_degradation"]:
            max_degradation = max(analysis["quality_degradation"].values())
            if max_degradation > 0.3:
                analysis["recommendations"].append("High context dependency detected - ensure full transcript and plan data is available")
            if analysis["quality_degradation"].get("no_plan", 0) > 0.4:
                analysis["recommendations"].append("Degree plan information is critical for recommendation quality")
            if analysis["quality_degradation"].get("no_transcript", 0) > 0.2:
                analysis["recommendations"].append("Transcript data significantly improves personalization")
        
        return analysis

# Global instance
smartcourse_handler = SmartCourseHandler()