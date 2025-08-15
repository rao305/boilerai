#!/bin/bash

echo "🚀 Testing Full Application Startup"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Cleanup any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "nodemon" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true  
pkill -f "python.*simple_main" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 3

# Start backend
echo -e "${BLUE}🔧 Starting backend...${NC}"
cd backend
npm run dev > ../backend-test.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 5

# Start AI Bridge
echo -e "${BLUE}🤖 Starting AI Bridge...${NC}"
cd src/services/cliBridge
python3 simple_main.py > ../../../bridge-test.log 2>&1 &
BRIDGE_PID=$!
cd ../../..
sleep 3

# Start frontend
echo -e "${BLUE}🎨 Starting frontend...${NC}"
npm run dev > frontend-test.log 2>&1 &
FRONTEND_PID=$!
sleep 5

echo ""
echo -e "${YELLOW}⏳ Testing service health...${NC}"

# Test backend health
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend (5001) is responding${NC}"
else
    echo -e "${RED}❌ Backend (5001) is not responding${NC}"
    cat backend-test.log | tail -10
fi

# Test AI Bridge health  
if curl -s http://localhost:5000/health > /dev/null; then
    echo -e "${GREEN}✅ AI Bridge (5000) is responding${NC}"
else
    echo -e "${RED}❌ AI Bridge (5000) is not responding${NC}"
    cat bridge-test.log | tail -10
fi

# Test frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend (3000) is responding${NC}"
else
    echo -e "${RED}❌ Frontend (3000) is not responding${NC}"
    cat frontend-test.log | tail -10
fi

echo ""
echo -e "${BLUE}📊 Service Status Summary:${NC}"
echo "🔧 Backend:  http://localhost:5001/api/health"
echo "🤖 AI Bridge: http://localhost:5000/health"  
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo -e "${GREEN}🎉 Test complete! Check the URLs above to verify services.${NC}"
echo ""
echo -e "${YELLOW}📝 To stop all services:${NC}"
echo "kill $BACKEND_PID $BRIDGE_PID $FRONTEND_PID"

# Keep running for 30 seconds to allow testing
echo "⏰ Services will run for 30 seconds for testing..."
sleep 30

# Cleanup
echo -e "${YELLOW}🛑 Stopping test services...${NC}"
kill $BACKEND_PID $BRIDGE_PID $FRONTEND_PID 2>/dev/null || true
echo -e "${GREEN}✅ Test cleanup complete${NC}"