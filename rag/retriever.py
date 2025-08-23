"""
RAG Retriever with hybrid search (BM25 + vector) and reranking.

Implements Reciprocal Rank Fusion (RRF) and optional cross-encoder reranking
for high-quality retrieval with citations.
"""

import os
import re
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import asyncpg
import numpy as np
from rapidfuzz import fuzz
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import CrossEncoder
import google.generativeai as genai
from openai import OpenAI

logger = logging.getLogger(__name__)

@dataclass
class RetrievedChunk:
    """A retrieved document chunk with relevance scoring."""
    id: str
    text: str
    metadata: Dict[str, Any]
    doc_id: str
    rank: int
    score: float
    retrieval_method: str  # 'lexical', 'semantic', 'hybrid'

@dataclass
class Citation:
    """A citation for retrieved content."""
    tag: str  # [doc1], [doc2], etc.
    uri: str
    title: str
    course_id: Optional[str] = None
    section: Optional[str] = None
    doc_id: Optional[str] = None

@dataclass
class RetrievalResult:
    """Complete retrieval result with chunks and citations."""
    chunks: List[RetrievedChunk]
    citations: List[Citation]
    query: str
    total_chunks: int
    retrieval_time_ms: float

class BM25Searcher:
    """Simple BM25 lexical search over document chunks."""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.k1 = 1.2
        self.b = 0.75
    
    def _preprocess_query(self, query: str) -> List[str]:
        """Preprocess query into search terms."""
        # Remove special characters, convert to lowercase
        query = re.sub(r'[^\w\s]', ' ', query.lower())
        # Split and filter stop words
        terms = [term for term in query.split() if len(term) > 2]
        return terms
    
    async def search(self, query: str, top_k: int = 24, filters: Dict[str, Any] = None) -> List[RetrievedChunk]:
        """Perform BM25 search using PostgreSQL full-text search."""
        terms = self._preprocess_query(query)
        if not terms:
            return []
        
        # Build FTS query
        fts_query = ' & '.join(terms)
        
        # Build filter conditions
        where_conditions = []
        params = [fts_query, top_k]
        param_idx = 2
        
        if filters:
            if filters.get('course_id'):
                param_idx += 1
                where_conditions.append(f"metadata->>'course_id' = ${param_idx}")
                params.append(filters['course_id'])
            
            if filters.get('track_id'):
                param_idx += 1
                where_conditions.append(f"metadata->>'track_id' = ${param_idx}")
                params.append(filters['track_id'])
            
            if filters.get('section'):
                param_idx += 1
                where_conditions.append(f"metadata->>'section' = ${param_idx}")
                params.append(filters['section'])
        
        where_clause = ""
        if where_conditions:
            where_clause = "AND " + " AND ".join(where_conditions)
        
        # Execute search query
        conn = await asyncpg.connect(self.database_url)
        try:
            rows = await conn.fetch(f"""
                SELECT id, doc_id, text, metadata, ord,
                       ts_rank(to_tsvector('english', text), plainto_tsquery('english', $1)) as rank_score
                FROM doc_chunks
                WHERE to_tsvector('english', text) @@ plainto_tsquery('english', $1)
                {where_clause}
                ORDER BY rank_score DESC
                LIMIT $2
            """, *params)
            
            chunks = []
            for i, row in enumerate(rows):
                chunk = RetrievedChunk(
                    id=row['id'],
                    text=row['text'],
                    metadata=row['metadata'] or {},
                    doc_id=row['doc_id'],
                    rank=i + 1,
                    score=float(row['rank_score']),
                    retrieval_method='lexical'
                )
                chunks.append(chunk)
            
            return chunks
        
        finally:
            await conn.close()

