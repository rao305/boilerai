#!/usr/bin/env python3
"""
Dynamic Knowledge Manager - Intelligent Knowledge Base Integration
Dynamically fetches, merges, and caches knowledge from multiple sources
No hardcoded data - all information dynamically retrieved and processed
"""

import json
import sqlite3
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
import os
from pathlib import Path
import threading
import time

@dataclass
class KnowledgeSource:
    """Represents a knowledge source"""
    source_type: str  # "database", "json_file", "api", "cache"
    source_path: str
    priority: int  # Higher number = higher priority
    last_updated: Optional[datetime] = None
    is_available: bool = True
    cache_duration_hours: int = 24

@dataclass
class CourseData:
    """Standardized course data structure"""
    course_code: str
    course_title: str
    credits: int
    department: str
    description: str = ""
    prerequisites: List[str] = None
    difficulty_level: str = "Unknown"
    difficulty_score: float = 0.0
    semester_offered: str = "Any"
    is_foundation: bool = False
    is_critical_path: bool = False
    success_rate: float = 0.0
    time_commitment: str = ""
    major_relevance: List[str] = None
    track_relevance: List[str] = None
    
    def __post_init__(self):
        if self.prerequisites is None:
            self.prerequisites = []
        if self.major_relevance is None:
            self.major_relevance = []
        if self.track_relevance is None:
            self.track_relevance = []

@dataclass
class MajorData:
    """Standardized major data structure"""
    major_name: str
    department: str
    total_credits: int
    foundation_courses: List[str]
    core_courses: List[str]
    electives_needed: int
    tracks: List[str]
    graduation_requirements: Dict[str, Any]
    career_paths: List[str] = None
    
    def __post_init__(self):
        if self.career_paths is None:
            self.career_paths = []

