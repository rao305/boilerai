"""Transcript processing Pydantic schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ParsedCourse(BaseModel):
    """Parsed course from transcript."""
    
    course_code: str = Field(..., description="Course code (e.g., CS180)")
    course_title: Optional[str] = Field(None, description="Course title")
    credit_hours: int = Field(..., gt=0, description="Credit hours")
    grade: str = Field(..., description="Letter grade received")
    semester_taken: str = Field(..., description="Semester when taken")
    grade_points: float = Field(..., ge=0.0, description="Grade points earned")
    is_passing: bool = Field(..., description="Whether grade is passing")
    is_transfer: bool = Field(default=False, description="Transfer credit")
    
    # Processing metadata
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Parsing confidence")
    raw_text: Optional[str] = Field(None, description="Original text from transcript")


class TranscriptParseResult(BaseModel):
    """Result of transcript parsing."""
    
    parsed_courses: List[ParsedCourse] = Field(default_factory=list)
    student_info: Dict[str, Any] = Field(default_factory=dict)
    parsing_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Statistics
    total_courses: int = Field(default=0, description="Total courses parsed")
    total_credit_hours: int = Field(default=0, description="Total credit hours")
    passing_courses: int = Field(default=0, description="Number of passing courses")
    cumulative_gpa: Optional[float] = Field(None, description="Calculated GPA")
    
    # Quality metrics
    parsing_errors: List[str] = Field(default_factory=list)
    parsing_warnings: List[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Overall parsing confidence")


class TranscriptProcessResponse(BaseModel):
    """Response from transcript processing."""
    
    status: str = Field(..., description="Processing status")
    student_id: int = Field(..., description="Student ID")
    
    # Processing results
    parse_result: Optional[TranscriptParseResult] = None
    courses_imported: int = Field(default=0, description="Number of courses imported to profile")
    courses_updated: int = Field(default=0, description="Number of existing courses updated")
    courses_skipped: int = Field(default=0, description="Number of courses skipped")
    
    # Processing metadata
    processing_method: str = Field(..., description="Processing method used")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    file_info: Optional[Dict[str, Any]] = Field(None, description="Original file information")
    
    # Error handling
    error: Optional[str] = Field(None, description="Error message if processing failed")
    error_type: Optional[str] = Field(None, description="Error type classification")
    
    # Validation results
    validation_errors: List[str] = Field(default_factory=list)
    validation_warnings: List[str] = Field(default_factory=list)
    
    model_config = {"from_attributes": True}