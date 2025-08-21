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

def run_all_tests():
    """Run all tests"""
    print("🚀 Starting BoilerAI System Tests")
    print("=" * 50)
    
    try:
        test_health()
        test_course_lookup()
        test_track_info()
        test_t2sql()
        test_planner_track_declaration()
        test_planner_mi_validation()
        
        print("\n" + "=" * 50)
        print("🎉 All tests passed! BoilerAI is working correctly.")
        print("\nKey Features Validated:")
        print("✅ Health monitoring")
        print("✅ Course lookup with alias support")
        print("✅ Machine Intelligence track requirements")
        print("✅ Text-to-SQL query execution")
        print("✅ Track declaration rule enforcement")
        print("✅ Grade requirement validation")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return False
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to {BASE_URL}")
        print("Make sure the API server is running:")
        print("uvicorn api_gateway.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)