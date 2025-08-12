#!/usr/bin/env python3
"""
Direct test of Clado API integration
"""

import os
import asyncio
import sys

# Set the API key directly
os.environ["CLADO_API_KEY"] = "lk_26267cec2bcd4f34b9894bc07a00af1b"

try:
    from clado_ai_client import search_professionals_sync
    
    print("🧪 Testing Clado API integration...")
    print(f"API Key present: {'Yes' if os.environ.get('CLADO_API_KEY') else 'No'}")
    print(f"OpenAI Key present: {'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'}")
    
    # Test query
    query = "Find me software engineers in the Bay Area"
    print(f"\n🔍 Testing query: {query}")
    
    result = search_professionals_sync(query)
    print(f"\n✅ Result: {result}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()