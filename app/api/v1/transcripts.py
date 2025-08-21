"""
Transcript processing endpoints.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.transcript import TranscriptProcessResponse
from app.services.transcript_service import TranscriptService

router = APIRouter()


@router.post("/upload/{student_id}", response_model=TranscriptProcessResponse)
async def upload_transcript(
    student_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> TranscriptProcessResponse:
    """Upload and process student transcript."""
    service = TranscriptService(db)
    
    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )
    
    # Check file type
    allowed_types = ["application/pdf", "text/plain", "application/json"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}"
        )
    
    try:
        return await service.process_transcript(student_id, file)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcript processing failed: {str(e)}"
        )


@router.post("/parse-text/{student_id}", response_model=TranscriptProcessResponse)
async def parse_transcript_text(
    student_id: int,
    transcript_text: str,
    db: AsyncSession = Depends(get_db),
) -> TranscriptProcessResponse:
    """Parse transcript from raw text."""
    service = TranscriptService(db)
    
    if not transcript_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Empty transcript text provided"
        )
    
    try:
        return await service.process_transcript_text(student_id, transcript_text)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcript processing failed: {str(e)}"
        )


@router.get("/processing-status/{student_id}")
async def get_processing_status(
    student_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, any]:
    """Get transcript processing status for student."""
    service = TranscriptService(db)
    
    return await service.get_processing_status(student_id)