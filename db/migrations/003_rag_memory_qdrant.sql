-- Qdrant-only RAG tables (no pgvector extension required)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uri TEXT UNIQUE NOT NULL,          -- e.g., packs/CS/docs/course_pages/CS35400.md
  title TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  token_count INT NOT NULL,
  vector_ref TEXT,                   -- Qdrant point ID
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (doc_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_documents_uri ON documents(uri);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON doc_chunks(doc_id);

