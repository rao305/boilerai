#!/bin/bash

# BoilerAI Integration Test Script
echo "🧪 Testing BoilerAI Integration"
echo "=============================="

# Test 1: Check if bridge service files exist
echo "📁 Checking bridge service files..."
if [ ! -f "src/services/cliBridge/main.py" ]; then
    echo "❌ Bridge service main.py not found"
    exit 1
fi

if [ ! -f "src/services/cliBridge/cli_integration.py" ]; then
    echo "❌ CLI integration wrapper not found"
    exit 1
fi

if [ ! -f "src/services/cliBridge/knowledge_merger.py" ]; then
    echo "❌ Knowledge merger not found"
    exit 1
fi

echo "✅ Bridge service files exist"

# Test 2: Check if CLI bot exists
echo "📁 Checking CLI bot files..."
if [ ! -d "src/cli test1/my_cli_bot" ]; then
    echo "❌ CLI bot directory not found"
    exit 1
fi

if [ ! -f "src/cli test1/my_cli_bot/universal_purdue_advisor.py" ]; then
    echo "❌ CLI bot main file not found"
    exit 1
fi

echo "✅ CLI bot files exist"

# Test 3: Check knowledge base
echo "📚 Checking knowledge bases..."
if [ ! -f "src/cli test1/my_cli_bot/data/cs_knowledge_graph.json" ]; then
    echo "❌ CLI knowledge base not found"
    exit 1
fi

if [ ! -f "src/data/purdue_courses_complete.json" ]; then
    echo "❌ Web app course data not found"
    exit 1
fi

echo "✅ Knowledge bases exist"

# Test 4: Check updated TypeScript files
echo "🔧 Checking updated TypeScript files..."
if ! grep -q "BoilerAI" src/services/aiService.ts; then
    echo "❌ aiService.ts not updated with BoilerAI references"
    exit 1
fi

if ! grep -q "BoilerAI" src/pages/AIAssistant.tsx; then
    echo "❌ AIAssistant.tsx not updated with BoilerAI references"
    exit 1
fi

echo "✅ TypeScript files updated"

# Test 5: Test Python environment setup
echo "🐍 Testing Python environment..."
cd src/services/cliBridge

if [ ! -f "setup_venv.sh" ]; then
    echo "❌ Virtual environment setup script not found"
    exit 1
fi

if [ ! -f "requirements.txt" ]; then
    echo "❌ Requirements file not found"
    exit 1
fi

# Test Python syntax
if ! python3 -m py_compile main.py; then
    echo "❌ main.py has syntax errors"
    exit 1
fi

if ! python3 -m py_compile cli_integration.py; then
    echo "❌ cli_integration.py has syntax errors"
    exit 1
fi

if ! python3 -m py_compile knowledge_merger.py; then
    echo "❌ knowledge_merger.py has syntax errors"
    exit 1
fi

echo "✅ Python files have valid syntax"

# Go back to project root
cd ../../..

# Test 6: Check startup scripts
echo "🚀 Checking startup scripts..."
if [ ! -f "start-boilerai.sh" ]; then
    echo "❌ BoilerAI startup script not found"
    exit 1
fi

if [ ! -x "start-boilerai.sh" ]; then
    echo "❌ BoilerAI startup script not executable"
    exit 1
fi

echo "✅ Startup scripts ready"

# Test 7: Check documentation
echo "📝 Checking documentation..."
if [ ! -f "BOILERAI_INTEGRATION_GUIDE.md" ]; then
    echo "❌ Integration guide not found"
    exit 1
fi

echo "✅ Documentation exists"

echo ""
echo "🎉 All integration tests passed!"
echo ""
echo "Next steps:"
echo "1. Set OpenAI API key (optional): export OPENAI_API_KEY='your-key'"
echo "2. Start BoilerAI service: ./start-boilerai.sh"
echo "3. Start your web app: npm run dev"
echo "4. Test the integration at http://localhost:3000"
echo ""
echo "For detailed instructions, see: BOILERAI_INTEGRATION_GUIDE.md"