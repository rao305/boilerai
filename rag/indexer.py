"""
RAG Document Indexer with Echelon-style structure-aware chunking.

Supports multiple embedding providers (OpenAI, Google, local) and vector backends
(Qdrant, pgvector) for flexible deployment.
"""

import os
import re
import uuid
import logging
import hashlib
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import asyncpg
import tiktoken
from dataclasses import dataclass
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import google.generativeai as genai
from openai import OpenAI
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

@dataclass
class DocumentChunk:
    """Represents a document chunk with metadata."""
    text: str
    metadata: Dict[str, Any]
    token_count: int
    doc_id: str
    chunk_index: int

@dataclass
class Document:
    """Represents a source document."""
    id: str
    source: str
    uri: str
    major_id: str = "CS"
    track_id: Optional[str] = None
    course_id: Optional[str] = None
    section: Optional[str] = None

class EmbeddingProvider:
    """Abstract base for embedding providers."""
    
    async def embed_text(self, text: str) -> List[float]:
        raise NotImplementedError
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple texts efficiently."""
        return [await self.embed_text(text) for text in texts]

class OpenAIEmbedding(EmbeddingProvider):
    """OpenAI embedding provider."""
    
    def __init__(self, api_key: str, model: str = "text-embedding-3-large"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
    
    async def embed_text(self, text: str) -> List[float]:
        response = self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        response = self.client.embeddings.create(
            input=texts,
            model=self.model
        )
        return [item.embedding for item in response.data]

class GeminiEmbedding(EmbeddingProvider):
    """Google Gemini embedding provider."""
    
    def __init__(self, api_key: str, model: str = "text-embedding-004"):
        genai.configure(api_key=api_key)
        self.model = model
    
    async def embed_text(self, text: str) -> List[float]:
        result = genai.embed_content(
            model=f"models/{self.model}",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        # Gemini API handles batching internally
        results = []
        for text in texts:
            embedding = await self.embed_text(text)
            results.append(embedding)
        return results

class LocalEmbedding(EmbeddingProvider):
    """Local sentence-transformers embedding provider."""
    
    def __init__(self, model: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model)
    
    async def embed_text(self, text: str) -> List[float]:
        embedding = self.model.encode(text)
        return embedding.tolist()
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        embeddings = self.model.encode(texts)
        return embeddings.tolist()

class VectorStore:
    """Abstract base for vector storage backends."""
    
    async def upsert_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]):
        raise NotImplementedError
    
    async def delete_document(self, doc_id: str):
        raise NotImplementedError

class QdrantStore(VectorStore):
    """Qdrant vector store implementation."""
    
    def __init__(self, url: str, collection_name: str = "boilerai_docs", vector_size: int = 1536):
        self.client = QdrantClient(url=url)
        self.collection_name = collection_name
        self.vector_size = vector_size
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Create collection if it doesn't exist."""
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE)
            )
    
    async def upsert_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]):
        """Upload chunks with embeddings to Qdrant."""
        points = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=embedding,
                payload={
                    "text": chunk.text,
                    "metadata": chunk.metadata,
                    "doc_id": chunk.doc_id,
                    "chunk_index": chunk.chunk_index,
                    "token_count": chunk.token_count
                }
            )
            points.append(point)
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
    
    async def delete_document(self, doc_id: str):
        """Delete all chunks for a document."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector={"must": [{"key": "doc_id", "match": {"value": doc_id}}]}
        )

class PgVectorStore(VectorStore):
    """PostgreSQL with pgvector extension store."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
    
    async def upsert_chunks(self, chunks: List[DocumentChunk], embeddings: List[List[float]]):
        """Insert chunks with embeddings into PostgreSQL."""
        conn = await asyncpg.connect(self.database_url)
        try:
            for chunk, embedding in zip(chunks, embeddings):
                await conn.execute("""
                    INSERT INTO doc_chunks (id, doc_id, chunk_index, text, token_count, meta, vector)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (doc_id, chunk_index) DO UPDATE SET
                        text = EXCLUDED.text,
                        token_count = EXCLUDED.token_count,
                        meta = EXCLUDED.meta,
                        vector = EXCLUDED.vector
                """, str(uuid.uuid4()), chunk.doc_id, chunk.chunk_index, chunk.text, 
                    chunk.token_count, json.dumps(chunk.metadata), embedding)
        finally:
            await conn.close()
    
    async def delete_document(self, doc_id: str):
        """Delete all chunks for a document."""
        conn = await asyncpg.connect(self.database_url)
        try:
            await conn.execute("DELETE FROM doc_chunks WHERE doc_id = $1", doc_id)
        finally:
            await conn.close()

