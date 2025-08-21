#!/usr/bin/env python3
"""
Test script for T2SQL API with Gemini and OpenAI
"""

import requests
import json
import os
from typing import Dict, Any

API_BASE = "http://localhost:8000"

def test_qa_endpoint(question: str, provider: str = "gemini", api_key: str = None) -> Dict[str, Any]:
    """Test the QA endpoint"""
    payload = {
        "question": question,
        "provider": provider
    }
    
    if api_key:
        payload["api_key"] = api_key
    
    print(f"\n🔍 Testing: {question}")
    print(f"Provider: {provider} ({'with API key' if api_key else 'fallback only'})")
    
    try:
        response = requests.post(f"{API_BASE}/qa", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Status: {result['status']}")
            print(f"📝 Answer: {result['answer']}")
            print(f"🔧 Provider used: {result.get('provider_used', 'unknown')}")
            if result.get('debug', {}).get('sql'):
                print(f"🗄️ SQL: {result['debug']['sql']}")
            return result
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return {"error": f"HTTP {response.status_code}"}
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

def test_t2sql_endpoint(question: str, provider: str = "gemini", api_key: str = None) -> Dict[str, Any]:
    """Test the T2SQL endpoint directly"""
    payload = {
        "query": question,
        "provider": provider
    }
    
    if api_key:
        payload["api_key"] = api_key
    
    print(f"\n🔍 T2SQL Test: {question}")
    print(f"Provider: {provider} ({'with API key' if api_key else 'fallback only'})")
    
    try:
        response = requests.post(f"{API_BASE}/t2sql/query", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Status: {result['status']}")
            if result.get('sql'):
                print(f"🗄️ SQL: {result['sql']}")
            print(f"📊 Results: {result.get('result_count', 0)} rows")
            return result
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            return {"error": f"HTTP {response.status_code}"}
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

def main():
    print("🚀 Testing T2SQL API with Gemini/OpenAI Integration")
    
    # Test questions that should work with fallback
    fallback_questions = [
        "tell me about CS240",
        "prerequisites for CS381", 
        "what are MI electives"
    ]
    
    print("\n" + "="*60)
    print("📋 Testing Fallback Patterns (no API key needed)")
    print("="*60)
    
    for question in fallback_questions:
        test_qa_endpoint(question, provider="gemini", api_key=None)
    
    # Check for API keys
    gemini_key = os.getenv("GEMINI_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if gemini_key:
        print("\n" + "="*60)
        print("🤖 Testing with Gemini API Key")
        print("="*60)
        
        test_questions = [
            "tell me about CS240",
            "what are the prerequisites for data structures?",
            "what courses do I need for machine intelligence track?"
        ]
        
        for question in test_questions:
            test_qa_endpoint(question, provider="gemini", api_key=gemini_key)
    else:
        print("\n⚠️ No GEMINI_API_KEY found - skipping Gemini tests")
        print("Set GEMINI_API_KEY environment variable to test with Gemini")
    
    if openai_key:
        print("\n" + "="*60)
        print("🤖 Testing with OpenAI API Key")
        print("="*60)
        
        test_questions = [
            "tell me about CS240",
            "what are the prerequisites for algorithms?"
        ]
        
        for question in test_questions:
            test_qa_endpoint(question, provider="openai", api_key=openai_key)
    else:
        print("\n⚠️ No OPENAI_API_KEY found - skipping OpenAI tests")
        print("Set OPENAI_API_KEY environment variable to test with OpenAI")
    
    print("\n" + "="*60)
    print("📋 Testing T2SQL Endpoint Directly")
    print("="*60)
    
    for question in fallback_questions:
        test_t2sql_endpoint(question, provider="gemini", api_key=None)
    
    print("\n✅ Test complete!")
    print("\nTo test with your API keys:")
    print("export GEMINI_API_KEY='your_key_here'")
    print("export OPENAI_API_KEY='your_key_here'")
    print("python test_t2sql_api.py")

if __name__ == "__main__":
    main()