"""
✅ COMPREHENSIVE PREREQUISITE VALIDATION TESTS
Critical academic system testing - 100% accuracy required

Tests the exact scenarios that caused the original problem:
1. Student with only CS 18200 asking about CS 25100 (should be DENIED)
2. Student with only CS 24000 asking about CS 25100 (should be DENIED)
3. Student with BOTH prerequisites asking about CS 25100 (should be APPROVED)
"""

import pytest
import asyncio
import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from validation_engine import (
    validate_course_prerequisites,
    format_prerequisite_validation_result,
    validate_query_courses,
    extract_courses_from_query,
    grade_to_numeric
)

# Mock database session for testing
class MockAsyncSession:
    def __init__(self, mock_data=None):
        self.mock_data = mock_data or self._get_default_cs_prerequisites()
    
    async def execute(self, query, params=None):
        # Mock prerequisite data based on query
        if "prerequisite_edges" in str(query) and params and "course_id" in params:
            course = params["course_id"]
            return MockResult(self.mock_data.get(course, []))
        elif "prerequisite_groups" in str(query):
            return MockResult([])  # No group prerequisites for now
        return MockResult([])
    
    def _get_default_cs_prerequisites(self):
        """Default CS prerequisite structure matching the corrected schema"""
        return {
            "CS 25100": [
                ("CS 18200", "C", "Data Structures and Algorithms prerequisite"),
                ("CS 24000", "C", "Programming in C prerequisite")
            ],
            "CS 25000": [
                ("CS 18200", "C", "Data Structures and Algorithms prerequisite"),
                ("CS 24000", "C", "Programming in C prerequisite")
            ],
            "CS 25200": [
                ("CS 18200", "C", "Data Structures and Algorithms prerequisite"),
                ("CS 24000", "C", "Programming in C prerequisite")
            ],
            "CS 18200": [
                ("CS 18000", "C", "Problem Solving and Object-Oriented Programming prerequisite"),
                ("MA 16100", "C", "Calculus I prerequisite")
            ],
            "CS 24000": [
                ("CS 18000", "C", "Problem Solving and Object-Oriented Programming prerequisite")
            ],
            "CS 18000": [],  # No prerequisites
            "MA 16100": [],  # No prerequisites
            "MA 16200": [
                ("MA 16100", "C", "Calculus I prerequisite")
            ]
        }

class MockResult:
    def __init__(self, rows):
        self._rows = rows
    
    def fetchall(self):
        return self._rows

# Test transcript data
FRESHMAN_TRANSCRIPT = [
    {"course_id": "CS 18000", "grade": "B", "credits": 4},
    {"course_id": "MA 16100", "grade": "B", "credits": 5},
    {"course_id": "CS 19100", "grade": "P", "credits": 1},
    {"course_id": "CS 19300", "grade": "P", "credits": 1}
]

TRANSCRIPT_WITH_ONLY_CS_18200 = FRESHMAN_TRANSCRIPT + [
    {"course_id": "CS 18200", "grade": "B", "credits": 4}
]

TRANSCRIPT_WITH_ONLY_CS_24000 = FRESHMAN_TRANSCRIPT + [
    {"course_id": "CS 24000", "grade": "B", "credits": 4}
]

SOPHOMORE_TRANSCRIPT = FRESHMAN_TRANSCRIPT + [
    {"course_id": "CS 18200", "grade": "B", "credits": 4},
    {"course_id": "CS 24000", "grade": "C", "credits": 4},
    {"course_id": "MA 16200", "grade": "B", "credits": 5}
]

INSUFFICIENT_GRADE_TRANSCRIPT = FRESHMAN_TRANSCRIPT + [
    {"course_id": "CS 18200", "grade": "C-", "credits": 4},
    {"course_id": "CS 24000", "grade": "C-", "credits": 4}
]

