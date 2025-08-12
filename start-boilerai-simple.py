#!/usr/bin/env python3
"""
Simple BoilerAI Bridge Service Starter
Starts the FastAPI bridge without complex shell scripts
"""

import os
import sys
import subprocess
import signal
from pathlib import Path

def setup_environment():
    """Set up environment for the bridge service"""
    # Set OpenAI API key
    os.environ['OPENAI_API_KEY'] = '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'
    
    # Add CLI bot path to PYTHONPATH
    current_dir = Path(__file__).parent
    cli_bot_path = current_dir / 'src' / 'cli test1' / 'my_cli_bot'
    bridge_path = current_dir / 'src' / 'services' / 'cliBridge'
    
    python_path = f"{cli_bot_path}:{bridge_path}:{os.environ.get('PYTHONPATH', '')}"
    os.environ['PYTHONPATH'] = python_path
    
    print(f"✅ OpenAI API key set: {bool(os.environ.get('OPENAI_API_KEY'))}")
    print(f"✅ CLI bot path: {cli_bot_path}")
    print(f"✅ Bridge path: {bridge_path}")
    
    return bridge_path

def start_service():
    """Start the BoilerAI bridge service"""
    print("🤖 Starting BoilerAI Bridge Service...")
    print("📡 Service will be available at: http://localhost:5000")
    print("🌐 Your React app should connect automatically")
    print("🛑 Press Ctrl+C to stop the service")
    print("")
    
    bridge_path = setup_environment()
    
    # Change to bridge directory
    os.chdir(bridge_path)
    
    # Activate virtual environment and start service
    venv_python = bridge_path / 'venv' / 'bin' / 'python'
    if venv_python.exists():
        print("🐍 Using virtual environment...")
        python_cmd = str(venv_python)
    else:
        print("🐍 Using system Python...")
        python_cmd = sys.executable
    
    try:
        # Start the FastAPI service
        cmd = [python_cmd, 'main.py']
        process = subprocess.Popen(cmd, cwd=str(bridge_path))
        
        def signal_handler(sig, frame):
            print("\n🛑 Shutting down BoilerAI Bridge Service...")
            process.terminate()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        
        # Wait for the process
        process.wait()
        
    except Exception as e:
        print(f"❌ Failed to start service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_service()