class DocumentChunker:
    """Structure-aware document chunker using Echelon-style approach."""
    
    def __init__(self, chunk_size: int = 800, overlap: int = 120):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))
    
    def split_by_headers(self, content: str) -> List[Tuple[str, str, int]]:
        """Split content by H1/H2/H3 headers."""
        sections = []
        lines = content.split('\n')
        current_section = ""
        current_header = ""
        current_level = 0
        
        for line in lines:
            # Check for markdown headers
            header_match = re.match(r'^(#{1,3})\s+(.+)$', line.strip())
            if header_match:
                # Save previous section
                if current_section.strip():
                    sections.append((current_header, current_section.strip(), current_level))
                
                # Start new section
                level = len(header_match.group(1))
                current_header = header_match.group(2)
                current_level = level
                current_section = line + '\n'
            else:
                current_section += line + '\n'
        
        # Add final section
        if current_section.strip():
            sections.append((current_header, current_section.strip(), current_level))
        
        return sections
    
    def chunk_section(self, content: str, header: str = "") -> List[str]:
        """Chunk a section into smaller pieces with overlap."""
        paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
        chunks = []
        current_chunk = header + '\n\n' if header else ""
        
        for paragraph in paragraphs:
            # Check if adding paragraph exceeds chunk size
            test_chunk = current_chunk + paragraph + '\n\n'
            if self.count_tokens(test_chunk) > self.chunk_size and current_chunk:
                # Save current chunk and start new one with overlap
                chunks.append(current_chunk.strip())
                
                # Create overlap by taking last sentence(s)
                overlap_text = self._create_overlap(current_chunk)
                current_chunk = overlap_text + paragraph + '\n\n'
            else:
                current_chunk = test_chunk
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _create_overlap(self, text: str) -> str:
        """Create overlap text from end of previous chunk."""
        sentences = text.split('. ')
        if len(sentences) <= 1:
            return ""
        
        # Take last 1-2 sentences for overlap
        overlap_sentences = sentences[-2:] if len(sentences) >= 2 else sentences[-1:]
        overlap = '. '.join(overlap_sentences)
        
        # Ensure overlap doesn't exceed overlap limit
        if self.count_tokens(overlap) > self.overlap:
            # Truncate to fit overlap limit
            words = overlap.split()
            while words and self.count_tokens(' '.join(words)) > self.overlap:
                words.pop(0)
            overlap = ' '.join(words)
        
        return overlap + '\n\n' if overlap else ""
    
    def chunk_document(self, content: str, metadata: Dict[str, Any]) -> List[DocumentChunk]:
        """Chunk entire document with structure awareness."""
        sections = self.split_by_headers(content)
        chunks = []
        chunk_index = 0
        
        # If no headers found, treat as single section
        if not sections:
            sections = [("", content, 0)]
        
        for header, section_content, level in sections:
            section_chunks = self.chunk_section(section_content, header)
            
            for chunk_text in section_chunks:
                # Enhance metadata with section info
                chunk_metadata = {
                    **metadata,
                    "section": header,
                    "section_level": level,
                    "chunk_index": chunk_index
                }
                
                chunk = DocumentChunk(
                    text=chunk_text,
                    metadata=chunk_metadata,
                    token_count=self.count_tokens(chunk_text),
                    doc_id=metadata.get("doc_id", ""),
                    chunk_index=chunk_index
                )
                chunks.append(chunk)
                chunk_index += 1
        
        return chunks

