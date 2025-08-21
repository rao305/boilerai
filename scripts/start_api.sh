#!/bin/bash
# Start API Gateway with proper configuration

set -e

echo "=== Starting BoilerAI API Gateway ==="

# Set environment variables
export DATABASE_URL="postgresql://app:app@localhost:5432/boilerai"
export DEBUG_TRACE=1
export ENVIRONMENT=development

# Ensure database is running
echo "Checking database connection..."
if ! pg_isready -h localhost -p 5432 -U postgres >/dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running on localhost:5432"
    echo "Please start PostgreSQL and create the 'app' user:"
    echo "  sudo -u postgres createuser -d -r -s app"
    echo "  sudo -u postgres createdb -O app boilerai"
    echo "  psql -U app -d boilerai -f db/migrations/001_init.sql"
    echo "  psql -U app -d boilerai -f db/migrations/002_course_details.sql"
    exit 1
fi

# Check if tables exist
echo "Checking database schema..."
if ! psql "$DATABASE_URL" -c "\dt" >/dev/null 2>&1; then
    echo "⚠️  Database tables not found. Running migrations..."
    if [ -f "db/migrations/001_init.sql" ]; then
        psql "$DATABASE_URL" -f db/migrations/001_init.sql
        psql "$DATABASE_URL" -f db/migrations/002_course_details.sql
        echo "✅ Database migrations completed"
    else
        echo "❌ Migration files not found. Please run setup first."
        exit 1
    fi
fi

# Check if data is ingested
echo "Checking course data..."
COURSE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM courses;" 2>/dev/null || echo "0")
if [ "$COURSE_COUNT" -lt 10 ]; then
    echo "⚠️  Course data not found. Running data ingestion..."
    if [ -f "ingest/cli.py" ] && [ -d "packs/CS" ]; then
        python3 ingest/cli.py --pack CS
        echo "✅ Course data ingested"
    else
        echo "❌ Ingest scripts or data packs not found"
        exit 1
    fi
fi

# Start the API gateway
echo "Starting FastAPI gateway on port 8000..."
cd "$(dirname "$0")/.."
exec uvicorn api_gateway.main:app --host 0.0.0.0 --port 8000 --reload