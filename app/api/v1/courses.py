"""
Course catalog and offering endpoints.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.course import CourseResponse, CourseOfferingResponse
from app.services.course_service import CourseService

router = APIRouter()


@router.get("/", response_model=List[CourseResponse])
async def get_courses(
    department: Optional[str] = Query(None, description="Filter by department"),
    level: Optional[int] = Query(None, description="Filter by course level"),
    active_only: bool = Query(True, description="Include only active courses"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    db: AsyncSession = Depends(get_db),
) -> List[CourseResponse]:
    """Get course catalog with optional filtering."""
    service = CourseService(db)
    return await service.get_courses(
        department=department,
        level=level,
        active_only=active_only,
        skip=skip,
        limit=limit
    )


@router.get("/{course_code}", response_model=CourseResponse)
async def get_course(
    course_code: str,
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    """Get specific course by code."""
    service = CourseService(db)
    course = await service.get_course_by_code(course_code)
    if not course:
        raise HTTPException(
            status_code=404,
            detail=f"Course {course_code} not found"
        )
    return course


@router.get("/{course_code}/offerings", response_model=List[CourseOfferingResponse])
async def get_course_offerings(
    course_code: str,
    semester: Optional[str] = Query(None, description="Filter by semester"),
    year: Optional[int] = Query(None, description="Filter by year"),
    available_only: bool = Query(True, description="Include only available offerings"),
    db: AsyncSession = Depends(get_db),
) -> List[CourseOfferingResponse]:
    """Get course offerings with optional filtering."""
    service = CourseService(db)
    
    # Verify course exists
    course = await service.get_course_by_code(course_code)
    if not course:
        raise HTTPException(
            status_code=404,
            detail=f"Course {course_code} not found"
        )
    
    return await service.get_course_offerings(
        course_code=course_code,
        semester=semester,
        year=year,
        available_only=available_only
    )


@router.get("/{course_code}/prerequisites", response_model=List[CourseResponse])
async def get_course_prerequisites(
    course_code: str,
    db: AsyncSession = Depends(get_db),
) -> List[CourseResponse]:
    """Get course prerequisites."""
    service = CourseService(db)
    
    # Verify course exists
    course = await service.get_course_by_code(course_code)
    if not course:
        raise HTTPException(
            status_code=404,
            detail=f"Course {course_code} not found"
        )
    
    return await service.get_prerequisites(course_code)