"""
Transcript processing service for OCR/VLM and normalization.
"""

import json
import re
import time
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

from fastapi import UploadFile
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import get_logger, get_settings
from app.models import (
    StudentProfile,
    Course,
    CompletedCourse
)
from app.schemas.transcript import (
    ParsedCourse,
    TranscriptParseResult,
    TranscriptProcessResponse
)

logger = get_logger(__name__)
settings = get_settings()


class TranscriptParser:
    """Transcript parsing engine with OCR/VLM integration."""
    
    def __init__(self):
        self.grade_mapping = self._build_grade_mapping()
        self.semester_patterns = self._build_semester_patterns()
        self.course_patterns = self._build_course_patterns()
    
    def _build_grade_mapping(self) -> Dict[str, Tuple[float, bool]]:
        """Build grade to points and passing status mapping."""
        return {
            "A+": (4.0, True), "A": (4.0, True), "A-": (3.7, True),
            "B+": (3.3, True), "B": (3.0, True), "B-": (2.7, True),
            "C+": (2.3, True), "C": (2.0, True), "C-": (1.7, True),
            "D+": (1.3, True), "D": (1.0, True), "D-": (0.7, True),
            "F": (0.0, False), "W": (0.0, False), "I": (0.0, False),
            "P": (0.0, True), "NP": (0.0, False), "S": (0.0, True),
            "U": (0.0, False), "AU": (0.0, False)
        }
    
    def _build_semester_patterns(self) -> List[str]:
        """Build regex patterns for semester identification."""
        return [
            r"(Fall|Spring|Summer)\s+(\d{4})",
            r"(F|S|U)(\d{2})",  # F21, S22, U22 format
            r"(\d{4})\s+(Fall|Spring|Summer)",
            r"(Autumn|Winter)\s+(\d{4})"
        ]
    
    def _build_course_patterns(self) -> List[str]:
        """Build regex patterns for course identification."""
        return [
            r"([A-Z]{2,5})\s*(\d{3}[A-Z]?)\s+([^\d\n]+?)\s+(\d+(?:\.\d+)?)\s+([A-F][+-]?|[IWPNSU]+)",
            r"([A-Z]{2,5})(\d{3}[A-Z]?)\s+(.+?)\s+(\d+)\s+([A-F][+-]?|[IWPNSU]+)",
            r"([A-Z]{2,5})\s(\d{3}[A-Z]?)\s(.+?)\s(\d+(?:\.\d+)?)\s([A-F][+-]?|[IWPNSU]+)"
        ]
    
    async def parse_pdf_transcript(self, pdf_bytes: bytes) -> TranscriptParseResult:
        """Parse PDF transcript using OCR/VLM."""
        try:
            # For demo purposes, we'll simulate OCR processing
            # In production, this would use actual OCR/VLM services
            text_content = await self._simulate_ocr_extraction(pdf_bytes)
            return await self._parse_text_content(text_content, "pdf_ocr")
            
        except Exception as e:
            logger.error("PDF transcript parsing failed", error=str(e), exc_info=True)
            return TranscriptParseResult(
                parsing_errors=[f"PDF parsing failed: {str(e)}"],
                confidence_score=0.0
            )
    
    async def parse_text_transcript(self, text_content: str) -> TranscriptParseResult:
        """Parse plain text transcript."""
        try:
            return await self._parse_text_content(text_content, "text")
            
        except Exception as e:
            logger.error("Text transcript parsing failed", error=str(e), exc_info=True)
            return TranscriptParseResult(
                parsing_errors=[f"Text parsing failed: {str(e)}"],
                confidence_score=0.0
            )
    
    async def parse_json_transcript(self, json_bytes: bytes) -> TranscriptParseResult:
        """Parse structured JSON transcript."""
        try:
            json_data = json.loads(json_bytes.decode('utf-8'))
            return await self._parse_structured_data(json_data)
            
        except Exception as e:
            logger.error("JSON transcript parsing failed", error=str(e), exc_info=True)
            return TranscriptParseResult(
                parsing_errors=[f"JSON parsing failed: {str(e)}"],
                confidence_score=0.0
            )
    
    async def _simulate_ocr_extraction(self, pdf_bytes: bytes) -> str:
        """Simulate OCR text extraction from PDF."""
        # In production, this would call actual OCR/VLM services
        # For demo, return sample transcript text
        return """
        PURDUE UNIVERSITY TRANSCRIPT
        
        Student: John Doe
        ID: 123456789
        Major: Computer Science
        
        Fall 2021
        CS180    Problem Solving and Object-Oriented Programming    4    B+
        MA161    Plane Analytic Geometry and Calculus I            5    A-
        ENGL106  First-Year Composition                            3    B
        
        Spring 2022
        CS240    Programming in C                                  3    A
        CS182    Foundations of Computer Science                   3    B+
        MA162    Plane Analytic Geometry and Calculus II         5    B
        PHYS172  Modern Mechanics                                 5    B-
        
        Fall 2022
        CS250    Computer Architecture                            4    A-
        CS251    Data Structures and Algorithms                  4    B+
        MA261    Multivariate Calculus                           3    B
        STAT355  Introduction to Statistics                       3    A
        
        Cumulative GPA: 3.45
        Total Credits: 42
        """
    
    async def _parse_text_content(self, text_content: str, method: str) -> TranscriptParseResult:
        """Parse text content into structured data."""
        result = TranscriptParseResult()
        result.parsing_metadata = {
            "method": method,
            "original_length": len(text_content),
            "lines_processed": len(text_content.split('\n'))
        }
        
        lines = text_content.split('\n')
        current_semester = None
        confidence_scores = []
        
        for line_idx, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Try to identify semester
            semester_match = self._match_semester(line)
            if semester_match:
                current_semester = semester_match
                continue
            
            # Try to parse course
            course_data = self._parse_course_line(line, current_semester)
            if course_data:
                parsed_course, confidence = course_data
                result.parsed_courses.append(parsed_course)
                confidence_scores.append(confidence)
            
            # Extract student info
            student_info = self._extract_student_info(line)
            if student_info:
                result.student_info.update(student_info)
        
        # Calculate statistics
        result.total_courses = len(result.parsed_courses)
        result.total_credit_hours = sum(course.credit_hours for course in result.parsed_courses)
        result.passing_courses = sum(1 for course in result.parsed_courses if course.is_passing)
        
        # Calculate GPA
        if result.parsed_courses:
            total_points = sum(course.credit_hours * course.grade_points for course in result.parsed_courses)
            total_credits = sum(course.credit_hours for course in result.parsed_courses)
            if total_credits > 0:
                result.cumulative_gpa = round(total_points / total_credits, 2)
        
        # Calculate confidence score
        if confidence_scores:
            result.confidence_score = sum(confidence_scores) / len(confidence_scores)
        
        # Validation
        result = self._validate_parse_result(result)
        
        return result
    
    async def _parse_structured_data(self, json_data: Dict[str, Any]) -> TranscriptParseResult:
        """Parse structured JSON transcript data."""
        result = TranscriptParseResult()
        result.parsing_metadata = {
            "method": "json_structured",
            "source_format": "json"
        }
        
        # Extract student info
        if "student" in json_data:
            result.student_info = json_data["student"]
        
        # Parse courses
        courses_data = json_data.get("courses", [])
        confidence_scores = []
        
        for course_entry in courses_data:
            try:
                parsed_course = ParsedCourse(
                    course_code=course_entry["course_code"],
                    course_title=course_entry.get("title", ""),
                    credit_hours=int(course_entry["credit_hours"]),
                    grade=course_entry["grade"],
                    semester_taken=course_entry["semester"],
                    grade_points=self._calculate_grade_points(course_entry["grade"]),
                    is_passing=self._is_passing_grade(course_entry["grade"]),
                    is_transfer=course_entry.get("is_transfer", False),
                    confidence=1.0,  # High confidence for structured data
                    raw_text=str(course_entry)
                )
                
                result.parsed_courses.append(parsed_course)
                confidence_scores.append(1.0)
                
            except (KeyError, ValueError) as e:
                result.parsing_errors.append(f"Invalid course entry: {str(e)}")
        
        # Calculate statistics
        result.total_courses = len(result.parsed_courses)
        result.total_credit_hours = sum(course.credit_hours for course in result.parsed_courses)
        result.passing_courses = sum(1 for course in result.parsed_courses if course.is_passing)
        
        # Calculate GPA
        if result.parsed_courses:
            total_points = sum(course.credit_hours * course.grade_points for course in result.parsed_courses)
            total_credits = sum(course.credit_hours for course in result.parsed_courses)
            if total_credits > 0:
                result.cumulative_gpa = round(total_points / total_credits, 2)
        
        # Set confidence
        if confidence_scores:
            result.confidence_score = sum(confidence_scores) / len(confidence_scores)
        
        return result
    
    def _match_semester(self, line: str) -> Optional[str]:
        """Match semester information from line."""
        for pattern in self.semester_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) == 2:
                    season, year = groups
                    
                    # Normalize season names
                    season_mapping = {
                        "F": "Fall", "S": "Spring", "U": "Summer",
                        "Autumn": "Fall", "Winter": "Spring"
                    }
                    season = season_mapping.get(season, season)
                    
                    # Handle 2-digit years
                    if len(year) == 2:
                        year_int = int(year)
                        if year_int >= 50:
                            year = f"19{year}"
                        else:
                            year = f"20{year}"
                    
                    return f"{season} {year}"
        
        return None
    
    def _parse_course_line(self, line: str, current_semester: Optional[str]) -> Optional[Tuple[ParsedCourse, float]]:
        """Parse individual course line."""
        for pattern in self.course_patterns:
            match = re.search(pattern, line)
            if match:
                try:
                    groups = match.groups()
                    if len(groups) >= 5:
                        dept, number, title, credits, grade = groups[:5]
                        
                        # Clean up the data
                        course_code = f"{dept.upper()}{number}"
                        title = title.strip()
                        credit_hours = int(float(credits))
                        grade = grade.upper().strip()
                        
                        # Calculate grade info
                        grade_points = self._calculate_grade_points(grade)
                        is_passing = self._is_passing_grade(grade)
                        
                        # Use current semester or try to extract from context
                        semester = current_semester or "Unknown"
                        
                        parsed_course = ParsedCourse(
                            course_code=course_code,
                            course_title=title,
                            credit_hours=credit_hours,
                            grade=grade,
                            semester_taken=semester,
                            grade_points=grade_points,
                            is_passing=is_passing,
                            is_transfer=False,
                            confidence=0.9,  # High confidence for pattern match
                            raw_text=line
                        )
                        
                        return parsed_course, 0.9
                        
                except (ValueError, IndexError) as e:
                    logger.warning("Failed to parse course line", line=line, error=str(e))
                    continue
        
        return None
    
    def _extract_student_info(self, line: str) -> Optional[Dict[str, Any]]:
        """Extract student information from line."""
        info = {}
        
        # GPA patterns
        gpa_match = re.search(r"(?:cumulative\s+)?gpa[:\s]+(\d+\.\d+)", line, re.IGNORECASE)
        if gpa_match:
            info["cumulative_gpa"] = float(gpa_match.group(1))
        
        # Credit patterns
        credits_match = re.search(r"(?:total\s+)?credits?[:\s]+(\d+)", line, re.IGNORECASE)
        if credits_match:
            info["total_credits"] = int(credits_match.group(1))
        
        # Student ID patterns
        id_match = re.search(r"(?:id|student\s+id)[:\s]+(\d+)", line, re.IGNORECASE)
        if id_match:
            info["student_id"] = id_match.group(1)
        
        # Name patterns
        name_match = re.search(r"student[:\s]+([A-Za-z\s]+)", line, re.IGNORECASE)
        if name_match:
            info["student_name"] = name_match.group(1).strip()
        
        return info if info else None
    
    def _calculate_grade_points(self, grade: str) -> float:
        """Calculate grade points for a grade."""
        grade = grade.upper().strip()
        return self.grade_mapping.get(grade, (0.0, False))[0]
    
    def _is_passing_grade(self, grade: str) -> bool:
        """Check if grade is passing."""
        grade = grade.upper().strip()
        return self.grade_mapping.get(grade, (0.0, False))[1]
    
    def _validate_parse_result(self, result: TranscriptParseResult) -> TranscriptParseResult:
        """Validate parsing results and add warnings/errors."""
        
        # Check for duplicate courses
        course_codes = [course.course_code for course in result.parsed_courses]
        duplicates = set([code for code in course_codes if course_codes.count(code) > 1])
        if duplicates:
            result.parsing_warnings.append(f"Duplicate courses found: {', '.join(duplicates)}")
        
        # Check for unusual patterns
        if result.total_courses == 0:
            result.parsing_errors.append("No courses found in transcript")
        
        if result.total_credit_hours > 200:
            result.parsing_warnings.append("Unusually high credit hour total")
        
        if result.cumulative_gpa and (result.cumulative_gpa > 4.0 or result.cumulative_gpa < 0.0):
            result.parsing_warnings.append("GPA outside normal range")
        
        # Check confidence
        if result.confidence_score < 0.5:
            result.parsing_warnings.append("Low parsing confidence - manual review recommended")
        
        return result


