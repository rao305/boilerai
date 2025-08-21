import re
KEYWORDS_PLANNER = r"(plan|schedule|semester|term|graduate|finish by|target.*term|what if|switch track)"
KEYWORDS_SQL = r"(prereq|prerequisite|credits?|offered|term pattern|tell me about|description|outcomes?|campus|schedule types?|track|electives?)"

def classify_intent(q: str) -> str:
    s = q.lower()
    if re.search(KEYWORDS_PLANNER, s): return "planner_query"
    if re.search(KEYWORDS_SQL, s): return "course_facts"
    return "course_facts"