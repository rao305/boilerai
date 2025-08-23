"""
Smart Course Progression Service
Integrates track-aware intelligence with the existing BoilerAI advisor system
"""

import json
import logging
from typing import Dict, List, Optional, Any
from .track_intelligent_advisor import (
    TrackIntelligentAdvisor,
    TrackContext, 
    integrate_with_existing_advisor
)
from .contextual_advisor import ContextualAdvisor

logger = logging.getLogger(__name__)

class SmartProgressionService:
    """
    Service that enhances the existing advisor with track-aware intelligence
    and SmartCourse-style contextual recommendations
    """
    
    def __init__(self):
        self.track_advisor = TrackIntelligentAdvisor()
        self.contextual_advisor = ContextualAdvisor()
        
    def enhance_query_with_track_intelligence(
        self, 
        query: str, 
        student_profile: Dict
    ) -> Dict[str, Any]:
        """
        Main entry point - enhance any query with track-aware intelligence
        """
        try:
            # Extract or detect track information
            track_info = self._extract_track_info(query, student_profile)
            
            # Generate track-aware recommendations
            track_result = integrate_with_existing_advisor(query, student_profile)
            
            # Generate SmartCourse-style contextual prompt
            track_context = TrackContext(
                selected_track=student_profile.get("track"),
                completed_courses=student_profile.get("completed_courses", []),
                current_semester=student_profile.get("current_semester"),
                gpa=student_profile.get("gpa"),
                low_grade_courses=student_profile.get("low_grade_courses", [])
            )
            
            contextual_prompt = self.track_advisor.generate_smartcourse_prompt(query, track_context)
            
            # Get personalized degree plan
            personalized_plan = self.track_advisor.get_personalized_degree_plan(track_context)
            
            return {
                "success": True,
                "track_recommendations": track_result["recommendations"],
                "smartcourse_metrics": track_result["smartcourse_metrics"],
                "detected_track": track_result.get("detected_track"),
                "contextual_prompt": contextual_prompt,
                "personalized_plan": personalized_plan,
                "track_analysis": track_info,
                "enhancement_type": "track_aware"
            }
            
        except Exception as e:
            logger.error(f"Error in track intelligence enhancement: {e}")
            return {
                "success": False,
                "error": str(e),
                "fallback_available": True
            }
    
    def _extract_track_info(self, query: str, student_profile: Dict) -> Dict:
        """Extract or infer track information from query and profile"""
        
        # Check if track is explicitly mentioned in profile
        explicit_track = student_profile.get("track")
        if explicit_track:
            return {
                "track_source": "profile",
                "track_id": explicit_track,
                "confidence": 1.0
            }
            
        # Try to detect from query
        detected_track, confidence = self.track_advisor.detect_track_from_query(query)
        if detected_track and confidence > 0.2:
            return {
                "track_source": "query_detection", 
                "track_id": detected_track,
                "confidence": confidence
            }
            
        # Check completed courses for track indicators
        completed_courses = student_profile.get("completed_courses", [])
        track_from_courses = self._infer_track_from_courses(completed_courses)
        if track_from_courses:
            return {
                "track_source": "course_analysis",
                "track_id": track_from_courses["track"],
                "confidence": track_from_courses["confidence"]
            }
            
        return {
            "track_source": "none",
            "track_id": None,
            "confidence": 0.0,
            "suggestion": "Consider selecting a track to get personalized recommendations"
        }
    
    def _infer_track_from_courses(self, completed_courses: List[str]) -> Optional[Dict]:
        """Infer likely track from pattern of completed courses"""
        if not completed_courses:
            return None
            
        # Define track-indicative courses
        mi_indicators = {"CS37300", "CS47100", "CS47300", "CS57700", "CS57800", "CS44000"}
        se_indicators = {"CS30700", "CS35200", "CS35400", "CS40700", "CS40800", "CS42200"}
        
        completed_set = set(completed_courses)
        
        mi_score = len(completed_set.intersection(mi_indicators))
        se_score = len(completed_set.intersection(se_indicators))
        
        if mi_score > se_score and mi_score >= 2:
            return {"track": "machine_intelligence", "confidence": 0.7}
        elif se_score > mi_score and se_score >= 2:
            return {"track": "software_engineering", "confidence": 0.7}
            
        return None
    
    def get_track_progression_for_semester(
        self, 
        semester: str, 
        student_profile: Dict
    ) -> Dict:
        """
        Get track-aware course plan for a specific semester
        """
        track_context = TrackContext(
            selected_track=student_profile.get("track"),
            completed_courses=student_profile.get("completed_courses", []),
            current_semester=student_profile.get("current_semester"), 
            gpa=student_profile.get("gpa"),
            low_grade_courses=student_profile.get("low_grade_courses", [])
        )
        
        # Get base semester plan
        progression = self.track_advisor.progression_data["academic_progression"]
        semester_plan = progression.get(semester, {})
        
        if not semester_plan:
            return {"error": f"No plan available for semester: {semester}"}
            
        # Replace track placeholders with specific courses
        enhanced_plan = self.track_advisor.replace_track_placeholders(semester_plan, track_context)
        
        return {
            "semester": semester,
            "enhanced_plan": enhanced_plan,
            "track_applied": track_context.selected_track,
            "original_credits": semester_plan.get("typical_credits"),
            "enhancement_applied": True
        }
    
    def validate_course_sequence(
        self, 
        proposed_courses: List[str], 
        student_profile: Dict
    ) -> Dict:
        """
        Validate a proposed sequence of courses against track requirements
        and prerequisites
        """
        completed_courses = student_profile.get("completed_courses", [])
        selected_track = student_profile.get("track")
        
        validation_results = []
        
        for course_id in proposed_courses:
            # Check prerequisites
            prereq_status = self.track_advisor._has_prerequisites(course_id, completed_courses)
            
            # Check track relevance if track is selected
            track_relevance = "unknown"
            if selected_track:
                track_def = self.track_advisor.progression_data["track_definitions"].get(selected_track)
                if track_def:
                    track_relevance = self._check_course_track_relevance(course_id, track_def)
            
            course_info = self.track_advisor.courses_data.get(course_id, {})
            
            validation_results.append({
                "course_id": course_id,
                "title": course_info.get("title", "Unknown"),
                "prerequisites_satisfied": prereq_status,
                "track_relevance": track_relevance,
                "validation_status": "valid" if prereq_status else "prerequisites_missing"
            })
            
        return {
            "validation_results": validation_results,
            "overall_valid": all(result["prerequisites_satisfied"] for result in validation_results),
            "track_aligned": selected_track is not None
        }
    
    def _check_course_track_relevance(self, course_id: str, track_def: Dict) -> str:
        """Check if course is relevant to the selected track"""
        # Check required courses
        for req_group in track_def.get("required_courses", []):
            if course_id in req_group.get("options", []):
                return "required"
                
        # Check electives
        for elec_group in track_def.get("elective_courses", []):
            if course_id in elec_group.get("options", []):
                return "elective"
                
        return "not_track_specific"
    
    def generate_degree_audit_with_tracks(self, student_profile: Dict) -> Dict:
        """
        Generate a comprehensive degree audit including track progression
        """
        track_context = TrackContext(
            selected_track=student_profile.get("track"),
            completed_courses=student_profile.get("completed_courses", []),
            gpa=student_profile.get("gpa"),
            low_grade_courses=student_profile.get("low_grade_courses", [])
        )
        
        # Get personalized plan
        personalized_plan = self.track_advisor.get_personalized_degree_plan(track_context)
        
        # Calculate completion status
        completion_status = self._calculate_completion_status(student_profile, track_context)
        
        # Generate next semester recommendations
        next_semester = self._determine_next_semester(track_context)
        next_semester_plan = self.get_track_progression_for_semester(next_semester, student_profile)
        
        return {
            "degree_audit": {
                "completion_status": completion_status,
                "track_selected": track_context.selected_track,
                "track_completion": self._calculate_track_completion(track_context),
                "gpa_status": {
                    "current_gpa": track_context.gpa,
                    "meets_requirements": (track_context.gpa or 0) >= 2.0,
                    "graduation_eligible": self._check_graduation_eligibility(completion_status, track_context.gpa)
                }
            },
            "personalized_plan": personalized_plan,
            "next_semester_recommendations": next_semester_plan,
            "enhancement_metadata": {
                "system": "track_intelligent_advisor",
                "smartcourse_integration": True,
                "context_aware": True
            }
        }
    
    def _calculate_completion_status(self, student_profile: Dict, track_context: TrackContext) -> Dict:
        """Calculate overall degree completion status"""
        completed_courses = track_context.completed_courses or []
        
        # CS Core requirements (6 courses)
        cs_core = ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"]
        cs_core_completed = [course for course in completed_courses if course in cs_core]
        
        # Math requirements  
        math_required = ["MA16100", "MA16200", "MA26100", "MA26500"]  # or alternatives
        math_completed = [course for course in completed_courses if course.startswith("MA")]
        
        # Track requirements (if track selected)
        track_completion = 0
        if track_context.selected_track:
            track_completion = len(self.track_advisor._get_outstanding_requirements(
                self.track_advisor.progression_data["track_definitions"][track_context.selected_track],
                track_context
            ))
        
        total_credits = sum(
            self.track_advisor.courses_data.get(course, {}).get("credits", 3) 
            for course in completed_courses
        )
        
        return {
            "total_credits": total_credits,
            "credits_remaining": max(0, 120 - total_credits),
            "cs_core_completed": len(cs_core_completed),
            "cs_core_remaining": max(0, 6 - len(cs_core_completed)),
            "math_requirements_met": len(math_completed) >= 4,
            "track_requirements_remaining": track_completion,
            "estimated_semesters_remaining": max(1, (120 - total_credits) // 15)
        }
    
    def _calculate_track_completion(self, track_context: TrackContext) -> Dict:
        """Calculate track-specific completion status"""
        if not track_context.selected_track:
            return {"track_selected": False}
            
        track_def = self.track_advisor.progression_data["track_definitions"][track_context.selected_track]
        outstanding = self.track_advisor._get_outstanding_requirements(track_def, track_context)
        
        total_track_requirements = 0
        for req_group in track_def.get("required_courses", []):
            total_track_requirements += req_group.get("need", 1)
        for elec_group in track_def.get("elective_courses", []):
            total_track_requirements += elec_group.get("need", 1)
            
        completed_track_requirements = total_track_requirements - len(outstanding)
        
        return {
            "track_selected": True,
            "track_name": track_def["track_name"],
            "total_requirements": total_track_requirements,
            "completed_requirements": completed_track_requirements,
            "remaining_requirements": len(outstanding),
            "completion_percentage": (completed_track_requirements / total_track_requirements) * 100 if total_track_requirements > 0 else 0,
            "outstanding_courses": outstanding
        }
    
    def _determine_next_semester(self, track_context: TrackContext) -> str:
        """Determine next logical semester for planning"""
        return self.track_advisor._determine_next_semester(track_context)
    
    def _check_graduation_eligibility(self, completion_status: Dict, gpa: Optional[float]) -> bool:
        """Check if student is eligible for graduation"""
        credits_ok = completion_status.get("credits_remaining", 120) <= 6  # Within one semester
        core_ok = completion_status.get("cs_core_remaining", 6) == 0
        gpa_ok = (gpa or 0) >= 2.0
        
        return credits_ok and core_ok and gpa_ok

# Integration functions for existing system

def enhance_advisor_response(query: str, student_profile: Dict, existing_response: str) -> Dict:
    """
    Enhance existing advisor response with track intelligence
    """
    service = SmartProgressionService()
    enhancement = service.enhance_query_with_track_intelligence(query, student_profile)
    
    return {
        "original_response": existing_response,
        "track_enhancement": enhancement,
        "combined_intelligence": True,
        "smartcourse_integrated": True
    }

def get_personalized_semester_plan(semester: str, student_profile: Dict) -> Dict:
    """
    Get track-aware semester plan for course scheduling
    """
    service = SmartProgressionService()
    return service.get_track_progression_for_semester(semester, student_profile)

def validate_course_selection(courses: List[str], student_profile: Dict) -> Dict:
    """
    Validate student's course selection against track requirements
    """
    service = SmartProgressionService()
    return service.validate_course_sequence(courses, student_profile)

def generate_comprehensive_degree_audit(student_profile: Dict) -> Dict:
    """
    Generate comprehensive degree audit with track intelligence
    """
    service = SmartProgressionService()
    return service.generate_degree_audit_with_tracks(student_profile)