class TestPrerequisiteValidation:
    """Test the core prerequisite validation logic"""
    
    @pytest.mark.asyncio
    async def test_cs_25100_with_only_cs_18200_denied(self):
        """🚨 CRITICAL: CS 25100 with only CS 18200 must be DENIED"""
        db = MockAsyncSession()
        
        validation = await validate_course_prerequisites(
            db, "CS 25100", TRANSCRIPT_WITH_ONLY_CS_18200
        )
        
        # Must NOT meet requirements
        assert not validation["meets_requirements"], \
            "CS 25100 should be DENIED with only CS 18200 - missing CS 24000"
        
        # Must show CS 24000 as missing
        missing_courses = [issue["course"] for issue in validation["direct_issues"] 
                          if issue["type"] == "missing_course"]
        assert "CS 24000" in missing_courses, \
            "CS 24000 must be listed as missing prerequisite"
        
        # Must NOT show CS 18200 as missing (since it's completed)
        assert "CS 18200" not in missing_courses, \
            "CS 18200 should not be missing - it's completed with grade B"
        
        print("✅ PASS: CS 25100 correctly DENIED with only CS 18200")
    
    @pytest.mark.asyncio
    async def test_cs_25100_with_only_cs_24000_denied(self):
        """🚨 CRITICAL: CS 25100 with only CS 24000 must be DENIED"""
        db = MockAsyncSession()
        
        validation = await validate_course_prerequisites(
            db, "CS 25100", TRANSCRIPT_WITH_ONLY_CS_24000
        )
        
        # Must NOT meet requirements
        assert not validation["meets_requirements"], \
            "CS 25100 should be DENIED with only CS 24000 - missing CS 18200"
        
        # Must show CS 18200 as missing
        missing_courses = [issue["course"] for issue in validation["direct_issues"] 
                          if issue["type"] == "missing_course"]
        assert "CS 18200" in missing_courses, \
            "CS 18200 must be listed as missing prerequisite"
        
        # Must NOT show CS 24000 as missing (since it's completed)
        assert "CS 24000" not in missing_courses, \
            "CS 24000 should not be missing - it's completed with grade B"
        
        print("✅ PASS: CS 25100 correctly DENIED with only CS 24000")
    
    @pytest.mark.asyncio
    async def test_cs_25100_with_both_prerequisites_approved(self):
        """✅ CS 25100 with BOTH prerequisites must be APPROVED"""
        db = MockAsyncSession()
        
        validation = await validate_course_prerequisites(
            db, "CS 25100", SOPHOMORE_TRANSCRIPT
        )
        
        # Must meet requirements
        assert validation["meets_requirements"], \
            f"CS 25100 should be APPROVED with both prerequisites. Issues: {validation['direct_issues']}"
        
        # Should have no missing prerequisites
        assert len(validation["direct_issues"]) == 0, \
            f"CS 25100 should have no missing prerequisites. Found: {validation['direct_issues']}"
        
        print("✅ PASS: CS 25100 correctly APPROVED with both prerequisites")
    
    @pytest.mark.asyncio
    async def test_cs_25100_with_insufficient_grades_denied(self):
        """CS 25100 with C- grades must be DENIED (need C or better)"""
        db = MockAsyncSession()
        
        validation = await validate_course_prerequisites(
            db, "CS 25100", INSUFFICIENT_GRADE_TRANSCRIPT
        )
        
        # Must NOT meet requirements due to insufficient grades
        assert not validation["meets_requirements"], \
            "CS 25100 should be DENIED with C- grades (need C or better)"
        
        # Must show grade issues
        grade_issues = [issue for issue in validation["direct_issues"] 
                       if issue["type"] == "insufficient_grade"]
        assert len(grade_issues) == 2, \
            f"Should have 2 grade issues (CS 18200 and CS 24000). Found: {grade_issues}"
        
        print("✅ PASS: CS 25100 correctly DENIED with insufficient grades")
    
    @pytest.mark.asyncio
    async def test_cs_25000_same_requirements_as_cs_25100(self):
        """CS 25000 must have the same requirements as CS 25100"""
        db = MockAsyncSession()
        
        # Test with only CS 18200 - should be DENIED
        validation = await validate_course_prerequisites(
            db, "CS 25000", TRANSCRIPT_WITH_ONLY_CS_18200
        )
        assert not validation["meets_requirements"], \
            "CS 25000 should be DENIED with only CS 18200"
        
        # Test with both prerequisites - should be APPROVED
        validation = await validate_course_prerequisites(
            db, "CS 25000", SOPHOMORE_TRANSCRIPT
        )
        assert validation["meets_requirements"], \
            "CS 25000 should be APPROVED with both prerequisites"
        
        print("✅ PASS: CS 25000 has same requirements as CS 25100")

