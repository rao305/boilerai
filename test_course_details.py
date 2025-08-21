#!/usr/bin/env python3
"""
Test script for Course Details System
Verifies that all components are working correctly
"""

import os
import psycopg2
import jsonlines
import csv
from pathlib import Path

def test_database_connection():
    """Test database connection"""
    try:
        dsn = os.environ.get("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
        conn = psycopg2.connect(dsn)
        print("✅ Database connection successful")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_migration_tables():
    """Test that migration tables exist"""
    try:
        dsn = os.environ.get("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
        conn = psycopg2.connect(dsn)
        
        expected_tables = [
            'course_details', 'course_levels', 'course_schedule_types',
            'course_campuses', 'course_outcomes', 'course_program_restrictions',
            'course_aliases'
        ]
        
        with conn.cursor() as cur:
            for table in expected_tables:
                cur.execute(f"SELECT 1 FROM {table} LIMIT 1")
                print(f"✅ Table {table} exists")
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Migration tables test failed: {e}")
        return False

def test_data_files():
    """Test that data files exist and are valid"""
    try:
        # Check course_extras.jsonl
        extras_path = "packs/CS/course_extras.jsonl"
        if not os.path.exists(extras_path):
            print(f"❌ {extras_path} not found")
            return False
        
        with jsonlines.open(extras_path) as reader:
            courses = list(reader)
            print(f"✅ {extras_path} contains {len(courses)} courses")
            
            # Check first course has required fields
            if courses:
                first_course = courses[0]
                required_fields = ['course_id', 'description', 'levels', 'schedule_types', 'campuses', 'outcomes']
                for field in required_fields:
                    if field not in first_course:
                        print(f"❌ Missing required field: {field}")
                        return False
                print("✅ Course data structure is valid")
        
        # Check course_aliases.csv
        aliases_path = "packs/CS/course_aliases.csv"
        if not os.path.exists(aliases_path):
            print(f"❌ {aliases_path} not found")
            return False
        
        with open(aliases_path) as f:
            reader = csv.DictReader(f)
            aliases = list(reader)
            print(f"✅ {aliases_path} contains {len(aliases)} aliases")
        
        return True
    except Exception as e:
        print(f"❌ Data files test failed: {e}")
        return False

def test_sample_query():
    """Test a sample query to verify the system works"""
    try:
        dsn = os.environ.get("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
        conn = psycopg2.connect(dsn)
        
        # Test alias resolution
        with conn.cursor() as cur:
            cur.execute("SELECT course_id FROM course_aliases WHERE alias = 'CS240'")
            result = cur.fetchone()
            if result:
                course_id = result[0]
                print(f"✅ Alias 'CS240' resolves to {course_id}")
                
                # Test course details
                cur.execute("""
                    SELECT c.title, cd.description, cd.credit_hours_max
                    FROM courses c
                    JOIN course_details cd ON c.id = cd.course_id
                    WHERE c.id = %s
                """, (course_id,))
                
                course_info = cur.fetchone()
                if course_info:
                    title, description, credits = course_info
                    print(f"✅ Course found: {title} ({credits} credits)")
                    print(f"   Description: {description[:100]}...")
                else:
                    print("❌ Course details not found")
                    return False
            else:
                print("❌ Alias 'CS240' not found")
                return False
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Sample query test failed: {e}")
        return False

def test_prerequisites():
    """Test prerequisite queries"""
    try:
        dsn = os.environ.get("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
        conn = psycopg2.connect(dsn)
        
        with conn.cursor() as cur:
            # Test CS18000 prerequisites (math options)
            cur.execute("""
                SELECT expr FROM prereqs 
                WHERE dst_course = 'CS18000' AND kind = 'oneof'
            """)
            
            prereq_result = cur.fetchone()
            if prereq_result:
                print(f"✅ CS18000 has {len(prereq_result[0])} math prerequisite options")
            else:
                print("❌ CS18000 prerequisites not found")
                return False
            
            # Test CS25000 prerequisites (both required)
            cur.execute("""
                SELECT expr FROM prereqs 
                WHERE dst_course = 'CS25000' AND kind = 'allof'
            """)
            
            prereq_result = cur.fetchone()
            if prereq_result:
                print(f"✅ CS25000 requires {len(prereq_result[0])} courses")
            else:
                print("❌ CS25000 prerequisites not found")
                return False
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Prerequisites test failed: {e}")
        return False

def test_requirements():
    """Test requirements structure"""
    try:
        dsn = os.environ.get("DATABASE_URL", "postgresql://app:app@localhost:5432/boilerai")
        conn = psycopg2.connect(dsn)
        
        with conn.cursor() as cur:
            # Test CS core requirements
            cur.execute("""
                SELECT rule FROM requirements 
                WHERE major_id = 'CS' AND key = 'cs_core'
            """)
            
            req_result = cur.fetchone()
            if req_result:
                print("✅ CS core requirements found")
            else:
                print("❌ CS core requirements not found")
                return False
        
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Requirements test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Comprehensive CS Pack System\n")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Migration Tables", test_migration_tables),
        ("Data Files", test_data_files),
        ("Sample Query", test_sample_query),
        ("Prerequisites", test_prerequisites),
        ("Requirements", test_requirements)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"Testing: {test_name}")
        if test_func():
            passed += 1
        print()
    
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Comprehensive CS Pack is ready.")
        print("\nYou can now ask questions like:")
        print("- 'Tell me about CS 240'")
        print("- 'What Math options satisfy CS18000 prereq?'")
        print("- 'Show prerequisites for CS25000'")
        print("- 'List all CS core requirements'")
        print("- 'What are alternative paths for CS25100?'")
    else:
        print("⚠️  Some tests failed. Check the setup instructions.")

if __name__ == "__main__":
    main()
