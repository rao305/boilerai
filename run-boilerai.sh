#!/bin/bash

echo "🚀 BoilerAI Manual Startup Script"
echo "=================================="

# Kill existing processes
echo "🧹 Cleaning up..."
pkill -f "python.*8080" 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Start backend
echo "🔧 Starting backend on port 5001..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "⏳ Waiting for backend..."
for i in {1..20}; do
    if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
        echo "✅ Backend ready!"
        break
    fi
    sleep 1
done

# Show the test URL first
echo ""
echo "🧪 First, test basic connectivity:"
echo "   http://localhost:8080/test.html"
echo ""

# Display final instructions
echo "🎯 MANUAL FRONTEND LAUNCH:"
echo "1. Open a new terminal"
echo "2. Run: cd /Users/rrao/Desktop/final"
echo "3. Run: npx vite --host 0.0.0.0 --port 3000"
echo "4. If that fails, try: npx vite --host 127.0.0.1 --port 3000"
echo "5. If still failing, try: npx vite --port 3001"
echo ""
echo "📱 Then open: http://localhost:3000 (or whatever port works)"
echo "🔧 Backend API: http://localhost:5001"
echo ""
echo "🛑 Press Ctrl+C to stop backend when done"

# Keep backend running
wait $BACKEND_PID