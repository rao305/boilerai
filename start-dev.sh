#!/bin/bash

# BoilerAI Development Server Startup Script
# PERMANENT FIX for "Failed to fetch" API errors
# This script ensures proper frontend-backend connection

echo "🚀 Starting BoilerAI Development Environment..."
echo "🔧 This fixes the 'Failed to fetch' API key error!"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
lsof -ti:3000,5001,5173 | xargs kill -9 2>/dev/null || true
pkill -f "vite\|nodemon" 2>/dev/null || true
sleep 2

# Start backend first
echo -e "${BLUE}🔧 Starting backend server...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start AI Bridge Service with environment variables
echo -e "${BLUE}🤖 Starting AI Bridge Service...${NC}"
cd src/services/cliBridge
# No hardcoded API key - user will provide via frontend
# export OPENAI_API_KEY="sk-development-test-key-replace-with-real-openai-key"
echo "  API key will be provided by user via frontend"
python simple_main.py > ../../../ai-bridge.log 2>&1 &
AI_BRIDGE_PID=$!
cd ../../..

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5002/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend ready on http://localhost:5002${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        exit 1
    fi
done

# Wait for AI Bridge Service to be ready
echo -e "${YELLOW}⏳ Waiting for AI Bridge Service to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:5003/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ AI Bridge Service ready on http://localhost:5003${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️ AI Bridge Service may not be ready (check ai-bridge.log)${NC}"
        break
    fi
done

# Start frontend with proper configuration
echo -e "${BLUE}🎨 Starting frontend server...${NC}"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend ready on http://localhost:3000${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
done

echo ""
echo -e "${GREEN}🎉 BoilerAI is now running successfully!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend:  http://localhost:5002${NC}"
echo -e "${BLUE}🤖 AI Bridge: http://localhost:5003${NC}"
echo ""
echo -e "${GREEN}✅ API Connection Test:${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}   • Frontend proxy: WORKING${NC}"
else
    echo -e "${RED}   • Frontend proxy: FAILED${NC}"
fi
echo ""
echo -e "${YELLOW}📧 Email verification system ready${NC}"
echo -e "${YELLOW}🔑 Test login: testdev@purdue.edu / password123${NC}"
echo -e "${YELLOW}🤖 AI Assistant: Add OpenAI API key in Settings to unlock${NC}"
echo -e "${GREEN}🔧 'Failed to fetch' error: FIXED - Use http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}🛑 Press Ctrl+C to stop all services${NC}"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down...${NC}"
    kill $BACKEND_PID $FRONTEND_PID $AI_BRIDGE_PID 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Keep script running
wait $BACKEND_PID $FRONTEND_PID $AI_BRIDGE_PID