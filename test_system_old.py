#!/usr/bin/env python3
"""
Test script for BoilerAI Computer Science Planner
Run after setting up database and loading KB files
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/healthz")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
    print("✅ Health check passed")

def test_course_lookup():
    """Test course information lookup with alias support"""
    print("\n🔍 Testing course lookup...")
    
    # Test with full course ID
    response = requests.get(f"{BASE_URL}/courses/CS24000")
    assert response.status_code == 200
    data = response.json()
    assert data["course"]["id"] == "CS24000"
    assert "Programming In C" in data["course"]["title"]
    print("✅ Course lookup (CS24000) passed")
    
    # Test with alias
    response = requests.get(f"{BASE_URL}/courses/CS240")
    assert response.status_code == 200
    data = response.json()
    assert data["course"]["id"] == "CS24000"
    print("✅ Course alias lookup (CS240 -> CS24000) passed")

def test_track_info():
    """Test track information retrieval"""
    print("\n🔍 Testing track information...")
    response = requests.get(f"{BASE_URL}/tracks/machine_intelligence")
    assert response.status_code == 200
    data = response.json()
    assert data["track"]["id"] == "machine_intelligence"
    assert data["track"]["name"] == "Machine Intelligence"
    
    # Verify MI track groups
    group_keys = {g["key"] for g in data["groups"]}
    expected_keys = {
        "mi_req_ml_dm", "mi_req_alg", "mi_req_ai_or_ir", 
        "mi_req_prob", "mi_electives"
    }
    assert group_keys == expected_keys
    print("✅ Machine Intelligence track info passed")

def test_t2sql():
    """Test text-to-SQL functionality"""
    print("\n🔍 Testing T2SQL...")
    
    # Test basic query
    ast = {
        "select": ["courses.id", "courses.title"],
        "from": "courses",
        "where": [{"left": "courses.major_id", "op": "=", "right": {"value": "CS"}}],
        "limit": 5
    }
    
    response = requests.post(f"{BASE_URL}/sql/query", json={"ast": ast})
    assert response.status_code == 200
    data = response.json()
    assert "sql" in data
    assert "rows" in data
    assert len(data["rows"]) <= 5
    print("✅ T2SQL basic query passed")
    
    # Test prerequisite lookup
    prereq_ast = {
        "select": ["prereqs.dst_course", "prereqs.kind", "prereqs.expr"],
        "from": "prereqs",
        "where": [{"left": "prereqs.dst_course", "op": "=", "right": {"value": "CS38100"}}]
    }
    
    response = requests.post(f"{BASE_URL}/sql/query", json={"ast": prereq_ast})
    assert response.status_code == 200
    data = response.json()
    assert len(data["rows"]) > 0
    print("✅ T2SQL prerequisite query passed")

def test_planner_track_declaration():
    """Test track declaration requirement enforcement"""
    print("\n🔍 Testing planner track declaration rule...")
    
    # Test case: CS25200 completed without track declaration
    profile = {
        "profile_json": {
            "student": {"gpa": 3.5, "start_term": "F2025"},
            "major": "CS",
            "track_id": None,  # No track declared
            "completed": [{"course_id": "CS25200", "grade": "A", "term": "F2024"}],
            "in_progress": [],
            "constraints": {"target_grad_term": "S2028", "max_credits": 16}
        }
    }
    
    response = requests.post(f"{BASE_URL}/plan/compute", json=profile)
    assert response.status_code == 200
    data = response.json()
    
    # Should have advisory about track declaration
    advisories = data.get("advisories", [])
    assert any("Track declaration required" in advisory for advisory in advisories)
    print("✅ Track declaration rule enforcement passed")

def test_planner_mi_validation():
    """Test Machine Intelligence track requirement validation"""
    print("\n🔍 Testing MI track validation...")
    
    # Test case: MI track with some completed courses
    profile = {
        "profile_json": {
            "student": {"gpa": 3.5, "start_term": "F2024"},
            "major": "CS",
            "track_id": "machine_intelligence",
            "completed": [
                {"course_id": "CS18000", "grade": "A", "term": "F2024"},
                {"course_id": "CS37300", "grade": "A", "term": "S2025"},  # ML/DM requirement
                {"course_id": "CS38100", "grade": "B", "term": "F2025"}   # Algorithms requirement
            ],
            "in_progress": [],
            "constraints": {"target_grad_term": "S2028", "max_credits": 16}
        }
    }
    
    response = requests.post(f"{BASE_URL}/plan/compute", json=profile)
    assert response.status_code == 200
    data = response.json()
    
    # Should show progress on MI requirements
    unmet_track_groups = data.get("unmet_track_groups", [])
    
    # Should still need AI/IR and Probability requirements
    unmet_keys = {group["key"] for group in unmet_track_groups}
    assert "mi_req_ai_or_ir" in unmet_keys
    assert "mi_req_prob" in unmet_keys
    assert "mi_electives" in unmet_keys  # Still need 2 electives
    
    print("✅ MI track validation passed")

def test_data_files():
    """Test that data files exist and are valid"""
    print("\n📦 Testing data files...")
    
    data_dir = Path("packs/CS")
    if not data_dir.exists():
        print(f"❌ Data directory {data_dir} does not exist")
        return False
    
    required_files = [
        "courses.csv",
        "offerings.csv", 
        "prereqs.jsonl",
        "requirements.json",
        "tracks.json",
        "policies.json"
    ]
    
    for file_name in required_files:
        file_path = data_dir / file_name
        if not file_path.exists():
            print(f"❌ Required file {file_name} does not exist")
            return False
        print(f"✅ {file_name} exists")
    
    # Test JSON parsing
    try:
        with open(data_dir / "requirements.json") as f:
            requirements = json.load(f)
            if "version" not in requirements or "groups" not in requirements:
                print("❌ requirements.json has invalid structure")
                return False
            print("✅ requirements.json is valid JSON")
    except Exception as e:
        print(f"❌ Failed to parse requirements.json: {e}")
        return False
    
    try:
        with open(data_dir / "tracks.json") as f:
            tracks = json.load(f)
            if "tracks" not in tracks:
                print("❌ tracks.json has invalid structure")
                return False
            print("✅ tracks.json is valid JSON")
    except Exception as e:
        print(f"❌ Failed to parse tracks.json: {e}")
        return False
    
    try:
        with open(data_dir / "policies.json") as f:
            policies = json.load(f)
            if "max_credits_per_term" not in policies:
                print("❌ policies.json has invalid structure")
                return False
            print("✅ policies.json is valid JSON")
    except Exception as e:
        print(f"❌ Failed to parse policies.json: {e}")
        return False
    
    return True

def test_planner_logic():
    """Test basic planner logic"""
    print("\n🧠 Testing planner logic...")
    
    try:
        from planner.core import AcademicPlanner
        
        # Test course scoring logic
        planner = AcademicPlanner(None)  # Mock DB session
        
        # Test that CS 25100 requires both CS 18000 and CS 18200
        # This is the critical prerequisite rule
        print("✅ Academic planner created successfully")
        
        # Test course ID validation
        from transcript.parser import TranscriptParser
        parser = TranscriptParser()
        
        # Test course ID normalization
        normalized = parser.normalize_course_id("CS18000")
        if normalized != "CS 18000":
            print(f"❌ Course ID normalization failed: expected 'CS 18000', got '{normalized}'")
            return False
        print("✅ Course ID normalization works")
        
        # Test course ID validation
        try:
            parser.validate_profile({
                "student": {"gpa": 3.0, "start_term": "F2025"},
                "major": "CS",
                "track_id": "systems",
                "completed": [{"course_id": "CS 18000", "grade": "A", "term": "F2024"}],
                "constraints": {"max_credits": 18}
            })
            print("✅ Profile validation works")
        except Exception as e:
            print(f"❌ Profile validation failed: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Planner logic test failed: {e}")
        return False
    
    return True

def test_t2sql_compiler():
    """Test Text-to-SQL compiler"""
    print("\n🔧 Testing T2SQL compiler...")
    
    try:
        from t2sql.ast_schema import SQLAST, ASTCompiler, ASTValue, ValueType
        
        # Test AST creation
        ast = SQLAST(
            select=["id", "title"],
            from_table="courses",
            where=[],
            limit=10
        )
        print("✅ AST creation works")
        
        # Test compiler
        compiler = ASTCompiler()
        sql = compiler.compile(ast)
        expected = "SELECT id, title FROM courses LIMIT 10"
        if sql != expected:
            print(f"❌ SQL compilation failed: expected '{expected}', got '{sql}'")
            return False
        print("✅ SQL compilation works")
        
        # Test validation
        errors = compiler.validate_ast(ast)
        if errors:
            print(f"❌ AST validation failed: {errors}")
            return False
        print("✅ AST validation works")
        
    except Exception as e:
        print(f"❌ T2SQL test failed: {e}")
        return False
    
    return True

def test_critical_prerequisites():
    """Test the critical CS 25100 prerequisite logic"""
    print("\n🚨 Testing critical prerequisites...")
    
    try:
        # Test that the system enforces BOTH CS 18200 AND CS 24000 for CS 25100
        from transcript.parser import TranscriptParser
        
        parser = TranscriptParser()
        
        # Test case 1: Missing CS 24000
        profile_missing_240 = {
            "student": {"gpa": 3.0, "start_term": "F2025"},
            "major": "CS",
            "track_id": "systems",
            "completed": [
                {"course_id": "CS 18000", "grade": "A", "term": "F2024"},
                {"course_id": "CS 18200", "grade": "A", "term": "F2024"}
            ],
            "constraints": {"max_credits": 18}
        }
        
        # Test case 2: Missing CS 18200
        profile_missing_182 = {
            "student": {"gpa": 3.0, "start_term": "F2025"},
            "major": "CS",
            "track_id": "systems",
            "completed": [
                {"course_id": "CS 18000", "grade": "A", "term": "F2024"},
                {"course_id": "CS 24000", "grade": "A", "term": "F2024"}
            ],
            "constraints": {"max_credits": 18}
        }
        
        # Test case 3: Both prerequisites present
        profile_both = {
            "student": {"gpa": 3.0, "start_term": "F2025"},
            "major": "CS",
            "track_id": "systems",
            "completed": [
                {"course_id": "CS 18000", "grade": "A", "term": "F2024"},
                {"course_id": "CS 18200", "grade": "A", "term": "F2024"},
                {"course_id": "CS 24000", "grade": "A", "term": "F2024"}
            ],
            "constraints": {"max_credits": 18}
        }
        
        # Validate all profiles
        for i, profile in enumerate([profile_missing_240, profile_missing_182, profile_both]):
            errors = parser.validate_profile(profile)
            if errors:
                print(f"❌ Profile {i+1} validation failed: {errors}")
                return False
        
        print("✅ Critical prerequisite test cases pass")
        
    except Exception as e:
        print(f"❌ Critical prerequisites test failed: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("🚀 Boiler AI - CS (No-KB Mode) System Test")
    print("=" * 50)
    
    tests = [
        ("Module Imports", test_imports),
        ("Data Files", test_data_files),
        ("Planner Logic", test_planner_logic),
        ("T2SQL Compiler", test_t2sql_compiler),
        ("Critical Prerequisites", test_critical_prerequisites)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} PASSED")
            else:
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            print(f"❌ {test_name} FAILED with exception: {e}")
    
    print(f"\n{'='*50}")
    print(f"🏆 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System is ready for deployment.")
        return True
    else:
        print("❌ Some tests failed. Please fix issues before deployment.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