class TestResponseFormatting:
    """Test the user-facing response formatting"""
    
    @pytest.mark.asyncio
    async def test_format_denial_message_clear(self):
        """Denial messages must be clear and specific"""
        db = MockAsyncSession()
        
        validation = await validate_course_prerequisites(
            db, "CS 25100", TRANSCRIPT_WITH_ONLY_CS_18200
        )
        
        response = await format_prerequisite_validation_result(validation)
        
        # Must indicate NOT eligible
        assert "NOT meet" in response or "not eligible" in response.lower(), \
            "Response must clearly indicate student is not eligible"
        
        # Must mention CS 24000 is missing
        assert "CS 24000" in response, \
            "Response must mention CS 24000 is missing"
        
        # Must include the critical BOTH requirement message
        assert ("BOTH" in response or "both" in response) and "CS 18200 AND CS 24000" in response, \
            "Response must explain BOTH prerequisites are required"
        
        # Must mention C or better requirement
        assert "C or better" in response, \
            "Response must mention C or better grade requirement"
        
        print("✅ PASS: Denial message is clear and specific")
    
    @pytest.mark.asyncio
    async def test_format_approval_message_clear(self):
        """Approval messages must be clear and definitive"""
        db = MockAsyncSession()
        
        validation = await validate_course_prerequisites(
            db, "CS 25100", SOPHOMORE_TRANSCRIPT
        )
        
        response = await format_prerequisite_validation_result(validation)
        
        # Must indicate eligible
        assert ("meet all prerequisites" in response and "eligible" in response) or \
               "✅" in response, \
            "Response must clearly indicate student is eligible"
        
        # Must mention the specific course
        assert "CS 25100" in response, \
            "Response must mention CS 25100"
        
        print("✅ PASS: Approval message is clear and definitive")

class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_extract_courses_from_query(self):
        """Test course extraction from various query formats"""
        test_cases = [
            ("Can I take CS 25100?", ["CS 25100"]),
            ("I want to enroll in CS25100", ["CS 25100"]),
            ("What about CS 25100 and CS 25000?", ["CS 25100", "CS 25000"]),
            ("cs 25100 prerequisites", ["CS 25100"]),
            ("No courses here", []),
            ("MATH 161 and CS 180", ["MATH 161", "CS 180"])
        ]
        
        for query, expected in test_cases:
            result = extract_courses_from_query(query)
            assert result == expected, \
                f"Query '{query}' should extract {expected}, got {result}"
        
        print("✅ PASS: Course extraction works correctly")
    
    def test_grade_to_numeric_conversion(self):
        """Test grade conversion accuracy"""
        test_cases = [
            ("A", 4.0),
            ("B", 3.0),
            ("C", 2.0),
            ("C-", 1.7),
            ("D", 1.0),
            ("F", 0.0),
            ("P", 2.0),  # Pass equals C
            ("W", 0.0),  # Withdrawal
            ("", 0.0),   # Empty
        ]
        
        for grade, expected in test_cases:
            result = grade_to_numeric(grade)
            assert result == expected, \
                f"Grade '{grade}' should convert to {expected}, got {result}"
        
        print("✅ PASS: Grade conversion is accurate")

