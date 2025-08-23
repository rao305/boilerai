# RAG-ON System Runbook

## Overview

Your BoilerAI system has been successfully upgraded to **RAG-ON** with comprehensive CS major support including:

- ✅ **Deterministic Planner** (degree progress & schedules)
- ✅ **Text-to-SQL** over locked schema (facts)
- ✅ **RAG** (hybrid retrieval + rerank + citations) over long-form docs
- ✅ **Transcript Ingestion** (PDF/PNG/CSV/MD → normalized JSON)
- ✅ **Contextual Awareness & Advisor Memory** (session + long-term)
- ✅ **Provider-agnostic LLMs/embeddings** (Gemini/OpenAI/local)
- ✅ **Self-checking** (grounding & contradiction detection)

## Quick Start

### 1. Environment Setup

Copy and configure your environment:

```bash
cp env.example .env
```

Edit `.env` with your API keys:

```bash
# LLM Provider (choose one)
LLM_PROVIDER=gemini  # or openai
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here

# Embedding Provider (can be different from LLM)
EMBED_PROVIDER=gemini  # or openai or local
EMBED_MODEL=text-embedding-004  # or text-embedding-3-large or all-MiniLM-L6-v2

# Vector Database
VECTOR_BACKEND=qdrant  # or pgvector
QDRANT_URL=http://localhost:6333

# Database
DATABASE_URL=postgresql://app:app@localhost:5432/boilerai

# Features
ENABLE_RAG=1
STRICT_INGEST=1
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Start Services

```bash
# Start PostgreSQL and Qdrant
docker-compose up -d postgres qdrant

# Wait for services to be ready
docker-compose ps
```

### 4. Run Database Migrations

```bash
python db/migrate.py
```

### 5. Index RAG Documents

```bash
# Index all CS documentation
python -m rag.indexer --dir packs/CS/docs

# Expected output: "Indexed X documents"
```

### 6. Test Integration

```bash
# Run comprehensive integration tests
python test_rag_integration.py

# All tests should pass ✅
```

### 7. Start API Server

```bash
uvicorn api_gateway.main:app --reload --host 0.0.0.0 --port 8000
```

## API Usage

### Core RAG-ON Endpoint

**POST /advisor/chat** - Main grounded academic advisor

```json
{
  "user_id": "student123",
  "query": "What are the prerequisites for CS38100?",
  "session_id": "optional_session_id"
}
```

**Response:**
```json
{
  "response": "CS38100 requires CS25100 and CS18200 [doc1]. Based on your transcript, you need to complete CS18200 first [doc2].",
  "citations": [
    {"tag": "[doc1]", "title": "CS38100 Course Info", "course_id": "CS38100"}
  ],
  "intents": ["facts_sql", "describe_course"],
  "confidence": 0.9,
  "sources": {"sql_used": true, "planning_used": true, "rag_used": true}
}
```

### Transcript Upload

**POST /transcript/ingest** - Upload and parse transcripts

```bash
curl -X POST "http://localhost:8000/transcript/ingest?user_id=student123" \
  -F "file=@transcript.pdf"
```

### User Profile

**GET /me/profile?user_id=student123** - Get complete user profile

```json
{
  "user_id": "student123",
  "transcript": {...},
  "goals": {"target_grad_term": "S2026", "chosen_track": "SE"},
  "preferences": {"max_credits": 15},
  "facts": {...}
}
```

## Testing Different Query Types

### 1. Factual Queries (SQL-backed)
```
"What are the prerequisites for CS38100?"
"How many credits is CS35200?"
"Which courses are only offered in Fall?"
```

### 2. Course Descriptions (RAG-backed)
```
"Tell me about CS35400"
"What does the Software Engineering track cover?"
"Explain the MI track requirements"
```

### 3. Planning Queries (Planner + RAG)
```
"Plan my courses for next semester with SE track"
"When should I take CS38100?"
"What's my graduation timeline?"
```

### 4. Policy Questions (RAG-backed)
```
"What's the grade policy for CS courses?"
"Can I retake a course?"
"What are the track declaration requirements?"
```

### 5. What-if Scenarios (All systems)
```
"What if I switch from MI to SE track?"
"What if I take CS40700 instead of CS35200?"
"How would taking 18 credits affect my timeline?"
```

## System Architecture

### Components

1. **RAG Indexer** (`rag/indexer.py`)
   - Echelon-style structure-aware chunking
   - Multi-provider embeddings (OpenAI/Gemini/local)
   - Dual storage (Qdrant + PostgreSQL)

2. **Hybrid Retriever** (`rag/retriever.py`)
   - BM25 lexical search + vector similarity
   - Reciprocal Rank Fusion (RRF)
   - Cross-encoder reranking

3. **Transcript Ingester** (`transcript/ingest.py`)
   - Multi-format support (PDF/PNG/CSV/MD)
   - LLM vision extraction + OCR fallback
   - Course alias mapping and validation

4. **Advisor Memory** (`advisor/memory.py`)
   - Long-term user context storage
   - Session rollup and summarization
   - Goal and preference tracking

5. **RAG Orchestrator** (`router/orchestrator.py`)
   - Intent classification and routing
   - Context assembly (SmartCourse fused context)
   - Grounding validation

### Data Flow

```
User Query → Intent Classification → Context Assembly → Response Generation → Grounding Check → User
     ↓              ↓                    ↓
   Memory         SQL Facts           RAG Retrieval
   Profile        Planner Data        Document Chunks
