-- Migration: Add RAG and Advisor Memory tables
-- Purpose: Support document indexing, vector search, and contextual advisor memory

-- Documents table for RAG source tracking
CREATE TABLE IF NOT EXISTS documents(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  uri TEXT,
  major_id TEXT DEFAULT 'CS',
  track_id TEXT,
  course_id TEXT,
  section TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Document chunks for vector search and retrieval
CREATE TABLE IF NOT EXISTS doc_chunks(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  ord INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  token_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  -- Vector column for pgvector (when not using Qdrant)
  -- Remove this column if using Qdrant as external vector store
  vector VECTOR(1536)
);

-- Advisor sessions for conversation tracking
CREATE TABLE IF NOT EXISTS advisor_sessions(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT now(),
  ended_at TIMESTAMP,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Advisor facts for long-term memory and context
CREATE TABLE IF NOT EXISTS advisor_facts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL, -- 'profile', 'preference', 'goal', 'transcript'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'user',
  updated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP,
  UNIQUE(user_id, kind, key)
);

-- Track metadata for structured retrieval (SE/MI objectives)
CREATE TABLE IF NOT EXISTS track_metadata(
  track_id TEXT PRIMARY KEY,
  objectives JSONB DEFAULT '[]'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb,
  requirements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_major_track ON documents(major_id, track_id);
CREATE INDEX IF NOT EXISTS idx_documents_course ON documents(course_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_id ON doc_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_text_search ON doc_chunks USING gin(to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS idx_advisor_sessions_user ON advisor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_facts_user_kind ON advisor_facts(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_advisor_facts_updated ON advisor_facts(updated_at);

-- Vector similarity search index (for pgvector)
-- CREATE INDEX IF NOT EXISTS idx_doc_chunks_vector ON doc_chunks USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- Comment: Uncomment the vector index above if using pgvector
-- For Qdrant vector backend, remove the vector column and use external storage

-- Track metadata for Computer Science tracks
INSERT INTO track_metadata (track_id, objectives, requirements) VALUES 
('MI', 
 '["Develop expertise in machine learning and artificial intelligence", "Understand theoretical foundations of intelligent systems", "Apply ML/AI techniques to real-world problems"]'::jsonb,
 '{"required_courses": 5, "elective_courses": 1, "min_grade": "C", "gpa_requirement": 2.0}'::jsonb
) ON CONFLICT (track_id) DO NOTHING;

INSERT INTO track_metadata (track_id, objectives, requirements) VALUES 
('SE', 
 '["Master software engineering principles and practices", "Develop large-scale system design skills", "Learn project management and team collaboration"]'::jsonb,
 '{"required_courses": 5, "elective_courses": 1, "min_grade": "C", "gpa_requirement": 2.0, "epics_substitution": true}'::jsonb
) ON CONFLICT (track_id) DO NOTHING;

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_track_metadata_updated_at BEFORE UPDATE ON track_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advisor_facts_updated_at BEFORE UPDATE ON advisor_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();