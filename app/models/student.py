"""
Student profile and academic history models.
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


class StudentProfile(Base, TimestampMixin):
    """Student academic profile and transcript data."""
    
    __tablename__ = "student_profiles"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    
    # Personal information (minimal for privacy)
    first_name: Mapped[Optional[str]] = mapped_column(String(100))
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    
    # Academic information
    major_id: Mapped[int] = mapped_column(ForeignKey("majors.id"), nullable=False)
    track_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tracks.id"))
    concentration: Mapped[Optional[str]] = mapped_column(String(100))
    
    # Academic status
    enrollment_semester: Mapped[str] = mapped_column(String(20), nullable=False)
    expected_graduation: Mapped[str] = mapped_column(String(20), nullable=False)
    academic_standing: Mapped[str] = mapped_column(
        String(20), default="good", nullable=False
    )  # good, probation, suspension
    
    # Academic metrics
    cumulative_gpa: Mapped[Optional[float]] = mapped_column(Float)
    total_credit_hours: Mapped[int] = mapped_column(default=0, nullable=False)
    
    # Transcript processing metadata
    transcript_source: Mapped[Optional[str]] = mapped_column(
        String(50)
    )  # manual, pdf, ocr, api
    transcript_processed_at: Mapped[Optional[datetime]] = mapped_column()
    
    # Additional profile data (JSON for flexibility)
    profile_data: Mapped[Optional[dict]] = mapped_column(JSON)
    # Example: {"transfer_credits": 30, "ap_credits": 12, "study_abroad": True}
    
    # Privacy and consent
    data_consent: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Relationships
    major: Mapped["Major"] = relationship("Major")
    track: Mapped[Optional["Track"]] = relationship("Track")
    completed_courses: Mapped[List["CompletedCourse"]] = relationship(
        "CompletedCourse", back_populates="student", cascade="all, delete-orphan"
    )
    academic_plans: Mapped[List["AcademicPlan"]] = relationship(
        "AcademicPlan", back_populates="student", cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        CheckConstraint(
            "cumulative_gpa IS NULL OR (cumulative_gpa >= 0.0 AND cumulative_gpa <= 4.0)",
            name="ck_student_profiles_gpa_range"
        ),
        CheckConstraint(
            "total_credit_hours >= 0",
            name="ck_student_profiles_credit_hours_non_negative"
        ),
        Index("ix_student_profiles_student_id", "student_id", unique=True),
        Index("ix_student_profiles_major", "major_id"),
        Index("ix_student_profiles_track", "track_id"),
        Index("ix_student_profiles_graduation", "expected_graduation"),
        Index("ix_student_profiles_active", "is_active"),
    )


class CompletedCourse(Base, TimestampMixin):
    """Student's completed course record."""
    
    __tablename__ = "completed_courses"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("student_profiles.id"), nullable=False
    )
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    
    # Completion details
    semester_taken: Mapped[str] = mapped_column(String(20), nullable=False)
    grade: Mapped[str] = mapped_column(String(5), nullable=False)
    credit_hours: Mapped[int] = mapped_column(nullable=False)
    
    # Grade information
    grade_points: Mapped[float] = mapped_column(nullable=False)
    is_passing: Mapped[bool] = mapped_column(nullable=False)
    is_transfer: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Source information
    source: Mapped[str] = mapped_column(
        String(50), default="transcript", nullable=False
    )  # transcript, manual, transfer, test_credit
    
    # Additional metadata
    instructor: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    student: Mapped["StudentProfile"] = relationship(
        "StudentProfile", back_populates="completed_courses"
    )
    course: Mapped["Course"] = relationship("Course")
    
    __table_args__ = (
        CheckConstraint("credit_hours > 0", name="ck_completed_courses_credit_hours_positive"),
        CheckConstraint("grade_points >= 0.0", name="ck_completed_courses_grade_points_non_negative"),
        Index(
            "ix_completed_courses_student_course", 
            "student_id", 
            "course_id", 
            "semester_taken",
            unique=True
        ),
        Index("ix_completed_courses_student", "student_id"),
        Index("ix_completed_courses_course", "course_id"),
        Index("ix_completed_courses_semester", "semester_taken"),
        Index("ix_completed_courses_grade", "grade"),
        Index("ix_completed_courses_passing", "is_passing"),
    )