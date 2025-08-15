#!/usr/bin/env python3
"""
Knowledge Base Merger
Combines CLI's specialized CS knowledge with web app's general course data
"""

import json
import os
import logging
from typing import Dict, Any, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeMerger:
    """Merges different knowledge bases into unified format"""
    
    def __init__(self):
        self.cli_knowledge = None
        self.web_courses = None
        self.merged_data = None
    
    def load_cli_knowledge(self) -> Optional[Dict]:
        """Load CLI knowledge base"""
        try:
            cli_path = os.path.join(
                os.path.dirname(__file__), 
                '..', '..', 
                'cli test1', 'my_cli_bot', 'data', 
                'cs_knowledge_graph.json'
            )
            
            if os.path.exists(cli_path):
                with open(cli_path, 'r') as f:
                    self.cli_knowledge = json.load(f)
                logger.info(f"✅ Loaded CLI knowledge: {len(self.cli_knowledge.get('courses', {}))} courses")
                return self.cli_knowledge
            else:
                logger.warning(f"⚠️ CLI knowledge not found at {cli_path}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to load CLI knowledge: {e}")
            return None
    
    def load_web_courses(self) -> Optional[List[Dict]]:
        """Load web app course data"""
        try:
            web_path = os.path.join(
                os.path.dirname(__file__), 
                '..', '..', 
                'data', 
                'purdue_courses_complete.json'
            )
            
            if os.path.exists(web_path):
                with open(web_path, 'r') as f:
                    self.web_courses = json.load(f)
                logger.info(f"✅ Loaded web courses: {len(self.web_courses)} courses")
                return self.web_courses
            else:
                logger.warning(f"⚠️ Web courses not found at {web_path}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Failed to load web courses: {e}")
            return None
    
    def merge_course_data(self) -> Dict:
        """Merge CLI and web course data"""
        try:
            if not self.cli_knowledge:
                self.load_cli_knowledge()
            if not self.web_courses:
                self.load_web_courses()
            
            # Start with CLI knowledge structure
            merged = {
                "courses": {},
                "prerequisites": {},
                "tracks": {},
                "graduation_requirements": {},
                "academic_policies": {}
            }
            
            # Add CLI specialized knowledge
            if self.cli_knowledge:
                merged["courses"].update(self.cli_knowledge.get("courses", {}))
                merged["prerequisites"].update(self.cli_knowledge.get("prerequisites", {}))
                merged["tracks"].update(self.cli_knowledge.get("tracks", {}))
                merged["graduation_requirements"].update(self.cli_knowledge.get("graduation_requirements", {}))
                merged["academic_policies"].update(self.cli_knowledge.get("academic_policies", {}))
            
            # Enhance with web course data
            if self.web_courses:
                for course in self.web_courses:
                    course_code = course.get("full_course_code", "")
                    
                    # Only process CS courses and math courses relevant to CS
                    if course_code.startswith(("CS ", "MATH ", "MA ", "STAT ")):
                        # Create enhanced course entry
                        enhanced_course = {
                            "title": course.get("course_title", ""),
                            "credits": float(course.get("credit_hours", 0)) if course.get("credit_hours") else 3,
                            "description": course.get("description", ""),
                            "course_type": self._determine_course_type(course_code),
                            "semester": "Any",
                            "prerequisites_raw": course.get("prerequisites", ""),
                            "corequisites": course.get("corequisites", ""),
                            "restrictions": course.get("restrictions", ""),
                            "url": course.get("url", ""),
                            "course_level": course.get("course_level", "undergraduate")
                        }
                        
                        # Merge with existing CLI data if present
                        if course_code in merged["courses"]:
                            # CLI data takes precedence, but add missing fields
                            cli_course = merged["courses"][course_code]
                            for key, value in enhanced_course.items():
                                if key not in cli_course and value:
                                    cli_course[key] = value
                        else:
                            # Add new course from web data
                            merged["courses"][course_code] = enhanced_course
            
            # Add derived prerequisites from web data
            self._extract_prerequisites(merged)
            
            # Add CS-specific enhancements
            self._add_cs_enhancements(merged)
            
            self.merged_data = merged
            logger.info(f"✅ Merged knowledge base created with {len(merged['courses'])} courses")
            
            return merged
            
        except Exception as e:
            logger.error(f"❌ Failed to merge course data: {e}")
            return {}
    
    def _determine_course_type(self, course_code: str) -> str:
        """Determine course type based on course code"""
        if course_code.startswith("CS "):
            course_num = course_code.split(" ")[1]
            if course_num in ["18000", "18200", "24000", "25000", "25100", "25200"]:
                return "foundation"
            elif int(course_num) >= 30000:
                return "advanced"
            elif int(course_num) >= 25000:
                return "core"
            else:
                return "elective"
        elif course_code.startswith(("MATH ", "MA ")):
            return "math_requirement"
        elif course_code.startswith("STAT "):
            return "statistics"
        else:
            return "elective"
    
    def _extract_prerequisites(self, merged_data: Dict):
        """Extract prerequisites from course descriptions"""
        try:
            for course_code, course_info in merged_data["courses"].items():
                prereq_text = course_info.get("prerequisites_raw", "")
                if prereq_text and course_code not in merged_data["prerequisites"]:
                    # Simple prerequisite extraction (can be enhanced)
                    prereqs = self._parse_prerequisites(prereq_text)
                    if prereqs:
                        merged_data["prerequisites"][course_code] = prereqs
                        
        except Exception as e:
            logger.error(f"❌ Failed to extract prerequisites: {e}")
    
    def _parse_prerequisites(self, prereq_text: str) -> List[str]:
        """Parse prerequisite text into course codes"""
        try:
            import re
            
            # Find course codes in format "CS 12345" or "MATH 12345"
            pattern = r'\b([A-Z]{2,4}\s+\d{5})\b'
            matches = re.findall(pattern, prereq_text)
            
            # Remove duplicates and return
            return list(set(matches))
            
        except Exception:
            return []
    
    def _add_cs_enhancements(self, merged_data: Dict):
        """Add CS-specific enhancements to the knowledge base"""
        try:
            # Add track information if not present
            if not merged_data.get("tracks"):
                merged_data["tracks"] = {
                    "machine_intelligence": {
                        "name": "Machine Intelligence",
                        "description": "Focuses on AI, machine learning, and data science",
                        "required_courses": ["CS 37300", "CS 47300", "CS 57300"],
                        "elective_courses": ["CS 30400", "CS 37400", "CS 47100"]
                    },
                    "software_engineering": {
                        "name": "Software Engineering",
                        "description": "Focuses on large-scale software development and engineering practices",
                        "required_courses": ["CS 35200", "CS 40800", "CS 50300"],
                        "elective_courses": ["CS 35400", "CS 42600", "CS 49000"]
                    }
                }
            
            # Add graduation requirements if not present
            if not merged_data.get("graduation_requirements"):
                merged_data["graduation_requirements"] = {
                    "total_credits": 120,
                    "cs_core_credits": 29,
                    "track_credits": 12,
                    "math_credits": 18,
                    "general_education_credits": 30,
                    "free_electives": 31
                }
            
            # Add academic policies if not present
            if not merged_data.get("academic_policies"):
                merged_data["academic_policies"] = {
                    "codo_requirements": {
                        "min_gpa": 2.75,
                        "required_courses": ["CS 18000"],
                        "min_grades": {"CS 18000": "B+", "MATH": "B+"}
                    },
                    "course_load_limits": {
                        "freshman": {"max_cs_courses": 2},
                        "sophomore_plus": {"max_cs_courses": 3},
                        "summer": {"max_cs_courses": 2}
                    }
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to add CS enhancements: {e}")
    
    def save_merged_data(self, output_path: str) -> bool:
        """Save merged data to file"""
        try:
            if not self.merged_data:
                self.merge_course_data()
            
            with open(output_path, 'w') as f:
                json.dump(self.merged_data, f, indent=2)
            
            logger.info(f"✅ Saved merged knowledge base to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to save merged data: {e}")
            return False
    
    def get_course_info(self, course_code: str) -> Optional[Dict]:
        """Get enhanced course information"""
        if not self.merged_data:
            self.merge_course_data()
        
        return self.merged_data.get("courses", {}).get(course_code)
    
    def get_cs_courses_only(self) -> Dict[str, Dict]:
        """Get only CS courses from merged data"""
        if not self.merged_data:
            self.merge_course_data()
        
        cs_courses = {}
        for code, info in self.merged_data["courses"].items():
            if code.startswith("CS "):
                cs_courses[code] = info
        
        return cs_courses
    
    def get_prerequisite_chain(self, course_code: str, visited: Optional[set] = None) -> List[str]:
        """Get full prerequisite chain for a course"""
        if not self.merged_data:
            self.merge_course_data()
        
        if visited is None:
            visited = set()
        
        if course_code in visited:
            return []  # Avoid circular dependencies
        
        visited.add(course_code)
        chain = []
        
        prereqs = self.merged_data.get("prerequisites", {}).get(course_code, [])
        for prereq in prereqs:
            chain.append(prereq)
            # Recursively get prerequisites of prerequisites
            chain.extend(self.get_prerequisite_chain(prereq, visited.copy()))
        
        return list(set(chain))  # Remove duplicates

def main():
    """Test the knowledge merger"""
    merger = KnowledgeMerger()
    
    # Test loading
    cli_data = merger.load_cli_knowledge()
    web_data = merger.load_web_courses()
    
    if cli_data or web_data:
        # Test merging
        merged = merger.merge_course_data()
        print(f"Merged {len(merged.get('courses', {}))} courses")
        
        # Test specific course lookup
        cs180_info = merger.get_course_info("CS 18000")
        if cs180_info:
            print(f"CS 18000: {cs180_info.get('title', 'N/A')}")
        
        # Save merged data
        output_path = os.path.join(os.path.dirname(__file__), 'merged_knowledge.json')
        merger.save_merged_data(output_path)
    
    else:
        print("❌ No knowledge bases could be loaded")

if __name__ == "__main__":
    main()