class VectorSearcher:
    """Vector similarity search using embedding providers."""
    
    def __init__(self, 
                 vector_backend: str,
                 database_url: str = None,
                 qdrant_url: str = None,
                 embedding_provider = None):
        self.vector_backend = vector_backend
        self.database_url = database_url
        self.embedding_provider = embedding_provider
        
        if vector_backend == "qdrant":
            self.qdrant_client = QdrantClient(url=qdrant_url)
            self.collection_name = "boilerai_docs"
        elif vector_backend == "pgvector":
            if not database_url:
                raise ValueError("Database URL required for pgvector")
    
    async def search(self, query: str, top_k: int = 24, filters: Dict[str, Any] = None) -> List[RetrievedChunk]:
        """Perform vector similarity search."""
        if not self.embedding_provider:
            return []
        
        # Get query embedding
        query_embedding = await self.embedding_provider.embed_text(query)
        
        if self.vector_backend == "qdrant":
            return await self._search_qdrant(query_embedding, top_k, filters)
        elif self.vector_backend == "pgvector":
            return await self._search_pgvector(query_embedding, top_k, filters)
        else:
            return []
    
    async def _search_qdrant(self, query_embedding: List[float], top_k: int, filters: Dict[str, Any]) -> List[RetrievedChunk]:
        """Search using Qdrant vector database."""
        # Build Qdrant filter
        qdrant_filter = None
        if filters:
            conditions = []
            for key, value in filters.items():
                if value:
                    conditions.append(FieldCondition(key=f"metadata.{key}", match=MatchValue(value=value)))
            
            if conditions:
                qdrant_filter = Filter(must=conditions)
        
        # Perform search
        results = self.qdrant_client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            query_filter=qdrant_filter,
            limit=top_k,
            with_payload=True
        )
        
        chunks = []
        for i, result in enumerate(results):
            payload = result.payload
            chunk = RetrievedChunk(
                id=str(result.id),
                text=payload['text'],
                metadata=payload.get('metadata', {}),
                doc_id=payload['doc_id'],
                rank=i + 1,
                score=float(result.score),
                retrieval_method='semantic'
            )
            chunks.append(chunk)
        
        return chunks
    
    async def _search_pgvector(self, query_embedding: List[float], top_k: int, filters: Dict[str, Any]) -> List[RetrievedChunk]:
        """Search using PostgreSQL with pgvector."""
        # Build filter conditions
        where_conditions = []
        params = [query_embedding, top_k]
        param_idx = 2
        
        if filters:
            if filters.get('course_id'):
                param_idx += 1
                where_conditions.append(f"metadata->>'course_id' = ${param_idx}")
                params.append(filters['course_id'])
            
            if filters.get('track_id'):
                param_idx += 1
                where_conditions.append(f"metadata->>'track_id' = ${param_idx}")
                params.append(filters['track_id'])
            
            if filters.get('section'):
                param_idx += 1
                where_conditions.append(f"metadata->>'section' = ${param_idx}")
                params.append(filters['section'])
        
        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)
        
        conn = await asyncpg.connect(self.database_url)
        try:
            rows = await conn.fetch(f"""
                SELECT id, doc_id, text, metadata, ord,
                       1 - (vector <=> $1) as similarity
                FROM doc_chunks
                {where_clause}
                ORDER BY vector <=> $1
                LIMIT $2
            """, *params)
            
            chunks = []
            for i, row in enumerate(rows):
                chunk = RetrievedChunk(
                    id=row['id'],
                    text=row['text'],
                    metadata=row['metadata'] or {},
                    doc_id=row['doc_id'],
                    rank=i + 1,
                    score=float(row['similarity']),
                    retrieval_method='semantic'
                )
                chunks.append(chunk)
            
            return chunks
        
        finally:
            await conn.close()

class Reranker:
    """Cross-encoder reranker for improving retrieval quality."""
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        try:
            self.model = CrossEncoder(model_name)
            self.enabled = True
        except Exception as e:
            logger.warning(f"Failed to load reranker model: {e}")
            self.model = None
            self.enabled = False
    
    def rerank(self, query: str, chunks: List[RetrievedChunk], top_k: int = 6) -> List[RetrievedChunk]:
        """Rerank chunks using cross-encoder."""
        if not self.enabled or not chunks:
            return chunks[:top_k]
        
        # Prepare pairs for cross-encoder
        pairs = [(query, chunk.text) for chunk in chunks]
        
        # Get rerank scores
        scores = self.model.predict(pairs)
        
        # Update chunks with new scores and rerank
        for chunk, score in zip(chunks, scores):
            chunk.score = float(score)
            chunk.retrieval_method = 'hybrid'
        
        # Sort by new scores and return top_k
        chunks.sort(key=lambda x: x.score, reverse=True)
        
        # Update ranks
        for i, chunk in enumerate(chunks[:top_k]):
            chunk.rank = i + 1
        
        return chunks[:top_k]

