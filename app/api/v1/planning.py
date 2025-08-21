"""
Academic planning endpoints.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.planning import (
    AcademicPlanResponse,
    PlanningRequest,
    PlanValidationResponse
)
from app.services.planning_service import PlanningService

router = APIRouter()


@router.post("/generate", response_model=AcademicPlanResponse)
async def generate_plan(
    planning_request: PlanningRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> AcademicPlanResponse:
    """Generate academic plan for a student."""
    service = PlanningService(db)
    
    try:
        plan = await service.generate_plan(planning_request)
        
        # Queue background validation
        background_tasks.add_task(
            service.validate_plan_background,
            plan.id
        )
        
        return plan
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate plan: {str(e)}"
        )


@router.get("/students/{student_id}/plans", response_model=List[AcademicPlanResponse])
async def get_student_plans(
    student_id: int,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
) -> List[AcademicPlanResponse]:
    """Get academic plans for a student."""
    service = PlanningService(db)
    return await service.get_student_plans(
        student_id=student_id,
        active_only=active_only
    )


@router.get("/plans/{plan_id}", response_model=AcademicPlanResponse)
async def get_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
) -> AcademicPlanResponse:
    """Get specific academic plan."""
    service = PlanningService(db)
    plan = await service.get_plan(plan_id)
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"Plan {plan_id} not found"
        )
    return plan


@router.post("/plans/{plan_id}/validate", response_model=PlanValidationResponse)
async def validate_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
) -> PlanValidationResponse:
    """Validate academic plan against requirements."""
    service = PlanningService(db)
    
    plan = await service.get_plan(plan_id)
    if not plan:
        raise HTTPException(
            status_code=404,
            detail=f"Plan {plan_id} not found"
        )
    
    return await service.validate_plan(plan_id)


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete academic plan."""
    service = PlanningService(db)
    
    success = await service.delete_plan(plan_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Plan {plan_id} not found"
        )
    
    return {"message": f"Plan {plan_id} deleted successfully"}