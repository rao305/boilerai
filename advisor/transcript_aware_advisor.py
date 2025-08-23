"""
Transcript-Aware Academic Advisor
Provides intelligent advice based on transcript upload status with privacy protection
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from .track_intelligent_advisor import TrackIntelligentAdvisor, TrackContext, integrate_with_existing_advisor
from .codo_evaluator import CODOEvaluator, evaluate_codo_from_transcript, get_transcript_aware_advice
from .smart_progression_service import SmartProgressionService

logger = logging.getLogger(__name__)

class TranscriptAwareAdvisor:
    """
    Enhanced advisor that provides different levels of intelligence based on 
    transcript availability while maintaining privacy
    """
    
    def __init__(self):
        self.track_advisor = TrackIntelligentAdvisor()
        self.codo_evaluator = CODOEvaluator() 
        self.progression_service = SmartProgressionService()
        
    def provide_intelligent_advice(
        self, 
        query: str, 
        user_session: Dict,
        privacy_settings: Dict = None
    ) -> Dict[str, Any]:
        """
        Main entry point - provides advice based on available context
        
        Args:
            query: User's academic question
            user_session: Session context including transcript status
            privacy_settings: User privacy preferences
        """
        
        # Determine available context
        context_level = self._assess_available_context(user_session, privacy_settings)
        
        # Route to appropriate advice generation
        if context_level["has_transcript"] and context_level["privacy_approved"]:
            return self._provide_full_context_advice(query, user_session, context_level)
        elif context_level["has_profile_data"]:
            return self._provide_profile_based_advice(query, user_session, context_level)
        else:
            return self._provide_general_advice(query, context_level)
    
    def _assess_available_context(self, user_session: Dict, privacy_settings: Dict = None) -> Dict:
        """Assess what context is available for personalized advice"""
        
        # Check transcript availability
        has_transcript = bool(user_session.get("transcript_data"))
        transcript_valid = False
        
        if has_transcript:
            transcript_data = user_session.get("transcript_data", {})
            transcript_valid = self._validate_transcript_data(transcript_data)
        
        # Check privacy settings
        privacy_settings = privacy_settings or user_session.get("privacy_settings", {})
        privacy_approved = privacy_settings.get("allow_transcript_analysis", True)
        
        # Check other profile data
        has_profile = bool(user_session.get("academic_profile", {}).get("completed_courses"))
        has_track = bool(user_session.get("selected_track"))
        
        return {
            "has_transcript": has_transcript,
            "transcript_valid": transcript_valid,
            "privacy_approved": privacy_approved,
            "has_profile_data": has_profile,
            "has_track": has_track,
            "context_score": self._calculate_context_score(has_transcript, transcript_valid, privacy_approved, has_profile, has_track)
        }
    
    def _calculate_context_score(self, has_transcript: bool, valid: bool, privacy: bool, profile: bool, track: bool) -> float:
        """Calculate context richness score (0.0-1.0)"""
        score = 0.0
        if has_transcript and valid and privacy:
            score += 0.5  # Transcript is most valuable
        if profile:
            score += 0.2  # Profile data adds value
        if track:
            score += 0.2  # Track selection adds specificity
        score += 0.1    # Base advice always available
        
        return min(1.0, score)
    
    def _validate_transcript_data(self, transcript_data: Dict) -> bool:
        """Validate transcript data has required fields"""
        required_fields = ["courses", "institution_info"]
        
        if not all(field in transcript_data for field in required_fields):
            return False
            
        courses = transcript_data.get("courses", [])
        if not courses:
            return False
            
        # Check if courses have required fields
        sample_course = courses[0] if courses else {}
        required_course_fields = ["course_code", "grade", "credits"]
        
        return all(field in sample_course for field in required_course_fields)
    
    def _provide_full_context_advice(self, query: str, user_session: Dict, context_level: Dict) -> Dict:
        """Provide advice with full transcript context"""
        
        transcript_data = user_session["transcript_data"]
        
        # Check for CODO-related queries first
        if self._is_codo_query(query):
            codo_result = evaluate_codo_from_transcript(transcript_data)
            return {
                "advice_type": "codo_evaluation_full",
                "context_level": "full_transcript",
                "codo_analysis": codo_result,
                "privacy_protected": True,
                "confidence": 0.95,
                "recommendations": self._format_codo_recommendations(codo_result)
            }
        
        # Build comprehensive student profile from transcript
        student_profile = self._build_profile_from_transcript(transcript_data, user_session)
        
        # Get track-aware recommendations
        track_result = self.progression_service.enhance_query_with_track_intelligence(query, student_profile)
        
        # Get degree audit
        degree_audit = self.progression_service.generate_degree_audit_with_tracks(student_profile)
        
        return {
            "advice_type": "full_context_analysis",
            "context_level": "full_transcript",
            "student_profile": self._sanitize_profile_for_privacy(student_profile),
            "track_analysis": track_result,
            "degree_audit": degree_audit,
            "personalized_recommendations": self._generate_comprehensive_recommendations(
                query, student_profile, track_result, degree_audit
            ),
            "confidence": 0.9,
            "privacy_protected": True
        }
    
    def _provide_profile_based_advice(self, query: str, user_session: Dict, context_level: Dict) -> Dict:
        """Provide advice based on available profile data"""
        
        academic_profile = user_session.get("academic_profile", {})
        selected_track = user_session.get("selected_track")
        
        # Build limited student profile
        student_profile = {
            "track": selected_track,
            "completed_courses": academic_profile.get("completed_courses", []),
            "current_semester": academic_profile.get("current_semester"),
            "gpa": academic_profile.get("gpa")
        }
        
        # Use track intelligence with limited context
        track_result = self.progression_service.enhance_query_with_track_intelligence(query, student_profile)
        
        return {
            "advice_type": "profile_based",
            "context_level": "profile_data",
            "track_analysis": track_result,
            "recommendations": [
                "Upload transcript for more personalized recommendations",
                "Based on available profile data:",
                *[rec["course_id"] + ": " + rec["reasoning"] for rec in track_result.get("track_recommendations", [])]
            ],
            "confidence": 0.7,
            "enhancement_available": "Upload transcript for detailed analysis"
        }
    
    def _provide_general_advice(self, query: str, context_level: Dict) -> Dict:
        """Provide general advice when limited context available"""
        
        if self._is_codo_query(query):
            return {
                "advice_type": "codo_general_requirements", 
                "context_level": "general",
                "codo_requirements": self._get_codo_requirements_display(),
                "recommendations": [
                    "Upload your transcript for personalized CODO eligibility evaluation",
                    "Focus on CS 18000 and Calculus with B or better grades",
                    "Maintain overall GPA of 2.75 or higher",
                    "Complete at least 12 Purdue credit hours"
                ],
                "confidence": 0.8,
                "call_to_action": "Upload transcript for detailed eligibility analysis"
            }
        
        # Detect track interest from query
        detected_track, track_confidence = self.track_advisor.detect_track_from_query(query)
        
        general_recommendations = [
            "Upload your transcript for personalized course recommendations"
        ]
        
        if detected_track:
            track_info = self.track_advisor.progression_data["track_definitions"][detected_track]
            general_recommendations.extend([
                f"Detected interest in {track_info['track_name']} track",
                f"Track focus: {track_info['description']}",
                "Complete CS core courses before specializing"
            ])
        
        return {
            "advice_type": "general_guidance",
            "context_level": "minimal",
            "detected_track": detected_track,
            "track_confidence": track_confidence,
            "recommendations": general_recommendations,
            "cs_core_guidance": [
                "Start with CS 18000 (Problem Solving & OOP)",
                "Take Calculus I (MA 16100 or MA 16500) early",
                "Follow with CS 18200 (Foundations of CS)",
                "Build strong foundation before advanced courses"
            ],
            "confidence": 0.6,
            "enhancement_available": "Upload transcript for comprehensive analysis"
        }
    
    def _build_profile_from_transcript(self, transcript_data: Dict, user_session: Dict) -> Dict:
        """Build comprehensive student profile from transcript data"""
        courses = transcript_data.get("courses", [])
        
        # Extract completed courses and grades
        completed_courses = []
        low_grade_courses = []
        total_credits = 0
        total_points = 0.0
        
        for course in courses:
            course_code = course.get("course_code", "")
            grade = course.get("grade", "")
            credits = course.get("credits", 0)
            
            if course_code and grade != "W":  # Exclude withdrawals
                completed_courses.append(course_code)
                
                # Track low grades for retake suggestions
                if grade in ["C-", "D+", "D", "D-", "F"]:
                    low_grade_courses.append(course_code)
                
                # Calculate GPA
                grade_points = self.codo_evaluator.grade_points.get(grade, 0.0)
                total_points += grade_points * credits
                total_credits += credits
        
        gpa = total_points / total_credits if total_credits > 0 else 0.0
        
        # Detect likely track from completed courses
        selected_track = user_session.get("selected_track")
        if not selected_track:
            selected_track = self._infer_track_from_courses(completed_courses)
        
        # Determine current academic standing
        current_semester = self._estimate_current_semester(completed_courses, total_credits)
        
        return {
            "track": selected_track,
            "completed_courses": completed_courses,
            "current_semester": current_semester,
            "gpa": round(gpa, 3),
            "low_grade_courses": low_grade_courses,
            "total_credits": total_credits,
            "transcript_analyzed": True,
            "last_updated": datetime.now().isoformat()
        }
    
    def _infer_track_from_courses(self, completed_courses: List[str]) -> Optional[str]:
        """Infer likely track interest from completed courses"""
        # Look for track-indicative courses
        mi_courses = {"CS37300", "CS47100", "CS47300", "CS57700", "CS57800", "CS44000"}
        se_courses = {"CS30700", "CS35200", "CS35400", "CS40700", "CS40800", "CS42200"}
        
        completed_set = set(completed_courses)
        
        mi_score = len(completed_set.intersection(mi_courses))
        se_score = len(completed_set.intersection(se_courses))
        
        if mi_score > se_score and mi_score >= 1:
            return "machine_intelligence"
        elif se_score > mi_score and se_score >= 1:
            return "software_engineering"
            
        return None
    
    def _get_codo_requirements_display(self) -> Dict:
        """Get CODO requirements formatted for display"""
        return {
            "general_requirements": {
                "minimum_semesters": 1,
                "minimum_purdue_credits": 12,
                "minimum_gpa": 2.75,
                "academic_standing": "Good standing (not on academic notice)"
            },
            "course_requirements": {
                "cs18000": "CS 18000 - Problem Solving and Object-Oriented Programming (B or better)",
                "mathematics": "One of: MA 16100/16500 (Calc I), MA 16200/16600 (Calc II), MA 26100/27101 (Calc III), or MA 26500/35100 (Linear Algebra) with B or better"
            },
            "important_notes": [
                "Admission is on SPACE AVAILABLE BASIS ONLY - extremely limited spots",
                "Priority given to students with strongest grades in CS 18000, Calculus, and overall GPA",
                "All CS and Math courses must be taken for letter grade at Purdue campus",
                "Only first or second attempt of required courses considered"
            ]
        }
    
    def _estimate_current_semester(self, completed_courses: List[str], total_credits: int) -> str:
        """Estimate current semester based on academic progress"""
        # Count CS core completion
        cs_core = ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"]
        cs_core_completed = len([course for course in completed_courses if course in cs_core])
        
        # Estimate based on credits and core progress
        if total_credits < 15 or cs_core_completed <= 1:
            return "freshman_spring" if cs_core_completed >= 1 else "freshman_fall"
        elif total_credits < 45 or cs_core_completed <= 3:
            return "sophomore_spring" if cs_core_completed >= 3 else "sophomore_fall"
        elif total_credits < 75 or cs_core_completed <= 5:
            return "junior_spring" if cs_core_completed >= 5 else "junior_fall"
        else:
            return "senior_spring" if total_credits >= 105 else "senior_fall"
    
    def _sanitize_profile_for_privacy(self, student_profile: Dict) -> Dict:
        """Remove or anonymize sensitive information from profile"""
        sanitized = student_profile.copy()
        
        # Remove specific grades, keep only course completion status
        if "low_grade_courses" in sanitized:
            sanitized["has_retake_opportunities"] = len(sanitized["low_grade_courses"]) > 0
            del sanitized["low_grade_courses"]
            
        # Generalize GPA
        if "gpa" in sanitized:
            gpa = sanitized["gpa"]
            if gpa >= 3.5:
                sanitized["gpa_range"] = "high"
            elif gpa >= 3.0:
                sanitized["gpa_range"] = "good"
            elif gpa >= 2.5:
                sanitized["gpa_range"] = "satisfactory"
            else:
                sanitized["gpa_range"] = "needs_improvement"
            del sanitized["gpa"]
            
        # Add privacy marker
        sanitized["privacy_protected"] = True
        sanitized["context_level"] = "full_transcript_sanitized"
        
        return sanitized
    
    def _is_codo_query(self, query: str) -> bool:
        """Check if query is CODO-related"""
        codo_keywords = [
            "codo", "change of degree", "change degree", "switch to cs", 
            "switch to computer science", "transfer to cs", "cs admission", 
            "cs eligibility", "get into cs", "apply to cs", "eligible for cs"
        ]
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in codo_keywords)
    
    def _format_codo_recommendations(self, codo_result: Dict) -> List[str]:
        """Format CODO evaluation results into actionable recommendations"""
        evaluation = codo_result["codo_evaluation"]
        competitive = codo_result["competitive_analysis"]
        
        recommendations = []
        
        if evaluation.eligible:
            recommendations.extend([
                "✅ CODO ELIGIBLE: You meet the basic requirements for CS CODO!",
                f"📊 Competitive Score: {competitive['competitive_score']}/100 ({competitive['competitiveness']})",
                "",
                "🎯 Next Steps:",
                "  • Submit CODO application during next application period",
                "  • Note: Space is extremely limited (space-available basis)",
                "  • Priority given to highest grades in CS18000, Calculus, and GPA"
            ])
            
            # Add competitive improvement suggestions
            if competitive["improvement_opportunities"]:
                recommendations.append("\n💡 To improve competitiveness:")
                recommendations.extend(f"  • {suggestion}" for suggestion in competitive["improvement_opportunities"])
                
        else:
            recommendations.extend([
                "❌ CODO NOT ELIGIBLE: Current transcript doesn't meet requirements",
                "",
                "📋 Missing Requirements:"
            ])
            recommendations.extend(f"  • {req}" for req in evaluation.missing_requirements)
            
            if evaluation.grade_deficiencies:
                recommendations.append("\n📈 Grade Improvements Needed:")
                recommendations.extend(f"  • {deficiency}" for deficiency in evaluation.grade_deficiencies)
                
            recommendations.extend([
                "",
                "🎯 Action Plan:",
                *evaluation.recommendations
            ])
        
        return recommendations
    
    def _generate_comprehensive_recommendations(
        self, 
        query: str, 
        student_profile: Dict, 
        track_result: Dict, 
        degree_audit: Dict
    ) -> List[str]:
        """Generate comprehensive recommendations using all available context"""
        
        recommendations = []
        
        # Start with track-specific recommendations
        if track_result.get("success") and track_result.get("track_recommendations"):
            track_name = track_result.get("detected_track", "your track")
            recommendations.extend([
                f"🎯 Based on your transcript and {track_name} track:",
                ""
            ])
            
            for rec in track_result["track_recommendations"][:3]:  # Top 3 recommendations
                recommendations.append(f"📚 {rec['course_id']}: {rec['title']}")
                recommendations.append(f"   Reasoning: {rec['reasoning']}")
                recommendations.append(f"   Confidence: {rec['confidence']:.0%}")
                recommendations.append("")
        
        # Add degree audit insights
        audit_info = degree_audit.get("degree_audit", {})
        completion_status = audit_info.get("completion_status", {})
        
        if completion_status:
            recommendations.extend([
                "📊 Your Academic Progress:",
                f"  • Credits completed: {completion_status.get('total_credits', 0)}/120",
                f"  • CS Core progress: {completion_status.get('cs_core_completed', 0)}/6 courses",
                f"  • Estimated semesters remaining: {completion_status.get('estimated_semesters_remaining', 'N/A')}"
            ])
            
            # Track-specific progress
            track_completion = audit_info.get("track_completion", {})
            if track_completion.get("track_selected"):
                recommendations.extend([
                    f"  • {track_completion['track_name']} track: {track_completion['completion_percentage']:.0f}% complete",
                    f"  • Track requirements remaining: {track_completion['remaining_requirements']}"
                ])
        
        # Add SmartCourse metrics if available
        metrics = track_result.get("smartcourse_metrics", {})
        if metrics:
            plan_score = metrics.get("plan_score", 0)
            recall = metrics.get("recall", 0)
            recommendations.extend([
                "",
                f"🔍 Recommendation Quality (SmartCourse metrics):",
                f"  • Plan alignment: {plan_score:.0%}",
                f"  • Coverage of remaining requirements: {recall:.0%}"
            ])
        
        return recommendations
    
    def handle_transcript_upload_scenario(
        self, 
        query: str, 
        uploaded_transcript: Dict = None,
        user_session: Dict = None
    ) -> Dict:
        """
        Handle both scenarios: with and without transcript upload
        """
        
        if uploaded_transcript:
            # Scenario 1: User uploaded transcript
            enhanced_session = (user_session or {}).copy()
            enhanced_session["transcript_data"] = uploaded_transcript
            enhanced_session["has_transcript"] = True
            
            result = self.provide_intelligent_advice(query, enhanced_session)
            result["scenario"] = "transcript_uploaded"
            result["personalization_level"] = "high"
            
        else:
            # Scenario 2: No transcript uploaded
            minimal_session = user_session or {}
            result = self.provide_intelligent_advice(query, minimal_session)
            result["scenario"] = "no_transcript"
            result["personalization_level"] = "limited"
            result["upload_prompt"] = {
                "message": "Upload your transcript for personalized recommendations",
                "benefits": [
                    "CODO eligibility evaluation",
                    "Personalized course recommendations",
                    "Detailed degree audit", 
                    "Track-specific guidance",
                    "Performance-based suggestions"
                ]
            }
        
        return result
    
    def evaluate_transcript_for_codo_with_privacy(self, transcript_data: Dict, privacy_level: str = "standard") -> Dict:
        """
        CODO evaluation with configurable privacy protection
        """
        if privacy_level == "minimal":
            # Only return eligibility status
            evaluation = self.codo_evaluator.evaluate_codo_eligibility(transcript_data)
            return {
                "eligible": evaluation.eligible,
                "privacy_level": "minimal",
                "general_guidance": "Contact academic advisor for detailed analysis"
            }
        elif privacy_level == "standard":
            # Return evaluation with sanitized details
            evaluation = self.codo_evaluator.evaluate_codo_eligibility(transcript_data)
            competitive = self.codo_evaluator.analyze_competitive_standing(transcript_data, evaluation)
            
            return {
                "eligible": evaluation.eligible,
                "gpa_meets_requirement": evaluation.overall_gpa >= 2.75,
                "credits_sufficient": evaluation.purdue_credits >= 12,
                "course_requirements_met": all(evaluation.requirements_met.values()),
                "competitive_score": competitive["competitive_score"],
                "competitiveness": competitive["competitiveness"],
                "recommendations": evaluation.recommendations,
                "privacy_level": "standard"
            }
        else:  # Full detail
            return evaluate_codo_from_transcript(transcript_data)

# Integration functions for existing system

def get_context_aware_advice(query: str, user_context: Dict, privacy_settings: Dict = None) -> Dict:
    """
    Main integration function - get advice based on available context
    """
    advisor = TranscriptAwareAdvisor()
    return advisor.provide_intelligent_advice(query, user_context, privacy_settings)

def handle_dual_scenario_advice(query: str, transcript_data: Dict = None, user_session: Dict = None) -> Dict:
    """
    Handle both transcript uploaded and no transcript scenarios
    """
    advisor = TranscriptAwareAdvisor()
    return advisor.handle_transcript_upload_scenario(query, transcript_data, user_session)

def evaluate_codo_eligibility_safe(transcript_data: Dict, privacy_level: str = "standard") -> Dict:
    """
    Safe CODO evaluation with privacy protection
    """
    advisor = TranscriptAwareAdvisor()
    return advisor.evaluate_transcript_for_codo_with_privacy(transcript_data, privacy_level)