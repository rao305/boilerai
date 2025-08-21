import pytest
import asyncio

# Import the core engine functions under test
from app.prerequisite_validation_engine import (
    validate_course_prerequisites,
    meets_grade_requirement,
)


class MockResult:
    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows


class MockDB:
    async def execute(self, query, params=None):
        # For these tests, we rely on the explicit special-case logic
        # for CS 25100/CS 25000 and avoid DB-driven prereqs
        return MockResult([])


@pytest.mark.asyncio
async def test_cs25100_missing_cs240():
    transcript = [
        {"course_id": "CS 18000", "grade": "B"},
        {"course_id": "CS 18200", "grade": "B"},
    ]

    db = MockDB()
    result = await validate_course_prerequisites(db, "CS 25100", transcript)

    assert not result["valid"]
    assert "CS 24000" in result["missing_prerequisites"]
    assert any(
        "CS 25100 requires BOTH CS 18200 AND CS 24000" in issue
        for issue in result["detailed_issues"]
    )


@pytest.mark.asyncio
async def test_cs25100_missing_cs182():
    transcript = [
        {"course_id": "CS 18000", "grade": "B"},
        {"course_id": "CS 24000", "grade": "B"},
    ]

    db = MockDB()
    result = await validate_course_prerequisites(db, "CS 25100", transcript)

    assert not result["valid"]
    assert "CS 18200" in result["missing_prerequisites"]
    assert any(
        "CS 25100 requires BOTH CS 18200 AND CS 24000" in issue
        for issue in result["detailed_issues"]
    )


@pytest.mark.asyncio
async def test_cs25100_both_prerequisites():
    transcript = [
        {"course_id": "CS 18000", "grade": "B"},
        {"course_id": "CS 18200", "grade": "B"},
        {"course_id": "CS 24000", "grade": "B"},
    ]

    db = MockDB()
    result = await validate_course_prerequisites(db, "CS 25100", transcript)

    assert result["valid"]
    assert not result["missing_prerequisites"]
    assert not result["insufficient_grades"]


def test_grade_comparison():
    assert meets_grade_requirement("C", "C") is True
    assert meets_grade_requirement("C-", "C") is False
    assert meets_grade_requirement("B+", "C") is True
    assert meets_grade_requirement("C+", "C") is True
    assert meets_grade_requirement("C", "C-") is True
    assert meets_grade_requirement("C-", "C-") is True



