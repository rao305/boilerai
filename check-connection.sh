#!/bin/bash

# Quick connection check script
# Use this to verify frontend-backend connection is working

echo "🔍 Checking BoilerAI Connection Status..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check backend
echo -n "Backend (port 5001): "
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RUNNING${NC}"
    BACKEND_OK=true
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    BACKEND_OK=false
fi

# Check frontend
echo -n "Frontend (port 3000): "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RUNNING${NC}"
    FRONTEND_OK=true
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    FRONTEND_OK=false
fi

echo ""

if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    echo -e "${GREEN}🎉 Connection Status: GOOD${NC}"
    echo -e "${GREEN}✅ API key saving should work${NC}"
    echo -e "${BLUE}🌐 Access: http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Connection Status: BROKEN${NC}"
    echo -e "${YELLOW}⚠️  'Failed to fetch' error likely${NC}"
    echo ""
    echo "To fix:"
    echo "1. Run: ./start-dev.sh"
    echo "2. Wait for both services to start"
    echo "3. Use: http://localhost:3000 (not 5001)"
fi