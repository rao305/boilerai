"""
Academic planning and course plan models.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    String,
    Text,
    Integer,
    Float,
    JSON,
    Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from .base import TimestampMixin


class AcademicPlan(Base, TimestampMixin):
    """Generated academic plan for a student."""
    
    __tablename__ = "academic_plans"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id"), nullable=False
    )
    
    # Plan metadata
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    
    # Plan status
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )  # draft, active, archived, superseded
    
    # Plan generation details
    generated_at: Mapped[datetime] = mapped_column(nullable=False)
    generated_by: Mapped[str] = mapped_column(
        String(50), default="system", nullable=False
    )  # system, advisor, manual
    
    # Planning parameters (JSON for flexibility)
    planning_parameters: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Example: {
    #   "start_semester": "Fall 2024",
    #   "target_graduation": "Spring 2028", 
    #   "max_credits_per_semester": 15,
    #   "preferred_seasons": ["Fall", "Spring"],
    #   "track_focus": "systems"
    # }
    
    # Plan validation results
    is_valid: Mapped[bool] = mapped_column(default=True, nullable=False)
    validation_errors: Mapped[Optional[List[str]]] = mapped_column(JSON)
    validation_warnings: Mapped[Optional[List[str]]] = mapped_column(JSON)
    
    # Plan metrics
    total_semesters: Mapped[int] = mapped_column(nullable=False)
    total_credit_hours: Mapped[int] = mapped_column(nullable=False)
    estimated_gpa: Mapped[Optional[float]] = mapped_column()
    
    # Relationships
    student: Mapped["StudentProfile"] = relationship(
        "StudentProfile", back_populates="academic_plans"
    )
    planned_courses: Mapped[List["PlannedCourse"]] = relationship(
        "PlannedCourse", back_populates="plan", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        CheckConstraint("version > 0", name="ck_academic_plans_version_positive"),
        CheckConstraint("total_semesters > 0", name="ck_academic_plans_semesters_positive"),
        CheckConstraint("total_credit_hours > 0", name="ck_academic_plans_credits_positive"),
        CheckConstraint(
            "estimated_gpa IS NULL OR (estimated_gpa >= 0.0 AND estimated_gpa <= 4.0)",
            name="ck_academic_plans_gpa_range"
        ),
        Index("ix_academic_plans_student", "student_id"),
        Index("ix_academic_plans_status", "status"),
        Index("ix_academic_plans_generated", "generated_at"),
        Index("ix_academic_plans_student_version", "student_id", "version", unique=True),
    )


class PlannedCourse(Base, TimestampMixin):
    """Individual course within an academic plan."""
    
    __tablename__ = "planned_courses"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(
        ForeignKey("academic_plans.id"), nullable=False
    )
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    
    # Scheduling information
    planned_semester: Mapped[str] = mapped_column(String(20), nullable=False)
    semester_order: Mapped[int] = mapped_column(nullable=False)  # 1, 2, 3, etc.
    
    # Planning details
    reason: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # prerequisite, requirement, elective, etc.
    requirement_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("requirements.id")
    )
    
    # Course prioritization
    priority: Mapped[int] = mapped_column(default=0, nullable=False)
    is_critical_path: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Planning algorithm scores
    planning_score: Mapped[float] = mapped_column(nullable=False)
    scoring_details: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Example: {
    #   "downstream_degree": 0.8,
    #   "requirement_coverage": 0.9,
    #   "rarity_penalty": -0.1,
    #   "level_progression": 0.7,
    #   "cohort_order": 0.6
    # }
    
    # Course status
    is_tentative: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_alternative: Mapped[bool] = mapped_column(default=False, nullable=False)
    alternative_group: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Relationships
    plan: Mapped["AcademicPlan"] = relationship(
        "AcademicPlan", back_populates="planned_courses"
    )
    course: Mapped["Course"] = relationship("Course")
    requirement: Mapped[Optional["Requirement"]] = relationship("Requirement")
    
    __table_args__ = (
        CheckConstraint("semester_order > 0", name="ck_planned_courses_semester_order_positive"),
        CheckConstraint("priority >= 0", name="ck_planned_courses_priority_non_negative"),
        Index(
            "ix_planned_courses_plan_course",
            "plan_id", 
            "course_id",
            unique=True
        ),
        Index("ix_planned_courses_plan", "plan_id"),
        Index("ix_planned_courses_course", "course_id"),
        Index("ix_planned_courses_semester", "planned_semester"),
        Index("ix_planned_courses_order", "plan_id", "semester_order"),
        Index("ix_planned_courses_critical", "is_critical_path"),
        Index("ix_planned_courses_requirement", "requirement_id"),
    )