#!/usr/bin/env python3
"""
Simple document processor to validate our RAG documentation structure.
This creates a basic index without requiring database or vector store setup.
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass
import tiktoken

@dataclass
class DocumentChunk:
    """Represents a document chunk with metadata."""
    text: str
    metadata: Dict[str, Any]
    token_count: int
    doc_id: str
    ord: int

@dataclass 
class Document:
    """Represents a source document."""
    id: str
    source: str
    uri: str
    major_id: str = "CS"
    track_id: str = None
    course_id: str = None
    section: str = None

class DocumentChunker:
    """Structure-aware document chunker."""
    
    def __init__(self, chunk_size: int = 800, overlap: int = 120):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))
    
    def split_by_headers(self, content: str) -> List[tuple]:
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
        chunk_ord = 0
        
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
                    "chunk_ord": chunk_ord
                }
                
                chunk = DocumentChunk(
                    text=chunk_text,
                    metadata=chunk_metadata,
                    token_count=self.count_tokens(chunk_text),
                    doc_id=metadata.get("doc_id", ""),
                    ord=chunk_ord
                )
                chunks.append(chunk)
                chunk_ord += 1
        
        return chunks

class SimpleIndexer:
    """Simple indexer that processes documents and creates a JSON index."""
    
    def __init__(self):
        self.chunker = DocumentChunker()
        self.documents = []
        self.chunks = []
    
    def process_file(self, filepath: Path) -> str:
        """Process a single file."""
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        # Read file content
        content = filepath.read_text(encoding='utf-8')
        
        # Extract metadata from filename and path
        file_metadata = self._extract_file_metadata(filepath)
        
        # Create document record
        doc_id = f"doc_{len(self.documents)}"
        document = Document(
            id=doc_id,
            source=str(filepath),
            uri=f"file://{filepath}",
            major_id=file_metadata.get("major_id", "CS"),
            track_id=file_metadata.get("track_id"),
            course_id=file_metadata.get("course_id"),
            section=file_metadata.get("section")
        )
        
        self.documents.append(document)
        
        # Chunk document
        file_metadata["doc_id"] = doc_id
        chunks = self.chunker.chunk_document(content, file_metadata)
        
        if chunks:
            self.chunks.extend(chunks)
            print(f"✓ Processed {filepath.name}: {len(chunks)} chunks, {sum(c.token_count for c in chunks)} tokens")
        else:
            print(f"⚠ No chunks generated for {filepath.name}")
        
        return doc_id
    
    def process_directory(self, directory: Path, pattern: str = "**/*.md") -> List[str]:
        """Process all files in directory matching pattern."""
        doc_ids = []
        files = list(directory.glob(pattern))
        
        print(f"Processing {len(files)} files from {directory}")
        print("-" * 50)
        
        for filepath in files:
            try:
                doc_id = self.process_file(filepath)
                doc_ids.append(doc_id)
            except Exception as e:
                print(f"✗ Failed to process {filepath}: {e}")
        
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
    
    def save_index(self, output_path: str = "rag_index.json"):
        """Save the processed index to JSON file."""
        index_data = {
            "documents": [
                {
                    "id": doc.id,
                    "source": doc.source,
                    "uri": doc.uri,
                    "major_id": doc.major_id,
                    "track_id": doc.track_id,
                    "course_id": doc.course_id,
                    "section": doc.section
                }
                for doc in self.documents
            ],
            "chunks": [
                {
                    "doc_id": chunk.doc_id,
                    "ord": chunk.ord,
                    "text": chunk.text,
                    "token_count": chunk.token_count,
                    "metadata": chunk.metadata
                }
                for chunk in self.chunks
            ],
            "stats": {
                "total_documents": len(self.documents),
                "total_chunks": len(self.chunks),
                "total_tokens": sum(c.token_count for c in self.chunks),
                "avg_tokens_per_chunk": sum(c.token_count for c in self.chunks) / len(self.chunks) if self.chunks else 0
            }
        }
        
        with open(output_path, 'w') as f:
            json.dump(index_data, f, indent=2)
        
        print(f"\n📄 Index saved to {output_path}")
        return output_path

def main():
    """Main processing function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Simple document indexer for RAG")
    parser.add_argument("--dir", required=True, help="Directory to process")
    parser.add_argument("--pattern", default="**/*.md", help="File pattern to match")
    parser.add_argument("--output", default="rag_index.json", help="Output file")
    args = parser.parse_args()
    
    # Create indexer
    indexer = SimpleIndexer()
    
    # Process directory
    directory = Path(args.dir)
    doc_ids = indexer.process_directory(directory, args.pattern)
    
    # Save index
    indexer.save_index(args.output)
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 PROCESSING SUMMARY")
    print("=" * 50)
    print(f"Documents processed: {len(doc_ids)}")
    print(f"Total chunks: {len(indexer.chunks)}")
    print(f"Total tokens: {sum(c.token_count for c in indexer.chunks):,}")
    if indexer.chunks:
        print(f"Average tokens per chunk: {sum(c.token_count for c in indexer.chunks) / len(indexer.chunks):.1f}")
    
    # Show document breakdown
    print("\n📋 DOCUMENT BREAKDOWN:")
    for doc in indexer.documents:
        doc_chunks = [c for c in indexer.chunks if c.doc_id == doc.id]
        course_info = f" ({doc.course_id})" if doc.course_id else ""
        track_info = f" [{doc.track_id}]" if doc.track_id else ""
        print(f"  {Path(doc.source).name}{course_info}{track_info}: {len(doc_chunks)} chunks")

if __name__ == "__main__":
    main()
