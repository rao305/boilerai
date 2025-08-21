"""
Natural language query endpoints (text-to-SQL).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_service import QueryService

router = APIRouter()


@router.post("/", response_model=QueryResponse)
async def execute_query(
    query_request: QueryRequest,
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    """Execute natural language query using constrained text-to-SQL."""
    service = QueryService(db)
    
    try:
        return await service.execute_natural_language_query(query_request)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query execution failed: {str(e)}"
        )


@router.get("/suggestions")
async def get_query_suggestions() -> dict[str, list[str]]:
    """Get example queries and suggestions."""
    return {
        "examples": [
            "Show me all CS courses offered in Fall 2024",
            "What are the prerequisites for CS240?",
            "List all 400-level CS courses",
            "Show courses in the systems track",
            "What courses satisfy the algorithms requirement?",
        ],
        "categories": [
            "Course Information",
            "Prerequisites", 
            "Requirements",
            "Offerings",
            "Academic Planning"
        ]
    }


@router.get("/schema")
async def get_query_schema() -> dict[str, any]:
    """Get available schema information for queries."""
    service = QueryService(None)  # No DB needed for schema info
    return service.get_queryable_schema()