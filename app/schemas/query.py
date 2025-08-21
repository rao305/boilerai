"""Query-related Pydantic schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Natural language query request."""
    
    query: str = Field(..., min_length=1, max_length=500, description="Natural language query")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional query context")
    max_results: Optional[int] = Field(default=100, ge=1, le=1000, description="Maximum results to return")
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "query": "Show me all CS courses offered in Fall 2024",
                    "max_results": 50
                },
                {
                    "query": "What are the prerequisites for CS240?",
                    "context": {"student_track": "systems"}
                }
            ]
        }
    }


class QueryResponse(BaseModel):
    """Query execution response."""
    
    status: str = Field(..., description="Query execution status")
    query: str = Field(..., description="Original natural language query")
    sql: Optional[str] = Field(None, description="Generated SQL query")
    ast: Optional[Dict[str, Any]] = Field(None, description="JSON AST representation")
    results: List[Dict[str, Any]] = Field(default_factory=list, description="Query results")
    result_count: int = Field(default=0, description="Number of results returned")
    execution_time_ms: Optional[float] = Field(None, description="Query execution time in milliseconds")
    
    # Error information
    error: Optional[str] = Field(None, description="Error message if query failed")
    error_type: Optional[str] = Field(None, description="Error type classification")
    
    # Query explanation
    explanation: Optional[str] = Field(None, description="Human-readable explanation of the query")
    suggestions: Optional[List[str]] = Field(None, description="Query improvement suggestions")
    
    model_config = {"from_attributes": True}