"""
Transcript ingestion system with multi-format support.

Handles PDF, PNG, CSV, MD → normalized JSON profile conversion with
LLM-vision extraction and OCR fallback.
"""

import os
import re
import json
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
import io
import base64
from PIL import Image
import pandas as pd

# OCR dependencies
try:
    import pdfplumber
    import pytesseract
    PDF_OCR_AVAILABLE = True
except ImportError:
    PDF_OCR_AVAILABLE = False
    logging.warning("PDF/OCR dependencies not available. Install: pip install pdfplumber pytesseract")

# LLM dependencies for vision
import google.generativeai as genai
from openai import OpenAI

logger = logging.getLogger(__name__)

@dataclass
class Course:
    """Represents a course taken by a student."""
    course_id: str
    title: str
    credits: float
    grade: str
    term: str
    gpa_points: Optional[float] = None
    
    def __post_init__(self):
        """Calculate GPA points from grade."""
        if self.gpa_points is None:
            self.gpa_points = self._grade_to_points(self.grade)
    
    def _grade_to_points(self, grade: str) -> float:
        """Convert letter grade to GPA points."""
        grade_map = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0, 'W': 0.0, 'I': 0.0, 'P': 0.0, 'NP': 0.0
        }
        return grade_map.get(grade.upper(), 0.0)

@dataclass
class Term:
    """Represents an academic term."""
    term: str  # e.g., "F2024", "S2025"
    courses: List[Course]
    term_gpa: Optional[float] = None
    term_credits: Optional[float] = None
    
    def __post_init__(self):
        """Calculate term statistics."""
        if self.term_gpa is None or self.term_credits is None:
            self._calculate_term_stats()
    
    def _calculate_term_stats(self):
        """Calculate term GPA and credits."""
        total_credits = 0.0
        total_points = 0.0
        
        for course in self.courses:
            if course.grade not in ['W', 'I', 'P', 'NP']:  # Exclude non-GPA grades
                total_credits += course.credits
                total_points += course.credits * course.gpa_points
        
        self.term_credits = total_credits
        self.term_gpa = total_points / total_credits if total_credits > 0 else 0.0

@dataclass
class Student:
    """Student information."""
    name: str
    id: str
    email: Optional[str] = None
    major: Optional[str] = None
    concentration: Optional[str] = None

@dataclass
class GPA:
    """GPA information."""
    cumulative: float
    major: Optional[float] = None
    last_term: Optional[float] = None
    credits_completed: Optional[float] = None

@dataclass
class TranscriptProfile:
    """Complete normalized transcript profile."""
    student: Student
    terms: List[Term]
    gpa: GPA
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'student': asdict(self.student),
            'terms': [asdict(term) for term in self.terms],
            'gpa': asdict(self.gpa),
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TranscriptProfile':
        """Create from dictionary."""
        student = Student(**data['student'])
        
        terms = []
        for term_data in data['terms']:
            courses = [Course(**course_data) for course_data in term_data['courses']]
            term = Term(term=term_data['term'], courses=courses)
            terms.append(term)
        
        gpa = GPA(**data['gpa'])
        
        return cls(
            student=student,
            terms=terms,
            gpa=gpa,
            metadata=data.get('metadata', {})
        )

class CourseAliasMapper:
    """Maps course aliases to canonical course IDs."""
    
    def __init__(self, aliases_file: str = None):
        self.aliases = {}
        if aliases_file and os.path.exists(aliases_file):
            self._load_aliases(aliases_file)
    
    def _load_aliases(self, aliases_file: str):
        """Load course aliases from CSV file."""
        try:
            df = pd.read_csv(aliases_file)
            for _, row in df.iterrows():
                canonical = row.get('course_id', '').strip()
                aliases = row.get('aliases', '').strip()
                
                if canonical and aliases:
                    for alias in aliases.split(','):
                        alias = alias.strip()
                        if alias:
                            self.aliases[alias.upper()] = canonical
        except Exception as e:
            logger.error(f"Failed to load course aliases: {e}")
    
    def normalize_course_id(self, course_id: str) -> str:
        """Normalize course ID using aliases."""
        course_id = course_id.strip().upper()
        
        # Remove common prefixes/suffixes
        course_id = re.sub(r'^(COURSE|CLASS)\s+', '', course_id)
        course_id = re.sub(r'\s+(COURSE|CLASS)$', '', course_id)
        
        # Check direct alias
        if course_id in self.aliases:
            return self.aliases[course_id]
        
        # Try to extract course pattern
        match = re.search(r'([A-Z]{2,4})\s*(\d{3,5})', course_id)
        if match:
            normalized = match.group(1) + match.group(2)
            return self.aliases.get(normalized, normalized)
        
        return course_id

