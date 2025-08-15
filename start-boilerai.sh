#!/bin/bash

# BoilerAI Bridge Service Starter Script
# This script starts the FastAPI bridge service to connect the CLI BoilerAI to the web app

echo "🤖 BoilerAI Bridge Service Starter"
echo "=================================="

# Check if we're in the correct directory
if [ ! -f "src/services/cliBridge/start_bridge.py" ]; then
    echo "❌ Error: start_bridge.py not found. Please run this from the project root directory."
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY environment variable is not set"
    echo "   The service will run in limited mode without full AI capabilities"
    echo "   To set it: export OPENAI_API_KEY='your-api-key-here'"
    echo ""
fi

# Change to the bridge service directory
cd src/services/cliBridge

# Setup virtual environment if needed
if [ ! -d "venv" ]; then
    echo "📦 Setting up Python virtual environment..."
    if ! ./setup_venv.sh; then
        echo "❌ Failed to setup virtual environment. Please run setup manually:"
        echo "   cd src/services/cliBridge && ./setup_venv.sh"
        exit 1
    fi
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

echo "✅ Environment setup complete"
echo ""

# Start the service
echo "🚀 Starting BoilerAI Bridge Service..."
echo "📡 Service will be available at: http://localhost:5000"
echo "🌐 Your React app should connect automatically"
echo "🛑 Press Ctrl+C to stop the service"
echo ""

# Run the service
python3 start_bridge.py