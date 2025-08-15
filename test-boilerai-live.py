#!/usr/bin/env python3
"""
Live BoilerAI Integration Test
Tests the bridge service and CLI integration with a real query
"""

import os
import sys
import json
import requests
import time
from pathlib import Path

# Set up environment
os.environ['OPENAI_API_KEY'] = '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'

def test_direct_cli():
    """Test CLI components directly"""
    print("🧪 Testing Direct CLI Integration")
    print("=" * 40)
    
    try:
        # Add CLI path
        cli_path = Path(__file__).parent / 'src' / 'cli test1' / 'my_cli_bot'
        sys.path.insert(0, str(cli_path))
        
        # Import CLI components
        from simple_boiler_ai import SimpleBoilerAI
        from intelligent_conversation_manager import IntelligentConversationManager
        
        # Test SimpleBoilerAI
        print("🤖 Testing SimpleBoilerAI...")
        ai_engine = SimpleBoilerAI()
        simple_response = ai_engine.process_query("What is CS 18000?")
        print(f"✅ SimpleBoilerAI Response: {simple_response[:100]}...")
        
        # Test IntelligentConversationManager
        print("🧠 Testing IntelligentConversationManager...")
        conv_manager = IntelligentConversationManager()
        smart_response = conv_manager.process_query("test_user", "Tell me about CODO requirements for CS")
        print(f"✅ Smart Response: {smart_response[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Direct CLI test failed: {e}")
        return False

def test_bridge_service():
    """Test the bridge service API"""
    print("\n🌉 Testing Bridge Service API")
    print("=" * 40)
    
    base_url = "http://localhost:5000"
    
    try:
        # Test health endpoint
        print("🏥 Testing health endpoint...")
        health_response = requests.get(f"{base_url}/health", timeout=10)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print("✅ Health check passed:")
            print(f"   Status: {health_data.get('status')}")
            print(f"   CLI Running: {health_data.get('cli_process_running')}")
            print(f"   OpenAI Configured: {health_data.get('openai_configured')}")
            print(f"   Knowledge Base: {health_data.get('knowledge_base_loaded')}")
        else:
            print(f"❌ Health check failed: {health_response.status_code}")
            return False
        
        # Test chat endpoint
        print("\n💬 Testing chat endpoint...")
        chat_payload = {
            "message": "What are the prerequisites for CS 251?",
            "context": {
                "userId": "test_user",
                "timestamp": "2025-01-30T12:00:00Z"
            }
        }
        
        chat_response = requests.post(
            f"{base_url}/chat", 
            json=chat_payload,
            timeout=30
        )
        
        if chat_response.status_code == 200:
            chat_data = chat_response.json()
            print("✅ Chat test passed:")
            print(f"   Response: {chat_data.get('response')[:200]}...")
            print(f"   User ID: {chat_data.get('user_id')}")
            print(f"   Timestamp: {chat_data.get('timestamp')}")
        else:
            print(f"❌ Chat test failed: {chat_response.status_code}")
            print(f"   Error: {chat_response.text}")
            return False
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to bridge service. Is it running on port 5000?")
        return False
    except Exception as e:
        print(f"❌ Bridge service test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 BoilerAI Live Integration Tests")
    print("=" * 50)
    
    # Test 1: Direct CLI components
    cli_success = test_direct_cli()
    
    # Test 2: Bridge service (if running)
    bridge_success = test_bridge_service()
    
    # Results
    print("\n📊 Test Results")
    print("=" * 30)
    print(f"Direct CLI Integration: {'✅ PASS' if cli_success else '❌ FAIL'}")
    print(f"Bridge Service API: {'✅ PASS' if bridge_success else '❌ FAIL'}")
    
    if cli_success and bridge_success:
        print("\n🎉 All tests passed! BoilerAI is fully integrated and working!")
        print("\nNext steps:")
        print("1. Start your web app: npm run dev")
        print("2. Go to AI Assistant page")
        print("3. Start chatting with BoilerAI!")
    elif cli_success:
        print("\n⚠️ CLI works but bridge service not available.")
        print("Start the bridge service with: ./start-boilerai.sh")
    else:
        print("\n❌ Integration has issues. Check the setup.")
    
    return cli_success and bridge_success

if __name__ == "__main__":
    main()