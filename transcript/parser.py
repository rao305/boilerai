"""
Transcript Parser for Boiler AI - CS (No-KB Mode)
Converts OCR/VLM output to normalized profile JSON for planning
"""

import json
import logging
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class ParsedCourse:
    """Parsed course information from transcript"""
    course_id: str
    title: str
    credits: float
    grade: str
    term: str
    year: int

class TranscriptParser:
    """Parser for various transcript formats"""
    
    def __init__(self):
        # Common course ID patterns
        self.course_id_patterns = [
            r'\b([A-Z]{2,4})\s*(\d{3,5})\b',  # CS 18000, MATH 161
            r'\b([A-Z]{2,4})(\d{3,5})\b',     # CS18000, MATH161
        ]
        
        # Grade patterns
        self.grade_patterns = [
            r'\b([A-F][+-]?)\b',  # A, A-, B+, B, B-, etc.
            r'\b([A-F])\b',       # A, B, C, D, F
            r'\b(P|NP|S|U|W|I)\b',  # Pass/No Pass, Satisfactory/Unsatisfactory, Withdrawal, Incomplete
        ]
        
        # Term patterns
        self.term_patterns = [
            r'\b(F|S|SU|Fall|Spring|Summer)\s*(\d{4})\b',
            r'\b(\d{4})\s*(F|S|SU|Fall|Spring|Summer)\b',
            r'\b(F|S|SU)\s*(\d{2})\b',  # F25, S26
            r'\b(\d{2})\s*(F|S|SU)\b',  # 25F, 26S
        ]
        
        # Credit patterns
        self.credit_patterns = [
            r'\b(\d+(?:\.\d+)?)\s*credits?\b',
            r'\b(\d+(?:\.\d+)?)\s*hrs?\b',
            r'\b(\d+(?:\.\d+)?)\s*hours?\b',
        ]
    
    def parse_ocr_text(self, ocr_text: str) -> Dict[str, Any]:
        """Parse OCR text into structured course data"""
        try:
            lines = ocr_text.split('\n')
            courses = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                parsed_course = self._parse_line(line)
                if parsed_course:
                    courses.append(parsed_course)
            
            # Group by term and year
            term_groups = self._group_by_term(courses)
            
            # Convert to profile format
            profile = self._create_profile(term_groups)
            
            logger.info(f"Parsed {len(courses)} courses from OCR text")
            return profile
            
        except Exception as e:
            logger.error(f"Error parsing OCR text: {e}")
            raise
    
    def parse_vlm_output(self, vlm_text: str) -> Dict[str, Any]:
        """Parse VLM (Vision Language Model) output"""
        try:
            # VLM output is usually more structured
            # Try to extract JSON-like structures first
            json_matches = re.findall(r'\{[^{}]*\}', vlm_text)
            
            if json_matches:
                # Try to parse as JSON
                for match in json_matches:
                    try:
                        data = json.loads(match)
                        if self._validate_vlm_data(data):
                            return self._convert_vlm_to_profile(data)
                    except json.JSONDecodeError:
                        continue
            
            # Fallback to text parsing
            return self.parse_ocr_text(vlm_text)
            
        except Exception as e:
            logger.error(f"Error parsing VLM output: {e}")
            raise
    
    def parse_manual_form(self, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse manually entered form data"""
        try:
            # Validate form structure
            required_fields = ['student', 'major', 'track_id', 'completed', 'constraints']
            for field in required_fields:
                if field not in form_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate student info
            student = form_data['student']
            if 'gpa' not in student or 'start_term' not in student:
                raise ValueError("Student must have gpa and start_term")
            
            # Validate completed courses
            for course in form_data['completed']:
                if not all(k in course for k in ['course_id', 'grade', 'term']):
                    raise ValueError("Completed courses must have course_id, grade, and term")
            
            # Validate constraints
            constraints = form_data['constraints']
            if 'max_credits' not in constraints:
                constraints['max_credits'] = 18  # Default
            
            logger.info("Manual form data validated successfully")
            return form_data
            
        except Exception as e:
            logger.error(f"Error parsing manual form: {e}")
            raise
    
    def _parse_line(self, line: str) -> Optional[ParsedCourse]:
        """Parse a single line for course information"""
        try:
            # Extract course ID
            course_id = self._extract_course_id(line)
            if not course_id:
                return None
            
            # Extract grade
            grade = self._extract_grade(line)
            if not grade:
                return None
            
            # Extract credits
            credits = self._extract_credits(line)
            if not credits:
                return None
            
            # Extract term and year
            term, year = self._extract_term_year(line)
            if not term or not year:
                return None
            
            # Extract title (everything between course ID and grade/credits)
            title = self._extract_title(line, course_id, grade, credits)
            
            return ParsedCourse(
                course_id=course_id,
                title=title,
                credits=credits,
                grade=grade,
                term=term,
                year=year
            )
            
        except Exception as e:
            logger.debug(f"Could not parse line: {line} - {e}")
            return None
    
    def _extract_course_id(self, line: str) -> Optional[str]:
        """Extract course ID from line"""
        for pattern in self.course_id_patterns:
            match = re.search(pattern, line)
            if match:
                dept, num = match.groups()
                return f"{dept} {num}"
        return None
    
    def _extract_grade(self, line: str) -> Optional[str]:
        """Extract grade from line"""
        for pattern in self.grade_patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1)
        return None
    
    def _extract_credits(self, line: str) -> Optional[float]:
        """Extract credits from line"""
        for pattern in self.credit_patterns:
            match = re.search(pattern, line)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    continue
        return None
    
    def _extract_term_year(self, line: str) -> Tuple[Optional[str], Optional[int]]:
        """Extract term and year from line"""
        for pattern in self.term_patterns:
            match = re.search(pattern, line)
            if match:
                term_part, year_part = match.groups()
                
                # Normalize term
                term_map = {
                    'F': 'F', 'Fall': 'F',
                    'S': 'S', 'Spring': 'S',
                    'SU': 'SU', 'Summer': 'SU'
                }
                term = term_map.get(term_part, term_part)
                
                # Normalize year
                try:
                    year = int(year_part)
                    if year < 100:  # Assume 20xx for 2-digit years
                        year += 2000
                    return term, year
                except ValueError:
                    continue
        
        return None, None
    
    def _extract_title(self, line: str, course_id: str, grade: str, credits: float) -> str:
        """Extract course title from line"""
        # Remove course ID, grade, and credits from line
        title_line = line.replace(course_id, '').replace(grade, '').replace(str(credits), '')
        
        # Clean up extra whitespace and punctuation
        title = re.sub(r'\s+', ' ', title_line).strip()
        title = re.sub(r'[^\w\s-]', '', title)  # Remove special chars except hyphens
        
        return title if title else "Unknown Course"
    
    def _group_by_term(self, courses: List[ParsedCourse]) -> Dict[str, List[ParsedCourse]]:
        """Group courses by term and year"""
        term_groups = {}
        
        for course in courses:
            term_key = f"{course.term}{course.year}"
            if term_key not in term_groups:
                term_groups[term_key] = []
            term_groups[term_key].append(course)
        
        return term_groups
    
    def _create_profile(self, term_groups: Dict[str, List[ParsedCourse]]) -> Dict[str, Any]:
        """Create profile JSON from parsed courses"""
        # Find earliest term for start_term
        if not term_groups:
            start_term = "F2025"  # Default
        else:
            earliest_term = min(term_groups.keys())
            start_term = earliest_term
        
        # Convert courses to profile format
        completed_courses = []
        for term_key, courses in term_groups.items():
            for course in courses:
                completed_courses.append({
                    'course_id': course.course_id,
                    'grade': course.grade,
                    'term': term_key,
                    'credits': course.credits
                })
        
        # Create profile structure
        profile = {
            'student': {
                'gpa': 3.0,  # Default GPA - could be calculated from grades
                'start_term': start_term
            },
            'major': 'CS',  # Default to CS
            'track_id': 'systems',  # Default to systems track
            'completed': completed_courses,
            'in_progress': [],  # No in-progress courses from transcript
            'constraints': {
                'max_credits': 18,
                'summer_ok': True,
                'pace': 'normal'
            }
        }
        
        return profile
    
    def _validate_vlm_data(self, data: Dict[str, Any]) -> bool:
        """Validate VLM output data structure"""
        required_fields = ['courses', 'student_info']
        return all(field in data for field in required_fields)
    
    def _convert_vlm_to_profile(self, vlm_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert VLM data to profile format"""
        try:
            courses = vlm_data['courses']
            student_info = vlm_data['student_info']
            
            # Convert courses to profile format
            completed_courses = []
            for course in courses:
                if all(k in course for k in ['course_id', 'grade', 'term']):
                    completed_courses.append({
                        'course_id': course['course_id'],
                        'grade': course['grade'],
                        'term': course['term'],
                        'credits': course.get('credits', 3.0)
                    })
            
            # Create profile
            profile = {
                'student': {
                    'gpa': student_info.get('gpa', 3.0),
                    'start_term': student_info.get('start_term', 'F2025')
                },
                'major': vlm_data.get('major', 'CS'),
                'track_id': vlm_data.get('track_id', 'systems'),
                'completed': completed_courses,
                'in_progress': vlm_data.get('in_progress', []),
                'constraints': vlm_data.get('constraints', {
                    'max_credits': 18,
                    'summer_ok': True,
                    'pace': 'normal'
                })
            }
            
            return profile
            
        except Exception as e:
            logger.error(f"Error converting VLM data: {e}")
            raise
    
    def normalize_course_id(self, course_id: str) -> str:
        """Normalize course ID to standard format (e.g., 'CS 18000')"""
        # Remove extra spaces and ensure proper format
        course_id = re.sub(r'\s+', ' ', course_id.strip())
        
        # Ensure there's a space between department and number
        if re.match(r'^[A-Z]{2,4}\d', course_id):
            # Insert space before first digit
            course_id = re.sub(r'(\d)', r' \1', course_id, count=1)
        
        return course_id
    
    def validate_profile(self, profile: Dict[str, Any]) -> List[str]:
        """Validate profile data for completeness and correctness"""
        errors = []
        
        # Check required fields
        required_fields = ['student', 'major', 'track_id', 'completed', 'constraints']
        for field in required_fields:
            if field not in profile:
                errors.append(f"Missing required field: {field}")
        
        if errors:
            return errors
        
        # Validate student info
        student = profile['student']
        if 'gpa' not in student:
            errors.append("Student missing GPA")
        elif not isinstance(student['gpa'], (int, float)) or student['gpa'] < 0 or student['gpa'] > 4:
            errors.append("GPA must be between 0 and 4")
        
        if 'start_term' not in student:
            errors.append("Student missing start term")
        
        # Validate completed courses
        for i, course in enumerate(profile['completed']):
            if not isinstance(course, dict):
                errors.append(f"Course {i} is not a dictionary")
                continue
            
            required_course_fields = ['course_id', 'grade', 'term']
            for field in required_course_fields:
                if field not in course:
                    errors.append(f"Course {i} missing {field}")
            
            if 'course_id' in course:
                # Validate course ID format
                if not re.match(r'^[A-Z]{2,4}\s+\d{3,5}$', course['course_id']):
                    errors.append(f"Course {i} has invalid course ID format: {course['course_id']}")
        
        # Validate constraints
        constraints = profile['constraints']
        if 'max_credits' in constraints:
            if not isinstance(constraints['max_credits'], int) or constraints['max_credits'] <= 0:
                errors.append("max_credits must be a positive integer")
        
        return errors

