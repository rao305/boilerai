#!/usr/bin/env python3
"""
Complete System Startup Script
Starts Frontend, Backend, and Unified AI Services for testing
"""

import os
import sys
import time
import json
import subprocess
import threading
import requests
from pathlib import Path
import signal

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_colored(message, color=Colors.WHITE):
    """Print colored message"""
    print(f"{color}{message}{Colors.END}")

def print_header(title):
    """Print section header"""
    print()
    print_colored("=" * 60, Colors.CYAN)
    print_colored(f"  {title}", Colors.WHITE + Colors.BOLD)
    print_colored("=" * 60, Colors.CYAN)

def check_port(port, service_name):
    """Check if a port is available or in use"""
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        
        if result == 0:
            print_colored(f"⚠️  Port {port} ({service_name}) is already in use", Colors.YELLOW)
            return False
        else:
            print_colored(f"✅ Port {port} ({service_name}) is available", Colors.GREEN)
            return True
    except Exception as e:
        print_colored(f"❌ Error checking port {port}: {e}", Colors.RED)
        return True

def wait_for_service(url, service_name, max_attempts=30):
    """Wait for a service to become available"""
    print_colored(f"⏳ Waiting for {service_name} to be ready...", Colors.YELLOW)
    
    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.get(url, timeout=2)
            if response.status_code < 500:  # Accept any non-server-error response
                print_colored(f"✅ {service_name} is ready!", Colors.GREEN)
                return True
        except requests.exceptions.RequestException:
            pass
        
        print_colored(f"   Attempt {attempt}/{max_attempts} - {service_name} not ready yet...", Colors.YELLOW)
        time.sleep(2)
    
    print_colored(f"❌ {service_name} failed to start after {max_attempts} attempts", Colors.RED)
    return False

def check_dependencies():
    """Check if required dependencies are installed"""
    print_header("DEPENDENCY CHECK")
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        node_version = result.stdout.strip()
        print_colored(f"✅ Node.js: {node_version}", Colors.GREEN)
    except FileNotFoundError:
        print_colored("❌ Node.js not found. Please install Node.js", Colors.RED)
        return False
    
    # Check npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        npm_version = result.stdout.strip()
        print_colored(f"✅ npm: {npm_version}", Colors.GREEN)
    except FileNotFoundError:
        print_colored("❌ npm not found. Please install npm", Colors.RED)
        return False
    
    # Check Python
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print_colored(f"✅ Python: {python_version}", Colors.GREEN)
    
    # Check Python packages for AI services
    required_python_packages = ['fastapi', 'uvicorn', 'requests']
    missing_packages = []
    
    for package in required_python_packages:
        try:
            __import__(package)
            print_colored(f"✅ Python package: {package}", Colors.GREEN)
        except ImportError:
            missing_packages.append(package)
            print_colored(f"❌ Missing Python package: {package}", Colors.RED)
    
    if missing_packages:
        print_colored(f"Install missing packages with: pip install {' '.join(missing_packages)}", Colors.YELLOW)
        return False
    
    return True

def install_npm_dependencies():
    """Install npm dependencies if needed"""
    print_header("NPM DEPENDENCIES")
    
    # Check frontend dependencies
    if not Path("node_modules").exists():
        print_colored("📦 Installing frontend dependencies...", Colors.BLUE)
        result = subprocess.run(['npm', 'install'], capture_output=True, text=True)
        if result.returncode == 0:
            print_colored("✅ Frontend dependencies installed", Colors.GREEN)
        else:
            print_colored(f"❌ Failed to install frontend dependencies: {result.stderr}", Colors.RED)
            return False
    else:
        print_colored("✅ Frontend dependencies already installed", Colors.GREEN)
    
    # Check backend dependencies
    backend_node_modules = Path("backend/node_modules")
    if not backend_node_modules.exists():
        print_colored("📦 Installing backend dependencies...", Colors.BLUE)
        result = subprocess.run(['npm', 'install'], cwd='backend', capture_output=True, text=True)
        if result.returncode == 0:
            print_colored("✅ Backend dependencies installed", Colors.GREEN)
        else:
            print_colored(f"❌ Failed to install backend dependencies: {result.stderr}", Colors.RED)
            return False
    else:
        print_colored("✅ Backend dependencies already installed", Colors.GREEN)
    
    return True

