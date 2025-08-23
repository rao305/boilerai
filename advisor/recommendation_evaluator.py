"""
Recommendation Evaluation System inspired by SmartCourse metrics.

Implements PlanScore, PersonalScore, Lift, and Recall metrics for measuring
the quality of AI-generated course recommendations.
"""

from typing import Dict, List, Set, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import time
import json
import logging
from datetime import datetime
import statistics

logger = logging.getLogger(__name__)

@dataclass
class RecommendationSet:
    """Set of course recommendations with metadata"""
    recommendations: List[str]  # course IDs
    query: str
    student_id: str
    context_mode: str
    generated_at: datetime
    response_time: float
    model_used: str

@dataclass
class StudentPlanContext:
    """Student's degree plan context for evaluation"""
    outstanding_requirements: Set[str]  # courses still needed for degree
    low_grade_courses: Set[str]  # courses with grades below B-
    completed_courses: Set[str]  # all completed courses
    track_requirements: Set[str]  # specific track requirements
    elective_options: Set[str]  # available elective courses

@dataclass
class EvaluationMetrics:
    """SmartCourse-inspired evaluation metrics"""
    plan_score: float  # fraction meeting unmet plan requirements
    personal_score: float  # fraction meeting plan OR retake needs
    lift: float  # improvement from personalization
    recall: float  # coverage of remaining plan courses
    precision: float  # accuracy of recommendations
    response_time: float  # latency in seconds
    recommendation_count: int  # number of recommendations