class LLMVisionExtractor:
    """LLM-based transcript extraction using vision models."""
    
    def __init__(self, provider: str = "gemini", api_key: str = None):
        self.provider = provider
        if provider == "gemini":
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro')
        elif provider == "openai":
            self.client = OpenAI(api_key=api_key)
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    async def extract_from_image(self, image_data: bytes) -> Dict[str, Any]:
        """Extract transcript data from image using vision model."""
        
        prompt = """
        Extract academic transcript information from this image and return it as a strict JSON object with this exact structure:

        {
          "student": {
            "name": "Student Full Name",
            "id": "Student ID number", 
            "email": "email@purdue.edu or null",
            "major": "Major name or null",
            "concentration": "Concentration/track or null"
          },
          "terms": [
            {
              "term": "F2024 or S2025 format",
              "courses": [
                {
                  "course_id": "CS18000 format",
                  "title": "Course title",
                  "credits": 3.0,
                  "grade": "A",
                  "term": "F2024"
                }
              ]
            }
          ],
          "gpa": {
            "cumulative": 3.54,
            "major": 3.42,
            "last_term": 3.67,
            "credits_completed": 45.0
          }
        }

        Rules:
        - Extract ALL visible courses with grades
        - Use standard course ID format (e.g., CS18000, MA16100)
        - Convert terms to F/S + year format (Fall 2024 -> F2024)
        - Include numeric GPA values only
        - Set unknown values to null
        - Return valid JSON only, no other text
        """
        
        if self.provider == "gemini":
            return await self._extract_gemini(image_data, prompt)
        elif self.provider == "openai":
            return await self._extract_openai(image_data, prompt)
    
    async def _extract_gemini(self, image_data: bytes, prompt: str) -> Dict[str, Any]:
        """Extract using Gemini vision."""
        try:
            # Convert image data to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            response = self.model.generate_content([
                prompt,
                image
            ])
            
            # Parse JSON response
            text = response.text.strip()
            # Remove markdown code blocks if present
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            
            return json.loads(text)
            
        except Exception as e:
            logger.error(f"Gemini extraction failed: {e}")
            raise
    
    async def _extract_openai(self, image_data: bytes, prompt: str) -> Dict[str, Any]:
        """Extract using OpenAI vision."""
        try:
            # Encode image as base64
            base64_image = base64.b64encode(image_data).decode('utf-8')
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000
            )
            
            text = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            text = re.sub(r'^```json\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
            
            return json.loads(text)
            
        except Exception as e:
            logger.error(f"OpenAI extraction failed: {e}")
            raise

class OCRExtractor:
    """OCR-based transcript extraction fallback."""
    
    def __init__(self):
        if not PDF_OCR_AVAILABLE:
            raise ImportError("OCR dependencies not available")
    
    def extract_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF using pdfplumber."""
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    
    def extract_from_image(self, image_data: bytes) -> str:
        """Extract text from image using Tesseract OCR."""
        image = Image.open(io.BytesIO(image_data))
        text = pytesseract.image_to_string(image)
        return text
    
    def parse_text_transcript(self, text: str, course_mapper: CourseAliasMapper) -> Dict[str, Any]:
        """Parse OCR text into structured transcript data."""
        # This is a simplified heuristic parser
        # In production, this would be much more sophisticated
        
        lines = text.split('\n')
        
        # Extract student info
        student_info = self._extract_student_info(lines)
        
        # Extract courses
        terms = self._extract_terms_and_courses(lines, course_mapper)
        
        # Calculate GPA
        gpa_info = self._calculate_gpa_from_courses(terms)
        
        return {
            "student": student_info,
            "terms": terms,
            "gpa": gpa_info
        }
    
    def _extract_student_info(self, lines: List[str]) -> Dict[str, Any]:
        """Extract student information from OCR text."""
        student = {
            "name": None,
            "id": None,
            "email": None,
            "major": None,
            "concentration": None
        }
        
        for line in lines[:20]:  # Check first 20 lines
            line = line.strip()
            
            # Name patterns
            if re.search(r'(name|student):', line, re.I):
                match = re.search(r':\s*(.+)$', line)
                if match:
                    student["name"] = match.group(1).strip()
            
            # ID patterns
            if re.search(r'(id|student.?id|number):', line, re.I):
                match = re.search(r'(\d{8,10})', line)
                if match:
                    student["id"] = match.group(1)
            
            # Email patterns
            email_match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', line)
            if email_match:
                student["email"] = email_match.group(1)
            
            # Major patterns
            if re.search(r'(major|program):', line, re.I):
                match = re.search(r':\s*(.+)$', line)
                if match:
                    student["major"] = match.group(1).strip()
        
        return student
    
    def _extract_terms_and_courses(self, lines: List[str], course_mapper: CourseAliasMapper) -> List[Dict[str, Any]]:
        """Extract terms and courses from OCR text."""
        terms = []
        current_term = None
        current_courses = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Term detection
            term_match = re.search(r'(fall|spring|summer)\s+(\d{4})', line, re.I)
            if term_match:
                # Save previous term
                if current_term and current_courses:
                    terms.append({
                        "term": current_term,
                        "courses": current_courses
                    })
                
                # Start new term
                season = "F" if term_match.group(1).lower() == "fall" else "S"
                year = term_match.group(2)
                current_term = f"{season}{year}"
                current_courses = []
                continue
            
            # Course detection
            course_match = re.search(r'([A-Z]{2,4})\s*(\d{3,5})\s+(.+?)\s+(\d+\.?\d*)\s+([A-F][+-]?|W|I|P|NP)', line)
            if course_match and current_term:
                course_id = course_mapper.normalize_course_id(f"{course_match.group(1)}{course_match.group(2)}")
                title = course_match.group(3).strip()
                credits = float(course_match.group(4))
                grade = course_match.group(5)
                
                current_courses.append({
                    "course_id": course_id,
                    "title": title,
                    "credits": credits,
                    "grade": grade,
                    "term": current_term
                })
        
        # Save final term
        if current_term and current_courses:
            terms.append({
                "term": current_term,
                "courses": current_courses
            })
        
        return terms
    
    def _calculate_gpa_from_courses(self, terms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate GPA from extracted courses."""
        total_credits = 0.0
        total_points = 0.0
        
        for term in terms:
            for course in term["courses"]:
                if course["grade"] not in ['W', 'I', 'P', 'NP']:
                    credits = course["credits"]
                    points = Course._grade_to_points(None, course["grade"])
                    total_credits += credits
                    total_points += credits * points
        
        cumulative_gpa = total_points / total_credits if total_credits > 0 else 0.0
        
        return {
            "cumulative": round(cumulative_gpa, 2),
            "major": None,
            "last_term": None,
            "credits_completed": total_credits
        }

class TranscriptIngester:
    """Main transcript ingestion orchestrator."""
    
    def __init__(self, 
                 llm_provider: str = "gemini",
                 api_key: str = None,
                 course_aliases_file: str = None,
                 enable_ocr_fallback: bool = True):
        
        self.course_mapper = CourseAliasMapper(course_aliases_file)
        
        # LLM vision extractor
        if api_key:
            self.llm_extractor = LLMVisionExtractor(llm_provider, api_key)
        else:
            self.llm_extractor = None
            logger.warning("No API key provided, LLM extraction disabled")
        
        # OCR fallback
        if enable_ocr_fallback and PDF_OCR_AVAILABLE:
            self.ocr_extractor = OCRExtractor()
        else:
            self.ocr_extractor = None
    
    async def ingest_file(self, file_path: str, file_data: bytes = None) -> TranscriptProfile:
        """Ingest transcript from file."""
        path = Path(file_path)
        
        if file_data is None:
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            file_data = path.read_bytes()
        
        # Determine file type and extract
        file_ext = path.suffix.lower()
        
        if file_ext == '.json':
            return self._ingest_json(file_data)
        elif file_ext == '.csv':
            return self._ingest_csv(file_data)
        elif file_ext == '.md':
            return self._ingest_markdown(file_data)
        elif file_ext == '.pdf':
            return await self._ingest_pdf(file_data)
        elif file_ext in ['.png', '.jpg', '.jpeg']:
            return await self._ingest_image(file_data)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    def _ingest_json(self, file_data: bytes) -> TranscriptProfile:
        """Ingest from JSON file."""
        data = json.loads(file_data.decode('utf-8'))
        return TranscriptProfile.from_dict(data)
    
    def _ingest_csv(self, file_data: bytes) -> TranscriptProfile:
        """Ingest from CSV file."""
        df = pd.read_csv(io.BytesIO(file_data))
        
        # Assume CSV has columns: term, course_id, title, credits, grade
        required_cols = ['term', 'course_id', 'credits', 'grade']
        if not all(col in df.columns for col in required_cols):
            raise ValueError(f"CSV must have columns: {required_cols}")
        
        # Group by term
        terms = []
        for term_name, term_df in df.groupby('term'):
            courses = []
            for _, row in term_df.iterrows():
                course_id = self.course_mapper.normalize_course_id(row['course_id'])
                courses.append(Course(
                    course_id=course_id,
                    title=row.get('title', ''),
                    credits=float(row['credits']),
                    grade=row['grade'],
                    term=term_name
                ))
            
            terms.append(Term(term=term_name, courses=courses))
        
        # Calculate overall GPA
        total_credits = sum(sum(c.credits for c in t.courses) for t in terms)
        total_points = sum(sum(c.credits * c.gpa_points for c in t.courses) for t in terms)
        cumulative_gpa = total_points / total_credits if total_credits > 0 else 0.0
        
        return TranscriptProfile(
            student=Student(name="Unknown", id="Unknown"),
            terms=terms,
            gpa=GPA(cumulative=cumulative_gpa, credits_completed=total_credits),
            metadata={"source": "csv_import"}
        )
    
    def _ingest_markdown(self, file_data: bytes) -> TranscriptProfile:
        """Ingest from markdown file."""
        text = file_data.decode('utf-8')
        
        # Use OCR parser for markdown text
        if self.ocr_extractor:
            data = self.ocr_extractor.parse_text_transcript(text, self.course_mapper)
            return TranscriptProfile.from_dict({
                **data,
                "metadata": {"source": "markdown_import"}
            })
        else:
            raise ValueError("OCR extractor not available for markdown parsing")
    
    async def _ingest_pdf(self, file_data: bytes) -> TranscriptProfile:
        """Ingest from PDF file."""
        
        # Try LLM vision first if available
        if self.llm_extractor:
            try:
                # Convert first page of PDF to image for vision
                # This is simplified - would need pdf2image in production
                logger.info("PDF vision extraction not implemented, falling back to OCR")
            except Exception as e:
                logger.warning(f"LLM vision extraction failed: {e}")
        
        # Fallback to OCR
        if self.ocr_extractor:
            # Save PDF temporarily for pdfplumber
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name
            
            try:
                text = self.ocr_extractor.extract_from_pdf(tmp_path)
                data = self.ocr_extractor.parse_text_transcript(text, self.course_mapper)
                return TranscriptProfile.from_dict({
                    **data,
                    "metadata": {"source": "pdf_ocr", "extraction_method": "pdfplumber"}
                })
            finally:
                os.unlink(tmp_path)
        else:
            raise ValueError("No PDF extraction method available")
    
    async def _ingest_image(self, file_data: bytes) -> TranscriptProfile:
        """Ingest from image file."""
        
        # Try LLM vision first
        if self.llm_extractor:
            try:
                data = await self.llm_extractor.extract_from_image(file_data)
                # Normalize course IDs
                for term in data.get('terms', []):
                    for course in term.get('courses', []):
                        course['course_id'] = self.course_mapper.normalize_course_id(course['course_id'])
                
                profile = TranscriptProfile.from_dict({
                    **data,
                    "metadata": {"source": "image_llm_vision", "extraction_method": self.llm_extractor.provider}
                })
                return profile
                
            except Exception as e:
                logger.warning(f"LLM vision extraction failed: {e}")
        
        # Fallback to OCR
        if self.ocr_extractor:
            text = self.ocr_extractor.extract_from_image(file_data)
            data = self.ocr_extractor.parse_text_transcript(text, self.course_mapper)
            return TranscriptProfile.from_dict({
                **data,
                "metadata": {"source": "image_ocr", "extraction_method": "tesseract"}
            })
        else:
            raise ValueError("No image extraction method available")
    
    def validate_profile(self, profile: TranscriptProfile, course_db: set = None) -> Tuple[bool, List[str]]:
        """Validate extracted profile and course IDs."""
        issues = []
        
        # Check student info
        if not profile.student.name or profile.student.name == "Unknown":
            issues.append("Missing or invalid student name")
        
        if not profile.student.id or profile.student.id == "Unknown":
            issues.append("Missing or invalid student ID")
        
        # Check terms and courses
        if not profile.terms:
            issues.append("No terms found")
        
        total_courses = sum(len(term.courses) for term in profile.terms)
        if total_courses == 0:
            issues.append("No courses found")
        
        # Validate course IDs against database
        if course_db:
            unknown_courses = []
            for term in profile.terms:
                for course in term.courses:
                    if course.course_id not in course_db:
                        unknown_courses.append(course.course_id)
            
            if unknown_courses:
                issues.append(f"Unknown course IDs: {', '.join(set(unknown_courses))}")
        
        # Check GPA consistency
        calculated_gpa = self._calculate_gpa(profile.terms)
        if abs(calculated_gpa - profile.gpa.cumulative) > 0.1:
            issues.append(f"GPA mismatch: extracted {profile.gpa.cumulative}, calculated {calculated_gpa:.2f}")
        
        return len(issues) == 0, issues
    
    def _calculate_gpa(self, terms: List[Term]) -> float:
        """Calculate GPA from terms."""
        total_credits = 0.0
        total_points = 0.0
        
        for term in terms:
            for course in term.courses:
                if course.grade not in ['W', 'I', 'P', 'NP']:
                    total_credits += course.credits
                    total_points += course.credits * course.gpa_points
        
        return total_points / total_credits if total_credits > 0 else 0.0

# CLI entry point
async def main():
    """CLI entry point for transcript ingestion."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest transcript files")
    parser.add_argument("file", help="Transcript file to ingest")
    parser.add_argument("--provider", default="gemini", choices=["gemini", "openai"], help="LLM provider")
    parser.add_argument("--api-key", help="API key for LLM provider")
    parser.add_argument("--aliases", help="Course aliases CSV file")
    parser.add_argument("--output", help="Output JSON file")
    parser.add_argument("--validate", action="store_true", help="Validate extracted profile")
    
    args = parser.parse_args()
    
    # Get API key from env if not provided
    api_key = args.api_key
    if not api_key:
        if args.provider == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
        elif args.provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
    
    # Create ingester
    ingester = TranscriptIngester(
        llm_provider=args.provider,
        api_key=api_key,
        course_aliases_file=args.aliases
    )
    
    # Ingest file
    try:
        profile = await ingester.ingest_file(args.file)
        
        # Validate if requested
        if args.validate:
            is_valid, issues = ingester.validate_profile(profile)
            if issues:
                print("Validation issues:")
                for issue in issues:
                    print(f"  - {issue}")
        
        # Output result
        profile_dict = profile.to_dict()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(profile_dict, f, indent=2)
            print(f"Profile saved to {args.output}")
        else:
            print(json.dumps(profile_dict, indent=2))
            
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())