#!/usr/bin/env python3
"""
Direct API testing script
"""
import sys
sys.path.append('/tmp')

from api_gateway.main import qa, plan_compute
from api_gateway.main import QARequest, PlanRequest
import json
import os

os.environ['DATABASE_URL'] = 'postgresql://app:app@localhost:5432/boilerai'

def test_qa_endpoints():
    print("=== Testing QA Endpoints ===")
    
    # Test course info query
    print("\n1. Testing course info query...")
    try:
        req = QARequest(question="tell me about CS18000")
        result = qa(req)
        print(f"✅ Course info query successful: {result['mode']}")
        if result.get('rows'):
            print(f"   Found course: {result['rows'][0].get('title', 'No title')}")
        else:
            print(f"   Result: {result}")
    except Exception as e:
        print(f"❌ Course info query failed: {e}")
    
    # Test prerequisite query  
    print("\n2. Testing prerequisite query...")
    try:
        req = QARequest(question="prereqs for CS25000")
        result = qa(req)
        print(f"✅ Prerequisite query successful: {result['mode']}")
        if result.get('rows'):
            print(f"   Found {len(result['rows'])} prerequisite records")
        else:
            print(f"   Result: {result}")
    except Exception as e:
        print(f"❌ Prerequisite query failed: {e}")

def test_planner_endpoints():
    print("\n=== Testing Planner Endpoints ===")
    
    # Test planner with no track (should give advisory)
    print("\n1. Testing no-track profile...")
    try:
        with open('/tmp/tests/profile_no_track.json', 'r') as f:
            profile_data = json.load(f)
        
        req = PlanRequest(profile_json=profile_data)
        result = plan_compute(req)
        print(f"✅ No-track planning successful")
        if result.get('advisories'):
            print(f"   Advisory: {result['advisories'][0]}")
        print(f"   Plan items: {len(result.get('plan', []))}")
    except Exception as e:
        print(f"❌ No-track planning failed: {e}")
    
    # Test planner with MI track
    print("\n2. Testing MI track profile...")
    try:
        with open('/tmp/tests/profile_mi.json', 'r') as f:
            profile_data = json.load(f)
        
        req = PlanRequest(profile_json=profile_data)
        result = plan_compute(req)
        print(f"✅ MI track planning successful")
        if result.get('unmet_track_groups'):
            print(f"   Unmet track groups: {len(result['unmet_track_groups'])}")
            for group in result['unmet_track_groups']:
                print(f"     {group['key']}: need {group['need']}, have {group['have']}")
    except Exception as e:
        print(f"❌ MI track planning failed: {e}")

if __name__ == "__main__":
    test_qa_endpoints()
    test_planner_endpoints()
    print("\n=== Test Summary ===")
    print("API tests completed. Check above for results.")