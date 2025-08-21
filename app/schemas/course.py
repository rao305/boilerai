"""Course-related Pydantic schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class CourseResponse(BaseModel):
    """Course catalog response schema."""
    
    id: int
    code: str = Field(..., description="Course code (e.g., CS180)")
    title: str = Field(..., description="Course title")
    description: str = Field(..., description="Course description")
    credit_hours: int = Field(..., gt=0, description="Credit hours")
    department: str = Field(..., description="Department code")
    level: int = Field(..., ge=100, description="Course level")
    
    # Course attributes
    is_lab: bool = Field(default=False)
    is_seminar: bool = Field(default=False)
    is_capstone: bool = Field(default=False)
    is_repeatable: bool = Field(default=False)
    
    # Catalog information
    catalog_year: int = Field(..., description="Catalog year")
    is_active: bool = Field(default=True)
    
    # Additional metadata
    learning_outcomes: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class CourseOfferingResponse(BaseModel):
    """Course offering response schema."""
    
    id: int
    course_id: int
    semester: str = Field(..., description="Semester (e.g., Fall 2024)")
    year: int = Field(..., description="Academic year")
    season: str = Field(..., description="Season (Fall, Spring, Summer)")
    
    # Offering details
    instructor: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=0)
    enrolled: int = Field(default=0, ge=0)
    waitlist: int = Field(default=0, ge=0)
    
    # Schedule information
    meeting_times: Optional[List[dict]] = None
    
    # Status
    is_available: bool = Field(default=True)
    is_cancelled: bool = Field(default=False)
    
    # Course information (nested)
    course: CourseResponse
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class PrerequisiteResponse(BaseModel):
    """Prerequisite relationship response schema."""
    
    id: int
    course_id: int
    prerequisite_course_id: int
    prerequisite_type: str = Field(default="required")
    min_grade: Optional[str] = None
    logic: Optional[dict] = None
    is_active: bool = Field(default=True)
    
    # Nested course information
    prerequisite_course: CourseResponse
    
    model_config = {"from_attributes": True}