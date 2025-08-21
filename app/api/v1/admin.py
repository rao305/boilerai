"""
Administrative endpoints for data management.
"""

from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.admin import DataPackResponse, IngestionStatus
from app.services.admin_service import AdminService

router = APIRouter()


@router.post("/ingest/data-pack", response_model=DataPackResponse)
async def ingest_data_pack(
    data_pack: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> DataPackResponse:
    """Ingest structured data pack (ZIP file with CSV/JSON data)."""
    service = AdminService(db)
    
    if not data_pack.filename or not data_pack.filename.endswith('.zip'):
        raise HTTPException(
            status_code=400,
            detail="Data pack must be a ZIP file"
        )
    
    try:
        return await service.ingest_data_pack(data_pack)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Data ingestion failed: {str(e)}"
        )


@router.get("/ingest/status", response_model=List[IngestionStatus])
async def get_ingestion_status(
    db: AsyncSession = Depends(get_db),
) -> List[IngestionStatus]:
    """Get data ingestion history and status."""
    service = AdminService(db)
    return await service.get_ingestion_history()


@router.post("/validate/data-integrity")
async def validate_data_integrity(
    db: AsyncSession = Depends(get_db),
) -> dict[str, any]:
    """Validate database integrity and consistency."""
    service = AdminService(db)
    
    try:
        return await service.validate_data_integrity()
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Data validation failed: {str(e)}"
        )


@router.get("/stats/database")
async def get_database_stats(
    db: AsyncSession = Depends(get_db),
) -> dict[str, any]:
    """Get database statistics and health metrics."""
    service = AdminService(db)
    return await service.get_database_stats()


@router.post("/maintenance/vacuum")
async def vacuum_database(
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Perform database maintenance (vacuum, analyze)."""
    service = AdminService(db)
    
    try:
        await service.vacuum_database()
        return {"message": "Database maintenance completed successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database maintenance failed: {str(e)}"
        )