class HybridRetriever:
    """Hybrid retriever combining BM25 and vector search with RRF."""
    
    def __init__(self,
                 database_url: str,
                 vector_backend: str = "qdrant",
                 qdrant_url: str = None,
                 embedding_provider = None,
                 enable_reranking: bool = True):
        
        self.bm25_searcher = BM25Searcher(database_url)
        self.vector_searcher = VectorSearcher(
            vector_backend=vector_backend,
            database_url=database_url,
            qdrant_url=qdrant_url,
            embedding_provider=embedding_provider
        )
        self.reranker = Reranker() if enable_reranking else None
        self.database_url = database_url
    
    def reciprocal_rank_fusion(self, 
                              lexical_results: List[RetrievedChunk],
                              semantic_results: List[RetrievedChunk],
                              k: int = 60) -> List[RetrievedChunk]:
        """Combine lexical and semantic results using RRF."""
        
        # Create score maps
        chunk_scores = {}
        chunk_objects = {}
        
        # Process lexical results
        for rank, chunk in enumerate(lexical_results):
            rrf_score = 1.0 / (k + rank + 1)
            chunk_scores[chunk.id] = chunk_scores.get(chunk.id, 0) + rrf_score
            chunk_objects[chunk.id] = chunk
        
        # Process semantic results
        for rank, chunk in enumerate(semantic_results):
            rrf_score = 1.0 / (k + rank + 1)
            chunk_scores[chunk.id] = chunk_scores.get(chunk.id, 0) + rrf_score
            chunk_objects[chunk.id] = chunk
        
        # Sort by combined RRF score
        sorted_chunks = sorted(
            chunk_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Create final ranked list
        hybrid_results = []
        for rank, (chunk_id, score) in enumerate(sorted_chunks):
            chunk = chunk_objects[chunk_id]
            chunk.score = score
            chunk.rank = rank + 1
            chunk.retrieval_method = 'hybrid'
            hybrid_results.append(chunk)
        
        return hybrid_results
    
    async def retrieve(self,
                      query: str,
                      top_k: int = 6,
                      top_k_lexical: int = 24,
                      top_k_semantic: int = 24,
                      filters: Dict[str, Any] = None,
                      enable_reranking: bool = True) -> RetrievalResult:
        """Perform hybrid retrieval with optional reranking."""
        
        import time
        start_time = time.time()
        
        # Perform parallel searches
        lexical_task = self.bm25_searcher.search(query, top_k_lexical, filters)
        semantic_task = self.vector_searcher.search(query, top_k_semantic, filters)
        
        lexical_results, semantic_results = await asyncio.gather(
            lexical_task, semantic_task, return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(lexical_results, Exception):
            logger.error(f"Lexical search failed: {lexical_results}")
            lexical_results = []
        
        if isinstance(semantic_results, Exception):
            logger.error(f"Semantic search failed: {semantic_results}")
            semantic_results = []
        
        # Combine using RRF
        if lexical_results and semantic_results:
            hybrid_results = self.reciprocal_rank_fusion(lexical_results, semantic_results)
        elif lexical_results:
            hybrid_results = lexical_results
        elif semantic_results:
            hybrid_results = semantic_results
        else:
            hybrid_results = []
        
        # Take top results before reranking
        hybrid_results = hybrid_results[:12]  # More for reranking
        
        # Optional reranking
        if enable_reranking and self.reranker and hybrid_results:
            hybrid_results = self.reranker.rerank(query, hybrid_results, top_k)
        else:
            hybrid_results = hybrid_results[:top_k]
        
        # Generate citations
        citations = await self._generate_citations(hybrid_results)
        
        # Calculate retrieval time
        retrieval_time = (time.time() - start_time) * 1000
        
        return RetrievalResult(
            chunks=hybrid_results,
            citations=citations,
            query=query,
            total_chunks=len(hybrid_results),
            retrieval_time_ms=retrieval_time
        )
    
    async def _generate_citations(self, chunks: List[RetrievedChunk]) -> List[Citation]:
        """Generate citations for retrieved chunks."""
        if not chunks:
            return []
        
        # Get document information for citations
        doc_ids = list(set(chunk.doc_id for chunk in chunks))
        
        conn = await asyncpg.connect(self.database_url)
        try:
            rows = await conn.fetch("""
                SELECT id, source, uri, course_id, section
                FROM documents
                WHERE id = ANY($1)
            """, doc_ids)
            
            doc_info = {row['id']: row for row in rows}
        finally:
            await conn.close()
        
        # Create citations with deterministic tags
        citations = []
        doc_tag_map = {}
        tag_counter = 1
        
        for chunk in chunks:
            doc_id = chunk.doc_id
            if doc_id not in doc_tag_map:
                doc_tag_map[doc_id] = f"[doc{tag_counter}]"
                tag_counter += 1
                
                # Create citation
                doc_data = doc_info.get(doc_id, {})
                citation = Citation(
                    tag=doc_tag_map[doc_id],
                    uri=doc_data.get('uri', ''),
                    title=self._extract_title(doc_data.get('source', ''), chunk.metadata),
                    course_id=doc_data.get('course_id'),
                    section=doc_data.get('section'),
                    doc_id=doc_id
                )
                citations.append(citation)
        
        return citations
    
    def _extract_title(self, source: str, metadata: Dict[str, Any]) -> str:
        """Extract a readable title from source and metadata."""
        # Try metadata first
        if metadata.get('section'):
            section = metadata['section']
            if metadata.get('course_id'):
                return f"{metadata['course_id']} - {section.title()}"
            else:
                return section.title()
        
        # Extract from filename
        if source:
            import os
            filename = os.path.basename(source)
            name = os.path.splitext(filename)[0]
            # Convert underscores/hyphens to spaces and title case
            title = name.replace('_', ' ').replace('-', ' ').title()
            return title
        
        return "Unknown Document"

# Factory function for easy instantiation
def create_retriever(
    database_url: str,
    vector_backend: str = "qdrant",
    qdrant_url: str = "http://localhost:6333",
    embedding_provider = None,
    enable_reranking: bool = True
) -> HybridRetriever:
    """Create a configured hybrid retriever."""
    
    return HybridRetriever(
        database_url=database_url,
        vector_backend=vector_backend,
        qdrant_url=qdrant_url,
        embedding_provider=embedding_provider,
        enable_reranking=enable_reranking
    )

# Example usage
async def main():
    """Example usage of the retriever."""
    
    # Create retriever (requires configured embedding provider)
    retriever = create_retriever(
        database_url=os.getenv("DATABASE_URL"),
        vector_backend=os.getenv("VECTOR_BACKEND", "qdrant"),
        qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333")
    )
    
    # Perform search
    result = await retriever.retrieve(
        query="What are the prerequisites for CS38100?",
        top_k=6,
        filters={"course_id": "CS38100"}
    )
    
    print(f"Query: {result.query}")
    print(f"Found {result.total_chunks} chunks in {result.retrieval_time_ms:.1f}ms")
    
    for chunk in result.chunks:
        print(f"\nRank {chunk.rank} (score: {chunk.score:.3f}, method: {chunk.retrieval_method})")
        print(f"Text: {chunk.text[:200]}...")
        print(f"Metadata: {chunk.metadata}")
    
    print("\nCitations:")
    for citation in result.citations:
        print(f"{citation.tag}: {citation.title} ({citation.course_id})")

if __name__ == "__main__":
    asyncio.run(main())