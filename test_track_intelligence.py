#!/usr/bin/env python3
"""
Test script for Track-Aware Intelligent Academic Advisor
Tests the system with various queries and track contexts
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import directly without going through advisor package
from advisor.track_intelligent_advisor import (
    TrackIntelligentAdvisor, 
    TrackContext,
    create_track_context_from_query,
    integrate_with_existing_advisor
)
import json

def test_track_detection():
    """Test automatic track detection from queries"""
    print("=== Testing Track Detection ===")
    
    advisor = TrackIntelligentAdvisor()
    
    test_queries = [
        "What electives should I take for AI and machine learning?",
        "I want to focus on software engineering and testing",
        "Which courses prepare me for a PhD in machine learning?", 
        "What software development courses should I take?",
        "I'm interested in neural networks and data mining",
        "Help me plan courses for software project management"
    ]
    
    for query in test_queries:
        track, confidence = advisor.detect_track_from_query(query)
        print(f"Query: {query}")
        print(f"Detected Track: {track} (confidence: {confidence:.2f})\n")

def test_track_replacement():
    """Test track placeholder replacement"""
    print("=== Testing Track Placeholder Replacement ===")
    
    advisor = TrackIntelligentAdvisor()
    
    # Test with Machine Intelligence track
    mi_context = TrackContext(
        selected_track="machine_intelligence",
        completed_courses=["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"],
        current_semester="fall_3rd_year"
    )
    
    # Get fall 3rd year plan
    fall_3rd_plan = advisor.progression_data["academic_progression"]["fall_3rd_year"]
    enhanced_plan = advisor.replace_track_placeholders(fall_3rd_plan, mi_context)
    
    print("Original Fall 3rd Year Plan:")
    for course in fall_3rd_plan["courses"]:
        if course.get("track_specific"):
            print(f"  {course['course_id']}: {course['title']}")
    
    print("\nEnhanced Plan for Machine Intelligence Track:")
    for course in enhanced_plan["courses"]:
        if course.get("track_specific"):
            print(f"  {course['course_id']}: {course['title']}")
            if "replacement_reasoning" in course:
                print(f"    Reason: {course['replacement_reasoning']}")
    print()

def test_contextual_recommendations():
    """Test contextual recommendation generation"""
    print("=== Testing Contextual Recommendations ===")
    
    advisor = TrackIntelligentAdvisor()
    
    # Test scenarios
    scenarios = [
        {
            "query": "What AI electives should I take next semester?",
            "context": TrackContext(
                selected_track="machine_intelligence",
                completed_courses=["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS37300"],
                current_semester="spring_3rd_year"
            )
        },
        {
            "query": "I need software engineering courses for my track",
            "context": TrackContext(
                selected_track="software_engineering", 
                completed_courses=["CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200"],
                current_semester="fall_3rd_year"
            )
        },
        {
            "query": "What courses should I take if I'm interested in machine learning and want to go to grad school?",
            "context": TrackContext(
                completed_courses=["CS18000", "CS18200", "CS24000"],
                current_semester="sophomore_spring"
            )
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"Scenario {i}:")
        print(f"Query: {scenario['query']}")
        print(f"Track: {scenario['context'].selected_track or 'Auto-detect'}")
        
        recommendations = advisor.generate_contextual_recommendation(
            scenario['query'], 
            scenario['context']
        )
        
        print("Recommendations:")
        for rec in recommendations:
            print(f"  {rec.course_id}: {rec.title} ({rec.credits} credits)")
            print(f"    Type: {rec.track_requirement_type}")
            print(f"    Reasoning: {rec.reasoning}")
            print(f"    Confidence: {rec.confidence:.2f}")
        print()

def test_smartcourse_integration():
    """Test integration with SmartCourse evaluation metrics"""
    print("=== Testing SmartCourse Integration ===")
    
    # Sample student profile
    student_profile = {
        "track": "machine_intelligence",
        "completed_courses": ["CS18000", "CS18200", "CS24000", "CS25000", "CS25100"],
        "current_semester": "spring_2nd_year",
        "gpa": 3.2,
        "low_grade_courses": ["CS25000"]  # Got a D, should retake
    }
    
    query = "What courses should I take next to prepare for AI graduate studies?"
    
    result = integrate_with_existing_advisor(query, student_profile)
    
    print(f"Query: {query}")
    print(f"Detected Track: {result['detected_track']}")
    print()
    
    print("Recommendations:")
    for rec in result["recommendations"]:
        print(f"  {rec['course_id']}: {rec['title']} ({rec['credits']} credits)")
        print(f"    Reasoning: {rec['reasoning']}")
        print(f"    Confidence: {rec['confidence']:.2f}")
    print()
    
    print("SmartCourse Metrics:")
    metrics = result["smartcourse_metrics"]
    for metric, value in metrics.items():
        print(f"  {metric}: {value:.3f}")
    print()
    
    print("Generated Contextual Prompt (first 500 chars):")
    print(result["contextual_prompt"][:500] + "...")

def test_edge_cases():
    """Test edge cases and error handling"""
    print("=== Testing Edge Cases ===")
    
    advisor = TrackIntelligentAdvisor()
    
    # Test with no track selected
    no_track_context = TrackContext(
        completed_courses=["CS18000", "CS18200"],
        current_semester="freshman_spring"
    )
    
    recommendations = advisor.generate_contextual_recommendation(
        "What should I take next?", 
        no_track_context
    )
    
    print("No track selected:")
    for rec in recommendations:
        print(f"  {rec.course_id}: {rec.title}")
        print(f"    Reasoning: {rec.reasoning}")
    print()
    
    # Test with completed student
    completed_context = TrackContext(
        selected_track="machine_intelligence",
        completed_courses=[
            "CS18000", "CS18200", "CS24000", "CS25000", "CS25100", "CS25200",
            "CS37300", "CS38100", "CS47100", "STAT41600", "CS57700", "CS57800"
        ],
        current_semester="spring_4th_year"
    )
    
    recommendations = advisor.generate_contextual_recommendation(
        "What electives do I still need?",
        completed_context  
    )
    
    print("Nearly completed student:")
    for rec in recommendations:
        print(f"  {rec.course_id}: {rec.title}")
        print(f"    Reasoning: {rec.reasoning}")

if __name__ == "__main__":
    print("Track-Aware Intelligent Academic Advisor Test Suite")
    print("=" * 60)
    
    try:
        test_track_detection()
        test_track_replacement()
        test_contextual_recommendations()
        test_smartcourse_integration()
        test_edge_cases()
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()