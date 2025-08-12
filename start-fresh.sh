#!/bin/bash

echo "🚀 Starting Fresh Academic Planner Application"
echo "=============================================="

# Kill any existing processes
echo "🔄 Killing existing processes..."
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "node.*server" 2>/dev/null

# Wait a moment
sleep 2

# Check if processes are stopped
if pgrep -f "vite\|nodemon\|node.*server" > /dev/null; then
    echo "⚠️  Some processes are still running. Please stop them manually."
    exit 1
fi

echo "✅ All processes stopped"

# Start backend first
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:5001"
else
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 5

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running on http://localhost:3000"
else
    echo "❌ Frontend failed to start"
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Application started successfully!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:5001"
echo "🤖 AI Bridge: http://localhost:5002"
echo "📊 Health:   http://localhost:5001/api/health"
echo "🤖 AI Health: http://localhost:5002/health"
echo ""
echo "Press Ctrl+C to stop all servers"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    kill $BACKEND_PID $FRONTEND_PID $AI_BRIDGE_PID 2>/dev/null || true
    echo "✅ All services stopped"
    exit 0
}

trap cleanup INT TERM

# Wait for user to stop
wait $BACKEND_PID $FRONTEND_PID $AI_BRIDGE_PID 