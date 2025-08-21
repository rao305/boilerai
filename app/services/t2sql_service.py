"""
Constrained text-to-SQL compiler with JSON AST and whitelist validation.
"""

import json
import re
from typing import Any, Dict, List, Optional, Set
from enum import Enum

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import get_logger

logger = get_logger(__name__)


class QueryType(str, Enum):
    """Allowed query types."""
    SELECT = "select"


class JoinType(str, Enum):
    """Allowed join types."""
    INNER = "inner"
    LEFT = "left"


class Operator(str, Enum):
    """Allowed comparison operators."""
    EQ = "="
    NE = "!="
    LT = "<"
    LE = "<="
    GT = ">"
    GE = ">="
    IN = "IN"
    LIKE = "LIKE"
    ILIKE = "ILIKE"


class SQLASTNode:
    """Base class for SQL AST nodes."""
    pass


class SelectNode(SQLASTNode):
    """SELECT query AST node."""
    
    def __init__(
        self,
        select_fields: List[str],
        from_table: str,
        joins: Optional[List[Dict[str, Any]]] = None,
        where_conditions: Optional[List[Dict[str, Any]]] = None,
        order_by: Optional[List[Dict[str, Any]]] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ):
        self.select_fields = select_fields
        self.from_table = from_table
        self.joins = joins or []
        self.where_conditions = where_conditions or []
        self.order_by = order_by or []
        self.limit = limit
        self.offset = offset


