"""
Citation management for RAG system.

Provides deterministic citation tagging and reference generation for retrieved chunks.
"""

import re
from typing import List, Dict, Any, Set, Tuple
from dataclasses import dataclass
from urllib.parse import urlparse

@dataclass
class Citation:
    """A citation reference for retrieved content."""
    tag: str  # [doc1], [doc2], etc.
    uri: str
    title: str
    course_id: str = None
    section: str = None
    doc_id: str = None
    source_type: str = "document"  # document, policy, course_page, etc.

class CitationManager:
    """Manages citation generation and formatting."""
    
    def __init__(self):
        self.citation_map: Dict[str, Citation] = {}
        self.doc_id_to_tag: Dict[str, str] = {}
        self.tag_counter = 1
    
    def generate_citations(self, chunks: List[Dict[str, Any]], doc_metadata: Dict[str, Dict[str, Any]]) -> List[Citation]:
        """Generate citations for a list of retrieved chunks."""
        citations = []
        seen_docs = set()
        
        for chunk in chunks:
            doc_id = chunk.get('doc_id')
            if not doc_id or doc_id in seen_docs:
                continue
            
            seen_docs.add(doc_id)
            citation = self._create_citation(doc_id, doc_metadata.get(doc_id, {}), chunk.get('metadata', {}))
            citations.append(citation)
            
            # Store mapping for text annotation
            self.doc_id_to_tag[doc_id] = citation.tag
            self.citation_map[citation.tag] = citation
        
        return citations
    
    def _create_citation(self, doc_id: str, doc_info: Dict[str, Any], chunk_metadata: Dict[str, Any]) -> Citation:
        """Create a single citation."""
        tag = f"[doc{self.tag_counter}]"
        self.tag_counter += 1
        
        # Extract title
        title = self._extract_title(doc_info, chunk_metadata)
        
        # Extract URI
        uri = doc_info.get('uri', '')
        
        # Extract course and section info
        course_id = doc_info.get('course_id') or chunk_metadata.get('course_id')
        section = doc_info.get('section') or chunk_metadata.get('section')
        
        # Determine source type
        source_type = self._determine_source_type(doc_info, chunk_metadata)
        
        return Citation(
            tag=tag,
            uri=uri,
            title=title,
            course_id=course_id,
            section=section,
            doc_id=doc_id,
            source_type=source_type
        )
    
    def _extract_title(self, doc_info: Dict[str, Any], chunk_metadata: Dict[str, Any]) -> str:
        """Extract a human-readable title for the citation."""
        
        # Try explicit title from metadata first
        if chunk_metadata.get('title'):
            return chunk_metadata['title']
        
        # Try section + course combination
        section = chunk_metadata.get('section') or doc_info.get('section')
        course_id = chunk_metadata.get('course_id') or doc_info.get('course_id')
        
        if section and course_id:
            return f"{course_id} - {self._format_section_name(section)}"
        elif section:
            return self._format_section_name(section)
        elif course_id:
            return f"{course_id} Course Information"
        
        # Extract from source filename
        source = doc_info.get('source', '')
        if source:
            title = self._extract_title_from_filename(source)
            if title:
                return title
        
        # Extract from URI
        uri = doc_info.get('uri', '')
        if uri:
            title = self._extract_title_from_uri(uri)
            if title:
                return title
        
        return "Academic Document"
    
    def _format_section_name(self, section: str) -> str:
        """Format section names for readability."""
        section_map = {
            'core': 'Core Requirements',
            'track_info': 'Track Information',
            'track_mi': 'Machine Intelligence Track',
            'track_se': 'Software Engineering Track',
            'policies': 'Academic Policies',
            'prereqs': 'Prerequisites',
            'description': 'Course Description',
            'objectives': 'Learning Objectives',
            'requirements': 'Requirements'
        }
        
        return section_map.get(section.lower(), section.title())
    
    def _extract_title_from_filename(self, filepath: str) -> str:
        """Extract title from file path."""
        import os
        filename = os.path.basename(filepath)
        name = os.path.splitext(filename)[0]
        
        # Handle special patterns
        patterns = [
            (r'^cs_core$', 'Computer Science Core Requirements'),
            (r'^track_mi$', 'Machine Intelligence Track'),
            (r'^track_se$', 'Software Engineering Track'),
            (r'^advising_policies$', 'Academic Advising Policies'),
            (r'^course_pages$', 'Course Information'),
            (r'^(cs|CS)(\d{3,5}).*', lambda m: f"CS{m.group(2)} Course Page"),
            (r'^([A-Z]{2,4})(\d{3,5}).*', lambda m: f"{m.group(1)}{m.group(2)} Course Page")
        ]
        
        for pattern, replacement in patterns:
            match = re.match(pattern, name)
            if match:
                if callable(replacement):
                    return replacement(match)
                else:
                    return replacement
        
        # Default: clean up filename
        title = name.replace('_', ' ').replace('-', ' ')
        title = re.sub(r'\s+', ' ', title).strip().title()
        
        return title if title else "Academic Document"
    
    def _extract_title_from_uri(self, uri: str) -> str:
        """Extract title from URI."""
        try:
            parsed = urlparse(uri)
            path = parsed.path
            
            if path:
                # Get last segment of path
                segments = [s for s in path.split('/') if s]
                if segments:
                    filename = segments[-1]
                    return self._extract_title_from_filename(filename)
        except:
            pass
        
        return ""
    
    def _determine_source_type(self, doc_info: Dict[str, Any], chunk_metadata: Dict[str, Any]) -> str:
        """Determine the type of source document."""
        
        section = chunk_metadata.get('section') or doc_info.get('section', '')
        source = doc_info.get('source', '')
        
        # Check section-based types
        if 'policies' in section.lower():
            return 'policy'
        elif 'track' in section.lower():
            return 'track_guide'
        elif 'core' in section.lower():
            return 'core_requirements'
        elif chunk_metadata.get('course_id') or doc_info.get('course_id'):
            return 'course_page'
        
        # Check filename-based types
        if source:
            filename = source.lower()
            if 'policy' in filename or 'policies' in filename:
                return 'policy'
            elif 'track' in filename:
                return 'track_guide'
            elif 'course' in filename:
                return 'course_page'
            elif 'core' in filename:
                return 'core_requirements'
        
        return 'document'
    
    def get_tag_for_doc(self, doc_id: str) -> str:
        """Get citation tag for a document ID."""
        return self.doc_id_to_tag.get(doc_id, '')
    
    def annotate_text_with_citations(self, text: str, doc_ids: List[str]) -> str:
        """Annotate text with inline citations."""
        # This is a placeholder for more sophisticated citation insertion
        # For now, we assume the LLM will insert citations manually
        return text
    
    def format_citation_list(self, citations: List[Citation]) -> str:
        """Format citations as a reference list."""
        if not citations:
            return ""
        
        formatted = []
        for citation in citations:
            parts = [citation.tag]
            
            # Add title
            parts.append(citation.title)
            
            # Add course if available
            if citation.course_id:
                parts.append(f"({citation.course_id})")
            
            # Add section if available and different from title
            if citation.section and citation.section.lower() not in citation.title.lower():
                parts.append(f"- {self._format_section_name(citation.section)}")
            
            formatted.append(" ".join(parts))
        
        return "\n".join(formatted)
    
    def get_citation_metadata(self, tag: str) -> Dict[str, Any]:
        """Get metadata for a citation tag for UI display."""
        citation = self.citation_map.get(tag)
        if not citation:
            return {}
        
        return {
            'title': citation.title,
            'course_id': citation.course_id,
            'section': citation.section,
            'source_type': citation.source_type,
            'uri': citation.uri,
            'hover_text': self._generate_hover_text(citation)
        }
    
    def _generate_hover_text(self, citation: Citation) -> str:
        """Generate hover text for UI display."""
        parts = [citation.title]
        
        if citation.course_id:
            parts.append(f"Course: {citation.course_id}")
        
        if citation.section:
            parts.append(f"Section: {self._format_section_name(citation.section)}")
        
        parts.append(f"Type: {citation.source_type.replace('_', ' ').title()}")
        
        return " | ".join(parts)
    
    def reset(self):
        """Reset citation state for new retrieval session."""
        self.citation_map.clear()
        self.doc_id_to_tag.clear()
        self.tag_counter = 1

