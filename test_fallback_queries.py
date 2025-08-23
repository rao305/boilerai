#!/usr/bin/env python3

"""
Test queries that should work with the t2sql fallback system.
"""

import requests
import json
import os

def test_fallback_queries():
    base_url = "http://127.0.0.1:8001"
    endpoint = f"{base_url}/qa"
    
    # These queries should use the fallback AST generation and work without API keys
    fallback_queries = [
        "tell me about cs251",
        "tell me about CS250",
        "describe cs240", 
        "what is cs251",
        "what class cs251",
        "prereqs for cs381",
        "prerequisites for CS240"
    ]
    
    print("=== Fallback T2SQL Test ===")
    print("Testing queries that should work without LLM via fallback patterns")
    print()
    
    for query in fallback_queries:
        try:
            payload = {"question": query}
            response = requests.post(endpoint, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                mode = data.get('mode', 'unknown')
                
                print(f"✅ '{query}'")
                print(f"   → Mode: {mode}")
                
                if mode == 't2sql':
                    sql = data.get('sql', 'N/A')
                    rows = data.get('rows', [])
                    ast = data.get('ast', {})
                    
                    print(f"   → SQL: {sql}")
                    print(f"   → Results: {len(rows)} rows")
                    print(f"   → AST params: {ast.get('params', {})}")
                    
                    # Show first result if available
                    if rows:
                        first_row = rows[0]
                        if isinstance(first_row, dict):
                            print(f"   → Sample: {list(first_row.keys())}")
                else:
                    print(f"   → Unexpected mode: {mode}")
                    
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
                print(f"❌ '{query}' - HTTP {response.status_code}")
                print(f"   → Error: {error_data}")
                
        except Exception as e:
            print(f"❌ '{query}' - Error: {e}")
        
        print()

if __name__ == "__main__":
    test_fallback_queries()