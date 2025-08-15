#!/bin/bash

# Purdue Academic Planner - Complete Application Startup Script
# This script ensures both frontend and backend start correctly with email functionality

echo "🚀 Starting Purdue Academic Planner..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s $url >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - $name not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Node.js version: $(node --version)${NC}"
echo -e "${BLUE}📦 npm version: $(npm --version)${NC}"

# Kill any existing processes on our ports
if port_in_use 5001; then
    echo -e "${YELLOW}⚠️  Killing existing process on port 5001...${NC}"
    lsof -ti:5001 | xargs kill -9 2>/dev/null || true
fi

if port_in_use 3000; then
    echo -e "${YELLOW}⚠️  Killing existing process on port 3000...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Start MongoDB if not running (optional)
if command_exists mongod && ! pgrep mongod > /dev/null; then
    echo -e "${YELLOW}🍃 Starting MongoDB...${NC}"
    mongod --fork --logpath /tmp/mongodb.log --dbpath ./data/db 2>/dev/null || true
fi

# Start backend server
echo -e "${BLUE}🔧 Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
if wait_for_service "http://localhost:5001" "Backend API"; then
    echo -e "${GREEN}✅ Backend server is running on http://localhost:5001${NC}"
else
    echo -e "${RED}❌ Backend failed to start. Exiting...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Test email service
echo -e "${BLUE}📧 Testing email service...${NC}"
EMAIL_TEST_RESPONSE=$(curl -s http://localhost:5001 2>/dev/null || echo "ERROR")
if [ "$EMAIL_TEST_RESPONSE" != "ERROR" ]; then
    echo -e "${GREEN}✅ Email service is ready${NC}"
else
    echo -e "${YELLOW}⚠️  Email service may need configuration${NC}"
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
if wait_for_service "http://localhost:3000" "Frontend"; then
    echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Purdue Academic Planner is now running!${NC}"
echo ""
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend API: http://localhost:5001${NC}"
echo ""
echo -e "${YELLOW}📧 Email Configuration Status:${NC}"
if [ -n "$EMAIL_USER" ] && [ -n "$EMAIL_PASS" ]; then
    echo -e "${GREEN}   ✅ Production email configured${NC}"
else
    echo -e "${YELLOW}   ⚠️  Using development email (Ethereal)${NC}"
    echo -e "${YELLOW}   💡 To use real email, set EMAIL_USER and EMAIL_PASS in backend/.env${NC}"
fi
echo ""
echo -e "${BLUE}🛑 To stop all services, press Ctrl+C${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap to catch Ctrl+C
trap cleanup INT TERM

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID