#!/usr/bin/env python3
"""
Test script to demonstrate the hybrid Enhanced AI + SQL system
Shows how SQL query methods enhance the academic planning recommendations
"""

import sys
import os

# Add the enhanced AI processor to path
sys.path.append('/Users/rrao/Desktop/final/src/services/cliBridge')

from enhanced_ai_processor import EnhancedAIProcessor

def test_hybrid_system():
    """Test the hybrid Enhanced AI + SQL system"""
    
    processor = EnhancedAIProcessor()
    
    print("="*80)
    print("HYBRID AI + SQL ACADEMIC ADVISOR SYSTEM")
    print("="*80)
    print("Testing advanced SQL-powered academic analysis...")
    print()
    
    # Test complex scenarios that trigger SQL analysis
    test_cases = [
        {
            "name": "Complex Early Graduation Analysis",
            "query": "I'm a sophomore CS major with CS 182 and CS 240 completed, want to graduate early with machine intelligence track, what's my critical path and timeline analysis?",
            "description": "Complex scenario requiring prerequisite analysis, critical path identification, and timeline optimization"
        },
        {
            "name": "Multi-Course Prerequisite Planning", 
            "query": "I need help planning my course sequence for the next 3 semesters, I've completed CS 18200 and CS 24000, interested in machine intelligence, what courses should I prioritize?",
            "description": "Multi-semester planning requiring SQL-based priority ranking and sequencing"
        },
        {
            "name": "Simple Course Planning (No SQL)",
            "query": "I'm a sophomore CS major, completed CS 182 and CS 240, want machine intelligence track and early graduation",
            "description": "Should use enhanced AI without SQL for straightforward scenarios"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"TEST CASE {i}: {test_case['name']}")
        print("="*60)
        print(f"Query: {test_case['query']}")
        print(f"Expected: {test_case['description']}")
        print()
        print("SYSTEM RESPONSE:")
        print("-"*40)
        
        response = processor.process_query(test_case['query'])
        print(response)
        print("\n" + "="*80 + "\n")

def compare_approaches():
    """Compare Enhanced AI vs Hybrid AI+SQL approaches"""
    
    print("COMPARISON: Enhanced AI vs Hybrid AI+SQL")
    print("="*80)
    
    # Create a processor instance
    processor = EnhancedAIProcessor()
    
    # Complex query that benefits from SQL analysis
    complex_query = "I want to graduate early, what's my critical path analysis and prerequisite optimization for machine intelligence track?"
    
    print("COMPLEX QUERY:")
    print(f'"{complex_query}"')
    print()
    
    # This will trigger SQL analysis because it contains "early graduation" and "critical path"
    print("HYBRID AI+SQL RESPONSE:")
    print("-"*50)
    response = processor.process_query(complex_query)
    print(response)
    print()
    
    print("KEY HYBRID SYSTEM ADVANTAGES:")
    print("-"*50)
    print("✅ SQL-based prerequisite analysis with relationship strengths")
    print("✅ Critical path identification using blocking factor calculations")
    print("✅ Priority scoring algorithms (difficulty × impact × blocking factor)")
    print("✅ Graduation timeline estimation with credit requirement tracking")
    print("✅ Risk assessment using success rates and difficulty metrics")
    print("✅ Advanced course sequencing optimization")
    print("✅ Multi-semester planning with capacity and availability analysis")

def demonstrate_sql_benefits():
    """Demonstrate specific benefits of SQL approach"""
    
    print("\n" + "="*80)
    print("SQL APPROACH BENEFITS FOR ACADEMIC PLANNING")
    print("="*80)
    
    benefits = [
        {
            "benefit": "Complex Prerequisite Analysis",
            "description": "SQL can efficiently find all courses with met prerequisites using JOINs",
            "example": "SELECT courses WHERE ALL prerequisites IN (completed_courses)"
        },
        {
            "benefit": "Critical Path Identification", 
            "description": "Identifies courses that block the most other courses using aggregation",
            "example": "SELECT prerequisite_code, COUNT(*) as courses_blocked FROM prerequisites GROUP BY prerequisite_code"
        },
        {
            "benefit": "Priority Scoring Algorithm",
            "description": "Combines multiple factors (difficulty, blocking, requirements) in single query",
            "example": "Priority = is_critical_path*10 + requirement_weight + (10-difficulty) + blocking_factor*2"
        },
        {
            "benefit": "Graduation Timeline Analysis",
            "description": "Calculates remaining requirements and estimates semesters with aggregations",
            "example": "SELECT SUM(credits_needed) FROM remaining_requirements WHERE category='total_credits'"
        },
        {
            "benefit": "Risk Assessment",
            "description": "Analyzes upcoming course difficulty and success rates statistically",
            "example": "SELECT AVG(difficulty_score), AVG(success_rate) FROM remaining_courses"
        },
        {
            "benefit": "Multi-Constraint Optimization",
            "description": "Handles complex constraints (prerequisites, capacity, timing) in single query",
            "example": "Course scheduling with semester availability, capacity limits, and prerequisite chains"
        }
    ]
    
    for benefit in benefits:
        print(f"🔹 {benefit['benefit']}")
        print(f"   {benefit['description']}")
        print(f"   SQL Example: {benefit['example']}")
        print()
    
    print("WHY SQL IS PERFECT FOR ACADEMIC PLANNING:")
    print("-"*50)
    print("• Academic data is highly relational (courses → prerequisites → requirements)")
    print("• Complex constraints require multi-table analysis")
    print("• Priority ranking needs weighted scoring across multiple dimensions")
    print("• Timeline planning requires aggregation and calculation")
    print("• Risk assessment benefits from statistical analysis")
    print("• Course sequencing optimization is a graph traversal problem")

if __name__ == "__main__":
    print("HYBRID ENHANCED AI + SQL ACADEMIC ADVISOR DEMONSTRATION")
    print("="*80)
    
    # Test the hybrid system
    test_hybrid_system()
    
    # Compare approaches
    compare_approaches()
    
    # Demonstrate SQL benefits
    demonstrate_sql_benefits()
    
    print("\n🎉 HYBRID SYSTEM COMPLETE!")
    print("📊 SQL queries provide advanced academic analysis capabilities")
    print("🧠 Enhanced AI provides natural language understanding and response generation")
    print("⚡ Together they create a comprehensive academic planning solution!")