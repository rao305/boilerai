#!/bin/bash

# Start API server with correct database URL
export DATABASE_URL=postgresql://app:app@127.0.0.1:5432/boilerai

echo "🚀 Starting API server on port 8001..."
uvicorn api_gateway.main:app --host 127.0.0.1 --port 8001