class RAGIndexer:
    """Main RAG indexer orchestrating chunking, embedding, and storage."""
    
    def __init__(self, 
                 embedding_provider: EmbeddingProvider,
                 vector_store: VectorStore,
                 database_url: str):
        self.embedding_provider = embedding_provider
        self.vector_store = vector_store
        self.database_url = database_url
        self.chunker = DocumentChunker()
    
    async def index_file(self, filepath: Path, metadata: Dict[str, Any] = None) -> str:
        """Index a single file."""
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        # Read file content
        content = filepath.read_text(encoding='utf-8')
        
        # Extract metadata from filename and path
        file_metadata = self._extract_file_metadata(filepath)
        if metadata:
            file_metadata.update(metadata)
        
        # Create document record
        doc_id = str(uuid.uuid4())
        document = Document(
            id=doc_id,
            source=str(filepath),
            uri=f"file://{filepath}",
            major_id=file_metadata.get("major_id", "CS"),
            track_id=file_metadata.get("track_id"),
            course_id=file_metadata.get("course_id"),
            section=file_metadata.get("section")
        )
        
        # Store document in database
        await self._store_document(document)
        
        # Chunk document
        file_metadata["doc_id"] = doc_id
        chunks = self.chunker.chunk_document(content, file_metadata)
        
        if not chunks:
            logger.warning(f"No chunks generated for {filepath}")
            return doc_id
        
        # Generate embeddings
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = await self.embedding_provider.embed_batch(chunk_texts)
        
        # Store chunks and embeddings
        await self.vector_store.upsert_chunks(chunks, embeddings)
        await self._store_chunks(chunks)
        
        logger.info(f"Indexed {filepath}: {len(chunks)} chunks, {sum(c.token_count for c in chunks)} tokens")
        return doc_id
    
    async def index_directory(self, directory: Path, pattern: str = "**/*.md") -> List[str]:
        """Index all files in directory matching pattern."""
        doc_ids = []
        files = list(directory.glob(pattern))
        
        logger.info(f"Indexing {len(files)} files from {directory}")
        
        for filepath in files:
            try:
                doc_id = await self.index_file(filepath)
                doc_ids.append(doc_id)
            except Exception as e:
                logger.error(f"Failed to index {filepath}: {e}")
        
        return doc_ids
    
    def _extract_file_metadata(self, filepath: Path) -> Dict[str, Any]:
        """Extract metadata from file path and name."""
        metadata = {}
        
        # Extract from path components
        parts = filepath.parts
        if "packs" in parts:
            pack_idx = parts.index("packs")
            if pack_idx + 1 < len(parts):
                metadata["major_id"] = parts[pack_idx + 1]
        
        # Extract from filename patterns
        filename = filepath.stem
        
        # Course ID pattern (e.g., CS35200, cs_180)
        course_match = re.search(r'([A-Z]{2,4})[\s_-]?(\d{3,5})', filename.upper())
        if course_match:
            metadata["course_id"] = course_match.group(1) + course_match.group(2)
        
        # Track pattern (MI, SE)
        if re.search(r'\b(mi|machine.?intelligence)\b', filename.lower()):
            metadata["track_id"] = "MI"
        elif re.search(r'\b(se|software.?engineering)\b', filename.lower()):
            metadata["track_id"] = "SE"
        
        # Section from filename
        if "policy" in filename.lower() or "policies" in filename.lower():
            metadata["section"] = "policies"
        elif "core" in filename.lower():
            metadata["section"] = "core"
        elif "track" in filename.lower():
            metadata["section"] = "track_info"
        
        return metadata
    
    async def _store_document(self, document: Document):
        """Store document record in database."""
        conn = await asyncpg.connect(self.database_url)
        try:
            await conn.execute("""
                INSERT INTO documents (id, source, uri, major_id, track_id, course_id, section)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    source = EXCLUDED.source,
                    uri = EXCLUDED.uri,
                    major_id = EXCLUDED.major_id,
                    track_id = EXCLUDED.track_id,
                    course_id = EXCLUDED.course_id,
                    section = EXCLUDED.section
            """, document.id, document.source, document.uri, 
                document.major_id, document.track_id, document.course_id, document.section)
        finally:
            await conn.close()
    
    async def _store_chunks(self, chunks: List[DocumentChunk]):
        """Store chunks metadata in database (not vectors for Qdrant)."""
        if not chunks:
            return
        
        conn = await asyncpg.connect(self.database_url)
        try:
            for chunk in chunks:
                await conn.execute("""
                    INSERT INTO doc_chunks (id, doc_id, chunk_index, text, token_count, meta)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (doc_id, chunk_index) DO UPDATE SET
                        text = EXCLUDED.text,
                        token_count = EXCLUDED.token_count,
                        meta = EXCLUDED.meta
                """, str(uuid.uuid4()), chunk.doc_id, chunk.chunk_index, chunk.text,
                    chunk.token_count, json.dumps(chunk.metadata))
        finally:
            await conn.close()

