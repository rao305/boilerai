def route_to_handler(intent: str, question: str) -> str:
    if intent == "planner_query": return "planner"
    if intent == "course_facts": return "t2sql"
    return "unknown"