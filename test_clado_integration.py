#!/usr/bin/env python3
"""
Test script for Clado LinkedIn networking integration
"""

import sys
import os
import requests
import json

def test_clado_api_directly():
    """Test the Clado API directly to verify it works"""
    print("Testing Clado API Integration...")
    
    # Use the API key from the frontend service
    clado_api_key = "lk_26267cec2bcd4f34b9894bc07a00af1b"
    
    test_queries = [
        "software engineers at Google",
        "Purdue alumni in machine learning",
        "data scientists"
    ]
    
    for query in test_queries:
        print(f"\nTesting query: '{query}'")
        
        try:
            # Test the REST API endpoint
            response = requests.get(
                "https://search.clado.ai/api/search",
                params={
                    "query": query,
                    "limit": 3
                },
                headers={
                    "Authorization": f"Bearer {clado_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            
            print(f"  Status Code: {response.status_code}")
            
            if response.ok:
                data = response.json()
                results = data.get("results", [])
                print(f"  Found {len(results)} results")
                
                if results:
                    # Show first result details
                    first_result = results[0]
                    profile = first_result.get("profile", {})
                    name = profile.get("name", "Unknown")
                    headline = profile.get("headline", "No headline")
                    linkedin_url = profile.get("linkedin_url", "No URL")
                    
                    print(f"  Sample result: {name}")
                    print(f"    Headline: {headline}")
                    print(f"    LinkedIn: {linkedin_url}")
                    print("  CLADO API WORKING")
                else:
                    print("  No results returned")
            else:
                print(f"  API Error: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"    Error: {error_data}")
                except:
                    print(f"    Error: {response.text}")
        
        except requests.exceptions.Timeout:
            print("  Request timed out")
        except requests.exceptions.RequestException as e:
            print(f"  Request failed: {e}")
        except Exception as e:
            print(f"  Unexpected error: {e}")

def test_backend_integration():
    """Test the backend AI service integration"""
    print("\n" + "="*50)
    print("Testing Backend Integration...")
    
    # Test data
    test_data = {
        "message": "/clado",
        "context": {
            "userId": "test_user"
        }
    }
    
    try:
        # Test the backend endpoint
        response = requests.post(
            "http://localhost:5003/chat",
            json=test_data,
            timeout=10
        )
        
        print(f"Backend Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            ai_response = data.get("response", "No response")
            print(f"Backend Response: {ai_response[:200]}...")
            
            if "Clado networking mode activated" in ai_response:
                print("Backend /clado command working")
            else:
                print("Backend response unexpected")
        else:
            print(f"Backend error: {response.status_code}")
            print(f"   Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("Backend not running (start with: python pure_ai_main.py)")
    except Exception as e:
        print(f"Backend test failed: {e}")

def main():
    print("Clado LinkedIn Integration Test Suite")
    print("=" * 60)
    
    # Test 1: Direct API access
    test_clado_api_directly()
    
    # Test 2: Backend integration
    test_backend_integration()
    
    print("\n" + "="*60)
    print("Test Summary:")
    print("- Direct API test verifies Clado service functionality")
    print("- Backend test verifies AI service integration")
    print("- If both pass, /clado mode should work end-to-end")
    print("\nTo use: Send '/clado' to activate, then ask networking questions")

if __name__ == "__main__":
    main()