class CitationValidator:
    """Validates citation quality and completeness."""
    
    @staticmethod
    def validate_citation(citation: Citation) -> Tuple[bool, List[str]]:
        """Validate a citation and return issues."""
        issues = []
        
        # Check required fields
        if not citation.tag:
            issues.append("Missing citation tag")
        
        if not citation.title or citation.title == "Academic Document":
            issues.append("Generic or missing title")
        
        if not citation.uri:
            issues.append("Missing URI/source reference")
        
        # Check tag format
        if citation.tag and not re.match(r'^\[doc\d+\]$', citation.tag):
            issues.append("Invalid tag format")
        
        # Check for meaningful title
        if citation.title and len(citation.title.split()) < 2:
            issues.append("Title too short or uninformative")
        
        return len(issues) == 0, issues
    
    @staticmethod
    def validate_citation_set(citations: List[Citation]) -> Dict[str, Any]:
        """Validate a set of citations."""
        results = {
            'valid_count': 0,
            'total_count': len(citations),
            'issues': [],
            'duplicate_tags': []
        }
        
        seen_tags = set()
        
        for citation in citations:
            is_valid, issues = CitationValidator.validate_citation(citation)
            
            if is_valid:
                results['valid_count'] += 1
            else:
                results['issues'].extend([f"{citation.tag}: {issue}" for issue in issues])
            
            # Check for duplicate tags
            if citation.tag in seen_tags:
                results['duplicate_tags'].append(citation.tag)
            else:
                seen_tags.add(citation.tag)
        
        results['validity_rate'] = results['valid_count'] / max(1, results['total_count'])
        
        return results

