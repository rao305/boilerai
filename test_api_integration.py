#!/usr/bin/env python3

"""
Test the API endpoint to verify the routing fix works end-to-end.
"""

import requests
import json
import os

def test_api_endpoint():
    # Test the API gateway endpoint
    base_url = "http://127.0.0.1:8001"
    endpoint = f"{base_url}/qa"
    
    # Set default environment variables
    os.environ.setdefault('LLM_PROVIDER', 'none')  # Use fallback for testing
    
    test_queries = [
        # These should now go to t2sql with our fix
        "what class is cs251", 
        "what is cs 250",
        "cs 251 course",
        "tell me about CS251",
        
        # Control: these should still go to general_chat
        "hello how are you",
        "what's the weather",
        
        # These should go to planner
        "when should I take CS251",
        "help me plan my schedule"
    ]
    
    print("=== API Integration Test ===")
    print(f"Testing endpoint: {endpoint}")
    print()
    
    for query in test_queries:
        try:
            payload = {"question": query}
            response = requests.post(endpoint, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                mode = data.get('mode', 'unknown')
                print(f"✅ '{query}'")
                print(f"   → Mode: {mode}")
                
                # Show additional info based on mode
                if mode == 't2sql':
                    print(f"   → SQL: {data.get('sql', 'N/A')[:100]}...")
                    print(f"   → Rows: {len(data.get('rows', []))} results")
                elif mode == 'general_chat':
                    response_text = data.get('response', '')
                    print(f"   → Response: {response_text[:100]}...")
                elif mode == 'planner':
                    print(f"   → Plan: {len(data.get('plan', {}))} items")
                
            else:
                print(f"❌ '{query}' - HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ '{query}' - Connection error: {e}")
        except Exception as e:
            print(f"❌ '{query}' - Error: {e}")
        
        print()

if __name__ == "__main__":
    test_api_endpoint()