class ConstrainedT2SQLCompiler:
    """
    Constrained text-to-SQL compiler with security validation.
    
    Security Features:
    1. JSON AST intermediate representation
    2. Whitelist validation for all components
    3. Read-only SELECT queries only
    4. Schema validation
    5. Complexity limits
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.schema_info = {}
        self.query_whitelist = self._load_query_whitelist()
        self._initialize_schema()
    
    def _load_query_whitelist(self) -> Dict[str, Any]:
        """Load approved query patterns from configuration."""
        # In production, this would load from a JSON file
        return {
            "allowed_tables": {
                "courses": {
                    "alias": ["c", "course"],
                    "fields": ["id", "code", "title", "description", "credit_hours", 
                             "department", "level", "is_lab", "is_seminar", "is_capstone",
                             "catalog_year", "is_active"]
                },
                "course_offerings": {
                    "alias": ["co", "offering"],
                    "fields": ["id", "course_id", "semester", "year", "season",
                             "instructor", "capacity", "enrolled", "is_available"]
                },
                "prerequisites": {
                    "alias": ["p", "prereq"],
                    "fields": ["id", "course_id", "prerequisite_course_id",
                             "prerequisite_type", "min_grade", "is_active"]
                },
                "majors": {
                    "alias": ["m", "major"],
                    "fields": ["id", "code", "name", "department", "degree_type", "is_active"]
                },
                "tracks": {
                    "alias": ["t", "track"],
                    "fields": ["id", "major_id", "code", "name", "is_active"]
                },
                "requirements": {
                    "alias": ["r", "req"],
                    "fields": ["id", "track_group_id", "requirement_type", "description", "is_active"]
                }
            },
            "allowed_joins": [
                {"from": "courses", "to": "course_offerings", "on": "courses.id = course_offerings.course_id"},
                {"from": "courses", "to": "prerequisites", "on": "courses.id = prerequisites.course_id"},
                {"from": "courses", "to": "prerequisites", "on": "courses.id = prerequisites.prerequisite_course_id"},
                {"from": "majors", "to": "tracks", "on": "majors.id = tracks.major_id"},
                {"from": "tracks", "to": "track_groups", "on": "tracks.id = track_groups.track_id"},
                {"from": "track_groups", "to": "requirements", "on": "track_groups.id = requirements.track_group_id"}
            ],
            "allowed_operators": ["=", "!=", "<", "<=", ">", ">=", "IN", "LIKE", "ILIKE"],
            "max_complexity": 100,
            "max_results": 1000
        }
    
    def _initialize_schema(self) -> None:
        """Initialize schema information for validation."""
        whitelist = self.query_whitelist["allowed_tables"]
        
        for table_name, table_info in whitelist.items():
            self.schema_info[table_name] = {
                "fields": set(table_info["fields"]),
                "aliases": set(table_info["alias"])
            }
    
    async def compile_natural_language_query(self, natural_query: str) -> Dict[str, Any]:
        """
        Compile natural language query to SQL.
        
        Process:
        1. Parse natural language to JSON AST
        2. Validate AST against whitelist
        3. Generate SQL from AST
        4. Execute with safety checks
        """
        logger.info("Compiling natural language query", query=natural_query[:100])
        
        try:
            # Step 1: Parse to AST
            ast = await self._parse_to_ast(natural_query)
            
            # Step 2: Validate AST
            self._validate_ast(ast)
            
            # Step 3: Generate SQL
            sql_query = self._ast_to_sql(ast)
            
            # Step 4: Execute query
            results = await self._execute_query(sql_query)
            
            return {
                "status": "success",
                "query": natural_query,
                "ast": ast,
                "sql": sql_query,
                "results": results,
                "result_count": len(results)
            }
            
        except Exception as e:
            logger.error("Query compilation failed", error=str(e), query=natural_query)
            return {
                "status": "error",
                "query": natural_query,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def _parse_to_ast(self, natural_query: str) -> Dict[str, Any]:
        """Parse natural language to JSON AST."""
        # Normalize query
        query = natural_query.lower().strip()
        
        # Pattern matching for common query types
        patterns = [
            self._match_course_catalog_query,
            self._match_prerequisite_query,
            self._match_offering_query,
            self._match_requirement_query,
            self._match_track_query
        ]
        
        for pattern_matcher in patterns:
            ast = pattern_matcher(query)
            if ast:
                return ast
        
        # Fallback: try to extract basic components
        return self._parse_generic_query(query)
    
    def _match_course_catalog_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Match course catalog queries."""
        patterns = [
            r"(?:show|list|get|find)\s+(?:all\s+)?(?:cs|computer science)?\s*courses?",
            r"courses?\s+(?:in|for|from)\s+(\w+)",
            r"(\d+)[-\s]?level\s+courses?",
            r"courses?\s+(?:with|having)\s+(\d+)\s+credits?"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                ast = {
                    "type": "select",
                    "select": ["courses.code", "courses.title", "courses.credit_hours", "courses.description"],
                    "from": "courses",
                    "joins": [],
                    "where": [{"field": "courses.is_active", "operator": "=", "value": True}]
                }
                
                # Add specific filters based on pattern
                if "cs" in query or "computer science" in query:
                    ast["where"].append({"field": "courses.department", "operator": "=", "value": "CS"})
                
                if match.groups():
                    group = match.group(1)
                    if group.isdigit():
                        level = int(group)
                        if 100 <= level <= 900:
                            ast["where"].append({"field": "courses.level", "operator": "=", "value": level})
                    elif group.upper() in ["CS", "COMPUTER", "SCIENCE"]:
                        ast["where"].append({"field": "courses.department", "operator": "=", "value": "CS"})
                
                return ast
        
        return None
    
    def _match_prerequisite_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Match prerequisite queries."""
        patterns = [
            r"(?:prerequisites?|prereqs?)\s+(?:for|of)\s+([A-Z]{2,4}\s*\d{3})",
            r"what\s+(?:are\s+)?(?:the\s+)?(?:prerequisites?|prereqs?)\s+(?:for|of)\s+([A-Z]{2,4}\s*\d{3})",
            r"([A-Z]{2,4}\s*\d{3})\s+(?:prerequisites?|prereqs?)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                course_code = re.sub(r'\s+', '', match.group(1).upper())
                
                return {
                    "type": "select",
                    "select": ["prereq_course.code", "prereq_course.title", "p.prerequisite_type", "p.min_grade"],
                    "from": "prerequisites p",
                    "joins": [
                        {
                            "type": "inner",
                            "table": "courses",
                            "alias": "c",
                            "on": "p.course_id = c.id"
                        },
                        {
                            "type": "inner", 
                            "table": "courses",
                            "alias": "prereq_course",
                            "on": "p.prerequisite_course_id = prereq_course.id"
                        }
                    ],
                    "where": [
                        {"field": "c.code", "operator": "=", "value": course_code},
                        {"field": "p.is_active", "operator": "=", "value": True}
                    ]
                }
        
        return None
    
    def _match_offering_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Match course offering queries."""
        patterns = [
            r"(?:courses?|offerings?)\s+(?:offered|available)\s+(?:in|for|during)\s+(fall|spring|summer)\s+(\d{4})",
            r"(fall|spring|summer)\s+(\d{4})\s+(?:courses?|offerings?)",
            r"when\s+is\s+([A-Z]{2,4}\s*\d{3})\s+(?:offered|available)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                groups = match.groups()
                
                ast = {
                    "type": "select",
                    "select": ["c.code", "c.title", "co.semester", "co.instructor", "co.capacity", "co.enrolled"],
                    "from": "course_offerings co",
                    "joins": [
                        {
                            "type": "inner",
                            "table": "courses",
                            "alias": "c", 
                            "on": "co.course_id = c.id"
                        }
                    ],
                    "where": [
                        {"field": "co.is_available", "operator": "=", "value": True}
                    ]
                }
                
                if len(groups) >= 2 and groups[0] and groups[1]:
                    season = groups[0].title()
                    year = int(groups[1])
                    ast["where"].extend([
                        {"field": "co.season", "operator": "=", "value": season},
                        {"field": "co.year", "operator": "=", "value": year}
                    ])
                elif len(groups) == 1 and re.match(r'[A-Z]{2,4}\s*\d{3}', groups[0]):
                    course_code = re.sub(r'\s+', '', groups[0].upper())
                    ast["where"].append({"field": "c.code", "operator": "=", "value": course_code})
                
                return ast
        
        return None
    
    def _match_requirement_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Match graduation requirement queries."""
        patterns = [
            r"(?:requirements?|reqs?)\s+(?:for|in)\s+(systems?|ai|artificial\s+intelligence)",
            r"(systems?|ai|artificial\s+intelligence)\s+(?:track\s+)?(?:requirements?|reqs?)",
            r"what\s+(?:are\s+)?(?:the\s+)?(?:requirements?|reqs?)"
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                ast = {
                    "type": "select",
                    "select": ["r.description", "tg.name", "r.requirement_type"],
                    "from": "requirements r",
                    "joins": [
                        {
                            "type": "inner",
                            "table": "track_groups",
                            "alias": "tg",
                            "on": "r.track_group_id = tg.id"
                        },
                        {
                            "type": "inner",
                            "table": "tracks",
                            "alias": "t",
                            "on": "tg.track_id = t.id"
                        }
                    ],
                    "where": [
                        {"field": "r.is_active", "operator": "=", "value": True}
                    ]
                }
                
                if match.groups():
                    track_type = match.group(1).lower()
                    if "ai" in track_type or "artificial" in track_type:
                        ast["where"].append({"field": "t.code", "operator": "=", "value": "AI"})
                    elif "system" in track_type:
                        ast["where"].append({"field": "t.code", "operator": "=", "value": "SYSTEMS"})
                
                return ast
        
        return None
    
    def _match_track_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Match track/major queries."""
        patterns = [
            r"(?:tracks?|majors?|programs?)\s+(?:in|for|available)",
            r"(?:available|all)\s+(?:tracks?|majors?|programs?)",
            r"computer\s+science\s+(?:tracks?|majors?|programs?)"
        ]
        
        for pattern in patterns:
            if re.search(pattern, query):
                return {
                    "type": "select",
                    "select": ["m.name", "t.name", "t.code", "m.degree_type"],
                    "from": "tracks t",
                    "joins": [
                        {
                            "type": "inner",
                            "table": "majors",
                            "alias": "m",
                            "on": "t.major_id = m.id"
                        }
                    ],
                    "where": [
                        {"field": "t.is_active", "operator": "=", "value": True},
                        {"field": "m.is_active", "operator": "=", "value": True}
                    ]
                }
        
        return None
    
    def _parse_generic_query(self, query: str) -> Dict[str, Any]:
        """Parse generic query as fallback."""
        # Basic SELECT from courses as default
        return {
            "type": "select",
            "select": ["courses.code", "courses.title"],
            "from": "courses",
            "joins": [],
            "where": [
                {"field": "courses.is_active", "operator": "=", "value": True}
            ],
            "limit": 10
        }
    
    def _validate_ast(self, ast: Dict[str, Any]) -> None:
        """Validate AST against whitelist and security rules."""
        # Check query type
        if ast.get("type") != "select":
            raise PermissionError("Only SELECT queries are allowed")
        
        # Validate tables
        main_table = ast.get("from", "").split()[0]  # Remove alias
        if main_table not in self.query_whitelist["allowed_tables"]:
            raise PermissionError(f"Table '{main_table}' not in whitelist")
        
        # Validate SELECT fields
        for field in ast.get("select", []):
            self._validate_field(field)
        
        # Validate JOINs
        for join in ast.get("joins", []):
            self._validate_join(join)
        
        # Validate WHERE conditions
        for condition in ast.get("where", []):
            self._validate_condition(condition)
        
        # Check complexity
        complexity = self._calculate_complexity(ast)
        if complexity > self.query_whitelist["max_complexity"]:
            raise PermissionError(f"Query complexity {complexity} exceeds limit")
    
    def _validate_field(self, field: str) -> None:
        """Validate field reference."""
        if "." in field:
            table_part, field_part = field.split(".", 1)
            table_name = self._resolve_table_name(table_part)
            
            if table_name not in self.schema_info:
                raise PermissionError(f"Unknown table: {table_name}")
            
            if field_part not in self.schema_info[table_name]["fields"]:
                raise PermissionError(f"Unknown field: {field}")
    
    def _validate_join(self, join: Dict[str, Any]) -> None:
        """Validate JOIN clause."""
        if join.get("type") not in ["inner", "left"]:
            raise PermissionError(f"Join type '{join.get('type')}' not allowed")
        
        table = join.get("table")
        if table not in self.query_whitelist["allowed_tables"]:
            raise PermissionError(f"Join table '{table}' not in whitelist")
    
    def _validate_condition(self, condition: Dict[str, Any]) -> None:
        """Validate WHERE condition."""
        operator = condition.get("operator")
        if operator not in self.query_whitelist["allowed_operators"]:
            raise PermissionError(f"Operator '{operator}' not allowed")
        
        field = condition.get("field")
        if field:
            self._validate_field(field)
    
    def _resolve_table_name(self, table_ref: str) -> str:
        """Resolve table name from reference (handle aliases)."""
        for table_name, table_info in self.query_whitelist["allowed_tables"].items():
            if table_ref == table_name or table_ref in table_info["alias"]:
                return table_name
        return table_ref
    
    def _calculate_complexity(self, ast: Dict[str, Any]) -> int:
        """Calculate query complexity score."""
        complexity = 0
        complexity += len(ast.get("select", []))  # SELECT fields
        complexity += len(ast.get("joins", [])) * 5  # JOINs are expensive
        complexity += len(ast.get("where", []))  # WHERE conditions
        return complexity
    
    def _ast_to_sql(self, ast: Dict[str, Any]) -> str:
        """Convert AST to SQL string."""
        parts = []
        
        # SELECT clause
        select_fields = ", ".join(ast.get("select", ["*"]))
        parts.append(f"SELECT {select_fields}")
        
        # FROM clause
        from_clause = ast.get("from")
        parts.append(f"FROM {from_clause}")
        
        # JOIN clauses
        for join in ast.get("joins", []):
            join_type = join.get("type", "inner").upper()
            table = join.get("table")
            alias = join.get("alias", "")
            on_condition = join.get("on")
            
            join_clause = f"{join_type} JOIN {table}"
            if alias:
                join_clause += f" {alias}"
            if on_condition:
                join_clause += f" ON {on_condition}"
            
            parts.append(join_clause)
        
        # WHERE clause
        where_conditions = []
        for condition in ast.get("where", []):
            field = condition.get("field")
            operator = condition.get("operator")
            value = condition.get("value")
            
            if isinstance(value, str):
                condition_sql = f"{field} {operator} '{value}'"
            elif isinstance(value, bool):
                condition_sql = f"{field} {operator} {str(value).lower()}"
            else:
                condition_sql = f"{field} {operator} {value}"
            
            where_conditions.append(condition_sql)
        
        if where_conditions:
            parts.append(f"WHERE {' AND '.join(where_conditions)}")
        
        # ORDER BY clause
        if ast.get("order_by"):
            order_fields = [f"{item['field']} {item.get('direction', 'ASC')}" 
                           for item in ast["order_by"]]
            parts.append(f"ORDER BY {', '.join(order_fields)}")
        
        # LIMIT clause
        if ast.get("limit"):
            limit_value = min(ast["limit"], self.query_whitelist["max_results"])
            parts.append(f"LIMIT {limit_value}")
        
        return " ".join(parts)
    
    async def _execute_query(self, sql_query: str) -> List[Dict[str, Any]]:
        """Execute SQL query with safety checks."""
        # Final safety check - ensure read-only
        if not self._is_read_only(sql_query):
            raise PermissionError("Only read-only queries allowed")
        
        try:
            result = await self.db.execute(text(sql_query))
            rows = result.fetchall()
            
            # Convert to list of dicts
            if rows:
                columns = result.keys()
                return [dict(zip(columns, row)) for row in rows]
            else:
                return []
                
        except Exception as e:
            logger.error("Query execution failed", sql=sql_query, error=str(e))
            raise RuntimeError(f"Query execution failed: {str(e)}")
    
    def _is_read_only(self, sql_query: str) -> bool:
        """Verify query is read-only."""
        sql_upper = sql_query.upper().strip()
        
        # Must start with SELECT
        if not sql_upper.startswith("SELECT"):
            return False
        
        # Must not contain dangerous keywords
        dangerous_keywords = [
            "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
            "TRUNCATE", "EXECUTE", "EXEC", "CALL", "MERGE", "REPLACE"
        ]
        
        for keyword in dangerous_keywords:
            if keyword in sql_upper:
                return False
        
        return True
    
    def get_queryable_schema(self) -> Dict[str, Any]:
        """Get schema information for query building."""
        return {
            "tables": {
                table_name: {
                    "fields": list(self.schema_info[table_name]["fields"]),
                    "description": self._get_table_description(table_name)
                }
                for table_name in self.schema_info.keys()
            },
            "example_queries": [
                "Show me all CS courses",
                "What are the prerequisites for CS240?",
                "List courses offered in Fall 2024",
                "Show systems track requirements",
                "Find 400-level CS courses"
            ],
            "operators": self.query_whitelist["allowed_operators"],
            "max_results": self.query_whitelist["max_results"]
        }
    
    def _get_table_description(self, table_name: str) -> str:
        """Get human-readable table description."""
        descriptions = {
            "courses": "Course catalog with course codes, titles, and details",
            "course_offerings": "Semester-specific course offerings and enrollment",
            "prerequisites": "Course prerequisite relationships",
            "majors": "Academic majors and degree programs",
            "tracks": "Specialization tracks within majors",
            "requirements": "Graduation requirements for tracks"
        }
        return descriptions.get(table_name, f"Table: {table_name}")