# Example usage and testing
def example_usage():
    """Example of citation management."""
    
    # Sample retrieved chunks
    chunks = [
        {
            'doc_id': 'doc1',
            'text': 'CS38100 requires prerequisite courses...',
            'metadata': {'course_id': 'CS38100', 'section': 'prerequisites'}
        },
        {
            'doc_id': 'doc2', 
            'text': 'The Machine Intelligence track requires...',
            'metadata': {'track_id': 'MI', 'section': 'track_info'}
        }
    ]
    
    # Sample document metadata
    doc_metadata = {
        'doc1': {
            'source': '/packs/CS/docs/course_pages/cs38100.md',
            'uri': 'file:///packs/CS/docs/course_pages/cs38100.md',
            'course_id': 'CS38100',
            'section': 'prerequisites'
        },
        'doc2': {
            'source': '/packs/CS/docs/track_mi.md',
            'uri': 'file:///packs/CS/docs/track_mi.md',
            'track_id': 'MI',
            'section': 'track_info'
        }
    }
    
    # Generate citations
    manager = CitationManager()
    citations = manager.generate_citations(chunks, doc_metadata)
    
    # Print results
    print("Generated Citations:")
    for citation in citations:
        print(f"{citation.tag}: {citation.title}")
        print(f"  Course: {citation.course_id}")
        print(f"  Section: {citation.section}")
        print(f"  Type: {citation.source_type}")
        print()
    
    # Validate citations
    validation = CitationValidator.validate_citation_set(citations)
    print(f"Validation: {validation['valid_count']}/{validation['total_count']} valid")
    if validation['issues']:
        print("Issues:", validation['issues'])

if __name__ == "__main__":
    example_usage()