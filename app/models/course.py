"""
Course catalog and offering models.
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


class Course(Base, TimestampMixin):
    """Course catalog entry."""
    
    __tablename__ = "courses"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    credit_hours: Mapped[int] = mapped_column(nullable=False)
    department: Mapped[str] = mapped_column(String(10), nullable=False)
    level: Mapped[int] = mapped_column(nullable=False)  # 100, 200, 300, 400, etc.
    
    # Course attributes
    is_lab: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_seminar: Mapped[bool] = mapped_column(default=False, nullable=False) 
    is_capstone: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_repeatable: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Catalog information
    catalog_year: Mapped[int] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Additional metadata
    learning_outcomes: Mapped[Optional[List[str]]] = mapped_column(JSON)
    topics: Mapped[Optional[List[str]]] = mapped_column(JSON)
    
    # Relationships
    offerings: Mapped[List["CourseOffering"]] = relationship(
        "CourseOffering", back_populates="course", cascade="all, delete-orphan"
    )
    prerequisites_as_course: Mapped[List["Prerequisite"]] = relationship(
        "Prerequisite", 
        foreign_keys="[Prerequisite.course_id]",
        back_populates="course",
        cascade="all, delete-orphan"
    )
    prerequisites_as_prereq: Mapped[List["Prerequisite"]] = relationship(
        "Prerequisite",
        foreign_keys="[Prerequisite.prerequisite_course_id]", 
        back_populates="prerequisite_course"
    )
    
    __table_args__ = (
        CheckConstraint("credit_hours > 0", name="ck_courses_credit_hours_positive"),
        CheckConstraint("level >= 100", name="ck_courses_level_minimum"),
        Index("ix_courses_code", "code", unique=True),
        Index("ix_courses_department", "department"),
        Index("ix_courses_level", "level"),
        Index("ix_courses_active", "is_active"),
        Index("ix_courses_catalog_year", "catalog_year"),
    )


class CourseOffering(Base, TimestampMixin):
    """Semester-specific course offering."""
    
    __tablename__ = "course_offerings"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    semester: Mapped[str] = mapped_column(String(20), nullable=False)  # "Fall 2024"
    year: Mapped[int] = mapped_column(nullable=False)
    season: Mapped[str] = mapped_column(String(10), nullable=False)  # Fall, Spring, Summer
    
    # Offering details
    instructor: Mapped[Optional[str]] = mapped_column(String(255))
    capacity: Mapped[Optional[int]] = mapped_column()
    enrolled: Mapped[int] = mapped_column(default=0, nullable=False)
    waitlist: Mapped[int] = mapped_column(default=0, nullable=False)
    
    # Schedule information
    meeting_times: Mapped[Optional[List[dict]]] = mapped_column(JSON)
    # Example: [{"days": ["MWF"], "time": "10:30-11:20", "location": "LWSN B146"}]
    
    # Offering status
    is_available: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_cancelled: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="offerings")
    
    __table_args__ = (
        CheckConstraint("enrolled >= 0", name="ck_offerings_enrolled_non_negative"),
        CheckConstraint("waitlist >= 0", name="ck_offerings_waitlist_non_negative"),
        Index("ix_offerings_course_semester", "course_id", "semester", unique=True),
        Index("ix_offerings_semester", "semester"),
        Index("ix_offerings_year_season", "year", "season"),
        Index("ix_offerings_available", "is_available"),
    )


class Prerequisite(Base, TimestampMixin):
    """Course prerequisite relationships."""
    
    __tablename__ = "prerequisites"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), nullable=False)
    prerequisite_course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id"), nullable=False
    )
    
    # Prerequisite type and requirements
    prerequisite_type: Mapped[str] = mapped_column(
        String(50), default="required", nullable=False
    )  # required, recommended, corequisite
    
    min_grade: Mapped[Optional[str]] = mapped_column(String(2))  # C-, C, C+, B-, etc.
    
    # Complex prerequisite logic (JSON for flexibility)
    logic: Mapped[Optional[dict]] = mapped_column(JSON)
    # Example: {"operator": "OR", "courses": ["CS180", "CS182"], "min_grade": "C"}
    
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Relationships
    course: Mapped["Course"] = relationship(
        "Course", 
        foreign_keys=[course_id],
        back_populates="prerequisites_as_course"
    )
    prerequisite_course: Mapped["Course"] = relationship(
        "Course",
        foreign_keys=[prerequisite_course_id], 
        back_populates="prerequisites_as_prereq"
    )
    
    __table_args__ = (
        CheckConstraint(
            "course_id != prerequisite_course_id", 
            name="ck_prerequisites_no_self_reference"
        ),
        Index(
            "ix_prerequisites_course_prereq", 
            "course_id", 
            "prerequisite_course_id",
            unique=True
        ),
        Index("ix_prerequisites_course", "course_id"),
        Index("ix_prerequisites_prereq", "prerequisite_course_id"),
        Index("ix_prerequisites_type", "prerequisite_type"),
        Index("ix_prerequisites_active", "is_active"),
    )