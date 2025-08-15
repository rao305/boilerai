#!/bin/bash

# Virtual Environment Setup for BoilerAI Bridge Service
echo "🐍 Setting up Python virtual environment for BoilerAI..."

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Virtual environment setup complete!"
echo ""
echo "To use the virtual environment in the future:"
echo "  source venv/bin/activate"
echo ""
echo "To start the BoilerAI bridge service:"
echo "  source venv/bin/activate && python start_bridge.py"