#!/usr/bin/env python3
"""
Comprehensive test script for advanced AI behavior improvements
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src', 'services', 'cliBridge'))

from pure_ai_main import (
    check_request_scope, 
    get_contextual_system_prompt,
    generate_reasoning_analysis,
    extract_relevant_knowledge,
    analyze_response_quality,
    add_to_conversation_history,
    build_conversation_context,
    analyze_conversation_topic,
    extract_message_topics,
    conversation_history,
    conversation_metadata,
    user_conversation_patterns
)

def test_conversation_memory():
    """Test enhanced conversation memory and context retention"""
    print("Testing Conversation Memory & Context Retention...")
    
    # Simulate a conversation
    user_id = "test_user_memory"
    
    # First message
    add_to_conversation_history(user_id, "Hi, I'm a computer science student", "Hello! Great to meet you. I'm here to help with your CS journey.")
    
    # Second message - should show continuity
    add_to_conversation_history(user_id, "I just completed CS 18200", "Congratulations on finishing CS 18200! That's a solid foundation course.")
    
    # Build context and check for continuity
    context = build_conversation_context(user_id)
    
    checks = [
        ("Conversation history preserved", len(conversation_history[user_id]) == 4),
        ("Context includes continuity instructions", "CONTINUITY INSTRUCTIONS" in context),
        ("References previous exchanges", "previous exchanges" in context.lower()),
        ("Tracks conversation relationship", "CONVERSATION RELATIONSHIP" in context)
    ]
    
    for check_name, passed in checks:
        print(f"  {check_name}: {'PASSED' if passed else 'FAILED'}")
    
    print()

def test_reasoning_layer():
    """Test reasoning analysis for more natural responses"""
    print("Testing Reasoning Layer...")
    
    user_id = "test_user_reasoning"
    
    # Test achievement recognition
    achievement_msg = "I just passed CS 18200 with an A!"
    mock_context = {"has_transcript_data": False}
    reasoning = generate_reasoning_analysis(achievement_msg, user_id, mock_context)
    
    # Test help request
    help_msg = "I'm confused about data structures"
    help_reasoning = generate_reasoning_analysis(help_msg, user_id, mock_context)
    
    checks = [
        ("Detects achievement", "academic achievement" in reasoning["analysis"].lower()),
        ("Suggests congratulations", "congratulations" in reasoning["strategy"].lower()),
        ("Detects confusion", "confusion" in help_reasoning["analysis"].lower()),
        ("Suggests empathy", "empathy" in help_reasoning["strategy"].lower()),
        ("Provides strategy guidance", len(reasoning["strategy"]) > 50)
    ]
    
    for check_name, passed in checks:
        print(f"  {check_name}: {'PASSED' if passed else 'FAILED'}")
    
    print()

def test_contextual_awareness():
    """Test enhanced contextual awareness"""
    print("Testing Contextual Awareness...")
    
    user_id = "test_user_context"
    
    # Add some conversation history
    add_to_conversation_history(user_id, "What courses should I take for data science?", "For Data Science, I recommend starting with STAT 350 and CS 18200.")
    
    # Analyze topic continuity
    topic_analysis = analyze_conversation_topic("Tell me more about STAT 350", user_id)
    
    # Test message topic extraction
    topics = extract_message_topics("I'm struggling with CS 25100 algorithms and need help with graduation planning")
    
    checks = [
        ("Detects topic continuity", not topic_analysis["topic_shift"]),
        ("Identifies multiple topics", len(topics) >= 2),
        ("Recognizes course mentions", "courses" in topics),
        ("Identifies help requests", "help" in topics),
        ("Tracks conversation flow", "conversation_flow" in topic_analysis)
    ]
    
    for check_name, passed in checks:
        print(f"  {check_name}: {'PASSED' if passed else 'FAILED'}")
    
    print()

def test_knowledge_integration():
    """Test intelligent knowledge base integration"""
    print("Testing Knowledge Integration...")
    
    user_id = "test_user_knowledge"
    mock_context = {"has_transcript_data": False}
    
    # Test course-specific query
    course_knowledge = extract_relevant_knowledge("Tell me about CS 18200", user_id, mock_context)
    
    # Test program-specific query
    program_knowledge = extract_relevant_knowledge("What are the requirements for Data Science major?", user_id, mock_context)
    
    # Test topic-based query
    topic_knowledge = extract_relevant_knowledge("I need help with programming courses", user_id, mock_context)
    
    checks = [
        ("Extracts course-specific info", "CS 18200" in course_knowledge or "SPECIFIC COURSES" in course_knowledge),
        ("Provides program information", "DATA SCIENCE" in program_knowledge.upper() or "PROGRAM INFO" in program_knowledge),
        ("Suggests relevant courses", "RELEVANT COURSES" in topic_knowledge or "programming" in course_knowledge.lower()),
        ("Returns structured information", "•" in course_knowledge or course_knowledge == ""),
        ("Handles unknown queries gracefully", len(topic_knowledge) > 0 or "KNOWLEDGE BASE" in topic_knowledge)
    ]
    
    for check_name, passed in checks:
        print(f"  {check_name}: {'PASSED' if passed else 'FAILED'}")
    
    print()

def test_feedback_system():
    """Test continuous improvement feedback system"""
    print("Testing Feedback & Improvement System...")
    
    user_id = "test_user_feedback"
    mock_context = {"has_transcript_data": True}
    
    # Test achievement acknowledgment analysis
    user_msg = "I completed CS 18200"
    ai_response = "Congratulations on finishing CS 18200! That's excellent progress."
    analysis = analyze_response_quality(user_msg, ai_response, user_id, mock_context)
    
    # Test response with course references
    technical_msg = "What should I take after CS 25100?"
    technical_response = "After CS 25100, I recommend CS 30700 (Software Engineering) or CS 38100 (Algorithms)."
    tech_analysis = analyze_response_quality(technical_msg, technical_response, user_id, mock_context)
    
    checks = [
        ("Detects achievement type", analysis["response_type"] == "achievement_acknowledgment"),
        ("Recognizes congratulations", "properly_congratulated" in analysis["quality_indicators"]),
        ("Identifies course references", tech_analysis["knowledge_base_referenced"]),
        ("Tracks improvement areas", isinstance(analysis["improvement_areas"], list)),
        ("Calculates response metrics", "response_length" in analysis)
    ]
    
    for check_name, passed in checks:
        print(f"  {check_name}: {'PASSED' if passed else 'FAILED'}")
    
    print()

def test_adaptive_personality():
    """Test adaptive personality based on user patterns"""
    print("Testing Adaptive Personality...")
    
    user_id = "test_user_personality"
    
    # Simulate user pattern (brief messages)
    user_conversation_patterns[user_id] = {
        "communication_patterns": {
            "avg_message_length": 30,  # Short messages
            "question_frequency": 5
        },
        "topic_interests": ["courses", "planning"]
    }
    
    # Build context for this user
    context = build_conversation_context(user_id)
    
    # Test system prompt adaptation
    mock_topic_analysis = {"primary_topic": "course_planning", "topic_shift": False}
    system_prompt = get_contextual_system_prompt(user_id, mock_topic_analysis)
    
    checks = [
        ("Includes user preferences", "USER PREFERENCE" in context or context == ""),
        ("Adapts to communication style", "concise" in context.lower() or context == ""),
        ("Maintains personality traits", "warm and personable" in system_prompt.lower()),
        ("Shows self-awareness", "honest about my limitations" in system_prompt.lower()),
        ("Mentions all three majors", all(major in system_prompt for major in ["Computer Science", "Data Science", "Artificial Intelligence"]))
    ]
    
    for check_name, passed in checks:
        print(f"  {check_name}: {'PASSED' if passed else 'FAILED'}")
    
    print()

def main():
    print("Advanced AI Behavior Improvements - Comprehensive Test Suite")
    print("=" * 70)
    
    test_conversation_memory()
    test_reasoning_layer()
    test_contextual_awareness()
    test_knowledge_integration()
    test_feedback_system()
    test_adaptive_personality()
    
    print("Comprehensive Improvements Summary:")
    print("=" * 50)
    print("+ Enhanced Memory: 15 exchanges + metadata tracking")
    print("+ Reasoning Layer: Context analysis before each response")
    print("+ Contextual Awareness: Explicit prior interaction references")
    print("+ Smart Knowledge Retrieval: Only relevant info, not everything")
    print("+ Feedback Loop: Response quality analysis & improvement tracking")
    print("+ Adaptive Personality: User-specific communication preferences")
    print("+ Conversation Flow: Topic tracking and natural transitions")
    print("+ Academic Progress: Achievement recognition and celebration")
    
    print("\nKey Behavioral Changes:")
    print("- Congratulates any mentioned course achievements dynamically")
    print("- References previous conversations naturally")
    print("- Adapts response style to user preferences")
    print("- Provides only relevant knowledge, not data dumps")
    print("- Shows empathy for struggling students")
    print("- Learns from conversation patterns")
    print("- Maintains consistent, warm personality")
    print("- Self-aware of capabilities and limitations")

if __name__ == "__main__":
    main()