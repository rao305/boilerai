"""
CODO (Change of Degree Objective) Eligibility Evaluator for Computer Science
Evaluates student transcripts against CS CODO requirements
"""

import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class CODORequirement:
    """CODO requirement definition"""
    course_options: List[str]
    required_grade: str
    requirement_name: str
    credits_info: str

@dataclass
class CODOEvaluation:
    """CODO eligibility evaluation result"""
    eligible: bool
    overall_gpa: float
    purdue_credits: int
    requirements_met: Dict[str, bool]
    missing_requirements: List[str]
    grade_deficiencies: List[str]
    recommendations: List[str]
    confidence: float
    detailed_analysis: Dict[str, Any]

class CODOEvaluator:
    """
    Evaluates CODO eligibility for Computer Science based on transcript data
    """
    
    def __init__(self):
        self.codo_requirements = self._initialize_codo_requirements()
        self.grade_points = self._initialize_grade_scale()
        
    def _initialize_codo_requirements(self) -> Dict[str, CODORequirement]:
        """Initialize CS CODO requirements"""
        return {
            "cs_programming": CODORequirement(
                course_options=["CS18000"],
                required_grade="B",
                requirement_name="Problem Solving and Object-Oriented Programming",
                credits_info="4.00 credits"
            ),
            "calculus_requirement": CODORequirement(
                course_options=[
                    "MA16100", "MA16500",  # Calc I options
                    "MA16200", "MA16600",  # Calc II options  
                    "MA26100", "MA27101",  # Multivariate options
                    "MA26500", "MA35100"   # Linear Algebra options
                ],
                required_grade="B",
                requirement_name="Calculus Mathematics (any level)",
                credits_info="3-5 credits depending on course"
            )
        }
    
    def _initialize_grade_scale(self) -> Dict[str, float]:
        """Standard Purdue grade scale"""
        return {
            "A+": 4.0, "A": 4.0, "A-": 3.7,
            "B+": 3.3, "B": 3.0, "B-": 2.7,
            "C+": 2.3, "C": 2.0, "C-": 1.7,
            "D+": 1.3, "D": 1.0, "D-": 0.7,
            "F": 0.0, "W": 0.0, "WU": 0.0
        }
    
    def evaluate_codo_eligibility(self, transcript_data: Dict) -> CODOEvaluation:
        """
        Comprehensive CODO eligibility evaluation
        """
        try:
            # Extract transcript information
            courses = transcript_data.get("courses", [])
            if not courses:
                courses = transcript_data.get("parsed_courses", [])
                
            # Calculate GPA and credits
            gpa_info = self._calculate_gpa_and_credits(courses)
            
            # Check course requirements
            requirements_analysis = self._evaluate_course_requirements(courses)
            
            # Check additional requirements
            additional_checks = self._check_additional_requirements(transcript_data, gpa_info)
            
            # Determine overall eligibility
            eligible = self._determine_eligibility(gpa_info, requirements_analysis, additional_checks)
            
            # Generate recommendations
            recommendations = self._generate_codo_recommendations(
                eligible, gpa_info, requirements_analysis, additional_checks
            )
            
            return CODOEvaluation(
                eligible=eligible,
                overall_gpa=gpa_info["overall_gpa"],
                purdue_credits=gpa_info["purdue_credits"],
                requirements_met=requirements_analysis["requirements_met"],
                missing_requirements=requirements_analysis["missing_requirements"],
                grade_deficiencies=requirements_analysis["grade_deficiencies"],
                recommendations=recommendations,
                confidence=self._calculate_confidence(gpa_info, requirements_analysis),
                detailed_analysis={
                    "gpa_analysis": gpa_info,
                    "course_analysis": requirements_analysis,
                    "additional_checks": additional_checks,
                    "policy_version": "Fall 2024"
                }
            )
            
        except Exception as e:
            logger.error(f"CODO evaluation error: {e}")
            return CODOEvaluation(
                eligible=False,
                overall_gpa=0.0,
                purdue_credits=0,
                requirements_met={},
                missing_requirements=["Evaluation error occurred"],
                grade_deficiencies=[],
                recommendations=["Please contact academic advisor for manual review"],
                confidence=0.0,
                detailed_analysis={"error": str(e)}
            )
    
    def _calculate_gpa_and_credits(self, courses: List[Dict]) -> Dict:
        """Calculate GPA and credit information"""
        total_points = 0.0
        total_credits = 0
        purdue_credits = 0
        course_grades = {}
        
        for course in courses:
            course_code = course.get("course_code", "")
            grade = course.get("grade", "")
            credits = course.get("credits", 0)
            institution = course.get("institution", "").lower()
            
            # Track all course grades
            course_grades[course_code] = grade
            
            # Only count Purdue courses for GPA
            if "purdue" in institution or not institution:
                if credits and grade in self.grade_points:
                    grade_points = self.grade_points[grade]
                    total_points += grade_points * credits
                    total_credits += credits
                    purdue_credits += credits
                    
        overall_gpa = total_points / total_credits if total_credits > 0 else 0.0
        
        return {
            "overall_gpa": round(overall_gpa, 3),
            "total_credits": total_credits,
            "purdue_credits": purdue_credits,
            "course_grades": course_grades,
            "meets_gpa_requirement": overall_gpa >= 2.75,
            "meets_credit_requirement": purdue_credits >= 12
        }
    
    def _evaluate_course_requirements(self, courses: List[Dict]) -> Dict:
        """Evaluate specific course requirements"""
        course_grades = {}
        for course in courses:
            course_code = course.get("course_code", "")
            grade = course.get("grade", "")
            course_grades[course_code] = grade
            
        requirements_met = {}
        missing_requirements = []
        grade_deficiencies = []
        
        for req_key, requirement in self.codo_requirements.items():
            met, deficiency = self._check_single_requirement(requirement, course_grades)
            requirements_met[req_key] = met
            
            if not met:
                missing_requirements.append(requirement.requirement_name)
                if deficiency:
                    grade_deficiencies.append(deficiency)
                    
        return {
            "requirements_met": requirements_met,
            "missing_requirements": missing_requirements,
            "grade_deficiencies": grade_deficiencies,
            "cs18000_analysis": self._analyze_cs18000(course_grades),
            "math_analysis": self._analyze_math_courses(course_grades)
        }
    
    def _check_single_requirement(self, requirement: CODORequirement, course_grades: Dict[str, str]) -> Tuple[bool, Optional[str]]:
        """Check if a single CODO requirement is satisfied"""
        required_grade_value = self.grade_points.get(requirement.required_grade, 3.0)
        
        for course_option in requirement.course_options:
            if course_option in course_grades:
                student_grade = course_grades[course_option]
                student_grade_value = self.grade_points.get(student_grade, 0.0)
                
                if student_grade_value >= required_grade_value:
                    return True, None
                else:
                    return False, f"{course_option}: {student_grade} (need {requirement.required_grade} or better)"
                    
        return False, None
    
    def _analyze_cs18000(self, course_grades: Dict[str, str]) -> Dict:
        """Detailed analysis of CS18000 performance"""
        if "CS18000" not in course_grades:
            return {
                "completed": False,
                "grade": None,
                "meets_requirement": False,
                "recommendation": "Must complete CS18000 with B or better"
            }
            
        grade = course_grades["CS18000"]
        grade_value = self.grade_points.get(grade, 0.0)
        meets_req = grade_value >= 3.0  # B or better
        
        return {
            "completed": True,
            "grade": grade,
            "grade_value": grade_value,
            "meets_requirement": meets_req,
            "recommendation": "Requirement satisfied" if meets_req else f"Need to retake CS18000 (current: {grade}, need: B or better)"
        }
    
    def _analyze_math_courses(self, course_grades: Dict[str, str]) -> Dict:
        """Detailed analysis of math course requirements"""
        math_courses = self.codo_requirements["calculus_requirement"].course_options
        completed_math = []
        qualifying_math = []
        
        for course in math_courses:
            if course in course_grades:
                grade = course_grades[course]
                grade_value = self.grade_points.get(grade, 0.0)
                completed_math.append({"course": course, "grade": grade, "grade_value": grade_value})
                
                if grade_value >= 3.0:  # B or better
                    qualifying_math.append(course)
                    
        return {
            "completed_math_courses": completed_math,
            "qualifying_courses": qualifying_math,
            "meets_requirement": len(qualifying_math) > 0,
            "recommendation": "Requirement satisfied" if qualifying_math else "Must complete at least one math course with B or better"
        }
    
    def _check_additional_requirements(self, transcript_data: Dict, gpa_info: Dict) -> Dict:
        """Check additional CODO requirements"""
        return {
            "minimum_semesters": {
                "requirement": "1 semester minimum",
                "status": True,  # Assume satisfied if they have transcript
                "note": "Verified through transcript submission"
            },
            "academic_standing": {
                "requirement": "Good academic standing (not on academic notice)",
                "status": gpa_info["overall_gpa"] >= 2.0,  # Basic good standing threshold
                "current_gpa": gpa_info["overall_gpa"],
                "note": "Based on overall GPA analysis"
            },
            "space_availability": {
                "requirement": "Space available basis only",
                "status": "pending",
                "note": "Space availability determined by department each semester"
            },
            "purdue_campus_requirement": {
                "requirement": "CS and Math courses taken at Purdue campus for letter grade",
                "status": "requires_verification",
                "note": "Manual verification required for transfer courses"
            }
        }
    
    def _determine_eligibility(self, gpa_info: Dict, requirements_analysis: Dict, additional_checks: Dict) -> bool:
        """Determine overall CODO eligibility"""
        # Core requirements check
        meets_gpa = gpa_info["meets_gpa_requirement"]
        meets_credits = gpa_info["meets_credit_requirement"] 
        meets_course_reqs = all(requirements_analysis["requirements_met"].values())
        meets_academic_standing = additional_checks["academic_standing"]["status"]
        
        return meets_gpa and meets_credits and meets_course_reqs and meets_academic_standing
    
    def _generate_codo_recommendations(
        self, 
        eligible: bool, 
        gpa_info: Dict, 
        requirements_analysis: Dict, 
        additional_checks: Dict
    ) -> List[str]:
        """Generate actionable recommendations for CODO process"""
        recommendations = []
        
        if eligible:
            recommendations.extend([
                "✅ You meet the basic CODO requirements for Computer Science!",
                "📝 Submit your CODO application during the next application period",
                "⚠️ Note: Admission is on a space-available basis with limited spots",
                "🎯 Priority given to students with strongest grades in CS18000, Calculus, and overall GPA",
                "📞 Consider meeting with a CS academic advisor to discuss your application"
            ])
        else:
            recommendations.append("❌ Current transcript does not meet CODO requirements. Here's what you need:")
            
            # GPA recommendations
            if not gpa_info["meets_gpa_requirement"]:
                recommendations.append(f"📈 Increase overall GPA to 2.75 (current: {gpa_info['overall_gpa']:.2f})")
                
            # Credit recommendations
            if not gpa_info["meets_credit_requirement"]:
                recommendations.append(f"📚 Complete at least 12 Purdue credit hours (current: {gpa_info['purdue_credits']})")
                
            # Course-specific recommendations
            for deficiency in requirements_analysis["grade_deficiencies"]:
                recommendations.append(f"📖 {deficiency}")
                
            # Missing course recommendations
            for missing in requirements_analysis["missing_requirements"]:
                recommendations.append(f"➕ Complete: {missing}")
                
            # Academic standing
            if not additional_checks["academic_standing"]["status"]:
                recommendations.append("⚖️ Improve academic standing (must not be on academic notice)")
                
        # Always add timeline guidance
        recommendations.extend([
            "",
            "📅 CODO Application Timeline:",
            "  • Applications accepted for Fall, Spring, and Summer terms",
            "  • Submit application early in intended semester",
            "  • Space is extremely limited - apply as soon as eligible"
        ])
        
        return recommendations
    
    def _calculate_confidence(self, gpa_info: Dict, requirements_analysis: Dict) -> float:
        """Calculate confidence in evaluation accuracy"""
        base_confidence = 0.9
        
        # Reduce confidence if missing transcript information
        if gpa_info["total_credits"] < 12:
            base_confidence -= 0.2
            
        # Reduce confidence if unusual grade patterns
        if len(requirements_analysis["grade_deficiencies"]) > 2:
            base_confidence -= 0.1
            
        return max(0.1, base_confidence)
    
    def analyze_competitive_standing(self, transcript_data: Dict, codo_evaluation: CODOEvaluation) -> Dict:
        """
        Analyze competitive standing for CODO admission
        Priority given to strongest grades in CS18000, Calculus, and overall GPA
        """
        courses = transcript_data.get("courses", [])
        course_grades = {course.get("course_code", ""): course.get("grade", "") for course in courses}
        
        # Analyze CS18000 performance
        cs18000_analysis = codo_evaluation.detailed_analysis["course_analysis"]["cs18000_analysis"]
        cs18000_strength = "strong" if cs18000_analysis.get("grade_value", 0) >= 3.7 else "adequate" if cs18000_analysis.get("grade_value", 0) >= 3.0 else "weak"
        
        # Analyze math performance
        math_analysis = codo_evaluation.detailed_analysis["course_analysis"]["math_analysis"]
        best_math_grade = 0.0
        best_math_course = None
        
        for math_course_info in math_analysis["completed_math_courses"]:
            if math_course_info["grade_value"] > best_math_grade:
                best_math_grade = math_course_info["grade_value"]
                best_math_course = math_course_info["course"]
                
        math_strength = "strong" if best_math_grade >= 3.7 else "adequate" if best_math_grade >= 3.0 else "weak"
        
        # Overall GPA strength
        gpa = codo_evaluation.overall_gpa
        gpa_strength = "strong" if gpa >= 3.5 else "adequate" if gpa >= 3.0 else "minimum" if gpa >= 2.75 else "insufficient"
        
        # Calculate competitive score (0-100)
        competitive_score = self._calculate_competitive_score(
            cs18000_analysis.get("grade_value", 0),
            best_math_grade,
            gpa
        )
        
        return {
            "competitive_analysis": {
                "cs18000_strength": cs18000_strength,
                "cs18000_grade": cs18000_analysis.get("grade"),
                "math_strength": math_strength,
                "best_math_course": best_math_course,
                "best_math_grade": best_math_grade,
                "gpa_strength": gpa_strength,
                "overall_gpa": gpa
            },
            "competitive_score": competitive_score,
            "competitiveness": self._categorize_competitiveness(competitive_score),
            "improvement_opportunities": self._suggest_improvements(cs18000_strength, math_strength, gpa_strength)
        }
    
    def _calculate_competitive_score(self, cs_grade_value: float, math_grade_value: float, gpa: float) -> int:
        """Calculate competitive score for CODO admission (0-100)"""
        # Weight: CS18000 (40%), Math (30%), GPA (30%)
        cs_score = (cs_grade_value / 4.0) * 40
        math_score = (math_grade_value / 4.0) * 30
        gpa_score = (min(gpa, 4.0) / 4.0) * 30
        
        return int(cs_score + math_score + gpa_score)
    
    def _categorize_competitiveness(self, score: int) -> str:
        """Categorize competitive standing"""
        if score >= 85:
            return "highly_competitive"
        elif score >= 75:
            return "competitive"
        elif score >= 65:
            return "moderately_competitive"
        else:
            return "minimally_competitive"
    
    def _suggest_improvements(self, cs_strength: str, math_strength: str, gpa_strength: str) -> List[str]:
        """Suggest specific improvements for competitiveness"""
        suggestions = []
        
        if cs_strength == "weak":
            suggestions.append("🎯 Retake CS18000 to achieve A- or better (most important factor)")
        elif cs_strength == "adequate":
            suggestions.append("📈 Consider retaking CS18000 for A- or better to improve competitiveness")
            
        if math_strength == "weak":
            suggestions.append("📐 Complete additional math course with B+ or better")
        elif math_strength == "adequate":
            suggestions.append("➕ Consider taking advanced math course (Calc III, Linear Algebra) for A-")
            
        if gpa_strength in ["minimum", "insufficient"]:
            suggestions.append("📊 Focus on raising overall GPA with high-performing courses")
        elif gpa_strength == "adequate":
            suggestions.append("⬆️ Take additional courses to raise GPA above 3.5 for competitive advantage")
            
        if not suggestions:
            suggestions.append("🎉 Your academic profile is strong for CODO admission!")
            
        return suggestions

