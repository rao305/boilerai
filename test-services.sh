#!/bin/bash

echo "🧪 Testing Services Individual"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test 1: Backend
echo -e "${BLUE}🔧 Testing Backend...${NC}"
cd backend
if npm list bcrypt > /dev/null 2>&1; then
    echo -e "${GREEN}✅ bcrypt dependency found${NC}"
else
    echo -e "${RED}❌ bcrypt dependency missing${NC}"
    exit 1
fi

# Test basic server start (syntax check)
if node -c src/server.js; then
    echo -e "${GREEN}✅ Backend syntax OK${NC}"
else
    echo -e "${RED}❌ Backend syntax error${NC}"
    exit 1
fi
cd ..

# Test 2: AI Bridge Service  
echo -e "${BLUE}🤖 Testing AI Bridge Service...${NC}"
cd src/services/cliBridge
if python3 -c "import simple_main; print('✅ Bridge service syntax OK')"; then
    echo -e "${GREEN}✅ AI Bridge service syntax OK${NC}"
else
    echo -e "${RED}❌ AI Bridge service syntax error${NC}"
    exit 1
fi
cd ../../..

# Test 3: Frontend
echo -e "${BLUE}🎨 Testing Frontend...${NC}"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ Frontend package.json found${NC}"
else
    echo -e "${RED}❌ Frontend package.json missing${NC}"
    exit 1
fi

# Test 4: Startup scripts
echo -e "${BLUE}📜 Testing Startup Scripts...${NC}"
if [ -x "start-dev.sh" ]; then
    echo -e "${GREEN}✅ start-dev.sh is executable${NC}"
else
    echo -e "${RED}❌ start-dev.sh is not executable${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All service tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: ./start-dev.sh"
echo "2. Wait for all services to start"
echo "3. Open: http://localhost:3000"
echo "4. Test the AI Assistant page"