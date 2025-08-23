"""
Enhanced Contextual Advisory Engine with SmartCourse-inspired intelligence.

Provides personalized course recommendations using full student context
(transcript + degree plan + query) with quality evaluation metrics.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import json
import time
import logging
from datetime import datetime

from .recommendation_evaluator import (
    RecommendationEvaluator, 
    RecommendationSet, 
    StudentPlanContext,
    create_plan_context_from_profile
)

logger = logging.getLogger(__name__)

@dataclass
class ContextualPrompt:
    """Structured prompt with full student context"""
    transcript_section: str
    degree_plan_section: str
    query_section: str
    personalization_hints: List[str]
    context_mode: str

@dataclass
class AdvisoryResponse:
    """Enhanced advisory response with evaluation metrics"""
    content: str
    recommendations: List[str]
    evaluation_metrics: Dict[str, float]
    context_mode: str
    response_time: float
    personalization_score: float
    confidence: float
    reasoning: str

class ContextualAdvisor:
    """
    Enhanced advisory engine that generates contextual prompts and
    evaluates recommendation quality using SmartCourse metrics.
    """
    
    def __init__(self, evaluator: Optional[RecommendationEvaluator] = None):
        self.evaluator = evaluator or RecommendationEvaluator()
        self.response_cache = {}
        self.performance_metrics = {
            "total_queries": 0,
            "avg_response_time": 0.0,
            "avg_plan_score": 0.0,
            "avg_personalization": 0.0
        }
    
    def build_contextual_prompt(
        self, 
        query: str, 
        profile_data: Dict[str, Any], 
        context_mode: str = "full"
    ) -> ContextualPrompt:
        """
        Build SmartCourse-inspired contextual prompt with student data.
        
        Creates structured prompts that fuse transcript, degree plan, and query
        for optimal recommendation quality.
        """
        
        transcript_section = ""
        degree_plan_section = ""
        personalization_hints = []
        
        # Build transcript section
        if context_mode in ["full", "no_plan"]:
            completed_courses = profile_data.get("completed", [])
            in_progress = profile_data.get("in_progress", [])
            
            if completed_courses:
                transcript_section = "STUDENT TRANSCRIPT:\n"
                for course in completed_courses:
                    course_id = course.get("course_id", "")
                    grade = course.get("grade", "")
                    term = course.get("term", "")
                    transcript_section += f"- {course_id}: {grade} ({term})\n"
                
                # Add GPA context
                gpa = profile_data.get("student", {}).get("gpa", 0.0)
                transcript_section += f"\nCurrent GPA: {gpa}\n"
                
                # Identify courses needing retakes
                low_grade_courses = self._identify_low_grade_courses(completed_courses)
                if low_grade_courses:
                    personalization_hints.append(f"Consider retaking: {', '.join(low_grade_courses)}")
                    transcript_section += f"Courses with grades below B-: {', '.join(low_grade_courses)}\n"
            
            if in_progress:
                transcript_section += f"\nCurrently enrolled: {', '.join(in_progress)}\n"
        
        # Build degree plan section
        if context_mode in ["full", "no_transcript"]:
            major = profile_data.get("major", "CS")
            track_id = profile_data.get("track_id")
            
            degree_plan_section = f"DEGREE PLAN ({major}"
            if track_id:
                degree_plan_section += f" - {track_id.replace('_', ' ').title()}"
            degree_plan_section += "):\n"
            
            # Outstanding requirements
            outstanding = profile_data.get("outstanding_requirements", [])
            if outstanding:
                degree_plan_section += "Outstanding Requirements:\n"
                for req in outstanding[:10]:  # Limit to avoid prompt bloat
                    degree_plan_section += f"- {req}\n"
                
                if len(outstanding) > 10:
                    degree_plan_section += f"... and {len(outstanding) - 10} more courses\n"
            
            # Track-specific requirements
            track_requirements = profile_data.get("track_requirements", [])
            if track_requirements:
                degree_plan_section += "Track Requirements:\n"
                for req in track_requirements:
                    degree_plan_section += f"- {req}\n"
            
            # Graduation timeline
            target_grad = profile_data.get("constraints", {}).get("target_grad_term", "")
            if target_grad:
                personalization_hints.append(f"Target graduation: {target_grad}")
        
        # Add personalization hints based on student context
        if profile_data.get("student", {}).get("gpa", 3.0) < 2.5:
            personalization_hints.append("Focus on GPA improvement strategies")
        
        if not profile_data.get("track_id") and len(profile_data.get("completed", [])) > 8:
            personalization_hints.append("Track declaration is required - recommend track selection")
        
        # Build query section
        query_section = f"STUDENT QUESTION:\n{query}\n"
        
        return ContextualPrompt(
            transcript_section=transcript_section,
            degree_plan_section=degree_plan_section,
            query_section=query_section,
            personalization_hints=personalization_hints,
            context_mode=context_mode
        )
    
    def format_prompt_for_llm(self, contextual_prompt: ContextualPrompt) -> str:
        """Format the contextual prompt for LLM consumption"""
        
        sections = []
        
        # Add context sections based on mode
        if contextual_prompt.transcript_section:
            sections.append(contextual_prompt.transcript_section)
        
        if contextual_prompt.degree_plan_section:
            sections.append(contextual_prompt.degree_plan_section)
        
        # Add personalization hints if available
        if contextual_prompt.personalization_hints:
            hints_section = "PERSONALIZATION NOTES:\n"
            for hint in contextual_prompt.personalization_hints:
                hints_section += f"- {hint}\n"
            sections.append(hints_section)
        
        sections.append(contextual_prompt.query_section)
        
        # Add advisory instructions
        advisory_instructions = """
