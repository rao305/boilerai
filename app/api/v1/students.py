"""
Student profile and academic history endpoints.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.student import (
    StudentProfileResponse,
    StudentProfileCreate,
    StudentProfileUpdate,
    CompletedCourseResponse
)
from app.services.student_service import StudentService

router = APIRouter()


@router.post("/", response_model=StudentProfileResponse)
async def create_student_profile(
    student_data: StudentProfileCreate,
    db: AsyncSession = Depends(get_db),
) -> StudentProfileResponse:
    """Create new student profile."""
    service = StudentService(db)
    
    try:
        return await service.create_student_profile(student_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{student_id}", response_model=StudentProfileResponse)
async def get_student_profile(
    student_id: int,
    db: AsyncSession = Depends(get_db),
) -> StudentProfileResponse:
    """Get student profile by ID."""
    service = StudentService(db)
    
    profile = await service.get_student_profile(student_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found"
        )
    
    return profile


@router.put("/{student_id}", response_model=StudentProfileResponse)
async def update_student_profile(
    student_id: int,
    student_data: StudentProfileUpdate,
    db: AsyncSession = Depends(get_db),
) -> StudentProfileResponse:
    """Update student profile."""
    service = StudentService(db)
    
    try:
        profile = await service.update_student_profile(student_id, student_data)
        if not profile:
            raise HTTPException(
                status_code=404,
                detail=f"Student {student_id} not found"
            )
        return profile
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{student_id}/courses", response_model=List[CompletedCourseResponse])
async def get_student_completed_courses(
    student_id: int,
    semester: Optional[str] = None,
    passing_only: bool = True,
    db: AsyncSession = Depends(get_db),
) -> List[CompletedCourseResponse]:
    """Get student's completed courses."""
    service = StudentService(db)
    
    # Verify student exists
    profile = await service.get_student_profile(student_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found"
        )
    
    return await service.get_completed_courses(
        student_id=student_id,
        semester=semester,
        passing_only=passing_only
    )


@router.get("/{student_id}/gpa")
async def get_student_gpa(
    student_id: int,
    semester: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, float]:
    """Calculate student GPA."""
    service = StudentService(db)
    
    # Verify student exists
    profile = await service.get_student_profile(student_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found"
        )
    
    gpa_data = await service.calculate_gpa(
        student_id=student_id,
        semester=semester
    )
    
    return gpa_data


@router.get("/{student_id}/progress")
async def get_graduation_progress(
    student_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, any]:
    """Get student's graduation progress."""
    service = StudentService(db)
    
    # Verify student exists
    profile = await service.get_student_profile(student_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail=f"Student {student_id} not found"
        )
    
    return await service.get_graduation_progress(student_id)