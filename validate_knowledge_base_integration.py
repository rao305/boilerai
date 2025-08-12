#!/usr/bin/env python3
"""
Knowledge Base Integration Validator
Validates the comprehensive unified knowledge base without external dependencies
"""

import json
import sys
import os

def validate_comprehensive_knowledge_base():
    """Validate the comprehensive knowledge base structure and data"""
    
    print("=== KNOWLEDGE BASE INTEGRATION VALIDATION ===")
    print()
    
    # Load the comprehensive knowledge graph
    try:
        with open('comprehensive_knowledge_graph.json', 'r') as f:
            knowledge_graph = json.load(f)
        print("[OK] Comprehensive knowledge graph loaded successfully")
    except Exception as e:
        print(f"[ERROR] Failed to load knowledge graph: {e}")
        return False
    
    # Validate knowledge graph structure
    print("\n--- KNOWLEDGE GRAPH ANALYSIS ---")
    
    courses = knowledge_graph.get('courses', {})
    print(f"Courses in knowledge graph: {len(courses)}")
    
    # Validate course data completeness
    complete_courses = 0
    incomplete_courses = []
    
    required_fields = ['title', 'credits', 'description', 'prerequisites', 'difficulty']
    
    for course_code, course_data in courses.items():
        missing_fields = [field for field in required_fields if field not in course_data]
        if not missing_fields:
            complete_courses += 1
        else:
            incomplete_courses.append((course_code, missing_fields))
    
    print(f"Complete course records: {complete_courses}/{len(courses)}")
    
    if incomplete_courses:
        print("Courses with missing data:")
        for course, missing in incomplete_courses[:5]:  # Show first 5
            print(f"  - {course}: missing {missing}")
    
    # Validate prerequisite chains
    print("\n--- PREREQUISITE VALIDATION ---")
    
    prerequisite_issues = []
    for course_code, course_data in courses.items():
        prereqs = course_data.get('prerequisites', [])
        for prereq in prereqs:
            if prereq not in courses:
                prerequisite_issues.append(f"{course_code} requires {prereq} (not found)")
    
    if prerequisite_issues:
        print(f"Prerequisite issues found: {len(prerequisite_issues)}")
        for issue in prerequisite_issues[:10]:  # Show first 10
            print(f"  ! {issue}")
    else:
        print("[OK] All prerequisites valid")
    
    # Analyze program coverage
    print("\n--- PROGRAM COVERAGE ANALYSIS ---")
    
    # Define expected programs based on our unified structure
    expected_programs = {
        "Computer Science": {
            "foundation": ["CS 18000", "CS 18200", "CS 24000", "CS 25000", "CS 25100", "CS 25200"],
            "mathematics": ["MA 16100", "MA 16200", "MA 26100", "MA 26500", "STAT 35000"],
            "tracks": {
                "Machine Intelligence": ["CS 37300", "CS 47100", "CS 48900"],
                "Software Engineering": ["CS 30700", "CS 40700", "CS 40800"]
            }
        },
        "Data Science": {
            "foundation": ["CS 18000", "CS 25100"],
            "statistics": ["STAT 35000", "STAT 41600", "STAT 42000", "STAT 51200", "STAT 52800"],
            "applied": ["CS 37300", "STAT 59800"]
        },
        "Artificial Intelligence": {
            "foundation": ["CS 18000", "CS 18200", "CS 25100", "CS 38100"],
            "core_ai": ["CS 47100", "CS 37300", "CS 48900", "CS 54100", "CS 57100"],
            "philosophy": ["PHIL 12000", "PHIL 27000", "PHIL 58000"]
        }
    }
    
    coverage_report = {}
    
    for program, categories in expected_programs.items():
        coverage_report[program] = {}
        print(f"\n{program} Coverage:")
        
        for category, expected_courses in categories.items():
            if isinstance(expected_courses, dict):  # Handle tracks
                coverage_report[program][category] = {}
                for track, track_courses in expected_courses.items():
                    found_courses = [c for c in track_courses if c in courses]
                    coverage_report[program][category][track] = {
                        'expected': len(track_courses),
                        'found': len(found_courses),
                        'missing': [c for c in track_courses if c not in courses]
                    }
                    print(f"  {track} Track: {len(found_courses)}/{len(track_courses)} courses found")
            else:
                found_courses = [c for c in expected_courses if c in courses]
                coverage_report[program][category] = {
                    'expected': len(expected_courses),
                    'found': len(found_courses),
                    'missing': [c for c in expected_courses if c not in courses]
                }
                print(f"  {category}: {len(found_courses)}/{len(expected_courses)} courses found")
    
    # Validate difficulty progression
    print("\n--- DIFFICULTY PROGRESSION ANALYSIS ---")
    
    foundation_courses = ["CS 18000", "CS 18200", "CS 24000", "MA 16100", "MA 16200"]
    advanced_courses = ["CS 38100", "CS 37300", "CS 47100", "CS 48900"]
    
    foundation_difficulties = [courses[c]['difficulty'] for c in foundation_courses if c in courses and 'difficulty' in courses[c]]
    advanced_difficulties = [courses[c]['difficulty'] for c in advanced_courses if c in courses and 'difficulty' in courses[c]]
    
    if foundation_difficulties and advanced_difficulties:
        avg_foundation = sum(foundation_difficulties) / len(foundation_difficulties)
        avg_advanced = sum(advanced_difficulties) / len(advanced_difficulties)
        
        print(f"Average foundation difficulty: {avg_foundation:.2f}")
        print(f"Average advanced difficulty: {avg_advanced:.2f}")
        
        if avg_advanced > avg_foundation:
            print("[OK] Difficulty progression looks appropriate")
        else:
            print("[WARNING] Difficulty progression may need review")
    
    # Generate integration recommendations
    print("\n--- INTEGRATION RECOMMENDATIONS ---")
    
    recommendations = []
    
    # Missing courses
    all_expected = []
    for program, categories in expected_programs.items():
        for category, course_list in categories.items():
            if isinstance(course_list, dict):
                for track_courses in course_list.values():
                    all_expected.extend(track_courses)
            else:
                all_expected.extend(course_list)
    
    missing_courses = [c for c in set(all_expected) if c not in courses]
    
    if missing_courses:
        recommendations.append(f"Add {len(missing_courses)} missing courses: {missing_courses[:5]}...")
    
    # Course data enhancement opportunities
    courses_without_workload = [c for c, data in courses.items() if 'workload_hours' not in data]
    if courses_without_workload:
        recommendations.append(f"Add workload data for {len(courses_without_workload)} courses")
    
    courses_without_offerings = [c for c, data in courses.items() if 'offered_semesters' not in data]
    if courses_without_offerings:
        recommendations.append(f"Add semester offerings for {len(courses_without_offerings)} courses")
    
    if not recommendations:
        recommendations.append("Knowledge base appears comprehensive and well-integrated")
    
    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec}")
    
    # Final assessment
    print("\n=== INTEGRATION ASSESSMENT ===")
    
    total_issues = len(prerequisite_issues) + len(missing_courses)
    completeness_score = (len(courses) - total_issues) / len(courses) * 100 if courses else 0
    
    print(f"Knowledge base completeness: {completeness_score:.1f}%")
    print(f"Total courses available: {len(courses)}")
    print(f"Total issues found: {total_issues}")
    
    if completeness_score >= 90:
        print("[EXCELLENT] Knowledge base is comprehensive and well-integrated")
        status = "EXCELLENT"
    elif completeness_score >= 75:
        print("[GOOD] Knowledge base is solid with minor gaps")
        status = "GOOD"
    elif completeness_score >= 50:
        print("[FAIR] Knowledge base needs some improvements")
        status = "FAIR"
    else:
        print("[POOR] Knowledge base needs significant work")
        status = "POOR"
    
    # AI Reasoning Readiness
    print("\n=== AI REASONING READINESS ===")
    
    ai_readiness_factors = {
        "Course descriptions available": len([c for c in courses.values() if 'description' in c]) / len(courses) * 100,
        "Prerequisite data complete": (len(courses) - len(prerequisite_issues)) / len(courses) * 100,
        "Difficulty ratings available": len([c for c in courses.values() if 'difficulty' in c]) / len(courses) * 100,
        "Workload data available": len([c for c in courses.values() if 'workload_hours' in c]) / len(courses) * 100,
        "Program structure defined": 100 if expected_programs else 0
    }
    
    print("AI Reasoning Capability Factors:")
    for factor, score in ai_readiness_factors.items():
        print(f"  {factor}: {score:.1f}%")
    
    overall_ai_readiness = sum(ai_readiness_factors.values()) / len(ai_readiness_factors)
    print(f"\nOverall AI Reasoning Readiness: {overall_ai_readiness:.1f}%")
    
    if overall_ai_readiness >= 80:
        print("[OK] AI system ready for comprehensive academic reasoning")
    else:
        print("[WARNING] AI system may need additional data for optimal reasoning")
    
    return status == "EXCELLENT" or status == "GOOD"

if __name__ == "__main__":
    success = validate_comprehensive_knowledge_base()
    sys.exit(0 if success else 1)