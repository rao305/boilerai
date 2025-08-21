"""
Main API router configuration.
"""

from fastapi import APIRouter

from app.api.v1 import (
    courses,
    planning,
    query,
    students,
    transcripts,
    admin,
)

# Create main API router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(
    courses.router,
    prefix="/courses",
    tags=["courses"]
)

api_router.include_router(
    planning.router,
    prefix="/planning", 
    tags=["planning"]
)

api_router.include_router(
    query.router,
    prefix="/query",
    tags=["query"]
)

api_router.include_router(
    students.router,
    prefix="/students",
    tags=["students"]
)

api_router.include_router(
    transcripts.router,
    prefix="/transcripts",
    tags=["transcripts"]
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["admin"]
)