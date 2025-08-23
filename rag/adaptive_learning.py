"""
SmartCourse-Inspired Adaptive Learning System
===========================================

Implements personalized learning paths, difficulty adaptation,
and smart course sequencing for CS-MI and CS-SE tracks.
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import numpy as np
from enum import Enum

logger = logging.getLogger(__name__)

class DifficultyLevel(Enum):
    BEGINNER = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4

class LearningStyle(Enum):
    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING = "reading"

@dataclass
class LearningObjective:
    """Individual learning objective with mastery tracking"""
    id: str
    title: str
    description: str
    course_id: str
    difficulty: DifficultyLevel
    prerequisites: List[str]
    estimated_hours: float
    mastery_threshold: float = 0.8
    current_mastery: float = 0.0
    attempts: int = 0
    last_accessed: Optional[datetime] = None

@dataclass
class AdaptivePath:
    """Personalized learning path with dynamic adjustment"""
    student_id: str
    track: str
    objectives: List[LearningObjective]
    current_position: int = 0
    difficulty_preference: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    learning_velocity: float = 1.0  # Courses per semester
    predicted_graduation: Optional[datetime] = None
    adaptation_history: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.adaptation_history is None:
            self.adaptation_history = []

class SmartSequencer:
    """Intelligent course sequencing with constraint satisfaction"""
    
    def __init__(self, knowledge_base):
        self.knowledge_base = knowledge_base
        
    def generate_optimal_sequence(self, 
                                track: str, 
                                completed_courses: List[str],
                                target_graduation: datetime,
                                preferences: Dict[str, Any]) -> List[Tuple[str, int]]:
        """Generate optimal course sequence with semester assignments"""
        
        # Get track requirements
        track_reqs = self.knowledge_base.get_track_requirements(track)
        if not track_reqs:
            return []
        
        # Extract all required courses
        required_courses = set()
        for group in track_reqs['groups']:
            required_courses.update(group['from'])
        
        # Remove completed courses
        remaining_courses = required_courses - set(completed_courses)
        
        # Build dependency graph
        dependency_graph = self._build_dependency_graph(remaining_courses)
        
        # Topological sort with semester constraints
        sequence = self._topological_sort_with_semesters(
            dependency_graph, 
            target_graduation,
            preferences.get('max_courses_per_semester', 4)
        )
        
        return sequence
    
    def _build_dependency_graph(self, courses: set) -> Dict[str, List[str]]:
        """Build prerequisite dependency graph"""
        graph = {course: [] for course in courses}
        
        for course in courses:
            prereq_check = self.knowledge_base.check_prerequisites(course, [])
            required_prereqs = prereq_check.get('required', [])
            
            # Only include prerequisites that are in our course set
            for prereq in required_prereqs:
                if prereq in courses:
                    graph[course].append(prereq)
        
        return graph
    
    def _topological_sort_with_semesters(self, 
                                       graph: Dict[str, List[str]], 
                                       target_date: datetime,
                                       max_per_semester: int) -> List[Tuple[str, int]]:
        """Topological sort with semester assignment"""
        
        # Calculate available semesters
        current_date = datetime.now()
        if isinstance(target_date, str):
            from datetime import datetime
            target_date = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
        
        months_available = (target_date - current_date).days / 30
        semesters_available = int(months_available / 4)  # 4 months per semester
        
        in_degree = {course: len(deps) for course, deps in graph.items()}
        semester_assignments = []
        current_semester = 1
        
        while graph and current_semester <= semesters_available:
            # Find courses with no dependencies
            available_courses = [course for course, degree in in_degree.items() if degree == 0]
            
            # Select up to max_per_semester courses
            semester_courses = available_courses[:max_per_semester]
            
            for course in semester_courses:
                semester_assignments.append((course, current_semester))
                
                # Remove course and update dependencies
                del graph[course]
                for other_course in graph:
                    if course in graph[other_course]:
                        graph[other_course].remove(course)
                        in_degree[other_course] -= 1
            
            current_semester += 1
        
        return semester_assignments

class PersonalizedRecommender:
    """AI-powered personalized course recommendations"""
    
    def __init__(self, knowledge_base):
        self.knowledge_base = knowledge_base
        
    def recommend_courses(self, 
                         student_profile: Dict[str, Any],
                         context: Dict[str, Any],
                         num_recommendations: int = 3) -> List[Dict[str, Any]]:
        """Generate personalized course recommendations"""
        
        completed = student_profile.get('completed_courses', [])
        track = student_profile.get('track', 'machine_intelligence')
        interests = student_profile.get('interests', [])
        difficulty_pref = student_profile.get('difficulty_preference', DifficultyLevel.INTERMEDIATE)
        
        # Get eligible courses
        eligible_courses = self._get_eligible_courses(completed, track)
        
        # Score courses based on multiple factors
        scored_courses = []
        for course_id in eligible_courses:
            course_info = self.knowledge_base.get_course_info(course_id)
            if course_info:
                score = self._calculate_recommendation_score(
                    course_info, student_profile, context
                )
                scored_courses.append({
                    'course_id': course_id,
                    'course_info': course_info,
                    'recommendation_score': score,
                    'reasoning': self._generate_recommendation_reasoning(course_info, student_profile)
                })
        
        # Sort by score and return top recommendations
        scored_courses.sort(key=lambda x: x['recommendation_score'], reverse=True)
        return scored_courses[:num_recommendations]
    
    def _get_eligible_courses(self, completed: List[str], track: str) -> List[str]:
        """Get courses the student is eligible to take"""
        eligible = []
        
        # Get all courses for the track
        track_reqs = self.knowledge_base.get_track_requirements(track)
        if not track_reqs:
            return []
        
        all_courses = set()
        for group in track_reqs['groups']:
            all_courses.update(group['from'])
        
        # Check prerequisites for each course
        for course_id in all_courses:
            if course_id not in completed:
                prereq_check = self.knowledge_base.check_prerequisites(course_id, completed)
                if prereq_check['satisfied']:
                    eligible.append(course_id)
        
        return eligible
    
    def _calculate_recommendation_score(self, 
                                      course_info: Dict[str, Any], 
                                      profile: Dict[str, Any],
                                      context: Dict[str, Any]) -> float:
        """Calculate multi-factor recommendation score"""
        
        score = 0.0
        
        # Base score from course level alignment
        course_level = int(course_info.get('level', 300))
        completed_courses = len(profile.get('completed_courses', []))
        
        if completed_courses < 10 and course_level < 300:
            score += 0.3  # Prefer lower level for beginners
        elif completed_courses >= 10 and course_level >= 300:
            score += 0.3  # Prefer higher level for advanced students
        
        # Track alignment score
        track = profile.get('track', '')
        course_id = course_info.get('id', '')
        
        if track == 'machine_intelligence':
            mi_courses = ['CS37300', 'CS47100', 'CS47300', 'CS41600', 'CS31400']
            if course_id in mi_courses:
                score += 0.4
        elif track == 'software_engineering':
            se_courses = ['CS30700', 'CS35200', 'CS35400', 'CS40800', 'CS40700']
            if course_id in se_courses:
                score += 0.4
        
        # Interest alignment (if available)
        interests = profile.get('interests', [])
        course_title = course_info.get('title', '').lower()
        
        for interest in interests:
            if interest.lower() in course_title:
                score += 0.2
                break
        
        # Semester timing bonus
        current_semester = context.get('current_semester', 'fall')
        if self._is_typically_offered(course_id, current_semester):
            score += 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _generate_recommendation_reasoning(self, 
                                         course_info: Dict[str, Any], 
                                         profile: Dict[str, Any]) -> str:
        """Generate human-readable reasoning for recommendation"""
        
        reasons = []
        
        course_id = course_info.get('id', '')
        track = profile.get('track', '')
        
        if track == 'machine_intelligence' and course_id in ['CS37300', 'CS47100']:
            reasons.append("Essential for Machine Intelligence track")
        elif track == 'software_engineering' and course_id in ['CS30700', 'CS40800']:
            reasons.append("Core requirement for Software Engineering track")
        
        course_level = int(course_info.get('level', 300))
        completed = len(profile.get('completed_courses', []))
        
        if completed < 6 and course_level < 300:
            reasons.append("Good foundational course for your current level")
        elif completed >= 6 and course_level >= 300:
            reasons.append("Appropriate advanced course for your progress")
        
        credits = course_info.get('credits', 3)
        if credits == 4:
            reasons.append("High-value 4-credit course")
        
        if not reasons:
            reasons.append("Fits well with your academic progression")
        
        return "; ".join(reasons)
    
    def _is_typically_offered(self, course_id: str, semester: str) -> bool:
        """Check if course is typically offered in given semester"""
        
        # Course offering patterns (simplified heuristic)
        fall_heavy = ['CS18000', 'CS25000', 'CS37300', 'CS47100']
        spring_heavy = ['CS18200', 'CS25100', 'CS30700', 'CS40800']
        
        if semester.lower() == 'fall' and course_id in fall_heavy:
            return True
        elif semester.lower() == 'spring' and course_id in spring_heavy:
            return True
        
        return False  # Conservative assumption

class AdaptiveLearningEngine:
    """Main adaptive learning system orchestrator"""
    
    def __init__(self, knowledge_base, student_data_store):
        self.knowledge_base = knowledge_base
        self.student_data_store = student_data_store
        self.sequencer = SmartSequencer(knowledge_base)
        self.recommender = PersonalizedRecommender(knowledge_base)
        
    async def create_adaptive_path(self, 
                                 student_id: str, 
                                 track: str,
                                 profile: Dict[str, Any]) -> AdaptivePath:
        """Create personalized adaptive learning path"""
        
        # Generate learning objectives from track requirements
        objectives = await self._generate_learning_objectives(track, profile)
        
        # Create adaptive path
        path = AdaptivePath(
            student_id=student_id,
            track=track,
            objectives=objectives,
            difficulty_preference=DifficultyLevel(profile.get('difficulty_level', 2)),
            learning_velocity=profile.get('learning_velocity', 1.0)
        )
        
        # Calculate predicted graduation
        path.predicted_graduation = self._predict_graduation_date(path, profile)
        
        return path
    
    async def _generate_learning_objectives(self, 
                                          track: str, 
                                          profile: Dict[str, Any]) -> List[LearningObjective]:
        """Generate learning objectives from track requirements"""
        
        objectives = []
        track_reqs = self.knowledge_base.get_track_requirements(track)
        
        if not track_reqs:
            return objectives
        
        obj_id = 0
        for group in track_reqs['groups']:
            for course_id in group['from']:
                course_info = self.knowledge_base.get_course_info(course_id)
                if course_info:
                    # Determine difficulty based on course level
                    level = int(course_info.get('level', 300))
                    if level < 200:
                        difficulty = DifficultyLevel.BEGINNER
                    elif level < 300:
                        difficulty = DifficultyLevel.INTERMEDIATE
                    elif level < 400:
                        difficulty = DifficultyLevel.ADVANCED
                    else:
                        difficulty = DifficultyLevel.EXPERT
                    
                    # Get prerequisites
                    prereq_check = self.knowledge_base.check_prerequisites(course_id, [])
                    prereqs = prereq_check.get('required', [])
                    
                    objective = LearningObjective(
                        id=f"obj_{obj_id}",
                        title=course_info.get('title', f'Course {course_id}'),
                        description=f"Master {course_info.get('title', course_id)} concepts and skills",
                        course_id=course_id,
                        difficulty=difficulty,
                        prerequisites=[f"obj_{p}" for p in prereqs if p in [c['id'] for c in [course_info]]],
                        estimated_hours=course_info.get('credits', 3) * 15  # 15 hours per credit
                    )
                    objectives.append(objective)
                    obj_id += 1
        
        return objectives
    
    def _predict_graduation_date(self, 
                               path: AdaptivePath, 
                               profile: Dict[str, Any]) -> datetime:
        """Predict graduation date based on learning path and velocity"""
        
        completed_courses = len(profile.get('completed_courses', []))
        remaining_objectives = len(path.objectives)
        
        # Assume 4 courses per semester, 2 semesters per year
        courses_per_semester = min(4, path.learning_velocity * 4)
        semesters_remaining = remaining_objectives / courses_per_semester
        
        current_date = datetime.now()
        graduation_date = current_date + timedelta(days=int(semesters_remaining * 120))  # 4 months per semester
        
        return graduation_date
    
    async def get_smart_recommendations(self, 
                                      student_id: str,
                                      context: Dict[str, Any]) -> Dict[str, Any]:
        """Get comprehensive smart recommendations for student"""
        
        # Load student profile
        student_profile = await self.student_data_store.get_student_profile(student_id)
        if not student_profile:
            return {"error": "Student profile not found"}
        
        # Get course recommendations
        course_recommendations = self.recommender.recommend_courses(
            student_profile, context, num_recommendations=5
        )
        
        # Generate optimal course sequence
        if student_profile.get('track') and student_profile.get('target_graduation'):
            target_date = datetime.fromisoformat(student_profile['target_graduation'])
            sequence = self.sequencer.generate_optimal_sequence(
                student_profile['track'],
                student_profile.get('completed_courses', []),
                target_date,
                student_profile.get('preferences', {})
            )
        else:
            sequence = []
        
        # Create adaptive learning insights
        insights = {
            'recommended_courses': course_recommendations,
            'optimal_sequence': sequence,
            'learning_insights': self._generate_learning_insights(student_profile, context),
            'next_semester_plan': self._plan_next_semester(course_recommendations, sequence),
            'graduation_timeline': self._create_graduation_timeline(sequence, student_profile)
        }
        
        return insights
    
    def _generate_learning_insights(self, 
                                  profile: Dict[str, Any], 
                                  context: Dict[str, Any]) -> List[str]:
        """Generate personalized learning insights"""
        
        insights = []
        completed = len(profile.get('completed_courses', []))
        track = profile.get('track', '')
        
        # Progress insights
        if completed < 6:
            insights.append("Focus on completing CS core requirements to build strong foundations")
        elif completed < 12:
            insights.append("Good progress! Time to consider specialized track courses")
        else:
            insights.append("Advanced stage - focus on electives and capstone preparation")
        
        # Track-specific insights
        if track == 'machine_intelligence':
            insights.append("MI track benefits from strong mathematical foundation - consider math electives")
        elif track == 'software_engineering':
            insights.append("SE track values practical experience - consider internships and projects")
        
        # Timing insights
        current_semester = context.get('current_semester', 'fall')
        if current_semester == 'fall':
            insights.append("Fall semester is ideal for starting new course sequences")
        else:
            insights.append("Spring semester - good time for project-based courses")
        
        return insights
    
    def _plan_next_semester(self, 
                          recommendations: List[Dict[str, Any]], 
                          sequence: List[Tuple[str, int]]) -> Dict[str, Any]:
        """Plan optimal course load for next semester"""
        
        # Find courses for next semester (semester 1 in sequence)
        next_semester_courses = [course for course, sem in sequence if sem == 1]
        
        # If sequence is empty, use top recommendations
        if not next_semester_courses and recommendations:
            next_semester_courses = [rec['course_id'] for rec in recommendations[:3]]
        
        total_credits = 0
        course_details = []
        
        for course_id in next_semester_courses:
            course_info = self.knowledge_base.get_course_info(course_id)
            if course_info:
                credits = course_info.get('credits', 3)
                total_credits += credits
                course_details.append({
                    'course_id': course_id,
                    'title': course_info.get('title'),
                    'credits': credits,
                    'level': course_info.get('level')
                })
        
        return {
            'courses': course_details,
            'total_credits': total_credits,
            'workload_assessment': 'Moderate' if total_credits <= 15 else 'Heavy',
            'balance_recommendation': self._assess_course_balance(course_details)
        }
    
    def _assess_course_balance(self, courses: List[Dict[str, Any]]) -> str:
        """Assess the balance of course difficulty and types"""
        
        if not courses:
            return "No courses selected"
        
        levels = [int(course.get('level', 300)) for course in courses]
        avg_level = sum(levels) / len(levels)
        
        if avg_level < 250:
            return "Good foundation-building semester"
        elif avg_level > 350:
            return "Challenging advanced semester - ensure good study habits"
        else:
            return "Well-balanced mix of courses"
    
    def _create_graduation_timeline(self, 
                                  sequence: List[Tuple[str, int]], 
                                  profile: Dict[str, Any]) -> Dict[str, Any]:
        """Create detailed graduation timeline"""
        
        if not sequence:
            return {"error": "Cannot create timeline without course sequence"}
        
        # Group courses by semester
        semesters = {}
        for course_id, semester in sequence:
            if semester not in semesters:
                semesters[semester] = []
            semesters[semester].append(course_id)
        
        # Create timeline with dates
        current_date = datetime.now()
        timeline = {}
        
        for sem_num in sorted(semesters.keys()):
            # Calculate semester start date (fall/spring pattern)
            months_ahead = (sem_num - 1) * 4
            is_spring = sem_num % 2 == 0
            sem_date = current_date + timedelta(days=months_ahead * 30)
            
            semester_name = f"{'Spring' if is_spring else 'Fall'} {sem_date.year}"
            
            timeline[semester_name] = {
                'semester_number': sem_num,
                'courses': semesters[sem_num],
                'estimated_date': sem_date.strftime('%Y-%m'),
                'course_count': len(semesters[sem_num])
            }
        
        return {
            'timeline': timeline,
            'estimated_graduation': max(timeline.keys()) if timeline else "Unknown",
            'total_semesters': len(timeline)
        }

# Simplified student data store for testing
class SimpleStudentDataStore:
    """Simple in-memory student data store"""
    
    def __init__(self):
        self.students = {}
    
    async def get_student_profile(self, student_id: str) -> Optional[Dict[str, Any]]:
        return self.students.get(student_id)
    
    async def save_student_profile(self, student_id: str, profile: Dict[str, Any]):
        self.students[student_id] = profile