```

### Grounding Rules

- **SQL facts**: Authoritative for course data, prerequisites, credits
- **RAG citations**: Required for policies, descriptions, track rules
- **Planning output**: Authoritative for scheduling and requirements
- **Unknown data**: "Not modeled in structured KB yet—please add it to packs or docs"

## Content Management

### Adding New Courses

1. Add to `packs/CS/courses.csv`
2. Add prerequisites to `packs/CS/prereqs.jsonl`
3. Add detailed page to `packs/CS/docs/course_pages/cs{course_number}.md`
4. Re-run indexer: `python -m rag.indexer --dir packs/CS/docs`

### Adding New Policies

1. Add markdown file to `packs/CS/docs/`
2. Use clear headers and structured content
3. Re-run indexer to make searchable

### Track Modifications

1. Update `packs/CS/tracks.json` for requirements
2. Update `packs/CS/docs/track_mi.md` or `track_se.md` for descriptions
3. Re-run indexer for documentation changes

## Evaluation & Quality Assurance

### Run Context Ablation Tests

```bash
# Verify personalization beats question-only
python -m pytest tests/test_context_ablation.py -v

# Expected: Full context > No Planning > No Transcript > Question Only
```

### Monitor Response Quality

1. **Grounding Check**: All responses cite sources [doc#] when using RAG
2. **SQL Authority**: Factual queries use SQL results as ground truth
3. **Personalization**: Responses consider transcript and goals
4. **Coherence**: Planning integrates with user's academic status

## Troubleshooting

### Common Issues

**"No results from RAG retrieval"**
- Check if documents are indexed: `docker exec qdrant-container curl http://localhost:6333/collections/boilerai_docs`
- Re-run indexer: `python -m rag.indexer --dir packs/CS/docs`

**"LLM API errors"**
- Verify API keys in `.env`
- Check rate limits and billing
- Use `LLM_PROVIDER=local` for testing

**"Database connection failed"**
- Ensure PostgreSQL is running: `docker-compose ps postgres`
- Check migrations: `python db/migrate.py`

**"Missing citations in responses"**
- Check grounding validation in orchestrator
- Verify RAG retrieval is returning results
- Review prompts for citation instructions

### Debug Mode

Enable detailed logging:

```bash
export DEBUG_TRACE=1
python test_rag_integration.py
```

## Performance Optimization

### Vector Search Tuning

- **Qdrant**: Optimize collection configuration for your data size
- **pgvector**: Create appropriate indexes for vector similarity
- **Embedding models**: Balance speed vs. quality (local < OpenAI < Gemini)

### Retrieval Tuning

- **top_k_lexical**: Default 24, increase for broader recall
- **top_k_semantic**: Default 24, increase for better semantic matching
- **reranking**: Disable if speed is critical (`enable_reranking=False`)

### Caching Strategy

- **Document embeddings**: Cached in vector store
- **User profiles**: Cached in advisor memory
- **SQL results**: Consider adding Redis cache for expensive queries

## Security Considerations

- **API keys**: Never commit to version control
- **User data**: PII stored only in advisor memory with proper retention
- **SQL injection**: Parameterized queries and AST validation
- **Input validation**: File upload size limits and type checking

## Next Steps

1. **Custom Tracks**: Add new majors/concentrations to `packs/`
2. **Advanced Planning**: Integrate with course scheduling APIs
3. **Analytics**: Add usage metrics and response quality tracking
4. **UI Integration**: Connect frontend to new `/advisor/chat` endpoint
5. **Mobile Support**: Optimize for mobile transcript upload via camera

## Support

For issues or questions:
1. Check logs in `api_gateway.log` and `backend.log`
2. Run integration tests to isolate problems
3. Review the RAG-ON architecture documentation above
4. Check individual component tests in `tests/` directory

---

🎉 **Your RAG-ON system is now ready!** 

The system provides grounded, personalized academic advising with full citation tracking and self-validation. All responses are backed by either SQL facts or RAG citations, ensuring accuracy and transparency.