#!/usr/bin/env python3
"""
Test the AI Assistant <-> /clado bridge functionality
"""

import requests
import json

def test_bridge_functionality():
    """Test the complete bridge between AI Assistant and /clado mode"""
    print("Testing AI Assistant <-> /clado Bridge")
    print("=" * 50)
    
    user_id = "bridge_test_user"
    
    # Test 1: Regular AI Assistant
    print("1. Testing Regular AI Assistant...")
    regular_query = {
        "message": "Hi! I need help with course planning",
        "context": {"userId": user_id}
    }
    
    try:
        response = requests.post("http://localhost:5003/chat", json=regular_query, timeout=10)
        if response.ok:
            data = response.json()
            ai_response = data.get("response", "")
            print(f"   AI Response: {ai_response[:100]}...")
            
            # Check that it doesn't mention hardcoded majors
            hardcoded_terms = ["Computer Science", "Data Science", "Artificial Intelligence", "three majors"]
            has_hardcoded = any(term in ai_response for term in hardcoded_terms)
            print(f"   Hardcoded patterns: {'Found' if has_hardcoded else 'None'}")
            print(f"   SUCCESS: Regular AI working" if not has_hardcoded else "   ERROR: Still has hardcoded patterns")
        else:
            print(f"   ERROR: {response.status_code}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 2: /clado toggle
    print("\n2. Testing /clado toggle...")
    clado_toggle = {
        "message": "/clado",
        "context": {"userId": user_id}
    }
    
    try:
        response = requests.post("http://localhost:5003/chat", json=clado_toggle, timeout=10)
        if response.ok:
            data = response.json()
            clado_response = data.get("response", "")
            print(f"   Clado Response: {clado_response[:100]}...")
            
            # Check for activation message
            if "Clado networking mode activated" in clado_response:
                print("   SUCCESS: /clado toggle working")
            else:
                print("   ERROR: /clado toggle failed")
                print(f"   Full response: {clado_response}")
        else:
            print(f"   ERROR: {response.status_code}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 3: Networking query (should use Clado)
    print("\n3. Testing networking query in Clado mode...")
    networking_query = {
        "message": "Find me software engineers at Google",
        "context": {"userId": user_id}
    }
    
    try:
        response = requests.post("http://localhost:5003/chat", json=networking_query, timeout=30)
        if response.ok:
            data = response.json()
            network_response = data.get("response", "")
            print(f"   Response length: {len(network_response)} characters")
            
            # Check for LinkedIn results
            if "LinkedIn" in network_response and ("Software Engineer" in network_response or "google" in network_response.lower()):
                print("   SUCCESS: Clado networking working - found LinkedIn profiles")
                print(f"   Sample: {network_response[:150]}...")
            elif "error" in network_response.lower() or "unavailable" in network_response.lower():
                print("   WARNING: Clado search unavailable (API limit/config)")
                print(f"   Response: {network_response[:150]}...")
            else:
                print("   ERROR: Unexpected response")
                print(f"   Response: {network_response[:150]}...")
        else:
            print(f"   ERROR: {response.status_code}")
    except Exception as e:
        print(f"   ERROR: {e}")
    
    # Test 4: Regular query after Clado (should still work)
    print("\n4. Testing regular query after Clado activation...")
    regular_after = {
        "message": "What courses should I take next semester?",
        "context": {"userId": user_id}
    }
    
    try:
        response = requests.post("http://localhost:5003/chat", json=regular_after, timeout=15)
        if response.ok:
            data = response.json()
            regular_response = data.get("response", "")
            print(f"   Response: {regular_response[:100]}...")
            
            # Should be academic advice, not LinkedIn search
            if "course" in regular_response.lower() or "academic" in regular_response.lower():
                print("   SUCCESS: Regular AI still working after Clado")
            else:
                print("   WARNING: Unexpected response type")
        else:
            print(f"   ERROR: {response.status_code}")
    except Exception as e:
        print(f"   ERROR: {e}")

def main():
    print("AI Assistant <-> /clado Bridge Test")
    print("=" * 60)
    print("Testing seamless switching between AI Assistant and Clado modes...")
    
    test_bridge_functionality()
    
    print("\n" + "=" * 60)
    print("Bridge Test Summary:")
    print("- Regular AI should work without hardcoded patterns")
    print("- /clado should activate networking mode")
    print("- Networking queries should return LinkedIn profiles")
    print("- Regular queries should still work after Clado activation")
    print("- Both modes should work in the same chat session")

if __name__ == "__main__":
    main()