class RecommendationEvaluator:
    """
    Evaluates recommendation quality using SmartCourse metrics:
    
    - PlanScore: |R ∩ P| / |R| (plan requirement coverage)
    - PersonalScore: |R ∩ (P ∪ L)| / |R| (plan + low grades coverage)
    - Lift: PersonalScore - PlanScore (personalization benefit)
    - Recall: |R ∩ P| / |P| (plan requirement coverage rate)
    
    Where R = recommendations, P = outstanding plan, L = low grade courses
    """
    
    def __init__(self):
        self.evaluation_history: List[Dict[str, Any]] = []
        self.baseline_metrics: Dict[str, float] = {}
    
    def evaluate_recommendations(
        self, 
        recommendations: RecommendationSet,
        plan_context: StudentPlanContext
    ) -> EvaluationMetrics:
        """
        Evaluate a set of recommendations against student plan context.
        
        Implements the core SmartCourse evaluation methodology.
        """
        
        rec_set = set(recommendations.recommendations)
        outstanding_set = plan_context.outstanding_requirements
        low_grade_set = plan_context.low_grade_courses
        
        # Core SmartCourse metrics
        plan_score = self._calculate_plan_score(rec_set, outstanding_set)
        personal_score = self._calculate_personal_score(rec_set, outstanding_set, low_grade_set)
        lift = personal_score - plan_score
        recall = self._calculate_recall(rec_set, outstanding_set)
        precision = self._calculate_precision(rec_set, outstanding_set, low_grade_set)
        
        metrics = EvaluationMetrics(
            plan_score=plan_score,
            personal_score=personal_score,
            lift=lift,
            recall=recall,
            precision=precision,
            response_time=recommendations.response_time,
            recommendation_count=len(recommendations.recommendations)
        )
        
        # Log evaluation for analytics
        self._log_evaluation(recommendations, plan_context, metrics)
        
        return metrics
    
    def _calculate_plan_score(self, recommendations: Set[str], outstanding: Set[str]) -> float:
        """
        PlanScore = |R ∩ P| / |R|
        Fraction of recommendations that satisfy unmet plan requirements.
        """
        if not recommendations:
            return 0.0
        
        plan_relevant = recommendations.intersection(outstanding)
        return len(plan_relevant) / len(recommendations)
    
    def _calculate_personal_score(
        self, 
        recommendations: Set[str], 
        outstanding: Set[str], 
        low_grades: Set[str]
    ) -> float:
        """
        PersonalScore = |R ∩ (P ∪ L)| / |R|
        Fraction meeting plan requirements OR suggesting retakes for low grades.
        """
        if not recommendations:
            return 0.0
        
        personally_relevant = recommendations.intersection(outstanding.union(low_grades))
        return len(personally_relevant) / len(recommendations)
    
    def _calculate_recall(self, recommendations: Set[str], outstanding: Set[str]) -> float:
        """
        Recall = |R ∩ P| / |P|
        Coverage of outstanding plan requirements.
        """
        if not outstanding:
            return 1.0  # Perfect recall if no requirements left
        
        covered_requirements = recommendations.intersection(outstanding)
        return len(covered_requirements) / len(outstanding)
    
    def _calculate_precision(
        self, 
        recommendations: Set[str], 
        outstanding: Set[str], 
        low_grades: Set[str]
    ) -> float:
        """
        Precision = |R ∩ (P ∪ L)| / |R|
        Same as PersonalScore but conceptually represents accuracy.
        """
        return self._calculate_personal_score(recommendations, outstanding, low_grades)
    
    def _log_evaluation(
        self,
        recommendations: RecommendationSet,
        plan_context: StudentPlanContext,
        metrics: EvaluationMetrics
    ) -> None:
        """Log evaluation results for analytics and improvement"""
        
        evaluation_record = {
            "timestamp": datetime.now().isoformat(),
            "student_id": recommendations.student_id,
            "query": recommendations.query,
            "context_mode": recommendations.context_mode,
            "model_used": recommendations.model_used,
            "metrics": {
                "plan_score": metrics.plan_score,
                "personal_score": metrics.personal_score,
                "lift": metrics.lift,
                "recall": metrics.recall,
                "precision": metrics.precision,
                "response_time": metrics.response_time,
                "recommendation_count": metrics.recommendation_count
            },
            "context_stats": {
                "outstanding_count": len(plan_context.outstanding_requirements),
                "low_grade_count": len(plan_context.low_grade_courses),
                "completed_count": len(plan_context.completed_courses)
            }
        }
        
        self.evaluation_history.append(evaluation_record)
        
        logger.info(f"Recommendation evaluation: PlanScore={metrics.plan_score:.3f}, "
                   f"PersonalScore={metrics.personal_score:.3f}, Lift={metrics.lift:.3f}, "
                   f"Recall={metrics.recall:.3f}, ResponseTime={metrics.response_time:.1f}s")
    
    def run_context_ablation_study(
        self,
        query: str,
        student_id: str,
        plan_context: StudentPlanContext,
        recommendation_generator: callable
    ) -> Dict[str, EvaluationMetrics]:
        """
        Run SmartCourse-style context ablation study.
        
        Tests recommendation quality under different context conditions:
        - Full Context (transcript + plan + query)
        - No Transcript (plan + query)
        - No Plan (transcript + query)
        - Question Only (query only)
        """
        
        context_modes = ["full", "no_transcript", "no_plan", "question_only"]
        results = {}
        
        for mode in context_modes:
            start_time = time.time()
            
            # Generate recommendations with different context modes
            recommendations_list = recommendation_generator(query, student_id, mode)
            
            response_time = time.time() - start_time
            
            recommendations = RecommendationSet(
                recommendations=recommendations_list,
                query=query,
                student_id=student_id,
                context_mode=mode,
                generated_at=datetime.now(),
                response_time=response_time,
                model_used="test_model"
            )
            
            # Evaluate recommendations
            metrics = self.evaluate_recommendations(recommendations, plan_context)
            results[mode] = metrics
            
        logger.info(f"Context ablation study completed for query: {query[:50]}...")
        return results
    
    def get_performance_summary(
        self, 
        context_mode: Optional[str] = None,
        time_window_hours: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get performance summary statistics.
        
        Args:
            context_mode: Filter by specific context mode
            time_window_hours: Only include evaluations within time window
        """
        
        filtered_evaluations = self.evaluation_history
        
        # Apply filters
        if context_mode:
            filtered_evaluations = [
                eval for eval in filtered_evaluations 
                if eval["context_mode"] == context_mode
            ]
        
        if time_window_hours:
            cutoff_time = datetime.now().timestamp() - (time_window_hours * 3600)
            filtered_evaluations = [
                eval for eval in filtered_evaluations
                if datetime.fromisoformat(eval["timestamp"]).timestamp() > cutoff_time
            ]
        
        if not filtered_evaluations:
            return {"total_evaluations": 0}
        
        # Calculate summary statistics
        metrics_keys = ["plan_score", "personal_score", "lift", "recall", "precision", "response_time"]
        summary_stats = {}
        
        for metric in metrics_keys:
            values = [eval["metrics"][metric] for eval in filtered_evaluations]
            summary_stats[metric] = {
                "mean": statistics.mean(values),
                "median": statistics.median(values),
                "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0,
                "min": min(values),
                "max": max(values),
                "count": len(values)
            }
        
        # Context mode distribution
        context_distribution = {}
        for eval in filtered_evaluations:
            mode = eval["context_mode"]
            context_distribution[mode] = context_distribution.get(mode, 0) + 1
        
        return {
            "total_evaluations": len(filtered_evaluations),
            "summary_statistics": summary_stats,
            "context_mode_distribution": context_distribution,
            "evaluation_period": {
                "oldest": min(eval["timestamp"] for eval in filtered_evaluations),
                "newest": max(eval["timestamp"] for eval in filtered_evaluations)
            }
        }
    
    def compare_context_modes(self) -> Dict[str, Dict[str, float]]:
        """
        Compare recommendation quality across different context modes.
        
        Returns SmartCourse-style comparison showing how context affects quality.
        """
        
        mode_groups = {}
        for eval in self.evaluation_history:
            mode = eval["context_mode"]
            if mode not in mode_groups:
                mode_groups[mode] = []
            mode_groups[mode].append(eval["metrics"])
        
        comparison = {}
        metrics_keys = ["plan_score", "personal_score", "lift", "recall", "precision", "response_time"]
        
        for mode, evaluations in mode_groups.items():
            if not evaluations:
                continue
                
            mode_stats = {}
            for metric in metrics_keys:
                values = [eval[metric] for eval in evaluations]
                mode_stats[metric] = {
                    "mean": statistics.mean(values),
                    "count": len(values),
                    "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0
                }
            
            comparison[mode] = mode_stats
        
        return comparison
    
    def generate_recommendations_report(
        self, 
        student_id: str,
        include_context_analysis: bool = True
    ) -> Dict[str, Any]:
        """
        Generate comprehensive recommendations report for a student.
        
        Includes quality metrics, context analysis, and improvement suggestions.
        """
        
        student_evaluations = [
            eval for eval in self.evaluation_history 
            if eval["student_id"] == student_id
        ]
        
        if not student_evaluations:
            return {"student_id": student_id, "total_evaluations": 0}
        
        # Recent performance
        recent_performance = self.get_performance_summary(time_window_hours=24)
        
        # Quality trends
        quality_trend = []
        for eval in student_evaluations[-10:]:  # Last 10 evaluations
            quality_trend.append({
                "timestamp": eval["timestamp"],
                "plan_score": eval["metrics"]["plan_score"],
                "personal_score": eval["metrics"]["personal_score"],
                "response_time": eval["metrics"]["response_time"]
            })
        
        # Context effectiveness analysis
        context_effectiveness = {}
        if include_context_analysis:
            context_effectiveness = self.compare_context_modes()
        
        return {
            "student_id": student_id,
            "total_evaluations": len(student_evaluations),
            "recent_performance": recent_performance,
            "quality_trend": quality_trend,
            "context_effectiveness": context_effectiveness,
            "recommendations": self._generate_improvement_suggestions(student_evaluations)
        }
    
    def _generate_improvement_suggestions(self, evaluations: List[Dict]) -> List[str]:
        """Generate suggestions for improving recommendation quality"""
        
        suggestions = []
        
        if not evaluations:
            return suggestions
        
        # Analyze recent performance
        recent_metrics = [eval["metrics"] for eval in evaluations[-5:]]
        
        avg_plan_score = statistics.mean([m["plan_score"] for m in recent_metrics])
        avg_personal_score = statistics.mean([m["personal_score"] for m in recent_metrics])
        avg_lift = statistics.mean([m["lift"] for m in recent_metrics])
        avg_response_time = statistics.mean([m["response_time"] for m in recent_metrics])
        
        # Generate targeted suggestions based on SmartCourse findings
        if avg_plan_score < 0.4:
            suggestions.append("Low PlanScore detected. Consider using full context mode with degree plan information.")
        
        if avg_lift < 0.1:
            suggestions.append("Low personalization benefit. Ensure transcript data includes grade information for better retake recommendations.")
        
        if avg_response_time > 60:
            suggestions.append("High response time detected. Consider context optimization or model switching.")
        
        if avg_personal_score < 0.6:
            suggestions.append("PersonalScore below optimal threshold. Verify that both transcript and degree plan contexts are available.")
        
        return suggestions

# Global evaluator instance
recommendation_evaluator = RecommendationEvaluator()

def create_plan_context_from_profile(profile_data: Dict[str, Any]) -> StudentPlanContext:
    """Helper to create StudentPlanContext from profile data"""
    
    completed = set(course["course_id"] for course in profile_data.get("completed", []))
    
    # Identify low-grade courses (below B-)
    grade_points = {"A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0}
    low_grades = set()
    for course in profile_data.get("completed", []):
        if grade_points.get(course.get("grade", "C"), 2.0) < 2.7:
            low_grades.add(course["course_id"])
    
    return StudentPlanContext(
        outstanding_requirements=set(profile_data.get("outstanding_requirements", [])),
        low_grade_courses=low_grades,
        completed_courses=completed,
        track_requirements=set(profile_data.get("track_requirements", [])),
        elective_options=set(profile_data.get("elective_options", []))
    )