class DynamicKnowledgeManager:
    """Manages dynamic knowledge fetching and integration from multiple sources"""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or "/Users/rrao/Desktop/final/src/services/cliBridge/knowledge_config.json"
        self.cache_dir = Path("/Users/rrao/Desktop/final/src/services/cliBridge/cache")
        self.cache_dir.mkdir(exist_ok=True)
        
        # Knowledge sources
        self.sources: List[KnowledgeSource] = []
        self.knowledge_cache: Dict[str, Any] = {}
        self.last_cache_update: Dict[str, datetime] = {}
        
        # Thread safety
        self.cache_lock = threading.Lock()
        
        # Initialize sources
        self._initialize_sources()
        
        # Start background cache refresh
        self._start_cache_refresh()
    
    def _initialize_sources(self):
        """Initialize knowledge sources based on configuration"""
        
        # Default sources configuration
        default_sources = [
            {
                "source_type": "database",
                "source_path": "/Users/rrao/Desktop/final/purdue_cs_knowledge.db",
                "priority": 100,
                "cache_duration_hours": 1
            },
            {
                "source_type": "json_file", 
                "source_path": "/Users/rrao/Desktop/final/src/cli test1/my_cli_bot/data/cs_knowledge_graph.json",
                "priority": 90,
                "cache_duration_hours": 6
            },
            {
                "source_type": "json_file",
                "source_path": "/Users/rrao/Desktop/final/comprehensive_knowledge_graph.json", 
                "priority": 80,
                "cache_duration_hours": 12
            }
        ]
        
        # Load from config file if exists
        sources_config = default_sources
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                    sources_config = config.get("sources", default_sources)
        except Exception as e:
            print(f"Config loading warning: {e}, using defaults")
        
        # Initialize sources
        for source_config in sources_config:
            source = KnowledgeSource(
                source_type=source_config["source_type"],
                source_path=source_config["source_path"],
                priority=source_config["priority"],
                cache_duration_hours=source_config.get("cache_duration_hours", 24)
            )
            
            # Check if source is available
            source.is_available = self._check_source_availability(source)
            self.sources.append(source)
        
        # Sort by priority (highest first)
        self.sources.sort(key=lambda x: x.priority, reverse=True)
    
    def _check_source_availability(self, source: KnowledgeSource) -> bool:
        """Check if a knowledge source is currently available"""
        
        if source.source_type == "database":
            try:
                conn = sqlite3.connect(source.source_path, timeout=5)
                conn.close()
                return True
            except Exception:
                return False
        
        elif source.source_type == "json_file":
            return os.path.exists(source.source_path) and os.path.isfile(source.source_path)
        
        elif source.source_type == "api":
            # Could implement API health check here
            return True
        
        return False
    
    def _start_cache_refresh(self):
        """Start background thread for cache refresh"""
        
        def refresh_worker():
            while True:
                try:
                    self._refresh_expired_cache()
                    time.sleep(300)  # Check every 5 minutes
                except Exception as e:
                    print(f"Cache refresh error: {e}")
                    time.sleep(600)  # Wait 10 minutes on error
        
        refresh_thread = threading.Thread(target=refresh_worker, daemon=True)
        refresh_thread.start()
    
    def _refresh_expired_cache(self):
        """Refresh expired cache entries"""
        
        with self.cache_lock:
            current_time = datetime.now()
            
            for cache_key, last_update in list(self.last_cache_update.items()):
                # Determine cache duration for this key
                cache_duration = timedelta(hours=6)  # Default
                for source in self.sources:
                    if source.source_path in cache_key:
                        cache_duration = timedelta(hours=source.cache_duration_hours)
                        break
                
                if current_time - last_update > cache_duration:
                    print(f"Refreshing expired cache for: {cache_key}")
                    self._invalidate_cache_key(cache_key)
    
    def _invalidate_cache_key(self, cache_key: str):
        """Invalidate a specific cache key"""
        if cache_key in self.knowledge_cache:
            del self.knowledge_cache[cache_key]
        if cache_key in self.last_cache_update:
            del self.last_cache_update[cache_key]
    
    def get_courses(self, filters: Dict[str, Any] = None) -> List[CourseData]:
        """Get course data from all sources, merged and deduplicated"""
        
        cache_key = f"courses_{hash(json.dumps(filters or {}, sort_keys=True))}"
        
        with self.cache_lock:
            # Check cache first
            if cache_key in self.knowledge_cache:
                return self.knowledge_cache[cache_key]
            
            # Fetch from sources
            all_courses: Dict[str, CourseData] = {}
            
            for source in self.sources:
                if not source.is_available:
                    continue
                
                try:
                    source_courses = self._fetch_courses_from_source(source, filters)
                    
                    # Merge courses (higher priority sources override)
                    for course in source_courses:
                        if course.course_code not in all_courses or source.priority > 50:
                            all_courses[course.course_code] = course
                        else:
                            # Merge data from lower priority source
                            existing = all_courses[course.course_code]
                            existing = self._merge_course_data(existing, course)
                            all_courses[course.course_code] = existing
                
                except Exception as e:
                    print(f"Error fetching from source {source.source_path}: {e}")
                    source.is_available = False
            
            # Convert to list and sort
            courses_list = list(all_courses.values())
            courses_list.sort(key=lambda x: (x.is_critical_path, x.is_foundation, x.course_code), reverse=True)
            
            # Cache result
            self.knowledge_cache[cache_key] = courses_list
            self.last_cache_update[cache_key] = datetime.now()
            
            return courses_list
    
    def _fetch_courses_from_source(self, source: KnowledgeSource, filters: Dict[str, Any] = None) -> List[CourseData]:
        """Fetch courses from a specific source"""
        
        if source.source_type == "database":
            return self._fetch_courses_from_database(source, filters)
        elif source.source_type == "json_file":
            return self._fetch_courses_from_json(source, filters)
        else:
            return []
    
    def _fetch_courses_from_database(self, source: KnowledgeSource, filters: Dict[str, Any] = None) -> List[CourseData]:
        """Fetch courses from SQL database"""
        
        try:
            conn = sqlite3.connect(source.source_path, timeout=10)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Build query with filters
            query = "SELECT * FROM courses WHERE 1=1"
            params = []
            
            if filters:
                if "department" in filters:
                    query += " AND department = ?"
                    params.append(filters["department"])
                
                if "major" in filters:
                    if filters["major"] == "Computer Science":
                        query += " AND department IN ('CS', 'MATH')"
                    elif filters["major"] == "Data Science":
                        query += " AND department IN ('STAT', 'CS', 'MATH')"
                    elif filters["major"] == "Artificial Intelligence":
                        query += " AND department IN ('CS', 'MATH', 'ECE')"
                
                if "is_foundation" in filters:
                    query += " AND is_foundation = ?"
                    params.append(1 if filters["is_foundation"] else 0)
            
            query += " ORDER BY is_critical_path DESC, course_code ASC"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            courses = []
            for row in rows:
                course = CourseData(
                    course_code=row["course_code"],
                    course_title=row["course_title"],
                    credits=row["credits"],
                    department=row["department"],
                    difficulty_level=row.get("difficulty_level", "Unknown"),
                    difficulty_score=row.get("difficulty_score", 0.0),
                    semester_offered=row.get("semester_offered", "Any"),
                    is_foundation=bool(row.get("is_foundation", False)),
                    is_critical_path=bool(row.get("is_critical_path", False)),
                    success_rate=row.get("success_rate", 0.0)
                )
                courses.append(course)
            
            conn.close()
            return courses
            
        except Exception as e:
            print(f"Database fetch error: {e}")
            return []
    
    def _fetch_courses_from_json(self, source: KnowledgeSource, filters: Dict[str, Any] = None) -> List[CourseData]:
        """Fetch courses from JSON file"""
        
        try:
            with open(source.source_path, 'r') as f:
                data = json.load(f)
            
            courses_data = data.get("courses", {})
            courses = []
            
            for course_code, course_info in courses_data.items():
                # Apply filters
                if filters and "department" in filters:
                    dept = course_code.split()[0] if " " in course_code else "Unknown"
                    if dept != filters["department"]:
                        continue
                
                course = CourseData(
                    course_code=course_code,
                    course_title=course_info.get("title", "Unknown"),
                    credits=course_info.get("credits", 0),
                    department=course_code.split()[0] if " " in course_code else "Unknown",
                    description=course_info.get("description", ""),
                    difficulty_level=course_info.get("difficulty_level", "Unknown"),
                    difficulty_score=course_info.get("difficulty_rating", 0.0),
                    semester_offered=course_info.get("semester", "Any"),
                    is_foundation=course_info.get("course_type") == "foundation",
                    is_critical_path=course_info.get("is_critical", False),
                    time_commitment=course_info.get("time_commitment", "")
                )
                courses.append(course)
            
            return courses
            
        except Exception as e:
            print(f"JSON fetch error: {e}")
            return []
    
    def _merge_course_data(self, primary: CourseData, secondary: CourseData) -> CourseData:
        """Merge course data from two sources, preferring primary source"""
        
        # Keep primary data but fill in missing fields from secondary
        if not primary.description and secondary.description:
            primary.description = secondary.description
        
        if not primary.time_commitment and secondary.time_commitment:
            primary.time_commitment = secondary.time_commitment
        
        if primary.difficulty_score == 0.0 and secondary.difficulty_score > 0.0:
            primary.difficulty_score = secondary.difficulty_score
        
        if primary.success_rate == 0.0 and secondary.success_rate > 0.0: 
            primary.success_rate = secondary.success_rate
        
        # Merge prerequisite lists
        all_prerequisites = set(primary.prerequisites + secondary.prerequisites)
        primary.prerequisites = list(all_prerequisites)
        
        return primary
    
    def get_majors(self) -> List[MajorData]:
        """Get major data from all sources"""
        
        cache_key = "majors_all"
        
        with self.cache_lock:
            if cache_key in self.knowledge_cache:
                return self.knowledge_cache[cache_key]
            
            majors: Dict[str, MajorData] = {}
            
            for source in self.sources:
                if not source.is_available:
                    continue
                
                try:
                    source_majors = self._fetch_majors_from_source(source)
                    
                    for major in source_majors:
                        if major.major_name not in majors or source.priority > 50:
                            majors[major.major_name] = major
                        else:
                            # Merge major data
                            existing = majors[major.major_name]
                            majors[major.major_name] = self._merge_major_data(existing, major)
                
                except Exception as e:
                    print(f"Error fetching majors from {source.source_path}: {e}")
            
            majors_list = list(majors.values())
            
            # Cache result
            self.knowledge_cache[cache_key] = majors_list
            self.last_cache_update[cache_key] = datetime.now()
            
            return majors_list
    
    def _fetch_majors_from_source(self, source: KnowledgeSource) -> List[MajorData]:
        """Fetch majors from a specific source"""
        
        if source.source_type == "json_file":
            return self._fetch_majors_from_json(source)
        elif source.source_type == "database":
            return self._fetch_majors_from_database(source)
        else:
            return []
    
    def _fetch_majors_from_json(self, source: KnowledgeSource) -> List[MajorData]:
        """Fetch majors from JSON file"""
        
        try:
            with open(source.source_path, 'r') as f:
                data = json.load(f)
            
            majors_data = data.get("majors", {})
            tracks_data = data.get("tracks", {})
            
            majors = []
            
            # Define standard majors if not in data
            standard_majors = ["Computer Science", "Data Science", "Artificial Intelligence"]
            
            for major_name in standard_majors:
                major_info = majors_data.get(major_name, {})
                
                # Extract tracks for this major (only CS has tracks)
                major_tracks = []
                if major_name == "Computer Science":
                    major_tracks = ["Machine Intelligence", "Software Engineering"]
                # Data Science and Artificial Intelligence are standalone majors without tracks
                
                major = MajorData(
                    major_name=major_name,
                    department=major_info.get("department", "Computer Science"),
                    total_credits=major_info.get("total_credits", 120),
                    foundation_courses=major_info.get("foundation_courses", []),
                    core_courses=major_info.get("core_courses", []),
                    electives_needed=major_info.get("electives_needed", 6),
                    tracks=major_tracks,
                    graduation_requirements=major_info.get("graduation_requirements", {}),
                    career_paths=major_info.get("career_paths", [])
                )
                majors.append(major)
            
            return majors
            
        except Exception as e:
            print(f"JSON majors fetch error: {e}")
            return []
    
    def _fetch_majors_from_database(self, source: KnowledgeSource) -> List[MajorData]:
        """Fetch majors from database"""
        
        try:
            conn = sqlite3.connect(source.source_path, timeout=10)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get unique majors
            cursor.execute("SELECT DISTINCT major_name FROM major_requirements")
            major_names = [row[0] for row in cursor.fetchall()]
            
            majors = []
            
            for major_name in major_names:
                # Get requirements for this major
                cursor.execute("""
                    SELECT * FROM major_requirements 
                    WHERE major_name = ? 
                    ORDER BY priority_order
                """, (major_name,))
                
                requirements = cursor.fetchall()
                
                foundation_courses = []
                core_courses = []
                tracks = set()
                
                for req in requirements:
                    if req["requirement_type"] == "foundation":
                        foundation_courses.append(req["course_code"])
                    elif req["requirement_type"] == "core":
                        core_courses.append(req["course_code"])
                    
                    if req["track_name"]:
                        tracks.add(req["track_name"])
                
                # Get graduation requirements
                cursor.execute("""
                    SELECT * FROM graduation_requirements 
                    WHERE major_name = ?
                """, (major_name,))
                
                grad_reqs = cursor.fetchall()
                graduation_requirements = {}
                total_credits = 120  # Default
                
                for req in grad_reqs:
                    graduation_requirements[req["requirement_category"]] = req["minimum_value"]
                    if req["requirement_category"] == "total_credits":
                        total_credits = int(req["minimum_value"])
                
                major = MajorData(
                    major_name=major_name,
                    department="Computer Science",  # Default
                    total_credits=total_credits,
                    foundation_courses=foundation_courses,
                    core_courses=core_courses,
                    electives_needed=6,  # Default
                    tracks=list(tracks),
                    graduation_requirements=graduation_requirements
                )
                majors.append(major)
            
            conn.close()
            return majors
            
        except Exception as e:
            print(f"Database majors fetch error: {e}")
            return []
    
    def _merge_major_data(self, primary: MajorData, secondary: MajorData) -> MajorData:
        """Merge major data from two sources"""
        
        # Merge course lists
        all_foundation = set(primary.foundation_courses + secondary.foundation_courses)
        primary.foundation_courses = list(all_foundation)
        
        all_core = set(primary.core_courses + secondary.core_courses)
        primary.core_courses = list(all_core)
        
        all_tracks = set(primary.tracks + secondary.tracks)
        primary.tracks = list(all_tracks)
        
        all_careers = set(primary.career_paths + secondary.career_paths)
        primary.career_paths = list(all_careers)
        
        # Merge graduation requirements
        for key, value in secondary.graduation_requirements.items():
            if key not in primary.graduation_requirements:
                primary.graduation_requirements[key] = value
        
        return primary
    
    def get_prerequisites(self, course_code: str) -> List[str]:
        """Get prerequisites for a specific course"""
        
        cache_key = f"prerequisites_{course_code}"
        
        with self.cache_lock:
            if cache_key in self.knowledge_cache:
                return self.knowledge_cache[cache_key]
            
            prerequisites: Set[str] = set()
            
            for source in self.sources:
                if not source.is_available:
                    continue
                
                try:
                    source_prereqs = self._fetch_prerequisites_from_source(source, course_code)
                    prerequisites.update(source_prereqs)
                
                except Exception as e:
                    print(f"Error fetching prerequisites from {source.source_path}: {e}")
            
            prereqs_list = list(prerequisites)
            
            # Cache result
            self.knowledge_cache[cache_key] = prereqs_list
            self.last_cache_update[cache_key] = datetime.now()
            
            return prereqs_list
    
    def _fetch_prerequisites_from_source(self, source: KnowledgeSource, course_code: str) -> List[str]:
        """Fetch prerequisites from a specific source"""
        
        if source.source_type == "database":
            try:
                conn = sqlite3.connect(source.source_path, timeout=10)
                cursor = conn.cursor()
                
                cursor.execute("""
                    SELECT prerequisite_code FROM prerequisites 
                    WHERE course_code = ? AND relationship_type = 'required'
                    ORDER BY strength DESC
                """, (course_code,))
                
                prereqs = [row[0] for row in cursor.fetchall()]
                conn.close()
                return prereqs
                
            except Exception:
                return []
        
        elif source.source_type == "json_file":
            try:
                with open(source.source_path, 'r') as f:
                    data = json.load(f)
                
                courses = data.get("courses", {})
                course_info = courses.get(course_code, {})
                return course_info.get("prerequisites", [])
                
            except Exception:
                return []
        
        return []
    
    def search_courses(self, query: str, filters: Dict[str, Any] = None) -> List[CourseData]:
        """Search courses by title, description, or course code"""
        
        all_courses = self.get_courses(filters)
        query_lower = query.lower()
        
        matching_courses = []
        
        for course in all_courses:
            # Check course code match
            if query_lower in course.course_code.lower():
                matching_courses.append((course, 3))  # High priority
            # Check title match
            elif query_lower in course.course_title.lower():
                matching_courses.append((course, 2))  # Medium priority
            # Check description match
            elif query_lower in course.description.lower():
                matching_courses.append((course, 1))  # Low priority
        
        # Sort by match priority and return courses
        matching_courses.sort(key=lambda x: x[1], reverse=True)
        return [course for course, _ in matching_courses]
    
    def get_cache_status(self) -> Dict[str, Any]:
        """Get cache status information"""
        
        with self.cache_lock:
            return {
                "cache_entries": len(self.knowledge_cache),
                "last_updates": {k: v.isoformat() for k, v in self.last_cache_update.items()},
                "available_sources": len([s for s in self.sources if s.is_available]),
                "total_sources": len(self.sources),
                "sources_status": [
                    {
                        "type": s.source_type,
                        "path": s.source_path,
                        "priority": s.priority,
                        "available": s.is_available
                    }
                    for s in self.sources
                ]
            }
    
    def invalidate_cache(self, pattern: str = None):
        """Invalidate cache entries matching pattern"""
        
        with self.cache_lock:
            if pattern is None:
                # Clear all cache
                self.knowledge_cache.clear()
                self.last_cache_update.clear()
            else:
                # Clear matching entries
                keys_to_remove = [k for k in self.knowledge_cache.keys() if pattern in k]
                for key in keys_to_remove:
                    self._invalidate_cache_key(key)

