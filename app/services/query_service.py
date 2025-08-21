"""
Query service implementing the constrained text-to-SQL functionality.
"""

import time
from typing import Any, Dict

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import get_logger
from app.schemas.query import QueryRequest, QueryResponse
from app.services.t2sql_service import ConstrainedT2SQLCompiler

logger = get_logger(__name__)


class QueryService:
    """Service for processing natural language queries."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.compiler = ConstrainedT2SQLCompiler(db) if db else None
    
    async def execute_natural_language_query(self, query_request: QueryRequest) -> QueryResponse:
        """Execute natural language query using constrained compiler."""
        start_time = time.time()
        
        logger.info(
            "Processing natural language query",
            query=query_request.query,
            max_results=query_request.max_results
        )
        
        try:
            if not self.compiler:
                raise RuntimeError("Query compiler not available")
            
            # Compile and execute query
            result = await self.compiler.compile_natural_language_query(query_request.query)
            
            # Calculate execution time
            execution_time = (time.time() - start_time) * 1000
            
            if result["status"] == "success":
                # Limit results if requested
                results = result["results"]
                if query_request.max_results and len(results) > query_request.max_results:
                    results = results[:query_request.max_results]
                
                # Generate explanation
                explanation = self._generate_explanation(result["ast"], len(results))
                
                response = QueryResponse(
                    status="success",
                    query=query_request.query,
                    sql=result["sql"],
                    ast=result["ast"],
                    results=results,
                    result_count=len(results),
                    execution_time_ms=execution_time,
                    explanation=explanation
                )
                
                logger.info(
                    "Query executed successfully",
                    query=query_request.query,
                    result_count=len(results),
                    execution_time_ms=execution_time
                )
                
                return response
            else:
                # Handle compilation/execution errors
                response = QueryResponse(
                    status="error",
                    query=query_request.query,
                    results=[],
                    result_count=0,
                    execution_time_ms=execution_time,
                    error=result["error"],
                    error_type=result.get("error_type", "UnknownError"),
                    suggestions=self._generate_error_suggestions(result["error"])
                )
                
                logger.warning(
                    "Query execution failed",
                    query=query_request.query,
                    error=result["error"],
                    error_type=result.get("error_type")
                )
                
                return response
                
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            
            logger.error(
                "Query service error",
                query=query_request.query,
                error=str(e),
                exc_info=True
            )
            
            return QueryResponse(
                status="error",
                query=query_request.query,
                results=[],
                result_count=0,
                execution_time_ms=execution_time,
                error=str(e),
                error_type=type(e).__name__,
                suggestions=["Please try rephrasing your query", "Check query syntax and try again"]
            )
    
    def _generate_explanation(self, ast: Dict[str, Any], result_count: int) -> str:
        """Generate human-readable explanation of the query."""
        if not ast:
            return "Query executed successfully"
        
        # Extract key components from AST
        select_fields = ast.get("select", [])
        from_table = ast.get("from", "")
        joins = ast.get("joins", [])
        where_conditions = ast.get("where", [])
        
        # Build explanation
        explanation_parts = []
        
        # What we're selecting
        if len(select_fields) <= 3:
            fields_str = ", ".join(select_fields)
            explanation_parts.append(f"Retrieved {fields_str}")
        else:
            explanation_parts.append(f"Retrieved {len(select_fields)} fields")
        
        # From which tables
        main_table = from_table.split()[0]  # Remove alias
        table_names = [main_table]
        
        for join in joins:
            table_names.append(join.get("table", ""))
        
        if len(table_names) == 1:
            explanation_parts.append(f"from {main_table}")
        else:
            explanation_parts.append(f"from {len(table_names)} related tables")
        
        # Applied filters
        if where_conditions:
            active_filters = [cond for cond in where_conditions if "is_active" not in cond.get("field", "")]
            if active_filters:
                explanation_parts.append(f"with {len(active_filters)} filter(s) applied")
        
        # Result summary
        explanation_parts.append(f"Found {result_count} results")
        
        return " ".join(explanation_parts) + "."
    
    def _generate_error_suggestions(self, error_message: str) -> list[str]:
        """Generate helpful suggestions based on error type."""
        error_lower = error_message.lower()
        suggestions = []
        
        if "not in whitelist" in error_lower or "not allowed" in error_lower:
            suggestions.extend([
                "Try using simpler table and field names",
                "Check available schema using the /query/schema endpoint",
                "Focus on course catalog, prerequisites, or offerings queries"
            ])
        
        elif "syntax" in error_lower or "parse" in error_lower:
            suggestions.extend([
                "Try rephrasing your query in simpler terms",
                "Use common terms like 'courses', 'prerequisites', 'offerings'",
                "Avoid complex sentence structures"
            ])
        
        elif "complexity" in error_lower:
            suggestions.extend([
                "Try breaking your query into smaller parts",
                "Reduce the number of conditions or joins",
                "Use more specific criteria to limit results"
            ])
        
        else:
            suggestions.extend([
                "Please try rephrasing your query",
                "Check the example queries for reference",
                "Use simpler and more direct language"
            ])
        
        return suggestions
    
    def get_queryable_schema(self) -> Dict[str, Any]:
        """Get schema information for query building."""
        if not self.compiler:
            return {
                "error": "Query compiler not available",
                "tables": {},
                "example_queries": []
            }
        
        return self.compiler.get_queryable_schema()