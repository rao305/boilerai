COURSE_ID_REGEX = r"(CS|MA|STAT|ECE|EE)\s?-?\s?\d{3,5}0?"
SYSTEM_T2SQL = """You convert natural-language questions about degree and courses
into a JSON AST for a read-only SQL query using a whitelisted schema.
Constraints:
- SELECT-only, parameterized literals.
- Resolve course IDs like 'CS 240' -> 'CS24000' (assume alias exists if needed).
- 'tell me about <course>' => join courses + course_details (+ outcomes).
- 'prereqs for <course>' => select kind, expr, min_grade from prereqs.
- If a query needs unstructured prose, do NOT answer (RAG disabled).
Return ONLY a JSON object."""
FEWSHOTS = [
  ("prereqs for cs381", {
     "select": ["p.kind","p.expr","p.min_grade"],
     "from": "prereqs p","joins": [],
     "where":[{"op":"=","left":"p.major_id","right":{"value":"CS"}},
              {"op":"=","left":"p.dst_course","right":{"param":"course_id"}}],
     "group_by": [], "order_by": [], "limit": 100,
     "params":{"course_id":"CS38100"}
  }),
  ("tell me about CS 473", {
     "select":["c.id","c.title","c.credits","cd.description","cd.attribute"],
     "from":"courses c",
     "joins":[{"table":"course_details cd","on":"cd.course_id = c.id","type":"left"}],
     "where":[{"op":"=","left":"c.id","right":{"param":"course_id"}}],
     "group_by": [], "order_by": [], "limit": 1,
     "params":{"course_id":"CS47300"}
  }),
]