class TestCriticalScenarios:
    """Test the exact scenarios from the system prompt"""
    
    @pytest.mark.asyncio
    async def test_critical_scenario_1_only_cs_18200(self):
        """🚨 CRITICAL: Test exact scenario 1 from system prompt"""
        db = MockAsyncSession()
        
        # Exact transcript from the prompt
        transcript = [
            {"course_id": "CS 18000", "grade": "B", "credits": 4},
            {"course_id": "CS 18200", "grade": "B", "credits": 4}
        ]
        
        query = "I have CS 18000 (B), CS 18200 (B), can I take CS 25100?"
        
        result = await validate_query_courses(db, query, transcript)
        
        # Must be found and NOT eligible
        assert result["found_courses"], "Should find CS 25100 in query"
        assert result["single_course"], "Should be single course query"
        assert result["course"] == "CS 25100", "Should identify CS 25100"
        
        validation = result["validation"]
        assert not validation["meets_requirements"], \
            "CRITICAL FAILURE: Student with only CS 18200 was approved for CS 25100"
        
        # Must show CS 24000 as missing
        message = result["message"]
        assert "CS 24000" in message and "missing" in message.lower(), \
            "Response must indicate CS 24000 is missing"
        
        assert "BOTH" in message or "both" in message, \
            "Response must explain BOTH prerequisites are required"
        
        print("✅ CRITICAL SCENARIO 1 PASSED: CS 25100 correctly denied with only CS 18200")
    
    @pytest.mark.asyncio
    async def test_critical_scenario_2_only_cs_24000(self):
        """🚨 CRITICAL: Test exact scenario 2 from system prompt"""
        db = MockAsyncSession()
        
        # Exact transcript from the prompt
        transcript = [
            {"course_id": "CS 18000", "grade": "B", "credits": 4},
            {"course_id": "CS 24000", "grade": "B", "credits": 4}
        ]
        
        query = "I have CS 18000 (B), CS 24000 (B), can I take CS 25100?"
        
        result = await validate_query_courses(db, query, transcript)
        
        # Must be found and NOT eligible
        assert result["found_courses"], "Should find CS 25100 in query"
        validation = result["validation"]
        assert not validation["meets_requirements"], \
            "CRITICAL FAILURE: Student with only CS 24000 was approved for CS 25100"
        
        # Must show CS 18200 as missing
        message = result["message"]
        assert "CS 18200" in message and "missing" in message.lower(), \
            "Response must indicate CS 18200 is missing"
        
        print("✅ CRITICAL SCENARIO 2 PASSED: CS 25100 correctly denied with only CS 24000")
    
    @pytest.mark.asyncio
    async def test_critical_scenario_3_both_prerequisites(self):
        """✅ CRITICAL: Test exact scenario 3 from system prompt"""
        db = MockAsyncSession()
        
        # Exact transcript from the prompt
        transcript = [
            {"course_id": "CS 18000", "grade": "B", "credits": 4},
            {"course_id": "CS 18200", "grade": "B", "credits": 4},
            {"course_id": "CS 24000", "grade": "B", "credits": 4}
        ]
        
        query = "I have CS 18000 (B), CS 18200 (B), CS 24000 (B), can I take CS 25100?"
        
        result = await validate_query_courses(db, query, transcript)
        
        # Must be found and eligible
        assert result["found_courses"], "Should find CS 25100 in query"
        validation = result["validation"]
        assert validation["meets_requirements"], \
            f"CRITICAL FAILURE: Student with both prerequisites was denied CS 25100. Issues: {validation['direct_issues']}"
        
        # Should indicate eligibility
        message = result["message"]
        assert ("eligible" in message.lower() or "meet" in message.lower()) and \
               "✅" in message, \
            "Response must confirm eligibility for CS 25100"
        
        print("✅ CRITICAL SCENARIO 3 PASSED: CS 25100 correctly approved with both prerequisites")

# Test runner
def run_all_tests():
    """Run all tests and report results"""
    print("🚨 RUNNING CRITICAL PREREQUISITE VALIDATION TESTS")
    print("=" * 60)
    
    # Test classes to run
    test_classes = [
        TestPrerequisiteValidation,
        TestResponseFormatting,
        TestUtilityFunctions,
        TestCriticalScenarios
    ]
    
    total_tests = 0
    passed_tests = 0
    
    for test_class in test_classes:
        class_name = test_class.__name__
        print(f"\n🧪 Running {class_name}...")
        
        instance = test_class()
        methods = [method for method in dir(instance) if method.startswith('test_')]
        
        for method_name in methods:
            total_tests += 1
            try:
                method = getattr(instance, method_name)
                if asyncio.iscoroutinefunction(method):
                    asyncio.run(method())
                else:
                    method()
                passed_tests += 1
                print(f"  ✅ {method_name}")
            except Exception as e:
                print(f"  ❌ {method_name}: {e}")
    
    print("\n" + "=" * 60)
    print(f"🏆 TEST RESULTS: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL CRITICAL TESTS PASSED!")
        print("\n📋 VALIDATION SUMMARY:")
        print("✅ CS 25100 is correctly DENIED with only CS 18200")
        print("✅ CS 25100 is correctly DENIED with only CS 24000")
        print("✅ CS 25100 is correctly APPROVED with both prerequisites")
        print("✅ Response messages are clear and specific")
        print("✅ All critical scenarios pass")
        print("\n🔒 SYSTEM IS SAFE FOR ACADEMIC USE")
        return True
    else:
        print(f"❌ {total_tests - passed_tests} CRITICAL TESTS FAILED!")
        print("🚨 SYSTEM IS NOT SAFE - DO NOT DEPLOY")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)