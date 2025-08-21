# BoilerAI - Computer Science Academic Planner (Structured-KB-first, RAG-off)

An AI-powered academic planning system for Purdue Computer Science students with structured knowledge base and deterministic planning.

## Overview

BoilerAI implements a **structured-first** approach to academic planning:
- **Major**: Computer Science (CS)
- **Track Supported**: Machine Intelligence (MI) with full requirements
- **Knowledge Base**: Structured rules, not unstructured RAG
- **Planning**: Deterministic scheduler with prerequisite validation
- **Query System**: Text-to-SQL over whitelisted schema

## Features

### Core CS Requirements
- CS18000, CS18200, CS24000, CS25000, CS25100, CS25200
- CS19300 (seminar)
- Grade requirement: C or better for all major and track requirements

### Machine Intelligence Track
**4 Required Buckets + 2 Electives (no double-counting)**:
1. **ML/DM**: CS37300
2. **Algorithms**: CS38100  
3. **AI/IR**: CS47100 or CS47300
4. **Probability/Regression**: STAT41600, MA41600, or STAT51200
5. **Electives** (pick 2): CS31100, CS41100, CS31400, CS34800, CS35200, CS44800, CS45600, CS45800, CS48300, CS43900, CS44000, CS47500, CS57700, CS57800

### Track Declaration Policy
**Critical Rule**: Track must be declared by the term containing CS25200. The planner enforces this requirement.

## Quick Start

### 1. Start Database
```bash
cp .env.example .env
docker compose up -d postgres
export DATABASE_URL=postgresql://app:app@localhost:5432/boilerai
```

### 2. Run Database Migrations
```bash
# Apply schema in order
python - <<'PY'
import psycopg2, os
url=os.environ["DATABASE_URL"]
conn=psycopg2.connect(url); cur=conn.cursor()
for p in ["db/migrations/001_init.sql","db/migrations/002_course_details.sql"]:
    cur.execute(open(p).read()); conn.commit()
print("migrated")
PY
```

### 3. Load Knowledge Base
```bash
# Core data (courses, prereqs, tracks, requirements)
python -m ingest.cli --major_id CS --dir packs/CS

# Extended details (descriptions, outcomes, restrictions)
python -m ingest.extras_cli --dir packs/CS
```

### 4. Start API Server
```bash
uvicorn api_gateway.main:app --reload --port 8000
```

## API Endpoints

### Planning
```bash
# Compute academic plan
POST /plan/compute
{
  "profile_json": {
    "student": {"gpa": 3.5, "start_term": "F2025"},
    "major": "CS",
    "track_id": "machine_intelligence",
    "completed": [{"course_id": "CS18000", "grade": "A", "term": "F2024"}],
    "in_progress": [{"course_id": "CS18200"}],
    "constraints": {
      "target_grad_term": "S2028",
      "max_credits": 16,
      "summer_ok": true,
      "pace": "normal"
    }
  }
}
```

### Text-to-SQL Queries
```bash
# Execute SQL from AST
POST /sql/query
{
  "ast": {
    "select": ["courses.id", "courses.title"],
    "from": "courses",
    "where": [{"left": "courses.major_id", "op": "=", "right": {"value": "CS"}}],
    "limit": 10
  }
}
```

### Course Information
```bash
# Get course details (supports aliases like CS240 -> CS24000)
GET /courses/CS24000
GET /courses/CS240
```

### Track Information
```bash
# Get track requirements
GET /tracks/machine_intelligence
```

## Smoke Tests

### Basic API
```bash
# Health check
curl http://localhost:8000/healthz

# Test T2SQL
curl -X POST http://localhost:8000/sql/query \
  -H "Content-Type: application/json" \
  -d '{"ast": {"select": ["courses.id"], "from": "courses", "limit": 5}}'

# Test course lookup
curl http://localhost:8000/courses/CS47300

# Test track requirements
curl http://localhost:8000/tracks/machine_intelligence
```

### Planner Validation
```bash
# Test track declaration rule
curl -X POST http://localhost:8000/plan/compute \
  -H "Content-Type: application/json" \
  -d '{"profile_json": {"completed": [{"course_id": "CS25200", "grade": "A"}], "track_id": null}}'

# Expected: Advisory about track declaration requirement

# Test MI track validation
curl -X POST http://localhost:8000/plan/compute \
  -H "Content-Type: application/json" \
  -d '{"profile_json": {"track_id": "machine_intelligence", "completed": [{"course_id": "CS37300", "grade": "A"}]}}'

# Expected: Shows progress on MI requirements
```

## Architecture

### Repository Structure
```
├── api_gateway/          # FastAPI application
├── db/migrations/        # Database schema
├── ingest/              # KB loading CLIs
├── planner/             # Deterministic planning engine
├── t2sql/               # Text-to-SQL compiler
├── packs/CS/            # Structured knowledge base
└── docker-compose.yml   # PostgreSQL setup
```

### Database Schema
- **Core**: majors, courses, prereqs, requirements, offerings, tracks, track_groups, policies
- **Extended**: course_details, course_levels, course_outcomes, course_aliases
- **Security**: Read-only SQL with whitelisted tables and operations

### Knowledge Base Files (packs/CS/)
- **requirements.json**: CS core requirements + seminar
- **tracks.json**: MI track with 4 buckets + 2 electives  
- **courses.csv**: Full course catalog with CS + support courses
- **prereqs.jsonl**: Prerequisite relationships (allof/oneof/coreq)
- **offerings.csv**: Term availability patterns
- **policies.json**: Academic policies and grade requirements
- **course_extras.jsonl**: Detailed course descriptions and outcomes
- **course_aliases.csv**: Short name mappings (CS240 -> CS24000)

## Development

### Technology Stack
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2
- **Database**: PostgreSQL 16
- **Dependencies**: networkx (graphs), numpy, psycopg2-binary
- **No RAG**: ENABLE_RAG=0 - all answers from SQL + planner

### Adding New Courses
1. Add to `packs/CS/courses.csv`
2. Add prerequisites to `packs/CS/prereqs.jsonl`
3. Add offerings to `packs/CS/offerings.csv`
4. Reload: `python -m ingest.cli --major_id CS --dir packs/CS`

### Adding New Tracks
1. Update `packs/CS/tracks.json` with track definition
2. Define track groups with need counts and course lists
3. Test track validation in planner

## Production Considerations

### Security
- Read-only SQL with parameterized queries
- Table whitelist prevents unauthorized access
- Input validation on all endpoints

### Performance  
- Indexed database for fast lookups
- Prerequisite graph caching with networkx
- Efficient track validation algorithms

### Monitoring
- Health checks at `/healthz`
- Structured error handling
- Academic policy compliance tracking

---

**Status**: Core implementation complete with Machine Intelligence track. Ready for testing and production deployment.

**RAG Status**: Intentionally disabled (ENABLE_RAG=0). All answers from structured SQL + deterministic planner.