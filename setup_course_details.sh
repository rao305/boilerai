#!/bin/bash
# Setup script for Comprehensive CS Pack System

set -e

echo "🚀 Setting up Comprehensive CS Pack System for Boiler AI"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "db/migrations/002_course_details.sql" ]; then
    echo "❌ Error: Please run this script from the boilerai-master directory"
    exit 1
fi

# Check if uv is available
if ! command -v uv &> /dev/null; then
    echo "⚠️  uv not found. Installing dependencies with pip instead..."
    USE_UV=false
else
    echo "✅ uv found"
    USE_UV=true
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if [ "$USE_UV" = true ]; then
    uv sync
else
    pip install -r requirements/base.txt
fi

# Check database connection
echo ""
echo "🔌 Testing database connection..."
if ! python -c "
import os
import psycopg2
try:
    dsn = os.environ.get('DATABASE_URL', 'postgresql://app:app@localhost:5432/boilerai')
    conn = psycopg2.connect(dsn)
    conn.close()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
"; then
    echo ""
    echo "❌ Database connection failed. Please check:"
    echo "   - PostgreSQL is running"
    echo "   - DATABASE_URL environment variable is set"
    echo "   - Database credentials are correct"
    exit 1
fi

# Apply migrations
echo ""
echo "🗄️  Applying database migrations..."
if [ "$USE_UV" = true ]; then
    uv run python -m db.migrate
else
    python -m db.migrate
fi

# Load core CS pack
echo ""
echo "📚 Loading core CS pack data..."
if [ "$USE_UV" = true ]; then
    uv run python -m ingest.cli --major_id CS --dir packs/CS
else
    python -m ingest.cli --major_id CS --dir packs/CS
fi

# Load course extras (CS + Math details)
echo ""
echo "📚 Loading course extras data..."
if [ "$USE_UV" = true ]; then
    uv run python -m ingest.extras_cli --dir packs/CS
else
    python -m ingest.extras_cli --dir packs/CS
fi

# Run tests
echo ""
echo "🧪 Running tests..."
if [ "$USE_UV" = true ]; then
    uv run python test_course_details.py
else
    python test_course_details.py
fi

echo ""
echo "🎉 Setup complete! Comprehensive CS Pack System is ready."
echo ""
echo "You can now ask questions like:"
echo "  - 'Tell me about CS 240'"
echo "  - 'What Math options satisfy CS18000 prereq?'"
echo "  - 'Show prerequisites for CS25000'"
echo "  - 'List all CS core requirements'"
echo "  - 'What are alternative paths for CS25100?'"
echo "  - 'Which campuses offer CS 18000?'"
echo "  - 'What are the learning outcomes for CS 18200?'"
echo ""
echo "For more information, see:"
echo "  - COURSE_DETAILS_README.md"
echo "  - packs/CS/REVIEW.md"