ADVISORY INSTRUCTIONS:
1. Provide specific course recommendations based on the student's context
2. Consider completed courses to avoid redundancy
3. Prioritize outstanding degree requirements
4. Suggest retakes for low-grade courses when appropriate
5. Consider prerequisite chains and course sequencing
6. Provide reasoning for each recommendation

Please provide personalized course recommendations:
"""
        sections.append(advisory_instructions)
        
        return "\n\n".join(sections)
    
    def extract_course_recommendations(self, llm_response: str) -> List[str]:
        """
        Extract course IDs from LLM response.
        
        Uses pattern matching to identify course codes like CS18000, MATH16100, etc.
        """
        import re
        
        # Pattern to match course codes (e.g., CS18000, MATH16100, STAT35000)
        course_pattern = r'\b[A-Z]{2,5}\d{5}\b'
        matches = re.findall(course_pattern, llm_response)
        
        # Remove duplicates while preserving order
        recommendations = []
        seen = set()
        for course in matches:
            if course not in seen:
                recommendations.append(course)
                seen.add(course)
        
        return recommendations
    
    def _identify_low_grade_courses(self, completed_courses: List[Dict]) -> List[str]:
        """Identify courses with grades below B- that may need retaking"""
        
        grade_points = {
            "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
            "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0
        }
        
        low_grade_threshold = 2.7  # Below B-
        low_grade_courses = []
        
        for course in completed_courses:
            grade = course.get("grade", "")
            course_id = course.get("course_id", "")
            
            if grade in grade_points and grade_points[grade] < low_grade_threshold:
                low_grade_courses.append(course_id)
        
        return low_grade_courses
    
    async def generate_advisory_response(
        self, 
        query: str, 
        profile_data: Dict[str, Any], 
        llm_client: Any,  # Generic LLM client
        context_mode: str = "full"
    ) -> AdvisoryResponse:
        """
        Generate enhanced advisory response with quality evaluation.
        
        Main interface that combines contextual prompting with quality metrics.
        """
        
        start_time = time.time()
        
        # Build contextual prompt
        contextual_prompt = self.build_contextual_prompt(query, profile_data, context_mode)
        formatted_prompt = self.format_prompt_for_llm(contextual_prompt)
        
        # Generate LLM response
        try:
            llm_response = await llm_client.generate_response(formatted_prompt)
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            llm_response = "I apologize, but I'm unable to generate recommendations at this time. Please try again later."
        
        response_time = time.time() - start_time
        
        # Extract course recommendations
        recommendations = self.extract_course_recommendations(llm_response)
        
        # Calculate personalization score
        personalization_score = self._calculate_personalization_score(
            contextual_prompt, recommendations, profile_data
        )
        
        # Evaluate recommendation quality
        evaluation_metrics = {}
        if recommendations:
            # Create evaluation objects
            rec_set = RecommendationSet(
                recommendations=recommendations,
                query=query,
                student_id=profile_data.get("student", {}).get("id", "unknown"),
                context_mode=context_mode,
                generated_at=datetime.now(),
                response_time=response_time,
                model_used="llm_client"
            )
            
            plan_context = create_plan_context_from_profile(profile_data)
            metrics = self.evaluator.evaluate_recommendations(rec_set, plan_context)
            
            evaluation_metrics = {
                "plan_score": metrics.plan_score,
                "personal_score": metrics.personal_score,
                "lift": metrics.lift,
                "recall": metrics.recall,
                "precision": metrics.precision,
                "response_time": metrics.response_time
            }
        
        # Update performance metrics
        self._update_performance_metrics(evaluation_metrics, personalization_score, response_time)
        
        # Calculate confidence based on context richness and recommendations
        confidence = self._calculate_confidence(contextual_prompt, recommendations, context_mode)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(contextual_prompt, recommendations, evaluation_metrics)
        
        return AdvisoryResponse(
            content=llm_response,
            recommendations=recommendations,
            evaluation_metrics=evaluation_metrics,
            context_mode=context_mode,
            response_time=response_time,
            personalization_score=personalization_score,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def _calculate_personalization_score(
        self, 
        prompt: ContextualPrompt, 
        recommendations: List[str], 
        profile_data: Dict[str, Any]
    ) -> float:
        """Calculate how well the response is personalized to the student"""
        
        score = 0.0
        
        # Context richness (0.3 weight)
        if prompt.transcript_section:
            score += 0.15
        if prompt.degree_plan_section:
            score += 0.15
        
        # Personalization hints utilization (0.3 weight)
        if prompt.personalization_hints:
            score += 0.3
        
        # Recommendation relevance (0.4 weight)
        if recommendations:
            outstanding = set(profile_data.get("outstanding_requirements", []))
            low_grades = set(self._identify_low_grade_courses(profile_data.get("completed", [])))
            
            relevant_count = len(set(recommendations).intersection(outstanding.union(low_grades)))
            if recommendations:
                score += 0.4 * (relevant_count / len(recommendations))
        
        return min(score, 1.0)
    
    def _calculate_confidence(
        self, 
        prompt: ContextualPrompt, 
        recommendations: List[str], 
        context_mode: str
    ) -> float:
        """Calculate confidence score based on context completeness"""
        
        confidence = 0.0
        
        # Context mode contribution (0.5 weight)
        mode_scores = {
            "full": 0.5,
            "no_transcript": 0.3,
            "no_plan": 0.2,
            "question_only": 0.1
        }
        confidence += mode_scores.get(context_mode, 0.1)
        
        # Content richness (0.3 weight)
        if len(prompt.transcript_section) > 100:
            confidence += 0.15
        if len(prompt.degree_plan_section) > 100:
            confidence += 0.15
        
        # Recommendations quality (0.2 weight)
        if recommendations:
            confidence += 0.2 * min(len(recommendations) / 5.0, 1.0)
        
        return min(confidence, 1.0)
    
    def _generate_reasoning(
        self, 
        prompt: ContextualPrompt, 
        recommendations: List[str], 
        metrics: Dict[str, float]
    ) -> str:
        """Generate reasoning explanation for the advisory response"""
        
        reasoning_parts = []
        
        # Context analysis
        if prompt.context_mode == "full":
            reasoning_parts.append("Used full student context (transcript + degree plan)")
        elif prompt.context_mode == "no_transcript":
            reasoning_parts.append("Limited to degree plan context (no transcript data)")
        elif prompt.context_mode == "no_plan":
            reasoning_parts.append("Limited to transcript context (no degree plan)")
        else:
            reasoning_parts.append("Minimal context available (question only)")
        
        # Personalization insights
        if prompt.personalization_hints:
            reasoning_parts.append(f"Applied {len(prompt.personalization_hints)} personalization insights")
        
        # Quality assessment
        if metrics.get("plan_score", 0) > 0.5:
            reasoning_parts.append("High alignment with degree plan requirements")
        elif metrics.get("plan_score", 0) > 0.3:
            reasoning_parts.append("Moderate alignment with degree plan requirements")
        else:
            reasoning_parts.append("Limited alignment with degree plan (may need more context)")
        
        # Recommendations assessment
        if len(recommendations) > 0:
            reasoning_parts.append(f"Generated {len(recommendations)} specific course recommendations")
        else:
            reasoning_parts.append("No specific courses identified (advisory guidance only)")
        
        return "; ".join(reasoning_parts)
    
    def _update_performance_metrics(
        self, 
        eval_metrics: Dict[str, float], 
        personalization_score: float, 
        response_time: float
    ) -> None:
        """Update running performance metrics"""
        
        self.performance_metrics["total_queries"] += 1
        n = self.performance_metrics["total_queries"]
        
        # Running average updates
        self.performance_metrics["avg_response_time"] = (
            (self.performance_metrics["avg_response_time"] * (n - 1) + response_time) / n
        )
        
        self.performance_metrics["avg_personalization"] = (
            (self.performance_metrics["avg_personalization"] * (n - 1) + personalization_score) / n
        )
        
        if eval_metrics.get("plan_score"):
            current_avg = self.performance_metrics.get("avg_plan_score", 0.0)
            self.performance_metrics["avg_plan_score"] = (
                (current_avg * (n - 1) + eval_metrics["plan_score"]) / n
            )
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for monitoring and optimization"""
        
        return {
            **self.performance_metrics,
            "cache_size": len(self.response_cache),
            "evaluator_stats": self.evaluator.get_performance_summary()
        }
    
    def run_context_ablation_test(
        self, 
        query: str, 
        profile_data: Dict[str, Any],
        llm_client: Any
    ) -> Dict[str, AdvisoryResponse]:
        """
        Run SmartCourse-style context ablation study.
        
        Tests recommendation quality under different context conditions.
        """
        
        context_modes = ["full", "no_transcript", "no_plan", "question_only"]
        results = {}
        
        for mode in context_modes:
            response = self.generate_advisory_response(
                query, profile_data, llm_client, context_mode=mode
            )
            results[mode] = response
        
        logger.info(f"Context ablation study completed for query: {query[:50]}...")
        return results

