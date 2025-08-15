#!/usr/bin/env python3
"""
Bridge Service Starter
Handles environment setup and service startup
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_environment():
    """Set up environment variables and paths"""
    try:
        # Get the current directory
        current_dir = Path(__file__).parent.absolute()
        
        # Add CLI bot path to PYTHONPATH
        cli_bot_path = current_dir / '..' / '..' / 'cli test1' / 'my_cli_bot'
        if cli_bot_path.exists():
            os.environ['PYTHONPATH'] = str(cli_bot_path) + ':' + os.environ.get('PYTHONPATH', '')
            logger.info(f"✅ Added CLI bot path to PYTHONPATH: {cli_bot_path}")
        
        # Check for OpenAI API key
        if not os.environ.get('OPENAI_API_KEY'):
            logger.warning("⚠️ OPENAI_API_KEY not set. Add it to your environment:")
            logger.warning("export OPENAI_API_KEY='your-api-key-here'")
            logger.warning("Service will run in limited mode without AI features.")
        else:
            logger.info("✅ OPENAI_API_KEY found")
        
        # Set other environment variables
        os.environ['PYTHONPATH'] = str(current_dir) + ':' + os.environ.get('PYTHONPATH', '')
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to setup environment: {e}")
        return False

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'openai'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"❌ Missing required packages: {', '.join(missing_packages)}")
        logger.error("Install them with: pip install -r requirements.txt")
        return False
    
    logger.info("✅ All required packages are installed")
    return True

def start_service():
    """Start the bridge service"""
    try:
        current_dir = Path(__file__).parent.absolute()
        main_py = current_dir / 'main.py'
        
        if not main_py.exists():
            logger.error(f"❌ main.py not found at {main_py}")
            return False
        
        logger.info("🚀 Starting BoilerAI Bridge Service...")
        logger.info("📡 Service will be available at http://localhost:5000")
        logger.info("🔗 Web app should connect automatically")
        logger.info("🛑 Press Ctrl+C to stop the service")
        
        # Start the service
        cmd = [sys.executable, str(main_py)]
        subprocess.run(cmd, cwd=str(current_dir))
        
        return True
        
    except KeyboardInterrupt:
        logger.info("🛑 Service stopped by user")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to start service: {e}")
        return False

def main():
    """Main entry point"""
    print("🤖 BoilerAI Bridge Service Startup")
    print("=" * 50)
    
    # Setup environment
    if not setup_environment():
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        print("\n📦 To install dependencies, run:")
        print("pip install -r requirements.txt")
        sys.exit(1)
    
    # Start service
    if not start_service():
        sys.exit(1)

if __name__ == "__main__":
    main()