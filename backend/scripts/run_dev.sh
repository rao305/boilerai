#!/usr/bin/env bash
# Development startup script with structured QA enforcement

set -e

echo "🚀 Starting Backend Development Server with Structured QA"
echo "=============================================="

# Ensure required environment variables
export API_GATEWAY_URL=${API_GATEWAY_URL:-http://127.0.0.1:8001}
export DISABLE_UNIFIED_AI_SERVICE=1
export FORCE_STRUCTURED_QA=1
export ENABLE_RAG=0
export PASS_THROUGH_PROVIDER_HEADERS=1

echo "📋 Configuration:"
echo "  - API Gateway URL: $API_GATEWAY_URL"
echo "  - Unified AI Service: DISABLED"
echo "  - Structured QA: ENFORCED"
echo "  - RAG: DISABLED"
echo "  - Provider Headers: PASS-THROUGH"

echo ""
echo "🔍 Pre-flight checks:"

# Check if API Gateway is running
if curl -s --connect-timeout 5 "$API_GATEWAY_URL/healthz" > /dev/null; then
    echo "  ✅ API Gateway is healthy at $API_GATEWAY_URL"
else
    echo "  ⚠️  API Gateway not responding at $API_GATEWAY_URL"
    echo "     Please start the FastAPI gateway with: uvicorn api_gateway.main:app --host 127.0.0.1 --port 8001"
fi

# Check database connection (if applicable)
if [ -n "$DATABASE_URL" ]; then
    echo "  📊 Database: $DATABASE_URL"
fi

echo ""
echo "🚀 Starting Node.js backend server..."

# Start the backend with npm or pnpm
if command -v pnpm > /dev/null; then
    pnpm dev
elif command -v npm > /dev/null; then
    npm run dev
else
    echo "❌ Neither npm nor pnpm found"
    exit 1
fi