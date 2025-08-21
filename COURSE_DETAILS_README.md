# Comprehensive CS Pack System for Boiler AI

This system provides a complete knowledge base for Computer Science degree planning, including rich course information, prerequisites, requirements, tracks, and degree structure - all without requiring RAG (pure text-to-SQL over structured tables).

## What's Included

### 1. **Complete CS Curriculum** (`packs/CS/`)
- **6 Core CS Courses** with full details (CS18000, CS18200, CS24000, CS25000, CS25100, CS25200)
- **Supporting Courses** (seminars, alt-path options)
- **12 Math Prerequisites** with multiple pathways
- **Prerequisites & Requirements** with complex logic (one-of, all-of combinations)
- **Track Structure** (software engineering, machine intelligence)
- **Course Offerings** (Fall/Spring patterns)

### 2. **Database Schema** (`db/migrations/002_course_details.sql`)
- `course_details` - Long descriptions, credit hours, department info
- `course_levels` - Graduate/Professional/Undergraduate levels
- `course_schedule_types` - Lecture, Lab, Recitation, etc.
- `course_campuses` - Indianapolis, West Lafayette, etc.
- `course_outcomes` - Learning outcomes and objectives
- `course_program_restrictions` - Which programs can take the course
- `course_aliases` - "CS 240" → "CS24000" mapping

### 3. **Rich Course Data** (`packs/CS/course_extras.jsonl`)
- **Full details** for all 6 CS core courses
- **Stub placeholders** for Math/alt-path courses (prevents 404s)
- Schedule types, campuses, learning outcomes, program restrictions

### 4. **Prerequisite Logic** (`packs/CS/prereqs.jsonl`)
- **CS18000**: Any single calculus OR calculus sequence (9 math options)
- **CS18200**: CS17600 OR CS18000 + math prerequisites
- **CS24000**: CS18000 required
- **CS25000**: CS18200 + CS24000 (both required)
- **CS25100**: CS18200 + programming (CS24000 OR CS24200 OR STAT24200)
- **CS25200**: CS25000 + CS25100 (both required)

### 5. **Degree Requirements** (`packs/CS/requirements.json`)
- **CS Core**: 6 required courses
- **Seminar**: 1 required (CS19300 Tools)
- **Policies**: 18 max credits/term, C minimum grade

### 6. **Track Structure** (`packs/CS/tracks.json`)
- **Software Engineering** (placeholder for future content)
- **Machine Intelligence** (placeholder for future content)

## Setup Instructions

### Quick Setup
```bash
# Run the automated setup
./setup_course_details.sh
```

### Manual Setup
```bash
# 1. Install dependencies
uv sync  # or pip install -r requirements/base.txt

# 2. Apply migrations
uv run python -m db.migrate

# 3. Load core CS pack
uv run python -m ingest.cli --major_id CS --dir packs/CS

# 4. Load course details
uv run python -m ingest.extras_cli --dir packs/CS

# 5. Test the system
uv run python test_course_details.py
```

## Example Queries

The AI can now answer comprehensive questions like:

### **Course Information**
- **"Tell me about CS 240"** → Full details, description, outcomes, schedule types, campuses
- **"Which campuses offer CS 18000?"** → Indianapolis, West Lafayette
- **"What are the learning outcomes for CS 18200?"** → Discrete math understanding

### **Prerequisites & Pathways**
- **"What Math options satisfy CS18000's prereq?"** → Lists all 9 math alternatives
- **"Show prerequisites for CS25000"** → CS18200 + CS24000 (both required)
- **"What are alternative paths for CS25100 programming prereq?"** → CS24000, CS24200, or STAT24200

### **Degree Planning**
- **"List all CS core requirements"** → 6 core courses + 1 seminar
- **"Show remaining requirements for CS core"** → SQL-based degree audit
- **"What courses can I take next semester?"** → Based on completed prerequisites

### **Schedule & Offerings**
- **"List offerings for MA16500"** → Fall + Spring (F,S)
- **"When is CS19300 offered?"** → Fall only
- **"List schedule types for CS 25100"** → Distance Learning, Lecture, Practice Study Observation

## How It Works

1. **Alias Resolution:** User says "CS 240" → system looks up `course_aliases` table
2. **Main Query:** Fetches course details, title, credits from `courses` + `course_details`
3. **Prerequisites:** Queries `prereqs` table with complex logic (one-of, all-of)
4. **Requirements:** Checks `requirements` table for degree progress
5. **Related Data:** Queries separate tables for schedule types, campuses, outcomes, etc.
6. **Natural Language:** Combines all results into a comprehensive answer

## Database Schema

```
courses (existing)
├── course_details (new)
├── course_levels (new)
├── course_schedule_types (new)
├── course_campuses (new)
├── course_outcomes (new)
├── course_program_restrictions (new)
├── course_aliases (new)
├── prereqs (existing)
├── requirements (existing)
├── offerings (existing)
└── tracks (existing)
```

## Prerequisite Logic Examples

### CS18000 Entry Point
```json
{
  "kind": "oneof",
  "expr": [
    ["MA16100"],           // Single course
    ["MA22100","MA22200"], // Sequence (both required)
    ["MA16010","MA16020"], // Sequence (both required)
    ["MATH16500"]          // Single course
  ]
}
```

### CS25000 Both Required
```json
{
  "kind": "allof",
  "expr": ["CS18200","CS24000"]  // Both courses required
}
```

## Adding More Content

### 1. **Fill Math Descriptions**
Replace "TO FILL" placeholders in `course_extras.jsonl` with official catalog descriptions.

### 2. **Define Track Content**
Update `tracks.json` with actual required and elective courses for each track.

### 3. **Add More Courses**
- Add to `courses.csv`
- Add to `offerings.csv`
- Add to `course_extras.jsonl`
- Add to `prereqs.jsonl` if needed

## Benefits

- **No RAG Required** - All data in structured tables
- **Rich Information** - Detailed course descriptions and metadata
- **Complex Logic** - Handles one-of, all-of prerequisite combinations
- **Natural Language** - "CS 240" works just like "CS24000"
- **Performance** - Indexed tables for fast queries
- **Safety** - T2SQL validation prevents SQL injection
- **Extensible** - Easy to add more courses and details
- **Degree Planning** - Full prerequisite and requirement tracking

## Troubleshooting

### Migration Fails
- Check database connection string in `DATABASE_URL`
- Ensure PostgreSQL is running
- Check migration file syntax

### Data Not Loading
- Verify all files exist in `packs/CS/`
- Check database permissions
- Look for error messages in console output

### Queries Not Working
- Verify T2SQL schema includes new tables
- Check table names match exactly
- Ensure all required columns are present

### Prerequisites Not Working
- Check `prereqs.jsonl` format
- Verify course IDs match exactly
- Check prerequisite logic (one-of vs all-of)

## Next Steps

1. **Ingest the pack** using the provided commands
2. **Test queries** to verify functionality
3. **Fill placeholders** as official descriptions become available
4. **Define track content** when curriculum is finalized
5. **Add more courses** as needed

For detailed information about the current state and todos, see `packs/CS/REVIEW.md`.
