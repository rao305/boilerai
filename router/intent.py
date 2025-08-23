"""
Enhanced intent classification for RAG-ON system.
"""

import re
from typing import List, Dict, Any, Set

def classify_intent(query: str) -> Dict[str, Any]:
    """
    Classify user query into intents for routing.
    Multiple intents can be active simultaneously.
    """
    
    query_lower = query.lower()
    active_intents = set()
    
    # SQL/facts intent - specific factual questions
    sql_patterns = [
        r'\b(prerequisite|prereq|when offered|credits|grade requirement)\b',
        r'\b(how many credits|list courses|show requirements)\b',
        r'\bcs\d{3,5}\b.*\b(prereq|credits|offered)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in sql_patterns):
        active_intents.add('facts_sql')
    
    # Planning intent - scheduling and sequencing
    plan_patterns = [
        r'\b(plan|schedule|when should|next semester|graduation timeline)\b',
        r'\b(take next|course order|sequence|roadmap)\b',
        r'\b(plan.*for|schedule.*courses)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in plan_patterns):
        active_intents.add('plan_schedule')
    
    # Course description - detailed course info
    course_patterns = [
        r'\b(tell me about|what is|describe)\b.*\bcs\d{3,5}\b',
        r'\bcs\d{3,5}\b.*\b(content|covers|learn|topics|about)\b',
        r'\b(course description|what.*covers|content of)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in course_patterns):
        active_intents.add('describe_course')
    
    # Policy questions - academic policies
    policy_patterns = [
        r'\b(policy|rule|regulation|allowed|permitted)\b',
        r'\b(drop|withdraw|retake|overload|repeat)\b',
        r'\b(grade policy|academic.*policy)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in policy_patterns):
        active_intents.add('policy')
    
    # Track rules - MI/SE specific info
    track_patterns = [
        r'\b(track|concentration|mi|se|machine intelligence|software engineering)\b',
        r'\b(declare.*track|choose.*track|track requirements)\b',
        r'\b(mi.*requirement|se.*requirement)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in track_patterns):
        active_intents.add('track_rules')
    
    # What-if scenarios - hypothetical planning
    whatif_patterns = [
        r'\b(what if|if i|suppose|assume|hypothetically)\b',
        r'\b(instead of|alternative|different path)\b',
        r'\b(change.*to|switch.*to)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in whatif_patterns):
        active_intents.add('what_if')
    
    # Transcript upload - document processing
    transcript_patterns = [
        r'\b(upload|transcript|import|add courses|parse)\b',
        r'\b(my transcript|course history)\b'
    ]
    if any(re.search(pattern, query_lower) for pattern in transcript_patterns):
        active_intents.add('upload_transcript')
    
    # Default to general explanation if no specific intent
    if not active_intents:
        active_intents.add('general_explain')
    
    # Calculate confidence based on pattern specificity
    confidence = 0.9 if len(active_intents) == 1 else 0.7
    primary_intent = list(active_intents)[0] if active_intents else 'general_explain'
    
    return {
        'intents': list(active_intents),
        'primary': primary_intent,
        'confidence': confidence,
        'requires_sql': 'facts_sql' in active_intents,
        'requires_planning': 'plan_schedule' in active_intents or 'what_if' in active_intents,
        'requires_rag': 'describe_course' in active_intents or 'policy' in active_intents or 'track_rules' in active_intents or 'general_explain' in active_intents
    }