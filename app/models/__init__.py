"""Database models for BoilerAI CS."""

from .academic import *
from .base import *
from .course import *
from .planning import *
from .student import *

__all__ = [
    # Base
    "TimestampMixin",
    # Academic
    "Major",
    "Track",
    "TrackGroup", 
    "Requirement",
    "Policy",
    # Course
    "Course",
    "CourseOffering",
    "Prerequisite",
    # Student
    "StudentProfile",
    "CompletedCourse",
    # Planning
    "AcademicPlan",
    "PlannedCourse",
]