class TranscriptAwareAdvisor:
    """
    Enhanced advisor that provides recommendations based on transcript upload status
    """
    
    def __init__(self):
        self.codo_evaluator = CODOEvaluator()
        
    def provide_contextual_advice(self, query: str, user_context: Dict) -> Dict:
        """
        Provide advice based on whether user has uploaded transcript
        """
        has_transcript = user_context.get("has_transcript", False)
        transcript_data = user_context.get("transcript_data")
        
        if has_transcript and transcript_data:
            return self._provide_transcript_based_advice(query, transcript_data, user_context)
        else:
            return self._provide_general_advice(query, user_context)
    
    def _provide_transcript_based_advice(self, query: str, transcript_data: Dict, user_context: Dict) -> Dict:
        """Provide personalized advice based on uploaded transcript"""
        
        # Check if query is CODO-related
        if self._is_codo_query(query):
            codo_eval = self.codo_evaluator.evaluate_codo_eligibility(transcript_data)
            competitive_analysis = self.codo_evaluator.analyze_competitive_standing(transcript_data, codo_eval)
            
            return {
                "advice_type": "codo_evaluation",
                "codo_eligibility": codo_eval,
                "competitive_analysis": competitive_analysis,
                "personalized": True,
                "based_on_transcript": True
            }
        
        # General academic advice based on transcript
        return self._analyze_academic_progress(query, transcript_data, user_context)
    
    def _provide_general_advice(self, query: str, user_context: Dict) -> Dict:
        """Provide general advice when no transcript is available"""
        
        if self._is_codo_query(query):
            return {
                "advice_type": "codo_general_info",
                "codo_requirements": self._format_codo_requirements_for_display(),
                "recommendation": "Upload your transcript for personalized CODO eligibility evaluation",
                "personalized": False,
                "based_on_transcript": False
            }
            
        return {
            "advice_type": "general_academic",
            "recommendation": "Upload your transcript for personalized course recommendations and degree planning",
            "general_guidance": self._provide_general_cs_guidance(query),
            "personalized": False,
            "based_on_transcript": False
        }
    
    def _is_codo_query(self, query: str) -> bool:
        """Check if query is related to CODO"""
        codo_keywords = [
            "codo", "change of degree", "change degree", "switch to cs", "switch to computer science",
            "transfer to cs", "cs admission", "cs eligibility", "get into cs", "apply to cs"
        ]
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in codo_keywords)
    
    def _format_codo_requirements_for_display(self) -> Dict:
        """Format CODO requirements for user display"""
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
    
    def _analyze_academic_progress(self, query: str, transcript_data: Dict, user_context: Dict) -> Dict:
        """Analyze academic progress from transcript for general advising"""
        courses = transcript_data.get("courses", [])
        completed_courses = [course.get("course_code") for course in courses]
        
        # Calculate basic progress metrics
        cs_courses_completed = [course for course in completed_courses if course.startswith("CS")]
        math_courses_completed = [course for course in completed_courses if course.startswith("MA")]
        
        total_credits = sum(course.get("credits", 0) for course in courses)
        
        progress_analysis = {
            "total_credits": total_credits,
            "cs_courses_completed": len(cs_courses_completed),
            "math_courses_completed": len(math_courses_completed),
            "estimated_year": self._estimate_academic_year(total_credits),
            "cs_core_progress": self._analyze_cs_core_progress(completed_courses),
            "next_recommended_courses": self._suggest_next_courses(completed_courses, query)
        }
        
        return {
            "advice_type": "transcript_based_progress",
            "progress_analysis": progress_analysis,
            "personalized_recommendations": self._generate_personalized_recommendations(progress_analysis, query),
            "personalized": True,
            "based_on_transcript": True
        }
    
    def _estimate_academic_year(self, total_credits: int) -> str:
        """Estimate academic year based on total credits"""
        if total_credits < 30:
            return "freshman"
        elif total_credits < 60:
            return "sophomore"
        elif total_credits < 90:
            return "junior"
        else:
            return "senior"
    
    def _analyze_cs_core_progress(self, completed_courses: List[str]) -> Dict:
        """Analyze progress through CS core sequence"""
        cs_core_sequence = ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"]
        completed_core = [course for course in cs_core_sequence if course in completed_courses]
        
        return {
            "completed_core_courses": completed_core,
            "core_completion_count": len(completed_core),
            "total_core_required": len(cs_core_sequence),
            "next_core_course": cs_core_sequence[len(completed_core)] if len(completed_core) < len(cs_core_sequence) else None,
            "core_completion_percentage": (len(completed_core) / len(cs_core_sequence)) * 100
        }
    
    def _suggest_next_courses(self, completed_courses: List[str], query: str) -> List[str]:
        """Suggest next logical courses based on completed work"""
        # This is a simplified version - could be enhanced with track intelligence
        cs_core_sequence = ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"]
        suggestions = []
        
        # Find next core course
        for course in cs_core_sequence:
            if course not in completed_courses:
                suggestions.append(course)
                break
                
        # Add math recommendations if CS core is progressing
        if "CS18200" in completed_courses and "MA16200" not in completed_courses:
            suggestions.append("MA16200")
            
        return suggestions[:3]  # Limit to 3 suggestions
    
    def _generate_personalized_recommendations(self, progress_analysis: Dict, query: str) -> List[str]:
        """Generate personalized recommendations based on progress"""
        recommendations = []
        
        year = progress_analysis["estimated_year"]
        core_progress = progress_analysis["cs_core_progress"]
        
        if year == "freshman":
            recommendations.extend([
                "Focus on completing CS core sequence in order",
                "Ensure strong performance in CS18000 (needed for CODO if applicable)",
                "Complete Calculus sequence for CS progression"
            ])
        elif year == "sophomore":
            recommendations.extend([
                "Complete remaining CS core courses",
                "Consider declaring CS track based on interests", 
                "Maintain strong GPA for competitive opportunities"
            ])
        else:
            recommendations.extend([
                "Focus on track-specific electives",
                "Consider research opportunities or internships",
                "Plan for graduation requirements"
            ])
            
        return recommendations
    
    def _provide_general_cs_guidance(self, query: str) -> List[str]:
        """Provide general CS guidance when no transcript available"""
        return [
            "Start with CS 18000 - Problem Solving and Object-Oriented Programming",
            "Complete Calculus I (MA 16100 or MA 16500) concurrently",
            "Maintain strong study habits - CS courses build on each other",
            "Consider joining CS study groups and office hours",
            "Upload transcript for personalized recommendations"
        ]

# Integration functions
def evaluate_codo_from_transcript(transcript_data: Dict) -> Dict:
    """Main function to evaluate CODO eligibility from transcript"""
    evaluator = CODOEvaluator()
    evaluation = evaluator.evaluate_codo_eligibility(transcript_data)
    competitive_analysis = evaluator.analyze_competitive_standing(transcript_data, evaluation)
    
    return {
        "codo_evaluation": evaluation,
        "competitive_analysis": competitive_analysis,
        "evaluation_timestamp": "2024-08-22",
        "policy_version": "Fall 2024"
    }

def get_transcript_aware_advice(query: str, user_context: Dict) -> Dict:
    """Get advice that adapts based on transcript availability"""
    advisor = TranscriptAwareAdvisor()
    return advisor.provide_contextual_advice(query, user_context)