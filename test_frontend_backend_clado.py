#!/usr/bin/env python3
"""
Test the complete frontend-backend Clado integration
"""

import requests
import json

def test_backend_clado_integration():
    """Test the Python backend Clado integration"""
    print("Testing Backend Clado Integration...")
    print("=" * 50)
    
    # Test 1: /clado toggle command
    test_data = {
        "message": "/clado",
        "context": {
            "userId": "test_user"
        }
    }
    
    try:
        response = requests.post(
            "http://localhost:5003/chat",
            json=test_data,
            timeout=10
        )
        
        print(f"1. /clado command status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            ai_response = data.get("response", "No response")
            print(f"   Response: {ai_response[:200]}...")
            
            if "Clado networking mode activated" in ai_response:
                print("   SUCCESS: /clado command working correctly")
            else:
                print("   ERROR: Unexpected response to /clado command")
        else:
            print(f"   ❌ Error: {response.status_code} - {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend not running. Start with: python pure_ai_main.py")
        return False
    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        return False
    
    # Test 2: Actual networking query
    print("\n2. Testing networking query...")
    networking_data = {
        "message": "Find me software engineers at Google",
        "context": {
            "userId": "test_user"
        }
    }
    
    try:
        response = requests.post(
            "http://localhost:5003/chat",
            json=networking_data,
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            ai_response = data.get("response", "No response")
            print(f"   Response length: {len(ai_response)} characters")
            
            # Check if response contains LinkedIn profiles
            if "LinkedIn" in ai_response and ("Software Engineer" in ai_response or "google" in ai_response.lower()):
                print("   SUCCESS: LinkedIn search working - found relevant profiles")
                print(f"   Sample: {ai_response[:300]}...")
            elif "error" in ai_response.lower() or "unavailable" in ai_response.lower():
                print("   WARNING: Search unavailable (might be API limit or configuration)")
                print(f"   Response: {ai_response[:200]}...")
            else:
                print("   ERROR: Unexpected response format")
                print(f"   Response: {ai_response[:200]}...")
        else:
            print(f"   ❌ Error: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"   ❌ Networking query failed: {e}")
        return False
    
    return True

def test_direct_clado_api():
    """Test direct Clado API to verify it's working"""
    print("\n" + "=" * 50)
    print("Testing Direct Clado API...")
    
    clado_api_key = "lk_26267cec2bcd4f34b9894bc07a00af1b"
    
    try:
        response = requests.get(
            "https://search.clado.ai/api/search",
            params={
                "query": "software engineers at Google",
                "limit": 3
            },
            headers={
                "Authorization": f"Bearer {clado_api_key}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            results = data.get("results", [])
            print(f"Found {len(results)} profiles")
            
            if results:
                first_result = results[0]
                profile = first_result.get("profile", {})
                name = profile.get("name", "Unknown")
                linkedin_url = profile.get("linkedin_url", "No URL")
                print(f"Sample: {name} - {linkedin_url}")
                print("SUCCESS: Direct Clado API working")
                return True
            else:
                print("WARNING: No results returned")
                return False
        else:
            print(f"ERROR: API Error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"ERROR: Direct API test failed: {e}")
        return False

def main():
    print("Frontend-Backend Clado Integration Test")
    print("=" * 60)
    
    # Test direct API first
    direct_api_working = test_direct_clado_api()
    
    # Test backend integration
    backend_working = test_backend_clado_integration()
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print(f"• Direct Clado API: {'Working' if direct_api_working else 'Failed'}")
    print(f"• Backend Integration: {'Working' if backend_working else 'Failed'}")
    
    if direct_api_working and backend_working:
        print("\nSUCCESS: Full integration should work!")
        print("To test in frontend:")
        print("1. Open AI Assistant")
        print("2. Type '/clado' to enable")
        print("3. Ask: 'Find me software engineers at Google'")
    else:
        print("\nERROR: Integration needs debugging")
        if not direct_api_working:
            print("- Check Clado API key and network connection")
        if not backend_working:
            print("- Make sure Python backend is running on port 5003")

if __name__ == "__main__":
    main()