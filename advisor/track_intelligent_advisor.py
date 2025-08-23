"""
Track-Aware Intelligent Academic Advisor
Integrates CS degree progression with contextual track course replacement
"""

import json
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

@dataclass
class TrackContext:
    """Student's track selection and progression context"""
    selected_track: Optional[str] = None
    track_preferences: List[str] = None
    completed_courses: List[str] = None
    current_semester: str = None
    gpa: float = None
    low_grade_courses: List[str] = None

@dataclass
class CourseRecommendation:
    """Enhanced course recommendation with track context"""
    course_id: str
    title: str
    credits: int
    track_requirement_type: str
    reasoning: str
    prerequisite_status: str
    semester_timing: str
    alternatives: List[str] = None
    confidence: float = 0.0

class TrackIntelligentAdvisor:
    """
    Intelligent advisor that replaces track placeholders with actual courses
    based on student context and track selection
    """
    
    def __init__(self, cs_data_path: str = "packs/CS"):
        self.cs_data_path = Path(cs_data_path)
        self.progression_data = self._load_progression_data()
        self.tracks_data = self._load_tracks_data()
        self.courses_data = self._load_courses_data()
        self.prereqs_data = self._load_prereqs_data()
        
    def _load_progression_data(self) -> Dict:
        """Load CS degree progression structure"""
        progression_file = self.cs_data_path / "cs_degree_progression.json"
        with open(progression_file, 'r') as f:
            return json.load(f)
    
    def _load_tracks_data(self) -> Dict:
        """Load track definitions"""
        tracks_file = self.cs_data_path / "tracks.json"
        with open(tracks_file, 'r') as f:
            return json.load(f)
    
    def _load_courses_data(self) -> Dict:
        """Load course catalog"""
        courses_file = self.cs_data_path / "courses.csv"
        courses = {}
        with open(courses_file, 'r') as f:
            lines = f.readlines()[1:]  # Skip header
            for line in lines:
                parts = line.strip().split(',')
                if len(parts) >= 4:
                    course_id, title, credits, level = parts[0], parts[1], parts[2], parts[3]
                    courses[course_id] = {
                        'title': title,
                        'credits': int(credits),
                        'level': int(level)
                    }
        return courses
    
    def _load_prereqs_data(self) -> List[Dict]:
        """Load prerequisite data"""
        prereqs_file = self.cs_data_path / "prereqs.jsonl"
        prereqs = []
        with open(prereqs_file, 'r') as f:
            for line in f:
                if line.strip():
                    prereqs.append(json.loads(line.strip()))
        return prereqs

    def detect_track_from_query(self, query: str) -> Tuple[str, float]:
        """
        Intelligently detect intended track from user query
        Returns: (track_id, confidence_score)
        """
        query_lower = query.lower()
        
        # Get track indicators from progression data
        rules = self.progression_data.get("intelligent_replacement_rules", {})
        patterns = rules.get("query_analysis_patterns", {})
        
        mi_indicators = patterns.get("machine_intelligence_indicators", [])
        se_indicators = patterns.get("software_engineering_indicators", [])
        
        mi_score = sum(1 for indicator in mi_indicators if indicator.lower() in query_lower)
        se_score = sum(1 for indicator in se_indicators if indicator.lower() in query_lower)
        
        # Normalize scores
        total_indicators = len(mi_indicators) + len(se_indicators)
        mi_confidence = mi_score / len(mi_indicators) if mi_indicators else 0
        se_confidence = se_score / len(se_indicators) if se_indicators else 0
        
        if mi_confidence > se_confidence and mi_confidence > 0.15:
            return "machine_intelligence", mi_confidence
        elif se_confidence > mi_confidence and se_confidence > 0.15:
            return "software_engineering", se_confidence
        else:
            return None, 0.0

    def replace_track_placeholders(self, semester_plan: Dict, track_context: TrackContext) -> Dict:
        """
        Replace track placeholders with actual course recommendations
        """
        if not track_context.selected_track:
            return semester_plan
            
        track_def = self.progression_data["track_definitions"].get(track_context.selected_track)
        if not track_def:
            return semester_plan
            
        progression_mapping = track_def.get("progression_mapping", {})
        
        enhanced_plan = semester_plan.copy()
        enhanced_plan["courses"] = []
        
        for course in semester_plan.get("courses", []):
            course_id = course.get("course_id")
            
            if course_id in progression_mapping:
                # Replace with track-specific course
                mapping = progression_mapping[course_id]
                group_key = mapping["maps_to"]
                
                # Find the appropriate track requirement
                track_requirement = self._find_track_requirement(track_def, group_key)
                if track_requirement:
                    replacement_course = self._select_best_course_for_context(
                        track_requirement, track_context, mapping["default_course"]
                    )
                    
                    enhanced_course = course.copy()
                    enhanced_course.update({
                        "course_id": replacement_course["course_id"],
                        "title": replacement_course["title"],
                        "credits": replacement_course["credits"],
                        "track_requirement_fulfilled": group_key,
                        "replacement_reasoning": replacement_course["reasoning"]
                    })
                    enhanced_plan["courses"].append(enhanced_course)
                else:
                    enhanced_plan["courses"].append(course)
            else:
                enhanced_plan["courses"].append(course)
                
        return enhanced_plan

    def _find_track_requirement(self, track_def: Dict, group_key: str) -> Optional[Dict]:
        """Find track requirement by group key"""
        # Check required courses
        for req in track_def.get("required_courses", []):
            if req.get("group_key") == group_key:
                return req
                
        # Check elective courses  
        for elec in track_def.get("elective_courses", []):
            if elec.get("group_key") == group_key:
                return elec
                
        return None

    def _select_best_course_for_context(self, requirement: Dict, context: TrackContext, default: str) -> Dict:
        """
        Select the best course from options based on student context
        """
        options = requirement.get("options", [])
        if not options:
            return {"course_id": default, "title": "Unknown", "credits": 3, "reasoning": "Default selection"}
            
        # If only one option, use it
        if len(options) == 1:
            course_id = options[0]
            course_info = self.courses_data.get(course_id, {})
            return {
                "course_id": course_id,
                "title": course_info.get("title", "Unknown"),
                "credits": course_info.get("credits", 3),
                "reasoning": f"Only option for {requirement['requirement']}"
            }
            
        # Multiple options - apply intelligence
        best_course = default
        best_reasoning = "Default recommendation"
        
        # Check if student has prerequisites for advanced options
        if context.completed_courses:
            for course_id in options:
                if self._has_prerequisites(course_id, context.completed_courses):
                    # Prefer more advanced/specialized courses if prerequisites met
                    course_level = self.courses_data.get(course_id, {}).get("level", 100)
                    if course_level >= 400:  # Advanced course
                        best_course = course_id
                        best_reasoning = f"Advanced option recommended - prerequisites satisfied"
                        break
                        
        course_info = self.courses_data.get(best_course, {})
        return {
            "course_id": best_course,
            "title": course_info.get("title", "Unknown"),
            "credits": course_info.get("credits", 3),
            "reasoning": best_reasoning
        }

    def _has_prerequisites(self, course_id: str, completed_courses: List[str]) -> bool:
        """Check if student has completed prerequisites for a course"""
        for prereq in self.prereqs_data:
            if prereq.get("dst") == course_id:
                expr = prereq.get("expr", [])
                kind = prereq.get("kind", "allof")
                
                if kind == "allof":
                    # All courses in expr must be completed
                    return all(course in completed_courses for course in expr)
                elif kind == "oneof":
                    # At least one option from expr must be completed
                    for option_group in expr:
                        if isinstance(option_group, list):
                            if all(course in completed_courses for course in option_group):
                                return True
                        elif option_group in completed_courses:
                            return True
                    return False
        return True  # No prerequisites found, assume satisfied

    def generate_contextual_recommendation(self, query: str, track_context: TrackContext) -> List[CourseRecommendation]:
        """
        Generate intelligent course recommendations based on query and track context
        """
        recommendations = []
        
        # Detect track if not specified
        if not track_context.selected_track:
            detected_track, confidence = self.detect_track_from_query(query)
            if detected_track and confidence > 0.3:
                track_context.selected_track = detected_track
                logger.info(f"Auto-detected track: {detected_track} (confidence: {confidence:.2f})")
        
        if not track_context.selected_track:
            return self._generate_generic_recommendations(query, track_context)
            
        # Get track-specific recommendations
        track_def = self.progression_data["track_definitions"][track_context.selected_track]
        
        # Analyze query for specific course type requests
        if self._query_asks_for_electives(query):
            recommendations.extend(self._recommend_track_electives(track_def, track_context, query))
        elif self._query_asks_for_requirements(query):
            recommendations.extend(self._recommend_track_requirements(track_def, track_context, query))
        else:
            # General recommendation - suggest next logical courses
            recommendations.extend(self._recommend_next_courses(track_def, track_context, query))
            
        return recommendations

    def _query_asks_for_electives(self, query: str) -> bool:
        """Check if query specifically asks for elective recommendations"""
        elective_keywords = ["elective", "electives", "optional", "choice", "choose"]
        return any(keyword in query.lower() for keyword in elective_keywords)
        
    def _query_asks_for_requirements(self, query: str) -> bool:
        """Check if query asks for required courses"""
        requirement_keywords = ["required", "requirement", "must take", "need to take"]
        return any(keyword in query.lower() for keyword in requirement_keywords)

    def _recommend_track_electives(self, track_def: Dict, context: TrackContext, query: str) -> List[CourseRecommendation]:
        """Recommend appropriate track electives"""
        recommendations = []
        
        elective_groups = track_def.get("elective_courses", [])
        for group in elective_groups:
            options = group.get("options", [])
            need = group.get("need", 1)
            
            # Filter out already completed courses
            available_options = []
            if context.completed_courses:
                available_options = [opt for opt in options if opt not in context.completed_courses]
            else:
                available_options = options
                
            # Select best options based on query context
            selected = self._select_courses_by_query_relevance(available_options, query, need)
            
            for course_id in selected:
                course_info = self.courses_data.get(course_id, {})
                recommendations.append(CourseRecommendation(
                    course_id=course_id,
                    title=course_info.get("title", "Unknown"),
                    credits=course_info.get("credits", 3),
                    track_requirement_type="elective",
                    reasoning=f"Elective for {track_def['track_name']} track",
                    prerequisite_status="check_required",
                    semester_timing="flexible",
                    confidence=0.8
                ))
                
        return recommendations

    def _recommend_track_requirements(self, track_def: Dict, context: TrackContext, query: str) -> List[CourseRecommendation]:
        """Recommend required track courses"""
        recommendations = []
        
        required_groups = track_def.get("required_courses", [])
        for group in required_groups:
            options = group.get("options", [])
            need = group.get("need", 1)
            
            # Check if already completed
            if context.completed_courses:
                completed_from_group = [opt for opt in options if opt in context.completed_courses]
                if len(completed_from_group) >= need:
                    continue  # Requirement already satisfied
                    
            # Select best course for this requirement
            best_course = self._select_best_required_course(options, context, query)
            
            if best_course:
                course_info = self.courses_data.get(best_course, {})
                recommendations.append(CourseRecommendation(
                    course_id=best_course,
                    title=course_info.get("title", "Unknown"),
                    credits=course_info.get("credits", 3),
                    track_requirement_type="required",
                    reasoning=f"Required for {track_def['track_name']}: {group['requirement']}",
                    prerequisite_status="check_required",
                    semester_timing="schedule_appropriate",
                    confidence=0.9
                ))
                
        return recommendations

    def _recommend_next_courses(self, track_def: Dict, context: TrackContext, query: str) -> List[CourseRecommendation]:
        """Recommend next logical courses based on progression"""
        recommendations = []
        
        # Determine current academic standing
        current_year = self._determine_academic_year(context)
        next_semester = self._determine_next_semester(context)
        
        # Get semester plan for next semester
        progression = self.progression_data.get("academic_progression", {})
        next_plan = progression.get(next_semester, {})
        
        # Replace placeholders with track-specific courses
        enhanced_plan = self.replace_track_placeholders(next_plan, context)
        
        # Convert to recommendations
        for course in enhanced_plan.get("courses", []):
            if course.get("track_specific", False):
                course_info = self.courses_data.get(course["course_id"], {})
                recommendations.append(CourseRecommendation(
                    course_id=course["course_id"],
                    title=course_info.get("title", course.get("title", "Unknown")),
                    credits=course_info.get("credits", course.get("credits", 3)),
                    track_requirement_type=course.get("requirement_type", "track"),
                    reasoning=course.get("replacement_reasoning", f"Next course in {track_def['track_name']} progression"),
                    prerequisite_status="validated",
                    semester_timing=next_semester,
                    confidence=0.85
                ))
                
        return recommendations

    def _select_courses_by_query_relevance(self, options: List[str], query: str, need: int) -> List[str]:
        """Select most relevant courses based on query keywords"""
        if need >= len(options):
            return options
            
        # Score courses by keyword relevance
        scored_courses = []
        query_words = set(query.lower().split())
        
        for course_id in options:
            course_info = self.courses_data.get(course_id, {})
            title_words = set(course_info.get("title", "").lower().split())
            
            # Calculate relevance score
            overlap = len(query_words.intersection(title_words))
            relevance_score = overlap / len(title_words) if title_words else 0
            
            # Boost AI/ML courses for AI-related queries
            if any(keyword in query.lower() for keyword in ["ai", "machine learning", "ml", "neural"]):
                if any(keyword in course_info.get("title", "").lower() for keyword in ["machine", "learning", "ai", "neural", "intelligence"]):
                    relevance_score += 0.5
                    
            scored_courses.append((course_id, relevance_score))
            
        # Sort by relevance and return top N
        scored_courses.sort(key=lambda x: x[1], reverse=True)
        return [course_id for course_id, _ in scored_courses[:need]]

    def _select_best_required_course(self, options: List[str], context: TrackContext, query: str) -> str:
        """Select best required course considering context"""
        if len(options) == 1:
            return options[0]
            
        # Apply intelligent selection logic
        for course_id in options:
            # Check prerequisites
            if self._has_prerequisites(course_id, context.completed_courses or []):
                # Check query relevance
                course_info = self.courses_data.get(course_id, {})
                title = course_info.get("title", "").lower()
                
                # Prefer courses that match query intent
                if any(word in title for word in query.lower().split()):
                    return course_id
                    
        # Fallback to first option with satisfied prerequisites
        for course_id in options:
            if self._has_prerequisites(course_id, context.completed_courses or []):
                return course_id
                
        # Last resort - return first option
        return options[0]

    def _determine_academic_year(self, context: TrackContext) -> str:
        """Determine student's academic year based on completed courses"""
        if not context.completed_courses:
            return "freshman"
            
        completed_count = len(context.completed_courses)
        cs_core_completed = sum(1 for course in context.completed_courses 
                               if course.startswith("CS") and course in ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"])
        
        if cs_core_completed >= 5 or completed_count >= 60:
            return "senior"
        elif cs_core_completed >= 3 or completed_count >= 30:
            return "junior" 
        elif cs_core_completed >= 1 or completed_count >= 15:
            return "sophomore"
        else:
            return "freshman"

    def _determine_next_semester(self, context: TrackContext) -> str:
        """Determine next logical semester"""
        if context.current_semester:
            if "fall" in context.current_semester.lower():
                return context.current_semester.replace("fall", "spring")
            elif "spring" in context.current_semester.lower():
                year = self._determine_academic_year(context)
                if year == "freshman":
                    return "fall_2nd_year"
                elif year == "sophomore":
                    return "fall_3rd_year"
                elif year == "junior":
                    return "fall_4th_year"
                    
        # Default progression logic
        year = self._determine_academic_year(context)
        return f"fall_{year.replace('man', '')}_year" if year != "senior" else "spring_4th_year"

    def _generate_generic_recommendations(self, query: str, context: TrackContext) -> List[CourseRecommendation]:
        """Generate recommendations when track is unknown"""
        recommendations = []
        
        # Suggest track selection first
        if "track" in query.lower() or "specialization" in query.lower():
            # Provide track information
            for track_id, track_data in self.progression_data["track_definitions"].items():
                recommendations.append(CourseRecommendation(
                    course_id=f"TRACK_INFO_{track_id.upper()}",
                    title=f"Consider {track_data['track_name']} Track",
                    credits=0,
                    track_requirement_type="track_selection",
                    reasoning=track_data["description"],
                    prerequisite_status="none",
                    semester_timing="flexible",
                    confidence=0.7
                ))
                
        return recommendations

    def generate_smartcourse_prompt(self, query: str, track_context: TrackContext) -> str:
        """
        Generate SmartCourse-style contextual prompt with full student context
        """
        # Build transcript section
        transcript_section = "TRANSCRIPT:\n"
        if track_context.completed_courses:
            for course in track_context.completed_courses:
                course_info = self.courses_data.get(course, {})
                transcript_section += f"- {course}: {course_info.get('title', 'Unknown')} (Credits: {course_info.get('credits', 3)})\n"
        else:
            transcript_section += "No courses completed yet.\n"
            
        # Build degree plan section
        plan_section = "DEGREE PLAN:\n"
        if track_context.selected_track:
            track_def = self.progression_data["track_definitions"][track_context.selected_track]
            plan_section += f"Selected Track: {track_def['track_name']}\n"
            plan_section += f"Track Description: {track_def['description']}\n"
            
            plan_section += "\nRequired Courses:\n"
            for req in track_def.get("required_courses", []):
                plan_section += f"- {req['requirement']}: Choose {req['need']} from {req['options']}\n"
                
            plan_section += "\nElective Courses:\n"
            for elec in track_def.get("elective_courses", []):
                plan_section += f"- {elec['requirement']}: Choose {elec['need']} from available options\n"
        else:
            plan_section += "Track not yet selected. Available tracks:\n"
            for track_id, track_data in self.progression_data["track_definitions"].items():
                plan_section += f"- {track_data['track_name']}: {track_data['description']}\n"
                
        # Build query section
        query_section = f"STUDENT QUERY:\n{query}\n"
        
        # Combine into full prompt
        full_prompt = f"""You are an intelligent academic advisor for Purdue Computer Science students.

{transcript_section}

{plan_section}

{query_section}

Please provide personalized course recommendations that:
1. Align with the student's selected track (if any)
2. Consider completed coursework and prerequisites  
3. Address the specific question asked
4. Suggest appropriate timing for course enrollment
5. Include reasoning for each recommendation

Format your response with specific course codes and clear explanations."""

        return full_prompt

    def evaluate_recommendations_smartcourse_style(
        self, 
        recommendations: List[str], 
        context: TrackContext
    ) -> Dict[str, float]:
        """
        Evaluate recommendations using SmartCourse metrics
        """
        if not recommendations or not context.selected_track:
            return {"plan_score": 0.0, "personal_score": 0.0, "lift": 0.0, "recall": 0.0}
            
        # Get outstanding plan requirements (P)
        track_def = self.progression_data["track_definitions"][context.selected_track]
        outstanding_requirements = self._get_outstanding_requirements(track_def, context)
        
        # Get low grade courses (L) - courses that should be retaken
        low_grade_courses = context.low_grade_courses or []
        
        # Calculate metrics
        rec_set = set(recommendations)
        plan_set = set(outstanding_requirements)
        low_grade_set = set(low_grade_courses)
        
        # PlanScore: |R ∩ P| / |R|
        plan_intersection = len(rec_set.intersection(plan_set))
        plan_score = plan_intersection / len(rec_set) if rec_set else 0.0
        
        # PersonalScore: |R ∩ (P ∪ L)| / |R| 
        personal_union = plan_set.union(low_grade_set)
        personal_intersection = len(rec_set.intersection(personal_union))
        personal_score = personal_intersection / len(rec_set) if rec_set else 0.0
        
        # Lift: PersonalScore - PlanScore
        lift = personal_score - plan_score
        
        # Recall: |R ∩ P| / |P|
        recall = plan_intersection / len(plan_set) if plan_set else 0.0
        
        return {
            "plan_score": plan_score,
            "personal_score": personal_score, 
            "lift": lift,
            "recall": recall
        }

    def _get_outstanding_requirements(self, track_def: Dict, context: TrackContext) -> List[str]:
        """Get list of courses still needed to complete track requirements"""
        outstanding = []
        completed = set(context.completed_courses or [])
        
        # Check required courses
        for req_group in track_def.get("required_courses", []):
            options = req_group.get("options", [])
            need = req_group.get("need", 1)
            
            completed_from_group = [opt for opt in options if opt in completed]
            if len(completed_from_group) < need:
                # Still need courses from this group
                remaining_needed = need - len(completed_from_group)
                available_options = [opt for opt in options if opt not in completed]
                outstanding.extend(available_options[:remaining_needed])
                
        # Check elective courses
        for elec_group in track_def.get("elective_courses", []):
            options = elec_group.get("options", [])
            need = elec_group.get("need", 1)
            
            completed_from_group = [opt for opt in options if opt in completed]
            if len(completed_from_group) < need:
                remaining_needed = need - len(completed_from_group)
                available_options = [opt for opt in options if opt not in completed]
                outstanding.extend(available_options[:remaining_needed])
                
        return outstanding

    def get_personalized_degree_plan(self, track_context: TrackContext) -> Dict:
        """
        Generate a personalized 4-year degree plan with track-specific courses
        """
        if not track_context.selected_track:
            return self.progression_data["academic_progression"]
            
        personalized_plan = {}
        progression = self.progression_data["academic_progression"]
        
        for semester, semester_data in progression.items():
            personalized_plan[semester] = self.replace_track_placeholders(semester_data, track_context)
            
        return personalized_plan

# Usage Example and Integration Functions

def create_track_context_from_query(query: str, completed_courses: List[str] = None) -> TrackContext:
    """Create track context from user query and academic history"""
    return TrackContext(
        completed_courses=completed_courses or [],
        track_preferences=[],
        current_semester=None,
        gpa=None,
        low_grade_courses=[]
    )

def integrate_with_existing_advisor(query: str, student_profile: Dict) -> Dict:
    """
    Integration function for existing advisor systems
    """
    advisor = TrackIntelligentAdvisor()
    
    # Extract track context from student profile
    track_context = TrackContext(
        selected_track=student_profile.get("track"),
        completed_courses=student_profile.get("completed_courses", []),
        current_semester=student_profile.get("current_semester"),
        gpa=student_profile.get("gpa"),
        low_grade_courses=student_profile.get("low_grade_courses", [])
    )
    
    # Generate recommendations
    recommendations = advisor.generate_contextual_recommendation(query, track_context)
    
    # Generate SmartCourse-style prompt
    contextual_prompt = advisor.generate_smartcourse_prompt(query, track_context)
    
    # Evaluate using SmartCourse metrics
    rec_course_ids = [rec.course_id for rec in recommendations]
    metrics = advisor.evaluate_recommendations_smartcourse_style(rec_course_ids, track_context)
    
    return {
        "recommendations": [
            {
                "course_id": rec.course_id,
                "title": rec.title,
                "credits": rec.credits,
                "reasoning": rec.reasoning,
                "track_requirement_type": rec.track_requirement_type,
                "confidence": rec.confidence
            }
            for rec in recommendations
        ],
        "contextual_prompt": contextual_prompt,
        "smartcourse_metrics": metrics,
        "detected_track": track_context.selected_track,
        "personalized_plan": advisor.get_personalized_degree_plan(track_context)
    }