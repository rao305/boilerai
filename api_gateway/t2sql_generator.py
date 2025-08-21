"""
Text-to-SQL Generator using LLM with fallback patterns
"""

import json
import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from .llm_client import llm_client

logger = logging.getLogger(__name__)

# Course ID normalization regex
COURSE_ID_REGEX = r"(CS|MA|STAT|ECE|EE)\s?-?\s?\d{3,5}0?"

def normalize_course_id(text: str) -> Optional[str]:
    """Normalize course ID like 'CS 240' -> 'CS24000'"""
    match = re.search(COURSE_ID_REGEX, text, flags=re.I)
    if not match:
        return None
    
    core = re.sub(r"\s|-", "", match.group(0).upper())
    if re.fullmatch(r"[A-Z]{2,4}\d{5}", core):
        return core
    
    # Extract parts and pad number to 5 digits
    num_part = re.sub(r"\D", "", core)
    prefix_part = re.sub(r"\d", "", core)
    
    if len(num_part) == 3:
        num_part = num_part + "00"
    elif len(num_part) == 4:
        num_part = num_part + "0"
    
    return f"{prefix_part}{num_part}"

class T2SQLGenerator:
    """Generate SQL AST from natural language using LLM with fallbacks"""
    
    def __init__(self):
        self.system_prompt = self._build_system_prompt()
        self.few_shot_examples = self._build_few_shot_examples()
    
    def _build_system_prompt(self) -> str:
        """Build system prompt for T2SQL conversion"""
        return """You are a text-to-SQL converter for a Purdue CS academic database. Convert natural language questions into a JSON AST for read-only SQL queries.

IMPORTANT RULES:
1. ONLY return valid JSON - no explanations, no code fences, no comments
2. Only SELECT queries allowed (read-only)
3. Normalize course IDs: 'CS 240' -> 'CS24000', 'CS 381' -> 'CS38100'
4. Use parameterized values for security

SCHEMA (whitelisted tables only):
- courses: id, title, credits, description, prerequisites
- course_details: course_id, description, attribute, outcomes
- prereqs: major_id, dst_course, kind, expr, min_grade
- tracks: id, name (machine_intelligence, software_engineering)
- track_groups: track_id, key, need, course_list

QUERY PATTERNS:
- "tell me about [course]" -> SELECT from courses + course_details
- "prerequisites for [course]" -> SELECT from prereqs WHERE dst_course
- "MI electives" -> SELECT from track_groups WHERE track_id='machine_intelligence' AND key='mi_electives'

JSON AST FORMAT:
{
  "select": ["field1", "field2"],
  "from": "table_name",
  "joins": [{"table": "table2", "on": "condition", "type": "left"}],
  "where": [{"op": "=", "left": "field", "right": {"value": "literal"}}],
  "group_by": [],
  "order_by": [],
  "limit": 100,
  "params": {"param_name": "param_value"}
}

For WHERE conditions:
- Literals: {"value": "CS24000"}
- Parameters: {"param": "course_id"}
- Operators: "=", "!=", "<", ">", "<=", ">=", "IN", "LIKE"

EXAMPLES:
Q: "prerequisites for CS381"
A: {"select":["p.kind","p.expr","p.min_grade"],"from":"prereqs p","joins":[],"where":[{"op":"=","left":"p.major_id","right":{"value":"CS"}},{"op":"=","left":"p.dst_course","right":{"param":"course_id"}}],"group_by":[],"order_by":[],"limit":100,"params":{"course_id":"CS38100"}}

Q: "tell me about CS 473"
A: {"select":["c.id","c.title","c.credits","cd.description","cd.attribute"],"from":"courses c","joins":[{"table":"course_details cd","on":"cd.course_id = c.id","type":"left"}],"where":[{"op":"=","left":"c.id","right":{"param":"course_id"}}],"group_by":[],"order_by":[],"limit":1,"params":{"course_id":"CS47300"}}

Return ONLY the JSON AST, nothing else."""
    
    def _build_few_shot_examples(self) -> List[Tuple[str, Dict[str, Any]]]:
        """Few-shot examples for better LLM performance"""
        return [
            ("prerequisites for cs381", {
                "select": ["p.kind", "p.expr", "p.min_grade"],
                "from": "prereqs p",
                "joins": [],
                "where": [
                    {"op": "=", "left": "p.major_id", "right": {"value": "CS"}},
                    {"op": "=", "left": "p.dst_course", "right": {"param": "course_id"}}
                ],
                "group_by": [],
                "order_by": [],
                "limit": 100,
                "params": {"course_id": "CS38100"}
            }),
            ("tell me about CS 473", {
                "select": ["c.id", "c.title", "c.credits", "cd.description", "cd.attribute"],
                "from": "courses c",
                "joins": [{"table": "course_details cd", "on": "cd.course_id = c.id", "type": "left"}],
                "where": [{"op": "=", "left": "c.id", "right": {"param": "course_id"}}],
                "group_by": [],
                "order_by": [],
                "limit": 1,
                "params": {"course_id": "CS47300"}
            }),
            ("what are MI electives", {
                "select": ["tg.key", "tg.need", "tg.course_list"],
                "from": "track_groups tg",
                "joins": [{"table": "tracks t", "on": "t.id = tg.track_id", "type": "inner"}],
                "where": [
                    {"op": "=", "left": "t.id", "right": {"value": "machine_intelligence"}},
                    {"op": "=", "left": "tg.key", "right": {"value": "mi_electives"}}
                ],
                "group_by": [],
                "order_by": [],
                "limit": 1,
                "params": {}
            })
        ]
    
    def _fallback_ast(self, question: str) -> Optional[Dict[str, Any]]:
        """Generate AST using pattern matching fallback"""
        q = question.lower()
        course_id = normalize_course_id(question)
        
        # Prerequisites pattern
        if "prereq" in q and course_id:
            return {
                "select": ["p.kind", "p.expr", "p.min_grade"],
                "from": "prereqs p",
                "joins": [],
                "where": [
                    {"op": "=", "left": "p.major_id", "right": {"value": "CS"}},
                    {"op": "=", "left": "p.dst_course", "right": {"param": "course_id"}}
                ],
                "group_by": [],
                "order_by": [],
                "limit": 100,
                "params": {"course_id": course_id}
            }
        
        # Course information pattern
        if ("tell me about" in q or "description" in q or "more about" in q) and course_id:
            return {
                "select": ["c.id", "c.title", "c.credits", "cd.description", "cd.attribute"],
                "from": "courses c",
                "joins": [{"table": "course_details cd", "on": "cd.course_id = c.id", "type": "left"}],
                "where": [{"op": "=", "left": "c.id", "right": {"param": "course_id"}}],
                "group_by": [],
                "order_by": [],
                "limit": 1,
                "params": {"course_id": course_id}
            }
        
        # MI electives pattern
        if "mi electives" in q or ("electives" in q and "machine" in q):
            return {
                "select": ["tg.key", "tg.need", "tg.course_list"],
                "from": "track_groups tg",
                "joins": [{"table": "tracks t", "on": "t.id = tg.track_id", "type": "inner"}],
                "where": [
                    {"op": "=", "left": "t.id", "right": {"value": "machine_intelligence"}},
                    {"op": "=", "left": "tg.key", "right": {"value": "mi_electives"}}
                ],
                "group_by": [],
                "order_by": [],
                "limit": 1,
                "params": {}
            }
        
        # Software Engineering electives pattern
        if "se electives" in q or ("electives" in q and "software" in q):
            return {
                "select": ["tg.key", "tg.need", "tg.course_list"],
                "from": "track_groups tg",
                "joins": [{"table": "tracks t", "on": "t.id = tg.track_id", "type": "inner"}],
                "where": [
                    {"op": "=", "left": "t.id", "right": {"value": "software_engineering"}},
                    {"op": "=", "left": "tg.key", "right": {"value": "se_electives"}}
                ],
                "group_by": [],
                "order_by": [],
                "limit": 1,
                "params": {}
            }
        
        return None
    
    async def generate_ast(
        self,
        question: str,
        provider: str = "gemini",
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate SQL AST from natural language question
        
        Args:
            question: Natural language query
            provider: LLM provider ('gemini' or 'openai')
            api_key: User's API key
            model: Specific model to use
            
        Returns:
            Dict containing the SQL AST
        """
        try:
            # First try LLM if API key is provided
            if api_key and provider:
                logger.info(f"Generating AST using {provider} for: {question[:50]}...")
                
                # Prepare few-shot examples string
                examples_str = ""
                for user_q, ast_response in self.few_shot_examples:
                    examples_str += f"\nQ: {user_q}\nA: {json.dumps(ast_response, separators=(',', ':'))}\n"
                
                enhanced_prompt = f"{self.system_prompt}\n\nFEW-SHOT EXAMPLES:{examples_str}"
                
                response = await llm_client.call_llm(
                    provider=provider,
                    api_key=api_key,
                    system_prompt=enhanced_prompt,
                    user_message=question,
                    model=model,
                    temperature=0.1,  # Low temperature for consistent JSON
                    max_tokens=800
                )
                
                if response.success:
                    try:
                        ast = json.loads(response.content)
                        logger.info(f"LLM AST generated successfully using {response.model}")
                        return ast
                    except json.JSONDecodeError as e:
                        logger.warning(f"LLM returned invalid JSON: {e}")
                        # Fall through to fallback
                else:
                    logger.warning(f"LLM call failed: {response.error}")
                    # Fall through to fallback
            
            # Try fallback pattern matching
            logger.info("Attempting fallback pattern matching...")
            fallback_ast = self._fallback_ast(question)
            if fallback_ast:
                logger.info("Fallback AST generated successfully")
                return fallback_ast
            
            # Last resort: error response
            logger.error("No AST generation method succeeded")
            raise ValueError("Unable to generate AST: no LLM key provided and no fallback pattern matched")
            
        except Exception as e:
            logger.error(f"AST generation failed: {e}")
            raise

# Global instance
t2sql_generator = T2SQLGenerator()