"""
Data ingestion service for structured academic data.
"""

import csv
import json
import zipfile
from io import StringIO, BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import get_logger
from app.models import (
    Course,
    CourseOffering, 
    Major,
    Track,
    TrackGroup,
    Requirement,
    Prerequisite,
    Policy
)

logger = get_logger(__name__)


class DataIngestionService:
    """Service for ingesting structured academic data."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def ingest_data_pack(self, data_pack_bytes: bytes) -> Dict[str, Any]:
        """
        Ingest complete data pack from ZIP file.
        
        Expected structure:
        - courses.csv
        - offerings.csv  
        - prereqs.jsonl
        - requirements.json
        - tracks.json
        - policies.json
        """
        logger.info("Starting data pack ingestion")
        
        results = {
            "status": "success",
            "files_processed": [],
            "errors": [],
            "summary": {}
        }
        
        try:
            # Extract ZIP file
            with zipfile.ZipFile(BytesIO(data_pack_bytes), 'r') as zip_ref:
                file_contents = {}
                for filename in zip_ref.namelist():
                    if not filename.startswith('__MACOSX/'):  # Skip macOS metadata
                        file_contents[filename] = zip_ref.read(filename)
            
            # Process files in dependency order
            async with self.db.begin():
                # 1. Majors and Tracks (from tracks.json)
                if 'tracks.json' in file_contents:
                    track_stats = await self._process_tracks_file(file_contents['tracks.json'])
                    results["files_processed"].append("tracks.json")
                    results["summary"]["majors"] = track_stats["majors"]
                    results["summary"]["tracks"] = track_stats["tracks"]
                
                # 2. Courses
                if 'courses.csv' in file_contents:
                    course_stats = await self._process_courses_file(file_contents['courses.csv'])
                    results["files_processed"].append("courses.csv")
                    results["summary"]["courses"] = course_stats
                
                # 3. Course Offerings
                if 'offerings.csv' in file_contents:
                    offering_stats = await self._process_offerings_file(file_contents['offerings.csv'])
                    results["files_processed"].append("offerings.csv")
                    results["summary"]["offerings"] = offering_stats
                
                # 4. Prerequisites
                if 'prereqs.jsonl' in file_contents:
                    prereq_stats = await self._process_prerequisites_file(file_contents['prereqs.jsonl'])
                    results["files_processed"].append("prereqs.jsonl")
                    results["summary"]["prerequisites"] = prereq_stats
                
                # 5. Requirements
                if 'requirements.json' in file_contents:
                    req_stats = await self._process_requirements_file(file_contents['requirements.json'])
                    results["files_processed"].append("requirements.json")
                    results["summary"]["requirements"] = req_stats
                
                # 6. Policies
                if 'policies.json' in file_contents:
                    policy_stats = await self._process_policies_file(file_contents['policies.json'])
                    results["files_processed"].append("policies.json")
                    results["summary"]["policies"] = policy_stats
                
            logger.info("Data pack ingestion completed successfully", **results["summary"])
            
        except Exception as e:
            logger.error("Data pack ingestion failed", error=str(e), exc_info=True)
            results["status"] = "error"
            results["errors"].append(str(e))
            raise
        
        return results
    
    async def _process_tracks_file(self, tracks_data: bytes) -> Dict[str, int]:
        """Process tracks.json file with majors and tracks."""
        tracks_json = json.loads(tracks_data.decode('utf-8'))
        
        major_count = 0
        track_count = 0
        
        for major_data in tracks_json.get("majors", []):
            # Create or update major
            major = Major(
                code=major_data["code"],
                name=major_data["name"],
                department=major_data["department"],
                degree_type=major_data["degree_type"],
                description=major_data.get("description"),
                is_active=major_data.get("is_active", True)
            )
            
            # Use merge to handle duplicates
            result = await self.db.merge(major)
            await self.db.flush()
            major_count += 1
            
            # Process tracks for this major
            for track_data in major_data.get("tracks", []):
                track = Track(
                    major_id=result.id,
                    code=track_data["code"],
                    name=track_data["name"],
                    description=track_data.get("description"),
                    is_active=track_data.get("is_active", True)
                )
                
                await self.db.merge(track)
                await self.db.flush()
                track_count += 1
                
                # Process track groups
                for group_data in track_data.get("track_groups", []):
                    track_group = TrackGroup(
                        track_id=track.id,
                        name=group_data["name"],
                        description=group_data.get("description"),
                        required_credits=group_data["required_credits"],
                        display_order=group_data.get("display_order", 0)
                    )
                    await self.db.merge(track_group)
        
        return {"majors": major_count, "tracks": track_count}
    
    async def _process_courses_file(self, courses_data: bytes) -> int:
        """Process courses.csv file."""
        courses_text = courses_data.decode('utf-8')
        df = pd.read_csv(StringIO(courses_text))
        
        course_count = 0
        
        for _, row in df.iterrows():
            course = Course(
                code=row["code"],
                title=row["title"],
                description=row["description"],
                credit_hours=int(row["credit_hours"]),
                department=row["department"],
                level=int(row["level"]),
                is_lab=row.get("is_lab", False),
                is_seminar=row.get("is_seminar", False),
                is_capstone=row.get("is_capstone", False),
                is_repeatable=row.get("is_repeatable", False),
                catalog_year=int(row["catalog_year"]),
                is_active=row.get("is_active", True),
                learning_outcomes=json.loads(row["learning_outcomes"]) if pd.notna(row.get("learning_outcomes")) else None,
                topics=json.loads(row["topics"]) if pd.notna(row.get("topics")) else None
            )
            
            await self.db.merge(course)
            course_count += 1
        
        return course_count
    
    async def _process_offerings_file(self, offerings_data: bytes) -> int:
        """Process offerings.csv file."""
        offerings_text = offerings_data.decode('utf-8')
        df = pd.read_csv(StringIO(offerings_text))
        
        offering_count = 0
        
        for _, row in df.iterrows():
            # Find course by code
            course_result = await self.db.execute(
                text("SELECT id FROM courses WHERE code = :code"),
                {"code": row["course_code"]}
            )
            course_id = course_result.scalar_one_or_none()
            
            if course_id:
                offering = CourseOffering(
                    course_id=course_id,
                    semester=row["semester"],
                    year=int(row["year"]),
                    season=row["season"],
                    instructor=row.get("instructor"),
                    capacity=int(row["capacity"]) if pd.notna(row.get("capacity")) else None,
                    enrolled=int(row.get("enrolled", 0)),
                    waitlist=int(row.get("waitlist", 0)),
                    meeting_times=json.loads(row["meeting_times"]) if pd.notna(row.get("meeting_times")) else None,
                    is_available=row.get("is_available", True),
                    is_cancelled=row.get("is_cancelled", False)
                )
                
                await self.db.merge(offering)
                offering_count += 1
        
        return offering_count
    
    async def _process_prerequisites_file(self, prereqs_data: bytes) -> int:
        """Process prereqs.jsonl file."""
        prereqs_text = prereqs_data.decode('utf-8')
        
        prereq_count = 0
        
        for line in prereqs_text.strip().split('\n'):
            if line.strip():
                prereq_data = json.loads(line)
                
                # Find course IDs
                course_result = await self.db.execute(
                    text("SELECT id FROM courses WHERE code = :code"),
                    {"code": prereq_data["course_code"]}
                )
                course_id = course_result.scalar_one_or_none()
                
                prereq_result = await self.db.execute(
                    text("SELECT id FROM courses WHERE code = :code"),
                    {"code": prereq_data["prerequisite_code"]}
                )
                prereq_course_id = prereq_result.scalar_one_or_none()
                
                if course_id and prereq_course_id:
                    prerequisite = Prerequisite(
                        course_id=course_id,
                        prerequisite_course_id=prereq_course_id,
                        prerequisite_type=prereq_data.get("type", "required"),
                        min_grade=prereq_data.get("min_grade"),
                        logic=prereq_data.get("logic"),
                        is_active=prereq_data.get("is_active", True)
                    )
                    
                    await self.db.merge(prerequisite)
                    prereq_count += 1
        
        return prereq_count
    
    async def _process_requirements_file(self, requirements_data: bytes) -> int:
        """Process requirements.json file."""
        requirements_json = json.loads(requirements_data.decode('utf-8'))
        
        requirement_count = 0
        
        for req_data in requirements_json.get("requirements", []):
            # Find track group by track code and group name
            track_group_result = await self.db.execute(
                text("""
                    SELECT tg.id 
                    FROM track_groups tg
                    JOIN tracks t ON tg.track_id = t.id
                    WHERE t.code = :track_code AND tg.name = :group_name
                """),
                {
                    "track_code": req_data["track_code"],
                    "group_name": req_data["track_group_name"]
                }
            )
            track_group_id = track_group_result.scalar_one_or_none()
            
            if track_group_id:
                requirement = Requirement(
                    track_group_id=track_group_id,
                    requirement_type=req_data["type"],
                    specification=req_data["specification"],
                    description=req_data["description"],
                    is_active=req_data.get("is_active", True)
                )
                
                await self.db.merge(requirement)
                requirement_count += 1
        
        return requirement_count
    
    async def _process_policies_file(self, policies_data: bytes) -> int:
        """Process policies.json file."""
        policies_json = json.loads(policies_data.decode('utf-8'))
        
        policy_count = 0
        
        for policy_data in policies_json.get("policies", []):
            policy = Policy(
                name=policy_data["name"],
                category=policy_data["category"],
                description=policy_data["description"],
                rules=policy_data["rules"],
                effective_date=pd.to_datetime(policy_data["effective_date"]),
                expiration_date=pd.to_datetime(policy_data["expiration_date"]) if policy_data.get("expiration_date") else None,
                is_active=policy_data.get("is_active", True)
            )
            
            await self.db.merge(policy)
            policy_count += 1
        
        return policy_count
    
    async def validate_data_integrity(self) -> Dict[str, Any]:
        """Validate database integrity and consistency."""
        logger.info("Starting data integrity validation")
        
        validation_results = {
            "status": "success",
            "errors": [],
            "warnings": [],
            "statistics": {}
        }
        
        try:
            # Check for orphaned records
            orphaned_checks = [
                ("course_offerings", "course_id", "courses", "id"),
                ("prerequisites", "course_id", "courses", "id"),
                ("prerequisites", "prerequisite_course_id", "courses", "id"),
                ("tracks", "major_id", "majors", "id"),
                ("track_groups", "track_id", "tracks", "id"),
                ("requirements", "track_group_id", "track_groups", "id"),
            ]
            
            for child_table, child_fk, parent_table, parent_pk in orphaned_checks:
                result = await self.db.execute(
                    text(f"""
                        SELECT COUNT(*) as orphaned_count
                        FROM {child_table} c
                        LEFT JOIN {parent_table} p ON c.{child_fk} = p.{parent_pk}
                        WHERE p.{parent_pk} IS NULL
                    """)
                )
                orphaned_count = result.scalar()
                
                if orphaned_count > 0:
                    validation_results["errors"].append(
                        f"Found {orphaned_count} orphaned records in {child_table}"
                    )
            
            # Check for circular prerequisites
            prereq_result = await self.db.execute(
                text("""
                    WITH RECURSIVE prereq_chain AS (
                        SELECT course_id, prerequisite_course_id, 1 as depth
                        FROM prerequisites
                        WHERE is_active = true
                        
                        UNION ALL
                        
                        SELECT pc.course_id, p.prerequisite_course_id, pc.depth + 1
                        FROM prereq_chain pc
                        JOIN prerequisites p ON pc.prerequisite_course_id = p.course_id
                        WHERE pc.depth < 20 AND p.is_active = true
                    )
                    SELECT COUNT(*) as circular_count
                    FROM prereq_chain
                    WHERE course_id = prerequisite_course_id
                """)
            )
            circular_count = prereq_result.scalar()
            
            if circular_count > 0:
                validation_results["errors"].append(
                    f"Found {circular_count} circular prerequisite dependencies"
                )
            
            # Collect statistics
            stats_queries = {
                "total_courses": "SELECT COUNT(*) FROM courses WHERE is_active = true",
                "total_offerings": "SELECT COUNT(*) FROM course_offerings WHERE is_available = true",
                "total_prerequisites": "SELECT COUNT(*) FROM prerequisites WHERE is_active = true",
                "total_majors": "SELECT COUNT(*) FROM majors WHERE is_active = true",
                "total_tracks": "SELECT COUNT(*) FROM tracks WHERE is_active = true",
                "total_requirements": "SELECT COUNT(*) FROM requirements WHERE is_active = true",
            }
            
            for stat_name, query in stats_queries.items():
                result = await self.db.execute(text(query))
                validation_results["statistics"][stat_name] = result.scalar()
            
            if validation_results["errors"]:
                validation_results["status"] = "error"
            elif validation_results["warnings"]:
                validation_results["status"] = "warning"
            
            logger.info("Data integrity validation completed", **validation_results["statistics"])
            
        except Exception as e:
            logger.error("Data integrity validation failed", error=str(e), exc_info=True)
            validation_results["status"] = "error"
            validation_results["errors"].append(f"Validation failed: {str(e)}")
        
        return validation_results