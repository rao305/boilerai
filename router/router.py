def route_to_handler(intent: str, question: str) -> str:
    """Route intent to appropriate handler service."""
    # Legacy intent mapping for backward compatibility
    if intent == "planner_query": return "planner"
    if intent == "course_facts": return "t2sql"
    if intent == "general_chat": return "general_chat"
    
    # New RAG-ON intent routing
    if intent == "facts_sql": return "t2sql"
    if intent == "plan_schedule": return "planner"
    if intent == "describe_course": return "rag"
    if intent == "policy": return "rag"
    if intent == "track_rules": return "rag"
    if intent == "what_if": return "advisor"
    if intent == "upload_transcript": return "transcript"
    if intent == "general_explain": return "advisor"
    
    return "advisor"  # Default to advisor for unknown intents

def route_with_context(question: str, profile_data: dict = None) -> str:
    """
    Enhanced routing with SmartCourse-inspired contextual intelligence.
    
    Uses student context (transcript + degree plan) to make intelligent
    routing decisions for optimal recommendation quality.
    """
    try:
        from .contextual_router import contextual_router, create_student_context_from_profile, ContextMode
        
        if profile_data:
            # Create rich student context
            student_context = create_student_context_from_profile(profile_data)
            
            # Get intelligent routing decision
            routing_decision = contextual_router.route_query(question, student_context)
            
            # Map contextual decisions to handler services
            handler_mapping = {
                "personalized_advisor": "advisor",
                "plan_focused": "planner", 
                "transcript_aware": "advisor",
                "generic_advisor": "advisor",
                "t2sql": "t2sql",
                "planner": "planner",
                "rag": "rag"
            }
            
            return handler_mapping.get(routing_decision.handler, "advisor")
        
        else:
            # Fallback to simple intent-based routing
            # This will be determined by the existing intent classification
            return "advisor"  # Default when no context available
            
    except Exception as e:
        # Graceful fallback to original routing if contextual routing fails
        import logging
        logging.warning(f"Contextual routing failed, falling back to simple routing: {e}")
        return "advisor"