class TranscriptService:
    """Service for processing student transcripts."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.parser = TranscriptParser()
    
    async def process_transcript(self, student_id: int, file: UploadFile) -> TranscriptProcessResponse:
        """Process uploaded transcript file."""
        start_time = time.time()
        
        logger.info(
            "Processing transcript file",
            student_id=student_id,
            filename=file.filename,
            content_type=file.content_type
        )
        
        try:
            # Read file content
            file_content = await file.read()
            
            # Parse based on file type
            if file.content_type == "application/pdf":
                parse_result = await self.parser.parse_pdf_transcript(file_content)
                method = "pdf_ocr"
            elif file.content_type == "text/plain":
                text_content = file_content.decode('utf-8')
                parse_result = await self.parser.parse_text_transcript(text_content)
                method = "text"
            elif file.content_type == "application/json":
                parse_result = await self.parser.parse_json_transcript(file_content)
                method = "json"
            else:
                raise ValueError(f"Unsupported file type: {file.content_type}")
            
            # Import courses to student profile
            import_result = await self._import_courses_to_profile(student_id, parse_result)
            
            processing_time = (time.time() - start_time) * 1000
            
            response = TranscriptProcessResponse(
                status="success" if not parse_result.parsing_errors else "warning",
                student_id=student_id,
                parse_result=parse_result,
                courses_imported=import_result["imported"],
                courses_updated=import_result["updated"],
                courses_skipped=import_result["skipped"],
                processing_method=method,
                processing_time_ms=processing_time,
                file_info={
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "size_bytes": len(file_content)
                },
                validation_errors=parse_result.parsing_errors,
                validation_warnings=parse_result.parsing_warnings
            )
            
            logger.info(
                "Transcript processing completed",
                student_id=student_id,
                courses_imported=import_result["imported"],
                processing_time_ms=processing_time
            )
            
            return response
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            
            logger.error(
                "Transcript processing failed",
                student_id=student_id,
                error=str(e),
                exc_info=True
            )
            
            return TranscriptProcessResponse(
                status="error",
                student_id=student_id,
                processing_method="unknown",
                processing_time_ms=processing_time,
                error=str(e),
                error_type=type(e).__name__
            )
    
    async def process_transcript_text(self, student_id: int, transcript_text: str) -> TranscriptProcessResponse:
        """Process transcript from raw text."""
        start_time = time.time()
        
        logger.info(
            "Processing transcript text",
            student_id=student_id,
            text_length=len(transcript_text)
        )
        
        try:
            # Parse text content
            parse_result = await self.parser.parse_text_transcript(transcript_text)
            
            # Import courses to student profile
            import_result = await self._import_courses_to_profile(student_id, parse_result)
            
            processing_time = (time.time() - start_time) * 1000
            
            response = TranscriptProcessResponse(
                status="success" if not parse_result.parsing_errors else "warning",
                student_id=student_id,
                parse_result=parse_result,
                courses_imported=import_result["imported"],
                courses_updated=import_result["updated"],
                courses_skipped=import_result["skipped"],
                processing_method="text",
                processing_time_ms=processing_time,
                validation_errors=parse_result.parsing_errors,
                validation_warnings=parse_result.parsing_warnings
            )
            
            logger.info(
                "Transcript text processing completed",
                student_id=student_id,
                courses_imported=import_result["imported"],
                processing_time_ms=processing_time
            )
            
            return response
            
        except Exception as e:
            processing_time = (time.time() - start_time) * 1000
            
            logger.error(
                "Transcript text processing failed",
                student_id=student_id,
                error=str(e),
                exc_info=True
            )
            
            return TranscriptProcessResponse(
                status="error",
                student_id=student_id,
                processing_method="text",
                processing_time_ms=processing_time,
                error=str(e),
                error_type=type(e).__name__
            )
    
    async def _import_courses_to_profile(
        self,
        student_id: int,
        parse_result: TranscriptParseResult
    ) -> Dict[str, int]:
        """Import parsed courses to student profile."""
        
        # Verify student exists
        student_result = await self.db.execute(
            select(StudentProfile).where(StudentProfile.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise ValueError(f"Student {student_id} not found")
        
        imported = 0
        updated = 0
        skipped = 0
        
        for parsed_course in parse_result.parsed_courses:
            try:
                # Find course in catalog
                course_result = await self.db.execute(
                    select(Course).where(Course.code == parsed_course.course_code)
                )
                course = course_result.scalar_one_or_none()
                
                if not course:
                    logger.warning(
                        "Course not found in catalog",
                        course_code=parsed_course.course_code
                    )
                    skipped += 1
                    continue
                
                # Check if course already exists for student
                existing_result = await self.db.execute(
                    select(CompletedCourse).where(
                        and_(
                            CompletedCourse.student_id == student_id,
                            CompletedCourse.course_id == course.id,
                            CompletedCourse.semester_taken == parsed_course.semester_taken
                        )
                    )
                )
                existing_course = existing_result.scalar_one_or_none()
                
                if existing_course:
                    # Update existing record
                    existing_course.grade = parsed_course.grade
                    existing_course.grade_points = parsed_course.grade_points
                    existing_course.is_passing = parsed_course.is_passing
                    existing_course.source = "transcript"
                    updated += 1
                else:
                    # Create new record
                    completed_course = CompletedCourse(
                        student_id=student_id,
                        course_id=course.id,
                        semester_taken=parsed_course.semester_taken,
                        grade=parsed_course.grade,
                        credit_hours=parsed_course.credit_hours,
                        grade_points=parsed_course.grade_points,
                        is_passing=parsed_course.is_passing,
                        is_transfer=parsed_course.is_transfer,
                        source="transcript"
                    )
                    self.db.add(completed_course)
                    imported += 1
                
            except Exception as e:
                logger.error(
                    "Failed to import course",
                    course_code=parsed_course.course_code,
                    error=str(e)
                )
                skipped += 1
        
        # Update student profile with transcript metadata
        if parse_result.cumulative_gpa:
            student.cumulative_gpa = parse_result.cumulative_gpa
        
        student.total_credit_hours = parse_result.total_credit_hours
        student.transcript_source = "transcript_upload"
        student.transcript_processed_at = time.time()
        
        await self.db.commit()
        
        return {
            "imported": imported,
            "updated": updated,
            "skipped": skipped
        }
    
    async def get_processing_status(self, student_id: int) -> Dict[str, Any]:
        """Get transcript processing status for student."""
        student_result = await self.db.execute(
            select(StudentProfile).where(StudentProfile.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        
        if not student:
            return {
                "status": "not_found",
                "message": f"Student {student_id} not found"
            }
        
        # Get completed courses count
        courses_result = await self.db.execute(
            select(CompletedCourse).where(CompletedCourse.student_id == student_id)
        )
        completed_courses = list(courses_result.scalars().all())
        
        return {
            "status": "ready",
            "student_id": student_id,
            "transcript_processed": bool(student.transcript_processed_at),
            "transcript_source": student.transcript_source,
            "processed_at": student.transcript_processed_at,
            "total_courses": len(completed_courses),
            "total_credit_hours": student.total_credit_hours,
            "cumulative_gpa": student.cumulative_gpa
        }