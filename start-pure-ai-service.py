#!/usr/bin/env python3
"""
Start Pure AI BoilerAI Service
Simple launcher for the pure AI service with no hardcoded patterns
"""

import subprocess
import sys
import os
from pathlib import Path

def start_pure_ai_service():
    """Start the pure AI BoilerAI service"""
    print("Starting Pure AI BoilerAI Service...")
    print("This service uses ONLY OpenAI API responses - no hardcoded templates or patterns")
    print("Service will be available at: http://localhost:5003")
    print("Press Ctrl+C to stop the service")
    print("")
    
    # Change to bridge directory
    bridge_path = Path(__file__).parent / "src" / "services" / "cliBridge"
    
    try:
        # Start the pure AI service
        cmd = [sys.executable, 'pure_ai_main.py']
        subprocess.run(cmd, cwd=str(bridge_path))
        
    except KeyboardInterrupt:
        print("\nService stopped by user")
    except Exception as e:
        print(f"Failed to start service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_pure_ai_service()