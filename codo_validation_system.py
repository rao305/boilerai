#!/usr/bin/env python3
"""
CODO Validation System for Standalone Majors
Validates and guides users on CODO (Change of Degree Objective) requirements
for Computer Science, Data Science, and Artificial Intelligence majors.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class Course:
    """Represents a course with its details."""
    code: str
    title: str
    grade: Optional[str] = None
    credit_hours: float = 0.0
    term: Optional[str] = None

@dataclass
class TranscriptData:
    """Represents parsed transcript data."""
    courses: List[Course]
    overall_gpa: float
    purdue_gpa: float
    total_credits: float
    purdue_credits: float

@dataclass
class CODOResult:
    """Represents CODO eligibility result."""
    major: str
    qualified: bool
    details: List[str]
    missing_requirements: List[str]
    recommendation: str
    policies_found: bool

class CODOValidationSystem:
    """
    Main CODO validation system that handles knowledge base lookup,
    class validation, transcript processing, and user guidance.
    """
    
    def __init__(self, codo_policies_path: str = "src/data/codoPolicies.json", 
                 courses_db_path: str = "src/data/purdue_courses_complete.json"):
        """
        Initialize the CODO validation system.
        
        Args:
            codo_policies_path: Path to CODO policies JSON file
            courses_db_path: Path to courses database JSON file
        """
        self.codo_policies_path = Path(codo_policies_path)
        self.courses_db_path = Path(courses_db_path)
        self.codo_policies = {}
        self.courses_db = {}
        self.available_majors = ['computer_science', 'data_science', 'artificial_intelligence']
        
        # Load knowledge base
        self._load_knowledge_base()
    
    def _load_knowledge_base(self) -> None:
        """Load CODO policies and course database from files."""
        try:
            # Load CODO policies
            if self.codo_policies_path.exists():
                with open(self.codo_policies_path, 'r') as f:
                    self.codo_policies = json.load(f)
                logger.info(f"Loaded CODO policies for {len([k for k in self.codo_policies.keys() if k in self.available_majors])} majors")
            else:
                logger.warning("CODO policies file not found, will use fallback policies")
                self._load_fallback_policies()
            
            # Load courses database
            if self.courses_db_path.exists():
                try:
                    with open(self.courses_db_path, 'r', encoding='utf-8') as f:
                        courses_list = json.load(f)
                    # Convert to dict for faster lookup
                    self.courses_db = {course['full_course_code']: course for course in courses_list}
                    logger.info(f"Loaded {len(self.courses_db)} courses into database")
                except UnicodeDecodeError:
                    logger.warning("Courses database has encoding issues, loading subset for validation")
                    # Load a minimal course set for validation
                    self._load_minimal_courses()
            else:
                logger.warning("Courses database file not found")
                self._load_minimal_courses()
                
        except Exception as e:
            logger.error(f"Error loading knowledge base: {e}")
            self._load_fallback_policies()
    
    def _load_minimal_courses(self) -> None:
        """Load minimal course set for validation when full database is unavailable."""
        logger.info("Loading minimal course set for validation")
        self.courses_db = {
            'CS 18000': {'full_course_code': 'CS 18000', 'course_title': 'Problem Solving and Object-Oriented Programming'},
            'CS 18200': {'full_course_code': 'CS 18200', 'course_title': 'Foundations of Computer Science'},
            'MA 16500': {'full_course_code': 'MA 16500', 'course_title': 'Analytic Geometry and Calculus I'},
            'MA 16600': {'full_course_code': 'MA 16600', 'course_title': 'Analytic Geometry and Calculus II'},
            'MA 16100': {'full_course_code': 'MA 16100', 'course_title': 'Plane Analytic Geometry and Calculus I'},
            'MA 16200': {'full_course_code': 'MA 16200', 'course_title': 'Plane Analytic Geometry and Calculus II'},
            'MA 26100': {'full_course_code': 'MA 26100', 'course_title': 'Multivariate Calculus'},
            'STAT 35000': {'full_course_code': 'STAT 35000', 'course_title': 'Introduction to Statistics'},
            'STAT 30100': {'full_course_code': 'STAT 30100', 'course_title': 'Elementary Statistical Methods'},
            'STAT 51100': {'full_course_code': 'STAT 51100', 'course_title': 'Statistical Methods'},
            'PHYS 17200': {'full_course_code': 'PHYS 17200', 'course_title': 'Modern Mechanics'},
            'ENGL 10600': {'full_course_code': 'ENGL 10600', 'course_title': 'First-Year Composition'},
            'CHEM 11500': {'full_course_code': 'CHEM 11500', 'course_title': 'General Chemistry'}
        }

    def _load_fallback_policies(self) -> None:
        """Load fallback CODO policies if main policies are not available."""
        logger.info("Loading fallback CODO policies")
        self.codo_policies = {
            "computer_science": {
                "program_name": "Computer Science",
                "codo_requirements": {
                    "minimum_gpa": 3.0,
                    "purdue_gpa_requirement": 2.5,
                    "credit_requirements": {
                        "minimum_purdue_credits": 12,
                        "maximum_total_credits": 86
                    },
                    "required_courses": [
                        {
                            "course_code": "CS 18000",
                            "course_title": "Problem Solving and Object-Oriented Programming",
                            "minimum_grade": "C",
                            "required": True
                        },
                        {
                            "course_code": "MA 16500",
                            "course_title": "Analytic Geometry and Calculus I",
                            "minimum_grade": "C",
                            "required": True
                        }
                    ]
                }
            },
            "data_science": {
                "program_name": "Data Science",
                "codo_requirements": {
                    "minimum_gpa": 3.2,
                    "purdue_gpa_requirement": 2.75,
                    "credit_requirements": {
                        "minimum_purdue_credits": 12,
                        "maximum_total_credits": 86
                    },
                    "required_courses": [
                        {
                            "course_code": "MA 16500",
                            "course_title": "Analytic Geometry and Calculus I",
                            "minimum_grade": "B-",
                            "required": True
                        },
                        {
                            "course_code": "CS 18000",
                            "course_title": "Problem Solving and Object-Oriented Programming",
                            "minimum_grade": "B-",
                            "required": True
                        }
                    ]
                }
            },
            "artificial_intelligence": {
                "program_name": "Artificial Intelligence",
                "codo_requirements": {
                    "minimum_gpa": 3.3,
                    "purdue_gpa_requirement": 2.75,
                    "credit_requirements": {
                        "minimum_purdue_credits": 12,
                        "maximum_total_credits": 86
                    },
                    "required_courses": [
                        {
                            "course_code": "CS 18000",
                            "course_title": "Problem Solving and Object-Oriented Programming",
                            "minimum_grade": "B",
                            "required": True
                        },
                        {
                            "course_code": "MA 16500",
                            "course_title": "Analytic Geometry and Calculus I",
                            "minimum_grade": "B",
                            "required": True
                        }
                    ]
                }
            }
        }
    
    def get_codo_policies(self, major: str) -> Optional[Dict]:
        """
        Retrieve CODO policies for a specific major.
        
        Args:
            major: Major name (computer_science, data_science, artificial_intelligence)
        
        Returns:
            Dictionary containing CODO policies or None if not found
        """
        if major.lower() in self.codo_policies:
            logger.info(f"CODO policies for {major} retrieved from knowledge base")
            return self.codo_policies[major.lower()]
        else:
            logger.warning(f"No CODO policies found for {major} in knowledge base")
            return None
    
    def validate_course_exists(self, course_code: str) -> Tuple[bool, Optional[Dict]]:
        """
        Validate if a course exists in the knowledge base.
        
        Args:
            course_code: Course code to validate (e.g., "CS 18000")
        
        Returns:
            Tuple of (exists, course_info)
        """
        # Normalize course code format
        normalized_code = self._normalize_course_code(course_code)
        
        if normalized_code in self.courses_db:
            return True, self.courses_db[normalized_code]
        
        # Try alternative formats
        alt_formats = self._get_alternative_course_formats(course_code)
        for alt_code in alt_formats:
            if alt_code in self.courses_db:
                return True, self.courses_db[alt_code]
        
        return False, None
    
    def _normalize_course_code(self, course_code: str) -> str:
        """Normalize course code to standard format."""
        # Remove extra spaces and convert to uppercase
        normalized = re.sub(r'\s+', ' ', course_code.strip().upper())
        return normalized
    
    def _get_alternative_course_formats(self, course_code: str) -> List[str]:
        """Get alternative formats for a course code."""
        alternatives = []
        normalized = self._normalize_course_code(course_code)
        
        # Try with/without space
        if ' ' in normalized:
            alternatives.append(normalized.replace(' ', ''))
        else:
            # Add space before numbers
            match = re.match(r'^([A-Z]+)(\d+)$', normalized)
            if match:
                alternatives.append(f"{match.group(1)} {match.group(2)}")
        
        return alternatives
    
    def parse_transcript_data(self, transcript_text: str) -> TranscriptData:
        """
        Parse transcript text and extract course data.
        This is a simplified parser - in practice, you'd use the existing transcript parser.
        
        Args:
            transcript_text: Raw transcript text
        
        Returns:
            TranscriptData object
        """
        courses = []
        overall_gpa = 0.0
        purdue_gpa = 0.0
        total_credits = 0.0
        purdue_credits = 0.0
        
        # Improved regex patterns for transcript parsing
        course_pattern = r'([A-Z]+\s*\d+)\s+([^0-9]{10,60}?)\s+(\d+\.?\d*)\s+([A-F][+-]?|P|W)'
        gpa_pattern = r'(?:Overall|Cumulative|Total).*GPA[:\s]*(\d+\.\d+)'
        purdue_gpa_pattern = r'Purdue.*GPA[:\s]*(\d+\.\d+)'
        total_credits_pattern = r'Total Credits[:\s]*(\d+\.?\d*)'
        
        # Extract courses line by line to avoid parsing issues
        lines = transcript_text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Try to match course pattern
            match = re.match(course_pattern, line, re.IGNORECASE)
            if match:
                course_code = self._normalize_course_code(match.group(1))
                course_title = match.group(2).strip()
                credits = float(match.group(3))
                grade = match.group(4)
                
                # Only add valid courses (reasonable credit hours)
                if 0 < credits <= 10:  # Typical course credit range
                    course = Course(
                        code=course_code,
                        title=course_title,
                        grade=grade,
                        credit_hours=credits
                    )
                    courses.append(course)
                    total_credits += credits
        
        # Extract GPAs from explicit GPA lines
        for line in lines:
            gpa_match = re.search(gpa_pattern, line, re.IGNORECASE)
            if gpa_match:
                overall_gpa = float(gpa_match.group(1))
            
            purdue_gpa_match = re.search(purdue_gpa_pattern, line, re.IGNORECASE)
            if purdue_gpa_match:
                purdue_gpa = float(purdue_gpa_match.group(1))
            
            # Check for explicit total credits line
            credits_match = re.search(total_credits_pattern, line, re.IGNORECASE)
            if credits_match:
                explicit_total = float(credits_match.group(1))
                # Use explicit total if reasonable, otherwise use calculated
                if 0 < explicit_total <= 200:
                    total_credits = explicit_total
        
        # Fallback if no Purdue GPA specified
        if purdue_gpa == 0.0:
            purdue_gpa = overall_gpa
        
        # Estimate Purdue credits (simplified - assume all credits are from Purdue)
        purdue_credits = total_credits
        
        return TranscriptData(
            courses=courses,
            overall_gpa=overall_gpa,
            purdue_gpa=purdue_gpa,
            total_credits=total_credits,
            purdue_credits=purdue_credits
        )
    
    def _grade_to_numeric(self, grade: str) -> float:
        """Convert letter grade to numeric value for comparison."""
        grade_map = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0, 'P': 2.0  # P (Pass) treated as C equivalent
        }
        return grade_map.get(grade.upper(), 0.0)
    
    def _meets_grade_requirement(self, earned_grade: str, required_grade: str) -> bool:
        """Check if earned grade meets minimum requirement."""
        return self._grade_to_numeric(earned_grade) >= self._grade_to_numeric(required_grade)
    
    def validate_codo_eligibility(self, major: str, transcript_data: TranscriptData) -> CODOResult:
        """
        Validate CODO eligibility based on transcript data.
        
        Args:
            major: Target major for CODO
            transcript_data: Parsed transcript data
        
        Returns:
            CODOResult with eligibility details
        """
        logger.info(f"Validating CODO eligibility for {major}")
        
        policies = self.get_codo_policies(major)
        if not policies:
            return CODOResult(
                major=major,
                qualified=False,
                details=[f"No CODO policies found for {major}"],
                missing_requirements=["CODO policies not available"],
                recommendation="Contact academic advisor for specific requirements",
                policies_found=False
            )
        
        requirements = policies['codo_requirements']
        details = []
        missing_requirements = []
        qualified = True
        
        # Check GPA requirements
        min_gpa = requirements['minimum_gpa']
        purdue_gpa_req = requirements.get('purdue_gpa_requirement', min_gpa)
        
        if transcript_data.overall_gpa >= min_gpa:
            details.append(f"[PASS] Overall GPA: {transcript_data.overall_gpa:.2f} (required: {min_gpa})")
        else:
            details.append(f"[FAIL] Overall GPA: {transcript_data.overall_gpa:.2f} (required: {min_gpa})")
            missing_requirements.append(f"Overall GPA of {min_gpa}")
            qualified = False
        
        if transcript_data.purdue_gpa >= purdue_gpa_req:
            details.append(f"[PASS] Purdue GPA: {transcript_data.purdue_gpa:.2f} (required: {purdue_gpa_req})")
        else:
            details.append(f"[FAIL] Purdue GPA: {transcript_data.purdue_gpa:.2f} (required: {purdue_gpa_req})")
            missing_requirements.append(f"Purdue GPA of {purdue_gpa_req}")
            qualified = False
        
        # Check credit requirements
        credit_reqs = requirements.get('credit_requirements', {})
        min_purdue_credits = credit_reqs.get('minimum_purdue_credits', 0)
        max_total_credits = credit_reqs.get('maximum_total_credits', 999)
        
        if transcript_data.purdue_credits >= min_purdue_credits:
            details.append(f"[PASS] Purdue Credits: {transcript_data.purdue_credits:.1f} (required: {min_purdue_credits})")
        else:
            details.append(f"[FAIL] Purdue Credits: {transcript_data.purdue_credits:.1f} (required: {min_purdue_credits})")
            missing_requirements.append(f"At least {min_purdue_credits} Purdue credits")
            qualified = False
        
        if transcript_data.total_credits <= max_total_credits:
            details.append(f"[PASS] Total Credits: {transcript_data.total_credits:.1f} (max allowed: {max_total_credits})")
        else:
            details.append(f"[FAIL] Total Credits: {transcript_data.total_credits:.1f} (max allowed: {max_total_credits})")
            missing_requirements.append(f"Total credits must not exceed {max_total_credits}")
            qualified = False
        
        # Check required courses
        required_courses = requirements.get('required_courses', [])
        completed_courses = {course.code: course for course in transcript_data.courses}
        
        for req_course in required_courses:
            if not req_course.get('required', True):
                continue  # Skip non-required courses
                
            course_code = req_course['course_code']
            min_grade = req_course.get('minimum_grade', 'D')
            alternatives = req_course.get('alternatives', [])
            
            # Check primary course
            found_course = None
            if course_code in completed_courses:
                found_course = completed_courses[course_code]
            else:
                # Check alternatives
                for alt_code in alternatives:
                    if alt_code in completed_courses:
                        found_course = completed_courses[alt_code]
                        course_code = alt_code  # Update to show which alternative was used
                        break
            
            if found_course:
                if self._meets_grade_requirement(found_course.grade, min_grade):
                    details.append(f"[PASS] {course_code}: {found_course.grade} (required: {min_grade} or better)")
                else:
                    details.append(f"[FAIL] {course_code}: {found_course.grade} (required: {min_grade} or better)")
                    missing_requirements.append(f"{course_code} with grade {min_grade} or better")
                    qualified = False
            else:
                details.append(f"[FAIL] {course_code}: Not completed")
                missing_requirements.append(f"{course_code} with grade {min_grade} or better")
                qualified = False
        
        # Generate recommendation
        if qualified:
            recommendation = f"You meet the CODO requirements for {policies['program_name']}. You're eligible to apply!"
        else:
            recommendation = f"You don't meet the CODO requirements for {policies['program_name']} yet. Complete the missing requirements and reapply."
        
        return CODOResult(
            major=major,
            qualified=qualified,
            details=details,
            missing_requirements=missing_requirements,
            recommendation=recommendation,
            policies_found=True
        )
    
    def validate_courses_against_database(self, courses: List[str]) -> Dict[str, bool]:
        """
        Validate a list of course codes against the knowledge base.
        
        Args:
            courses: List of course codes to validate
        
        Returns:
            Dictionary mapping course codes to validation results
        """
        results = {}
        for course_code in courses:
            exists, _ = self.validate_course_exists(course_code)
            results[course_code] = exists
            
        return results
    
    def get_general_requirements(self, major: str) -> str:
        """
        Get general CODO requirements for a major as a formatted string.
        
        Args:
            major: Target major
        
        Returns:
            Formatted string with requirements
        """
        policies = self.get_codo_policies(major)
        if not policies:
            return f"No specific CODO policies found for {major}. Please contact an academic advisor."
        
        requirements = policies['codo_requirements']
        program_name = policies.get('program_name', major.replace('_', ' ').title())
        
        output = [f"CODO Requirements for {program_name}:"]
        
        # GPA requirements
        min_gpa = requirements['minimum_gpa']
        purdue_gpa = requirements.get('purdue_gpa_requirement', min_gpa)
        output.append(f"• Minimum Overall GPA: {min_gpa}")
        if purdue_gpa != min_gpa:
            output.append(f"• Minimum Purdue GPA: {purdue_gpa}")
        
        # Credit requirements
        credit_reqs = requirements.get('credit_requirements', {})
        if 'minimum_purdue_credits' in credit_reqs:
            output.append(f"• Minimum Purdue Credits: {credit_reqs['minimum_purdue_credits']}")
        if 'maximum_total_credits' in credit_reqs:
            output.append(f"• Maximum Total Credits: {credit_reqs['maximum_total_credits']}")
        
        # Required courses
        required_courses = [c for c in requirements.get('required_courses', []) if c.get('required', True)]
        if required_courses:
            output.append("• Required Courses:")
            for course in required_courses:
                min_grade = course.get('minimum_grade', 'D')
                alternatives = course.get('alternatives', [])
                course_line = f"  - {course['course_code']} (minimum grade: {min_grade})"
                if alternatives:
                    course_line += f" OR {' OR '.join(alternatives)}"
                output.append(course_line)
        
        # Application deadlines
        app_periods = requirements.get('application_periods', {})
        if app_periods:
            output.append("• Application Deadlines:")
            for period, deadline in app_periods.items():
                output.append(f"  - {period.replace('_', ' ').title()}: {deadline}")
        
        return '\n'.join(output)
    
    def handle_user_query(self, query: str, major: str, transcript_text: Optional[str] = None) -> str:
        """
        Handle a user query about CODO requirements and eligibility.
        
        Args:
            query: User's question or request
            major: Target major for CODO
            transcript_text: Optional transcript text for validation
        
        Returns:
            Formatted response string
        """
        logger.info(f"Handling user query about {major} CODO")
        
        # Check if policies exist
        policies_exist = self.get_codo_policies(major) is not None
        
        # If user has uploaded transcript, process it
        if transcript_text:
            transcript_data = self.parse_transcript_data(transcript_text)
            result = self.validate_codo_eligibility(major, transcript_data)
            
            response = [f"CODO Eligibility for {result.major.replace('_', ' ').title()}:"]
            response.append(f"Status: {'QUALIFIED' if result.qualified else 'NOT QUALIFIED'}")
            response.append("\nDetails:")
            response.extend(f"  {detail}" for detail in result.details)
            
            if result.missing_requirements:
                response.append("\nMissing Requirements:")
                response.extend(f"  • {req}" for req in result.missing_requirements)
            
            response.append(f"\nRecommendation: {result.recommendation}")
            
            return '\n'.join(response)
        
        # No transcript provided - give general requirements and encourage upload
        else:
            general_reqs = self.get_general_requirements(major)
            
            response = [
                "For the most accurate guidance on your CODO eligibility, I recommend uploading your transcript. "
                "This allows me to cross-check your courses and GPA against the requirements. "
                "If you don't have it handy, here are the general requirements, and you can apply if you meet them!",
                "",
                general_reqs,
                "",
                "TIP: Upload your transcript for personalized eligibility checking!"
            ]
            
            return '\n'.join(response)


def create_test_transcript() -> str:
    """Create a sample transcript for testing."""
    return """
    PURDUE UNIVERSITY OFFICIAL TRANSCRIPT
    
    Student: John Doe
    ID: 12345678
    
    FALL 2023
    CS 18000    Problem Solving and Object-Oriented Programming    3.0    B+
    MA 16500    Analytic Geometry and Calculus I                   5.0    A-
    ENGL 10600  First-Year Composition                            3.0    B
    PHYS 17200  Modern Mechanics                                  3.0    B-
    
    SPRING 2024
    CS 18200    Foundations of Computer Science                   3.0    A
    MA 16600    Analytic Geometry and Calculus II                5.0    B+
    STAT 35000  Introduction to Statistics                       3.0    B
    CHEM 11500  General Chemistry                                3.0    C+
    
    Overall GPA: 3.42
    Purdue GPA: 3.42
    Total Credits: 31.0
    """


def run_comprehensive_tests():
    """Run comprehensive tests of the CODO validation system."""
    print("Running Comprehensive CODO Validation System Tests\n")
    
    # Initialize system
    system = CODOValidationSystem()
    
    # Test 1: Knowledge Base Loading
    print("Test 1: Knowledge Base Loading")
    print("=" * 50)
    for major in ['computer_science', 'data_science', 'artificial_intelligence']:
        policies = system.get_codo_policies(major)
        if policies:
            print(f"[OK] CODO policies for {major} retrieved from knowledge base")
        else:
            print(f"[FAIL] No CODO policies found for {major} in knowledge base")
    print()
    
    # Test 2: Course Validation
    print("Test 2: Course Validation Against Database")
    print("=" * 50)
    test_courses = ['CS 18000', 'MA 16500', 'INVALID 99999', 'STAT 35000']
    validation_results = system.validate_courses_against_database(test_courses)
    for course, valid in validation_results.items():
        status = "[VALID]" if valid else "[INVALID]"
        print(f"  {course}: {status}")
    print()
    
    # Test 3: Transcript Processing and Eligibility (Qualified Student)
    print("Test 3: Qualified Student - Computer Science")
    print("=" * 50)
    qualified_transcript = create_test_transcript()
    response = system.handle_user_query(
        "Am I eligible for CODO to Computer Science?",
        "computer_science",
        qualified_transcript
    )
    print(response)
    print()
    
    # Test 4: Unqualified Student (Low GPA)
    print("Test 4: Unqualified Student - Artificial Intelligence (Low GPA)")
    print("=" * 50)
    unqualified_transcript = qualified_transcript.replace("Overall GPA: 3.42", "Overall GPA: 2.8")
    response = system.handle_user_query(
        "Am I eligible for CODO to Artificial Intelligence?",
        "artificial_intelligence",
        unqualified_transcript
    )
    print(response)
    print()
    
    # Test 5: Missing Required Course
    print("Test 5: Missing Required Course - Data Science")
    print("=" * 50)
    incomplete_transcript = qualified_transcript.replace("MA 16600    Analytic Geometry and Calculus II", "")
    response = system.handle_user_query(
        "Can I CODO to Data Science?",
        "data_science",
        incomplete_transcript
    )
    print(response)
    print()
    
    # Test 6: No Transcript Provided
    print("Test 6: General Requirements (No Transcript)")
    print("=" * 50)
    response = system.handle_user_query(
        "What are the CODO requirements for Computer Science?",
        "computer_science"
    )
    print(response)
    print()
    
    # Test 7: Edge Cases
    print("Test 7: Edge Cases")
    print("=" * 50)
    
    # Invalid major
    try:
        response = system.handle_user_query("Requirements for invalid major", "invalid_major")
        print("Invalid major handling: [OK] Handled gracefully")
    except Exception as e:
        print(f"Invalid major handling: [FAIL] Error - {e}")
    
    # Empty transcript
    try:
        empty_response = system.handle_user_query("Check eligibility", "computer_science", "")
        print("Empty transcript handling: [OK] Handled gracefully")
    except Exception as e:
        print(f"Empty transcript handling: [FAIL] Error - {e}")
    
    print("\nAll tests completed!")


if __name__ == "__main__":
    # Run the comprehensive test suite
    run_comprehensive_tests()
    
    # Example usage
    print("\n" + "="*80)
    print("EXAMPLE USAGE")
    print("="*80)
    
    # Initialize the system
    codo_system = CODOValidationSystem()
    
    # Example 1: Check general requirements
    print("\n1. Getting general requirements:")
    general_reqs = codo_system.get_general_requirements("computer_science")
    print(general_reqs)
    
    # Example 2: Validate with transcript
    print("\n2. Validating with transcript:")
    sample_transcript = create_test_transcript()
    transcript_data = codo_system.parse_transcript_data(sample_transcript)
    result = codo_system.validate_codo_eligibility("computer_science", transcript_data)
    
    print(f"Qualified: {result.qualified}")
    print("Details:")
    for detail in result.details:
        print(f"  {detail}")