def start_backend():
    """Start the backend server"""
    print_header("STARTING BACKEND SERVER")
    
    try:
        # Change to backend directory and start server
        backend_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd='backend',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print_colored("🔧 Backend server starting...", Colors.BLUE)
        return backend_process
    except Exception as e:
        print_colored(f"❌ Failed to start backend: {e}", Colors.RED)
        return None

def start_frontend():
    """Start the frontend development server"""
    print_header("STARTING FRONTEND SERVER")
    
    try:
        # Start frontend development server
        frontend_process = subprocess.Popen(
            ['npm', 'run', 'dev'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print_colored("🎨 Frontend server starting...", Colors.BLUE)
        return frontend_process
    except Exception as e:
        print_colored(f"❌ Failed to start frontend: {e}", Colors.RED)
        return None

def start_unified_ai_service():
    """Start the unified AI service"""
    print_header("STARTING UNIFIED AI SERVICE")
    
    try:
        # Check if the unified AI bridge exists
        ai_bridge_path = Path("src/services/cliBridge/unified_ai_bridge.py")
        if not ai_bridge_path.exists():
            print_colored("⚠️  Unified AI bridge not found, skipping AI service", Colors.YELLOW)
            return None
        
        # Create a simple FastAPI server to serve the AI
        ai_server_code = '''
import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel
    import uvicorn
    
    # Try to import our unified AI bridge
    try:
        from unified_ai_bridge import get_unified_ai_bridge
        ai_bridge = get_unified_ai_bridge()
        ai_available = True
        print("✅ Unified AI Bridge loaded successfully")
    except Exception as e:
        print(f"⚠️  AI Bridge not available: {e}")
        ai_available = False
    
    app = FastAPI(title="Unified AI Academic Advisor", version="1.0.0")
    
    class ChatRequest(BaseModel):
        message: str
        userId: str = "anonymous"
        context: dict = None
    
    @app.get("/")
    async def root():
        return {"message": "Unified AI Academic Advisor Service", "ai_available": ai_available}
    
    @app.get("/health")
    async def health():
        return {
            "status": "healthy" if ai_available else "limited",
            "ai_available": ai_available,
            "timestamp": "2025-08-09T12:00:00Z"
        }
    
    @app.post("/chat")
    async def chat(request: ChatRequest):
        if not ai_available:
            return {
                "response": "AI service is not available. Please check the system configuration.",
                "error": "AI service unavailable"
            }
        
        try:
            result = ai_bridge.process_academic_query(
                request.message,
                request.userId,
                request.context
            )
            
            return {
                "response": result.response_text,
                "confidence": result.confidence_score,
                "sources": result.knowledge_sources,
                "actions": result.suggested_actions[:3],  # Limit to top 3
                "timestamp": "2025-08-09T12:00:00Z",
                "user_id": request.userId
            }
        except Exception as e:
            return {
                "response": f"I encountered an error processing your query. Please try again.",
                "error": str(e),
                "timestamp": "2025-08-09T12:00:00Z",
                "user_id": request.userId
            }
    
    if __name__ == "__main__":
        print("🤖 Starting Unified AI Academic Advisor Service on port 5003")
        uvicorn.run(app, host="0.0.0.0", port=5003, log_level="info")

except ImportError as e:
    print(f"❌ Required packages not available: {e}")
    print("Install with: pip install fastapi uvicorn")
    sys.exit(1)
'''
        
        # Write the AI server code to a temporary file
        ai_server_path = Path("temp_ai_server.py")
        with open(ai_server_path, 'w') as f:
            f.write(ai_server_code)
        
        # Start the AI service
        ai_process = subprocess.Popen(
            [sys.executable, str(ai_server_path)],
            cwd='src/services/cliBridge',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print_colored("🤖 Unified AI service starting on port 5003...", Colors.PURPLE)
        return ai_process
        
    except Exception as e:
        print_colored(f"❌ Failed to start AI service: {e}", Colors.RED)
        return None

def print_system_status():
    """Print the final system status"""
    print_header("SYSTEM STATUS")
    
    services = [
        ("Frontend", "http://localhost:3000", "🎨"),
        ("Backend API", "http://localhost:5001", "🔧"),
        ("Unified AI Service", "http://localhost:5003", "🤖")
    ]
    
    print_colored("🎉 PURDUE ACADEMIC PLANNER - ALL SERVICES RUNNING!", Colors.GREEN + Colors.BOLD)
    print()
    
    for name, url, icon in services:
        try:
            response = requests.get(url, timeout=2)
            if response.status_code < 500:
                print_colored(f"{icon} {name:20} | {url:30} | ✅ RUNNING", Colors.GREEN)
            else:
                print_colored(f"{icon} {name:20} | {url:30} | ⚠️  ISSUES", Colors.YELLOW)
        except:
            print_colored(f"{icon} {name:20} | {url:30} | ❌ DOWN", Colors.RED)
    
    print()
    print_colored("📱 OPEN IN BROWSER:", Colors.CYAN + Colors.BOLD)
    print_colored("   🌐 Main Application: http://localhost:3000", Colors.CYAN)
    print()
    print_colored("🧪 TEST THE AI SYSTEM:", Colors.PURPLE + Colors.BOLD)
    print_colored("   1. Go to the AI Assistant page", Colors.PURPLE)
    print_colored("   2. Ask: 'What's the difference between Data Science and AI?'", Colors.PURPLE)
    print_colored("   3. Ask: 'I want to do machine learning - should I choose CS track?'", Colors.PURPLE)
    print()
    print_colored("🛑 TO STOP ALL SERVICES: Press Ctrl+C", Colors.YELLOW)

def cleanup_processes(processes):
    """Clean up all processes"""
    print()
    print_colored("🛑 Shutting down all services...", Colors.YELLOW)
    
    for name, process in processes.items():
        if process and process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=5)
                print_colored(f"✅ {name} stopped", Colors.GREEN)
            except subprocess.TimeoutExpired:
                process.kill()
                print_colored(f"🔥 {name} force killed", Colors.YELLOW)
            except Exception as e:
                print_colored(f"⚠️  Error stopping {name}: {e}", Colors.YELLOW)
    
    # Clean up temporary files
    temp_file = Path("temp_ai_server.py")
    if temp_file.exists():
        temp_file.unlink()
    
    print_colored("✅ All services stopped", Colors.GREEN)

def main():
    """Main startup function"""
    print_colored("🚀 PURDUE ACADEMIC PLANNER - COMPLETE SYSTEM STARTUP", Colors.CYAN + Colors.BOLD)
    
    processes = {}
    
    try:
        # Check dependencies
        if not check_dependencies():
            print_colored("❌ Dependency check failed", Colors.RED)
            return 1
        
        # Install npm dependencies
        if not install_npm_dependencies():
            print_colored("❌ Failed to install dependencies", Colors.RED)
            return 1
        
        # Check ports
        ports_to_check = [
            (3000, "Frontend"),
            (5001, "Backend"),
            (5003, "AI Service")
        ]
        
        for port, service in ports_to_check:
            if not check_port(port, service):
                print_colored(f"⚠️  {service} port {port} is in use. Continuing anyway...", Colors.YELLOW)
        
        # Start backend
        backend_process = start_backend()
        if backend_process:
            processes["Backend"] = backend_process
        
        # Wait for backend
        if not wait_for_service("http://localhost:5001", "Backend API"):
            print_colored("❌ Backend failed to start", Colors.RED)
            cleanup_processes(processes)
            return 1
        
        # Start frontend
        frontend_process = start_frontend()
        if frontend_process:
            processes["Frontend"] = frontend_process
        
        # Start AI service
        ai_process = start_unified_ai_service()
        if ai_process:
            processes["AI Service"] = ai_process
        
        # Wait a moment for everything to stabilize
        time.sleep(3)
        
        # Wait for frontend
        if not wait_for_service("http://localhost:3000", "Frontend"):
            print_colored("⚠️  Frontend may still be starting...", Colors.YELLOW)
        
        # Check AI service
        if ai_process:
            if not wait_for_service("http://localhost:5003", "AI Service", max_attempts=10):
                print_colored("⚠️  AI Service may need more time to start...", Colors.YELLOW)
        
        # Print final status
        print_system_status()
        
        # Wait for user interrupt
        while True:
            time.sleep(1)
    
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print_colored(f"❌ Unexpected error: {e}", Colors.RED)
        return 1
    finally:
        cleanup_processes(processes)
    
    return 0

if __name__ == "__main__":
    # Set up signal handlers
    def signal_handler(signum, frame):
        print_colored("\n🛑 Received interrupt signal", Colors.YELLOW)
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    sys.exit(main())