def create_indexer(
    embed_provider: str = "gemini",
    vector_backend: str = "qdrant",
    embed_model: str = None,
    database_url: str = None,
    qdrant_url: str = None,
    openai_key: str = None,
    gemini_key: str = None
) -> RAGIndexer:
    """Factory function to create configured indexer."""
    
    # Create embedding provider and determine vector size
    if embed_provider == "openai":
        if not openai_key:
            raise ValueError("OpenAI API key required")
        embedding = OpenAIEmbedding(openai_key, embed_model or "text-embedding-3-large")
        vector_size = 3072  # text-embedding-3-large size
    elif embed_provider == "gemini":
        if not gemini_key:
            raise ValueError("Gemini API key required")
        embedding = GeminiEmbedding(gemini_key, embed_model or "text-embedding-004")
        vector_size = 768   # text-embedding-004 size
    elif embed_provider == "local":
        embedding = LocalEmbedding(embed_model or "all-MiniLM-L6-v2")
        vector_size = 384   # all-MiniLM-L6-v2 size
    else:
        raise ValueError(f"Unknown embedding provider: {embed_provider}")
    
    # Create vector store
    if vector_backend == "qdrant":
        if not qdrant_url:
            raise ValueError("Qdrant URL required")
        vector_store = QdrantStore(qdrant_url, vector_size=vector_size)
    elif vector_backend == "pgvector":
        if not database_url:
            raise ValueError("Database URL required for pgvector")
        vector_store = PgVectorStore(database_url)
    else:
        raise ValueError(f"Unknown vector backend: {vector_backend}")
    
    if not database_url:
        raise ValueError("Database URL required")
    
    return RAGIndexer(embedding, vector_store, database_url)

# CLI entry point
async def main():
    """CLI entry point for indexing."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Index documents for RAG")
    parser.add_argument("--dir", required=True, help="Directory to index")
    parser.add_argument("--pattern", default="**/*.md", help="File pattern to match")
    args = parser.parse_args()
    
    # Get configuration from environment
    embed_provider = os.getenv("EMBED_PROVIDER", "gemini")
    vector_backend = os.getenv("VECTOR_BACKEND", "qdrant")
    embed_model = os.getenv("EMBED_MODEL")
    database_url = os.getenv("DATABASE_URL")
    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    # Create indexer
    indexer = create_indexer(
        embed_provider=embed_provider,
        vector_backend=vector_backend,
        embed_model=embed_model,
        database_url=database_url,
        qdrant_url=qdrant_url,
        openai_key=openai_key,
        gemini_key=gemini_key
    )
    
    # Index directory
    directory = Path(args.dir)
    doc_ids = await indexer.index_directory(directory, args.pattern)
    
    print(f"Indexed {len(doc_ids)} documents")

if __name__ == "__main__":
    asyncio.run(main())