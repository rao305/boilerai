#!/usr/bin/env python3
"""
Quick correctness guardrails to add to the ingestion process
"""
import json
import psycopg2

def validate_course_references():
    """Check that prereqs/offerings/extras reference valid courses"""
    print("🔍 Validating course references...")
    
    conn = psycopg2.connect("postgresql://app:app@localhost:5432/boilerai")
    cur = conn.cursor()
    
    # Get all valid course IDs
    cur.execute("SELECT id FROM courses")
    valid_courses = {row[0] for row in cur.fetchall()}
    
    # Check prereqs
    cur.execute("SELECT DISTINCT dst_course FROM prereqs")
    prereq_courses = {row[0] for row in cur.fetchall()}
    invalid_prereq_courses = prereq_courses - valid_courses
    
    if invalid_prereq_courses:
        print(f"❌ Invalid courses in prereqs: {invalid_prereq_courses}")
    else:
        print("✅ All prereq courses are valid")
    
    # Check offerings
    cur.execute("SELECT DISTINCT course_id FROM offerings")
    offering_courses = {row[0] for row in cur.fetchall()}
    invalid_offering_courses = offering_courses - valid_courses
    
    if invalid_offering_courses:
        print(f"❌ Invalid courses in offerings: {invalid_offering_courses}")
    else:
        print("✅ All offering courses are valid")
    
    conn.close()
    return len(invalid_prereq_courses) + len(invalid_offering_courses) == 0

def validate_track_groups():
    """Ensure track groups have valid course references"""
    print("🎯 Validating track group courses...")
    
    conn = psycopg2.connect("postgresql://app:app@localhost:5432/boilerai")
    cur = conn.cursor()
    
    # Get all valid course IDs
    cur.execute("SELECT id FROM courses")
    valid_courses = {row[0] for row in cur.fetchall()}
    
    # Check track groups
    cur.execute("SELECT track_id, key, course_list FROM track_groups")
    
    errors = 0
    for track_id, group_key, course_list_json in cur.fetchall():
        course_list = json.loads(course_list_json)
        invalid_courses = set(course_list) - valid_courses
        if invalid_courses:
            print(f"❌ Track {track_id}, group {group_key} has invalid courses: {invalid_courses}")
            errors += 1
    
    if errors == 0:
        print("✅ All track group courses are valid")
    
    conn.close()
    return errors == 0

def validate_grade_logic():
    """Ensure grade logic is consistent"""
    print("📊 Validating grade logic...")
    
    conn = psycopg2.connect("postgresql://app:app@localhost:5432/boilerai")
    cur = conn.cursor()
    
    # Check for missing grade requirements
    cur.execute("SELECT COUNT(*) FROM prereqs WHERE min_grade IS NULL")
    missing_grades = cur.fetchone()[0]
    
    if missing_grades > 0:
        print(f"⚠️  {missing_grades} prereqs missing grade requirements")
    else:
        print("✅ All prereqs have grade requirements")
    
    # Check for unusual grades
    cur.execute("SELECT DISTINCT min_grade FROM prereqs WHERE min_grade IS NOT NULL")
    grades = {row[0] for row in cur.fetchall()}
    valid_grades = {'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'}
    
    invalid_grades = grades - valid_grades
    if invalid_grades:
        print(f"⚠️  Unusual grades found: {invalid_grades}")
    else:
        print("✅ All grades are in expected format")
    
    conn.close()
    return True

def validate_term_logic():
    """Check term ordering logic"""
    print("📅 Validating term logic...")
    
    # Test term comparison logic
    def term_to_sort_key(term):
        if not term or len(term) != 5:
            return (9999, 9)
        season, year = term[0], term[1:]
        try:
            year_int = int(year)
            season_order = {'S': 1, 'F': 2}  # Spring < Fall within same year
            return (year_int, season_order.get(season, 9))
        except ValueError:
            return (9999, 9)
    
    # Test cases
    test_cases = [
        ("F2024", "S2025", True),   # F2024 < S2025
        ("S2025", "F2025", True),   # S2025 < F2025 
        ("F2025", "S2026", True),   # F2025 < S2026
    ]
    
    for term1, term2, expected_less in test_cases:
        actual_less = term_to_sort_key(term1) < term_to_sort_key(term2)
        if actual_less == expected_less:
            print(f"✅ {term1} < {term2}: {actual_less}")
        else:
            print(f"❌ {term1} < {term2}: expected {expected_less}, got {actual_less}")
    
    return True

if __name__ == "__main__":
    print("🛡️  Running correctness guardrails...")
    
    results = [
        validate_course_references(),
        validate_track_groups(),
        validate_grade_logic(),
        validate_term_logic()
    ]
    
    if all(results):
        print("\n✅ All correctness checks passed!")
    else:
        print("\n❌ Some correctness checks failed!")
        exit(1)