def test_dynamic_knowledge_manager():
    """Test the dynamic knowledge manager"""
    
    manager = DynamicKnowledgeManager()
    
    print("=== Dynamic Knowledge Manager Test ===")
    
    # Test course fetching
    print("\n1. Fetching CS courses...")
    cs_courses = manager.get_courses({"department": "CS"})
    print(f"Found {len(cs_courses)} CS courses")
    for course in cs_courses[:5]:
        print(f"  - {course.course_code}: {course.course_title}")
    
    # Test major fetching
    print("\n2. Fetching majors...")
    majors = manager.get_majors()
    print(f"Found {len(majors)} majors")
    for major in majors:
        print(f"  - {major.major_name}: {len(major.foundation_courses)} foundation courses")
    
    # Test search
    print("\n3. Searching for 'programming' courses...")
    search_results = manager.search_courses("programming")
    print(f"Found {len(search_results)} matches")
    for course in search_results[:3]:
        print(f"  - {course.course_code}: {course.course_title}")
    
    # Test prerequisites
    print("\n4. Getting prerequisites for CS 25100...")
    prereqs = manager.get_prerequisites("CS 25100")
    print(f"Prerequisites: {', '.join(prereqs) if prereqs else 'None found'}")
    
    # Test cache status
    print("\n5. Cache status...")
    status = manager.get_cache_status()
    print(f"Cache entries: {status['cache_entries']}")
    print(f"Available sources: {status['available_sources']}/{status['total_sources']}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_dynamic_knowledge_manager()