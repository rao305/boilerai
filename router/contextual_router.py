"""
Enhanced Contextual Router with SmartCourse-inspired intelligence.
Replaces simple intent mapping with context-aware routing decisions.
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ContextMode(Enum):
    """Context modes for ablation testing (inspired by SmartCourse)"""
    FULL_CONTEXT = "full"  # transcript + plan + query
    NO_TRANSCRIPT = "no_transcript"  # plan + query only
    NO_PLAN = "no_plan"  # transcript + query only
    QUESTION_ONLY = "question"  # query only

class RouteDecision(Enum):
    """Enhanced routing decisions"""
    PERSONALIZED_ADVISOR = "personalized_advisor"
    PLAN_FOCUSED = "plan_focused" 
    TRANSCRIPT_AWARE = "transcript_aware"
    GENERIC_ADVISOR = "generic_advisor"
    T2SQL = "t2sql"
    PLANNER = "planner"
    RAG = "rag"

@dataclass
class StudentContext:
    """Comprehensive student context for intelligent routing"""
    student_id: str
    major: str
    track_id: Optional[str]
    gpa: float
    completed_courses: List[Dict[str, Any]]  # [{"course_id": "CS18000", "grade": "A", "term": "F2024"}]
    in_progress_courses: List[str]
    outstanding_requirements: List[str]
    low_grade_courses: List[str]  # courses with grades below B-
    track_declared: bool
    terms_enrolled: int
    context_mode: ContextMode = ContextMode.FULL_CONTEXT

@dataclass
class RoutingDecision:
    """Enhanced routing decision with context"""
    handler: str
    confidence: float
    reasoning: str
    context_used: ContextMode
    personalization_score: float
    expected_quality_metrics: Dict[str, float]
    routing_metadata: Dict[str, Any]

class ContextualRouter:
    """
    Enhanced router that makes intelligent routing decisions based on 
    full student context (transcript + degree plan + query).
    
    Inspired by SmartCourse's contextual approach to recommendation quality.
    """
    
    def __init__(self):
        self.routing_history: List[Dict] = []
        self.performance_metrics: Dict[str, float] = {}
        
    def analyze_student_context(self, context: StudentContext) -> Dict[str, float]:
        """Analyze student context to determine personalization needs"""
        
        # Calculate context richness scores
        transcript_richness = len(context.completed_courses) / max(1, context.terms_enrolled * 4)
        plan_progress = len(context.completed_courses) / max(1, len(context.outstanding_requirements) + len(context.completed_courses))
        
        # Grade performance analysis
        grade_scores = {"A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0}
        avg_grade_score = 0.0
        if context.completed_courses:
            total_score = sum(grade_scores.get(course.get("grade", "C"), 2.0) for course in context.completed_courses)
            avg_grade_score = total_score / len(context.completed_courses)
        
        # Risk factors
        has_low_grades = len(context.low_grade_courses) > 0
        track_declaration_risk = not context.track_declared and len(context.completed_courses) > 8
        
        return {
            "transcript_richness": transcript_richness,
            "plan_progress": plan_progress,
            "grade_performance": avg_grade_score / 4.0,  # normalize to 0-1
            "personalization_need": 1.0 if has_low_grades or track_declaration_risk else 0.5,
            "context_completeness": 1.0 if context.context_mode == ContextMode.FULL_CONTEXT else 0.3
        }
    
    def determine_routing_strategy(self, query: str, context: StudentContext) -> RoutingDecision:
        """
        Determine optimal routing strategy based on query and student context.
        
        Uses SmartCourse-inspired analysis to predict recommendation quality
        under different routing decisions.
        """
        
        context_analysis = self.analyze_student_context(context)
        query_lower = query.lower()
        
        # Query complexity analysis
        planning_keywords = ["plan", "schedule", "semester", "graduation", "sequence"]
        factual_keywords = ["prerequisite", "requirement", "credit", "when", "offered"]
        advisory_keywords = ["recommend", "should", "best", "elective", "track", "advice"]
        retake_keywords = ["retake", "repeat", "improve", "grade", "gpa"]
        
        is_planning = any(kw in query_lower for kw in planning_keywords)
        is_factual = any(kw in query_lower for kw in factual_keywords)
        is_advisory = any(kw in query_lower for kw in advisory_keywords)
        is_retake_related = any(kw in query_lower for kw in retake_keywords)
        
        # Context-aware routing logic
        if context.context_mode == ContextMode.QUESTION_ONLY:
            # Limited context - route to generic handlers
            if is_planning:
                return self._create_routing_decision(
                    handler="planner",
                    confidence=0.3,
                    reasoning="Basic planning query with no student context",
                    context=context,
                    personalization_score=0.1
                )
            elif is_factual:
                return self._create_routing_decision(
                    handler="t2sql", 
                    confidence=0.6,
                    reasoning="Factual query suitable for SQL lookup",
                    context=context,
                    personalization_score=0.0
                )
            else:
                return self._create_routing_decision(
                    handler="generic_advisor",
                    confidence=0.2,
                    reasoning="Generic advisory query with no personalization",
                    context=context,
                    personalization_score=0.0
                )
        
        elif context.context_mode == ContextMode.FULL_CONTEXT:
            # Rich context - enable personalized routing
            
            if is_retake_related and context.low_grade_courses:
                return self._create_routing_decision(
                    handler="personalized_advisor",
                    confidence=0.9,
                    reasoning="Retake query with identified low-grade courses - high personalization value",
                    context=context,
                    personalization_score=0.8
                )
            
            elif is_advisory and context_analysis["personalization_need"] > 0.7:
                return self._create_routing_decision(
                    handler="personalized_advisor",
                    confidence=0.85,
                    reasoning="Advisory query for student with high personalization needs",
                    context=context,
                    personalization_score=0.7
                )
            
            elif is_planning and context.outstanding_requirements:
                return self._create_routing_decision(
                    handler="plan_focused",
                    confidence=0.8,
                    reasoning="Planning query with clear outstanding requirements",
                    context=context,
                    personalization_score=0.6
                )
            
            elif is_factual:
                return self._create_routing_decision(
                    handler="t2sql",
                    confidence=0.7,
                    reasoning="Factual query - SQL lookup appropriate",
                    context=context,
                    personalization_score=0.1
                )
            
            else:
                return self._create_routing_decision(
                    handler="personalized_advisor",
                    confidence=0.75,
                    reasoning="General advisory query with full context available",
                    context=context,
                    personalization_score=0.6
                )
        
        elif context.context_mode == ContextMode.NO_TRANSCRIPT:
            # Plan-only context
            if is_planning or is_advisory:
                return self._create_routing_decision(
                    handler="plan_focused",
                    confidence=0.6,
                    reasoning="Plan-focused routing without transcript context",
                    context=context,
                    personalization_score=0.3
                )
            else:
                return self._create_routing_decision(
                    handler="generic_advisor",
                    confidence=0.4,
                    reasoning="Limited context without transcript data",
                    context=context,
                    personalization_score=0.2
                )
        
        elif context.context_mode == ContextMode.NO_PLAN:
            # Transcript-only context
            if is_retake_related and context.low_grade_courses:
                return self._create_routing_decision(
                    handler="transcript_aware",
                    confidence=0.7,
                    reasoning="Transcript-based retake recommendations",
                    context=context,
                    personalization_score=0.5
                )
            else:
                return self._create_routing_decision(
                    handler="transcript_aware",
                    confidence=0.5,
                    reasoning="Transcript-only context limits recommendation quality",
                    context=context,
                    personalization_score=0.4
                )
        
        # Fallback
        return self._create_routing_decision(
            handler="generic_advisor",
            confidence=0.3,
            reasoning="Fallback routing due to unclear query or context",
            context=context,
            personalization_score=0.1
        )
    
    def _create_routing_decision(
        self, 
        handler: str, 
        confidence: float, 
        reasoning: str,
        context: StudentContext,
        personalization_score: float
    ) -> RoutingDecision:
        """Create a routing decision with predicted quality metrics"""
        
        # Predict quality metrics based on SmartCourse findings
        expected_metrics = self._predict_quality_metrics(
            handler, context.context_mode, personalization_score
        )
        
        routing_metadata = {
            "timestamp": datetime.now().isoformat(),
            "student_id": context.student_id,
            "context_completeness": len(context.completed_courses),
            "outstanding_reqs": len(context.outstanding_requirements),
            "low_grade_count": len(context.low_grade_courses),
            "track_declared": context.track_declared
        }
        
        return RoutingDecision(
            handler=handler,
            confidence=confidence,
            reasoning=reasoning,
            context_used=context.context_mode,
            personalization_score=personalization_score,
            expected_quality_metrics=expected_metrics,
            routing_metadata=routing_metadata
        )
    
    def _predict_quality_metrics(
        self, 
        handler: str, 
        context_mode: ContextMode, 
        personalization_score: float
    ) -> Dict[str, float]:
        """
        Predict recommendation quality metrics based on SmartCourse findings.
        
        From paper: Full context achieved PlanScore=0.53, PersonalScore=0.78, Lift=0.25, Recall=0.15
        Context-omitted modes showed significant degradation.
        """
        
        base_metrics = {
            "expected_plan_score": 0.53,
            "expected_personal_score": 0.78,
            "expected_lift": 0.25,
            "expected_recall": 0.15,
            "expected_latency": 47.65
        }
        
        # Adjust based on context mode (following SmartCourse experimental results)
        if context_mode == ContextMode.FULL_CONTEXT:
            # Use full metrics from paper
            multiplier = 1.0
        elif context_mode == ContextMode.NO_PLAN:
            # Significant degradation when plan is missing
            multiplier = 0.1  # Based on paper: PlanScore dropped to 0.03
        elif context_mode == ContextMode.NO_TRANSCRIPT:
            # Moderate degradation without transcript
            multiplier = 0.7  # PlanScore remained ~0.60
        elif context_mode == ContextMode.QUESTION_ONLY:
            # Severe degradation with no context
            multiplier = 0.05  # Near zero performance
        else:
            multiplier = 0.5
        
        # Adjust for handler type
        handler_adjustments = {
            "personalized_advisor": 1.0,
            "plan_focused": 0.8,
            "transcript_aware": 0.6,
            "generic_advisor": 0.3,
            "t2sql": 0.1,  # Factual queries don't need personalization
            "planner": 0.4
        }
        
        handler_mult = handler_adjustments.get(handler, 0.5)
        final_multiplier = multiplier * handler_mult * (0.5 + 0.5 * personalization_score)
        
        return {
            metric: value * final_multiplier 
            for metric, value in base_metrics.items()
        }
    
    def route_query(self, query: str, student_context: StudentContext) -> RoutingDecision:
        """Main routing interface - enhanced version of original route_to_handler"""
        
        decision = self.determine_routing_strategy(query, student_context)
        
        # Log routing decision for analysis
        self.routing_history.append({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "student_id": student_context.student_id,
            "decision": decision.handler,
            "confidence": decision.confidence,
            "context_mode": decision.context_used.value,
            "personalization_score": decision.personalization_score,
            "expected_metrics": decision.expected_quality_metrics
        })
        
        logger.info(f"Contextual routing: {query[:50]}... -> {decision.handler} "
                   f"(confidence: {decision.confidence:.2f}, personalization: {decision.personalization_score:.2f})")
        
        return decision
    
    def get_routing_analytics(self) -> Dict[str, Any]:
        """Get routing performance analytics"""
        if not self.routing_history:
            return {"total_routes": 0}
        
        total_routes = len(self.routing_history)
        avg_confidence = sum(r["confidence"] for r in self.routing_history) / total_routes
        avg_personalization = sum(r["personalization_score"] for r in self.routing_history) / total_routes
        
        handler_distribution = {}
        context_mode_distribution = {}
        
        for route in self.routing_history:
            handler = route["decision"]
            context_mode = route["context_mode"]
            
            handler_distribution[handler] = handler_distribution.get(handler, 0) + 1
            context_mode_distribution[context_mode] = context_mode_distribution.get(context_mode, 0) + 1
        
        return {
            "total_routes": total_routes,
            "avg_confidence": avg_confidence,
            "avg_personalization": avg_personalization,
            "handler_distribution": handler_distribution,
            "context_mode_distribution": context_mode_distribution,
            "recent_routes": self.routing_history[-10:]  # Last 10 routes
        }

# Global instance
contextual_router = ContextualRouter()

def create_student_context_from_profile(profile_data: Dict[str, Any]) -> StudentContext:
    """Helper function to create StudentContext from profile data"""
    
    completed = profile_data.get("completed", [])
    low_grade_threshold = 2.7  # B- and below
    grade_points = {"A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0}
    
    low_grade_courses = [
        course["course_id"] for course in completed 
        if grade_points.get(course.get("grade", "C"), 2.0) < low_grade_threshold
    ]
    
    return StudentContext(
        student_id=profile_data.get("student", {}).get("id", "unknown"),
        major=profile_data.get("major", "CS"),
        track_id=profile_data.get("track_id"),
        gpa=profile_data.get("student", {}).get("gpa", 3.0),
        completed_courses=completed,
        in_progress_courses=[c.get("course_id", "") for c in profile_data.get("in_progress", [])],
        outstanding_requirements=profile_data.get("outstanding_requirements", []),
        low_grade_courses=low_grade_courses,
        track_declared=profile_data.get("track_id") is not None,
        terms_enrolled=profile_data.get("terms_enrolled", 4),
        context_mode=ContextMode.FULL_CONTEXT
    )