# Global instance
contextual_advisor = ContextualAdvisor()

# Utility functions for integration
def create_enhanced_advisory_prompt(
    query: str, 
    profile_data: Dict[str, Any], 
    context_mode: str = "full"
) -> str:
    """
    Utility function to create enhanced prompts for existing LLM integrations.
    
    Can be used to upgrade existing advisory endpoints with SmartCourse intelligence.
    """
    
    prompt_obj = contextual_advisor.build_contextual_prompt(query, profile_data, context_mode)
    return contextual_advisor.format_prompt_for_llm(prompt_obj)

def evaluate_existing_recommendations(
    recommendations: List[str],
    profile_data: Dict[str, Any],
    query: str,
    response_time: float = 0.0
) -> Dict[str, float]:
    """
    Utility function to evaluate existing recommendation systems.
    
    Can be integrated into current advisory endpoints for quality monitoring.
    """
    
    rec_set = RecommendationSet(
        recommendations=recommendations,
        query=query,
        student_id=profile_data.get("student", {}).get("id", "unknown"),
        context_mode="full",
        generated_at=datetime.now(),
        response_time=response_time,
        model_used="existing_system"
    )
    
    plan_context = create_plan_context_from_profile(profile_data)
    metrics = contextual_advisor.evaluator.evaluate_recommendations(rec_set, plan_context)
    
    return {
        "plan_score": metrics.plan_score,
        "personal_score": metrics.personal_score,
        "lift": metrics.lift,
        "recall": metrics.recall,
        "precision": metrics.precision,
        "response_time": metrics.response_time
    }