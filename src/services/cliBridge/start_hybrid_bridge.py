#!/usr/bin/env python3
"""
Start Hybrid AI Bridge Service
Simple startup script for the advanced AI academic advisory system
"""

import sys
import os
import subprocess
from pathlib import Path

def check_requirements():
    """Check if required packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn', 
        'openai',
        'sqlite3',  # Built-in
        'pydantic'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        if package == 'sqlite3':
            continue  # Built-in module
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages

def install_requirements():
    """Install missing requirements"""
    missing = check_requirements()
    
    if missing:
        print(f"📦 Installing missing packages: {', '.join(missing)}")
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install'] + missing)
            print("✅ Requirements installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install requirements: {e}")
            return False
    else:
        print("✅ All requirements already satisfied")
    
    return True

def check_openai_key():
    """Check if OpenAI API key is configured"""
    api_key = os.getenv('OPENAI_API_KEY')
    
    if api_key:
        print("✅ OpenAI API key found")
        return True
    else:
        print("⚠️ OpenAI API key not found - system will run in pattern-based mode")
        print("💡 To enable full AI capabilities, set OPENAI_API_KEY environment variable")
        return False

def check_knowledge_base():
    """Check if knowledge base files exist"""
    current_dir = Path(__file__).parent
    
    knowledge_files = [
        "/Users/rrao/Desktop/final/src/cli test1/my_cli_bot/data/cs_knowledge_graph.json",
        "/Users/rrao/Desktop/final/purdue_cs_knowledge.db"
    ]
    
    found_files = []
    for file_path in knowledge_files:
        if os.path.exists(file_path):
            found_files.append(file_path)
    
    if found_files:
        print(f"✅ Found {len(found_files)} knowledge base files")
        return True
    else:
        print("⚠️ Knowledge base files not found - system will use basic fallbacks")
        return False

def main():
    """Main startup function"""
    print("🚀 Hybrid AI Academic Advisor Bridge - Startup")
    print("=" * 60)
    
    # Check and install requirements
    print("\n📋 Checking requirements...")
    if not install_requirements():
        print("❌ Cannot start service without required packages")
        return False
    
    # Check OpenAI configuration
    print("\n🤖 Checking AI configuration...")
    has_openai = check_openai_key()
    
    # Check knowledge base
    print("\n📚 Checking knowledge base...")
    has_knowledge = check_knowledge_base()
    
    # System status summary
    print("\n📊 System Status Summary:")
    print(f"   • Requirements: ✅ Satisfied")
    print(f"   • OpenAI API: {'✅ Available' if has_openai else '⚠️ Limited mode'}")
    print(f"   • Knowledge Base: {'✅ Available' if has_knowledge else '⚠️ Basic mode'}")
    
    # Start the service
    print("\n🚀 Starting Hybrid AI Bridge Service...")
    print("📍 Service URL: http://localhost:5003")
    print("📋 API Docs: http://localhost:5003/docs")
    print("🔄 Health Check: http://localhost:5003/health")
    print("\n💡 To stop the service, press Ctrl+C")
    print("=" * 60)
    
    try:
        # Import and run the service
        from hybrid_ai_bridge import app
        import uvicorn
        
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=5003,
            reload=False,
            log_level="info"
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
        return True
    except Exception as e:
        print(f"\n❌ Service failed to start: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)