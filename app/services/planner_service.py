"""
Deterministic course planning service.
"""

import math
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy import and_, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import get_logger, get_settings
from app.models import (
    AcademicPlan,
    PlannedCourse,
    Course,
    CourseOffering,
    Prerequisite,
    StudentProfile,
    CompletedCourse,
    Requirement,
    TrackGroup,
    Track,
)

logger = get_logger(__name__)
settings = get_settings()


class CourseNode:
    """Course node for planning algorithm."""
    
    def __init__(self, course: Course):
        self.course = course
        self.prerequisites: Set[str] = set()
        self.dependents: Set[str] = set()
        self.requirement_coverage: List[str] = []
        self.offering_frequency: Dict[str, int] = {}  # season -> frequency
        self.downstream_degree: int = 0


class DeterministicPlannerService:
    """
    Deterministic course planning algorithm.
    
    Core Algorithm:
    1. Build course dependency graph
    2. Identify requirement coverage
    3. Calculate offering patterns
    4. For each semester, compute eligible set
    5. Score and select courses deterministically
    6. Update state and continue
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.course_graph: Dict[str, CourseNode] = {}
        self.requirement_map: Dict[int, List[str]] = {}
        
    async def generate_plan(
        self,
        student_profile: StudentProfile,
        planning_parameters: Dict[str, any]
    ) -> AcademicPlan:
        """Generate deterministic academic plan."""
        logger.info(
            "Starting plan generation",
            student_id=student_profile.id,
            major_id=student_profile.major_id,
            track_id=student_profile.track_id
        )
        
        # Initialize planning state
        await self._initialize_planning_state(student_profile)
        
        # Get completed courses
        completed_courses = await self._get_completed_courses(student_profile.id)
        completed_codes = {course.course.code for course in completed_courses}
        
        # Get remaining requirements
        remaining_requirements = await self._get_remaining_requirements(
            student_profile, completed_codes
        )
        
        # Generate semester-by-semester plan
        plan_data = await self._generate_semester_plan(
            student_profile,
            completed_codes,
            remaining_requirements,
            planning_parameters
        )
        
        # Create academic plan record
        academic_plan = AcademicPlan(
            student_id=student_profile.id,
            name=f"Generated Plan - {datetime.now().strftime('%Y-%m-%d')}",
            description="Automatically generated academic plan",
            version=1,
            status="draft",
            generated_at=datetime.now(),
            generated_by="system",
            planning_parameters=planning_parameters,
            is_valid=plan_data["is_valid"],
            validation_errors=plan_data["validation_errors"],
            validation_warnings=plan_data["validation_warnings"],
            total_semesters=plan_data["total_semesters"],
            total_credit_hours=plan_data["total_credit_hours"],
            estimated_gpa=plan_data.get("estimated_gpa")
        )
        
        self.db.add(academic_plan)
        await self.db.flush()
        
        # Add planned courses
        for semester_idx, semester_plan in enumerate(plan_data["semesters"]):
            for course_plan in semester_plan["courses"]:
                planned_course = PlannedCourse(
                    plan_id=academic_plan.id,
                    course_id=course_plan["course_id"],
                    planned_semester=semester_plan["semester"],
                    semester_order=semester_idx + 1,
                    reason=course_plan["reason"],
                    requirement_id=course_plan.get("requirement_id"),
                    priority=course_plan["priority"],
                    is_critical_path=course_plan["is_critical_path"],
                    planning_score=course_plan["planning_score"],
                    scoring_details=course_plan["scoring_details"],
                    is_tentative=course_plan.get("is_tentative", False),
                    is_alternative=course_plan.get("is_alternative", False),
                    alternative_group=course_plan.get("alternative_group")
                )
                self.db.add(planned_course)
        
        await self.db.commit()
        
        logger.info(
            "Plan generation completed",
            plan_id=academic_plan.id,
            total_semesters=plan_data["total_semesters"],
            total_credits=plan_data["total_credit_hours"]
        )
        
        return academic_plan
    
    async def _initialize_planning_state(self, student_profile: StudentProfile) -> None:
        """Initialize course graph and requirement mapping."""
        # Load all courses
        courses_result = await self.db.execute(
            select(Course)
            .where(Course.is_active == True)
            .options(
                selectinload(Course.prerequisites_as_course),
                selectinload(Course.prerequisites_as_prereq)
            )
        )
        courses = courses_result.scalars().all()
        
        # Build course graph
        self.course_graph = {}
        for course in courses:
            node = CourseNode(course)
            
            # Add prerequisites
            for prereq in course.prerequisites_as_course:
                if prereq.is_active:
                    prereq_code = await self._get_course_code(prereq.prerequisite_course_id)
                    node.prerequisites.add(prereq_code)
            
            # Calculate downstream degree (how many courses this unlocks)
            dependents_result = await self.db.execute(
                select(Course.code)
                .join(Prerequisite, Course.id == Prerequisite.course_id)
                .where(
                    and_(
                        Prerequisite.prerequisite_course_id == course.id,
                        Prerequisite.is_active == True
                    )
                )
            )
            dependents = dependents_result.scalars().all()
            node.dependents = set(dependents)
            node.downstream_degree = len(dependents)
            
            # Get offering frequency
            offerings_result = await self.db.execute(
                select(CourseOffering.season)
                .where(
                    and_(
                        CourseOffering.course_id == course.id,
                        CourseOffering.is_available == True
                    )
                )
            )
            offerings = offerings_result.scalars().all()
            
            frequency_map = {}
            for season in offerings:
                frequency_map[season] = frequency_map.get(season, 0) + 1
            node.offering_frequency = frequency_map
            
            self.course_graph[course.code] = node
        
        # Load requirements for student's track
        if student_profile.track_id:
            requirements_result = await self.db.execute(
                select(Requirement)
                .join(TrackGroup)
                .where(
                    and_(
                        TrackGroup.track_id == student_profile.track_id,
                        Requirement.is_active == True
                    )
                )
            )
            requirements = requirements_result.scalars().all()
            
            # Map requirements to courses
            for requirement in requirements:
                if requirement.requirement_type == "course":
                    course_codes = requirement.specification.get("course_codes", [])
                    for course_code in course_codes:
                        if course_code in self.course_graph:
                            self.course_graph[course_code].requirement_coverage.append(
                                requirement.description
                            )
                            
                            # Add to requirement map
                            if requirement.id not in self.requirement_map:
                                self.requirement_map[requirement.id] = []
                            self.requirement_map[requirement.id].append(course_code)
    
    async def _get_course_code(self, course_id: int) -> str:
        """Get course code by ID."""
        result = await self.db.execute(
            select(Course.code).where(Course.id == course_id)
        )
        return result.scalar_one()
    
    async def _get_completed_courses(self, student_id: int) -> List[CompletedCourse]:
        """Get student's completed courses."""
        result = await self.db.execute(
            select(CompletedCourse)
            .where(
                and_(
                    CompletedCourse.student_id == student_id,
                    CompletedCourse.is_passing == True
                )
            )
            .options(selectinload(CompletedCourse.course))
        )
        return list(result.scalars().all())
    
    async def _get_remaining_requirements(
        self,
        student_profile: StudentProfile,
        completed_codes: Set[str]
    ) -> List[Dict[str, any]]:
        """Get unfulfilled graduation requirements."""
        if not student_profile.track_id:
            return []
        
        requirements_result = await self.db.execute(
            select(Requirement)
            .join(TrackGroup)
            .where(
                and_(
                    TrackGroup.track_id == student_profile.track_id,
                    Requirement.is_active == True
                )
            )
            .options(selectinload(Requirement.track_group))
        )
        requirements = requirements_result.scalars().all()
        
        remaining = []
        
        for requirement in requirements:
            if requirement.requirement_type == "course":
                spec = requirement.specification
                required_courses = spec.get("course_codes", [])
                select_count = spec.get("select_count", len(required_courses))
                
                # Check how many are already completed
                completed_from_req = len(set(required_courses) & completed_codes)
                
                if completed_from_req < select_count:
                    remaining.append({
                        "requirement_id": requirement.id,
                        "type": requirement.requirement_type,
                        "specification": requirement.specification,
                        "description": requirement.description,
                        "completed_count": completed_from_req,
                        "required_count": select_count,
                        "track_group": requirement.track_group.name
                    })
        
        return remaining
    
    async def _generate_semester_plan(
        self,
        student_profile: StudentProfile,
        completed_codes: Set[str],
        remaining_requirements: List[Dict[str, any]],
        planning_parameters: Dict[str, any]
    ) -> Dict[str, any]:
        """Generate semester-by-semester course plan."""
        
        # Planning parameters
        start_semester = planning_parameters.get("start_semester", "Fall 2024")
        max_semesters = planning_parameters.get("max_semesters", settings.MAX_SEMESTERS)
        semester_capacity = planning_parameters.get(
            "max_credits_per_semester", 
            settings.DEFAULT_SEMESTER_CAPACITY
        )
        preferred_seasons = planning_parameters.get("preferred_seasons", ["Fall", "Spring"])
        
        # State tracking
        plan_state = {
            "completed_courses": completed_codes.copy(),
            "remaining_requirements": remaining_requirements.copy(),
            "semesters": [],
            "total_credit_hours": 0,
            "validation_errors": [],
            "validation_warnings": []
        }
        
        # Generate semesters
        current_semester = start_semester
        
        for semester_idx in range(max_semesters):
            semester_plan = await self._plan_semester(
                semester_idx + 1,
                current_semester,
                plan_state,
                semester_capacity,
                preferred_seasons
            )
            
            if semester_plan["courses"]:
                plan_state["semesters"].append(semester_plan)
                plan_state["total_credit_hours"] += semester_plan["total_credits"]
                
                # Update completed courses
                for course_plan in semester_plan["courses"]:
                    course_code = await self._get_course_code(course_plan["course_id"])
                    plan_state["completed_courses"].add(course_code)
                
                # Update remaining requirements
                plan_state["remaining_requirements"] = await self._update_remaining_requirements(
                    plan_state["remaining_requirements"],
                    plan_state["completed_courses"]
                )
            
            # Check if all requirements fulfilled
            if not plan_state["remaining_requirements"]:
                break
            
            # Advance to next semester
            current_semester = self._advance_semester(current_semester, preferred_seasons)
        
        # Validation
        plan_state["is_valid"] = len(plan_state["validation_errors"]) == 0
        plan_state["total_semesters"] = len(plan_state["semesters"])
        
        if plan_state["remaining_requirements"]:
            plan_state["validation_warnings"].append(
                f"Plan incomplete: {len(plan_state['remaining_requirements'])} requirements remaining"
            )
        
        return plan_state
    
    async def _plan_semester(
        self,
        semester_number: int,
        semester_name: str,
        plan_state: Dict[str, any],
        semester_capacity: int,
        preferred_seasons: List[str]
    ) -> Dict[str, any]:
        """Plan courses for a single semester."""
        
        # Get eligible courses
        eligible_courses = await self._compute_eligible_set(
            plan_state["completed_courses"],
            plan_state["remaining_requirements"],
            semester_name
        )
        
        # Score and rank courses
        scored_courses = []
        for course_info in eligible_courses:
            score_data = await self._calculate_course_score(
                course_info,
                plan_state,
                semester_number
            )
            scored_courses.append((course_info, score_data))
        
        # Sort by score (descending)
        scored_courses.sort(key=lambda x: x[1]["total_score"], reverse=True)
        
        # Select courses for semester
        selected_courses = []
        used_credits = 0
        
        for course_info, score_data in scored_courses:
            course = course_info["course"]
            
            # Check if we can fit this course
            if used_credits + course.credit_hours <= semester_capacity:
                selected_courses.append({
                    "course_id": course.id,
                    "reason": course_info["reason"],
                    "requirement_id": course_info.get("requirement_id"),
                    "priority": len(selected_courses) + 1,
                    "is_critical_path": score_data["is_critical_path"],
                    "planning_score": score_data["total_score"],
                    "scoring_details": score_data,
                    "is_tentative": False,
                    "is_alternative": False
                })
                
                used_credits += course.credit_hours
                
                # Stop if semester is full
                if used_credits >= semester_capacity:
                    break
        
        return {
            "semester": semester_name,
            "semester_number": semester_number,
            "courses": selected_courses,
            "total_credits": used_credits,
            "capacity_used": used_credits / semester_capacity
        }
    
    async def _compute_eligible_set(
        self,
        completed_courses: Set[str],
        remaining_requirements: List[Dict[str, any]],
        semester_name: str
    ) -> List[Dict[str, any]]:
        """Compute set of courses eligible for scheduling."""
        eligible = []
        
        # Extract season from semester name (e.g., "Fall 2024" -> "Fall")
        season = semester_name.split()[0]
        
        # Check courses from remaining requirements
        for requirement in remaining_requirements:
            if requirement["type"] == "course":
                course_codes = requirement["specification"].get("course_codes", [])
                
                for course_code in course_codes:
                    if course_code not in completed_courses and course_code in self.course_graph:
                        node = self.course_graph[course_code]
                        
                        # Check prerequisites
                        if node.prerequisites.issubset(completed_courses):
                            # Check if offered this semester
                            if season in node.offering_frequency:
                                eligible.append({
                                    "course": node.course,
                                    "course_code": course_code,
                                    "reason": f"Required for {requirement['description']}",
                                    "requirement_id": requirement["requirement_id"],
                                    "requirement_type": requirement["type"],
                                    "offering_frequency": node.offering_frequency.get(season, 0)
                                })
        
        return eligible
    
    async def _calculate_course_score(
        self,
        course_info: Dict[str, any],
        plan_state: Dict[str, any],
        semester_number: int
    ) -> Dict[str, any]:
        """Calculate deterministic planning score for a course."""
        
        course = course_info["course"]
        course_code = course_info["course_code"]
        node = self.course_graph[course_code]
        
        # Scoring components
        scores = {}
        
        # 1. Downstream degree score (how many courses this unlocks)
        downstream_max = max((n.downstream_degree for n in self.course_graph.values()), default=1)
        scores["downstream_degree"] = node.downstream_degree / downstream_max if downstream_max > 0 else 0
        
        # 2. Requirement coverage score
        req_coverage = len(node.requirement_coverage)
        max_coverage = max((len(n.requirement_coverage) for n in self.course_graph.values()), default=1)
        scores["requirement_coverage"] = req_coverage / max_coverage if max_coverage > 0 else 0
        
        # 3. Rarity penalty (prefer frequently offered courses early)
        total_frequency = sum(node.offering_frequency.values())
        avg_frequency = total_frequency / len(node.offering_frequency) if node.offering_frequency else 0
        scores["rarity_penalty"] = -1.0 / (avg_frequency + 1)  # Negative penalty
        
        # 4. Level progression bonus (appropriate difficulty for semester)
        target_level = 100 + (semester_number - 1) * 75  # Rough progression
        level_diff = abs(course.level - target_level)
        scores["level_progression"] = max(0, 1.0 - level_diff / 200)
        
        # 5. Cohort order bonus (traditional course sequencing)
        cohort_bonus = 0.0
        if course.level == 100:
            cohort_bonus = 1.0 if semester_number <= 2 else 0.5
        elif course.level == 200:
            cohort_bonus = 1.0 if 2 <= semester_number <= 4 else 0.5
        elif course.level == 300:
            cohort_bonus = 1.0 if 4 <= semester_number <= 6 else 0.5
        elif course.level >= 400:
            cohort_bonus = 1.0 if semester_number >= 6 else 0.3
        
        scores["cohort_order"] = cohort_bonus
        
        # Calculate total score (weighted combination)
        weights = {
            "downstream_degree": 0.3,
            "requirement_coverage": 0.25,
            "rarity_penalty": 0.15,
            "level_progression": 0.15,
            "cohort_order": 0.15
        }
        
        total_score = sum(scores[component] * weights[component] for component in scores)
        
        # Critical path detection
        is_critical_path = (
            node.downstream_degree >= 3 or  # Unlocks many courses
            req_coverage >= 2 or  # Satisfies multiple requirements
            course.is_capstone  # Capstone courses
        )
        
        return {
            **scores,
            "total_score": total_score,
            "is_critical_path": is_critical_path,
            "weights": weights
        }
    
    async def _update_remaining_requirements(
        self,
        remaining_requirements: List[Dict[str, any]],
        completed_courses: Set[str]
    ) -> List[Dict[str, any]]:
        """Update remaining requirements based on completed courses."""
        updated = []
        
        for requirement in remaining_requirements:
            if requirement["type"] == "course":
                course_codes = requirement["specification"].get("course_codes", [])
                select_count = requirement["specification"].get("select_count", len(course_codes))
                
                completed_from_req = len(set(course_codes) & completed_courses)
                
                if completed_from_req < select_count:
                    # Update completed count
                    requirement = requirement.copy()
                    requirement["completed_count"] = completed_from_req
                    updated.append(requirement)
        
        return updated
    
    def _advance_semester(self, current_semester: str, preferred_seasons: List[str]) -> str:
        """Advance to next semester."""
        parts = current_semester.split()
        season = parts[0]
        year = int(parts[1])
        
        # Simple advancement logic
        if season == "Fall":
            return f"Spring {year + 1}"
        elif season == "Spring":
            return f"Fall {year + 1}"
        elif season == "Summer":
            return f"Fall {year}"
        else:
            # Default advancement
            return f"Fall {year + 1}"