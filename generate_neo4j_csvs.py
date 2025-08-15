#!/usr/bin/env python3
"""
Generate CSV files from knowledge graph data for Neo4j import
"""

import json
import csv
import sqlite3
import os
from pathlib import Path

def load_json_data():
    """Load all JSON knowledge graph data"""
    data = {}
    
    # Load comprehensive knowledge graph
    try:
        with open('comprehensive_knowledge_graph.json', 'r') as f:
            data['comprehensive'] = json.load(f)
        print("✅ Loaded comprehensive_knowledge_graph.json")
    except FileNotFoundError:
        print("⚠️ comprehensive_knowledge_graph.json not found")
        data['comprehensive'] = {}
    
    # Load CLI bot knowledge graph
    try:
        with open('src/cli test1/my_cli_bot/data/cs_knowledge_graph.json', 'r') as f:
            data['cli_bot'] = json.load(f)
        print("✅ Loaded CLI bot knowledge graph")
    except FileNotFoundError:
        print("⚠️ CLI bot knowledge graph not found")
        data['cli_bot'] = {}
    
    # Load complete course catalog
    try:
        with open('src/data/purdue_courses_complete.json', 'r') as f:
            data['complete_catalog'] = json.load(f)
        print(f"✅ Loaded complete course catalog ({len(data['complete_catalog'])} courses)")
    except FileNotFoundError:
        print("⚠️ Complete course catalog not found")
        data['complete_catalog'] = []
    
    return data

def create_courses_csv(data):
    """Create courses.csv with all course information"""
    courses = {}
    
    # Process comprehensive knowledge graph
    if 'courses' in data['comprehensive']:
        for code, course_info in data['comprehensive']['courses'].items():
            courses[code] = {
                'code': code,
                'title': course_info.get('title', ''),
                'credits': course_info.get('credits', 0),
                'description': course_info.get('description', ''),
                'course_type': course_info.get('course_type', 'elective'),
                'typical_semester': course_info.get('typical_semester', ''),
                'difficulty': course_info.get('difficulty', 0),
                'workload_hours': course_info.get('workload_hours', 0),
                'required': course_info.get('required', False),
                'is_critical': course_info.get('is_critical', False),
                'offered_semesters': '|'.join(course_info.get('offered_semesters', [])),
                'source': 'comprehensive'
            }
    
    # Process CLI bot knowledge graph
    if 'courses' in data['cli_bot']:
        for code, course_info in data['cli_bot']['courses'].items():
            if code not in courses:
                courses[code] = {
                    'code': code,
                    'title': course_info.get('title', ''),
                    'credits': course_info.get('credits', 0),
                    'description': course_info.get('description', ''),
                    'course_type': course_info.get('course_type', 'elective'),
                    'typical_semester': course_info.get('semester', ''),
                    'difficulty': course_info.get('difficulty_rating', 0),
                    'workload_hours': 0,
                    'required': False,
                    'is_critical': course_info.get('is_critical', False),
                    'offered_semesters': '',
                    'source': 'cli_bot'
                }
            else:
                # Merge additional info from CLI bot
                courses[code]['difficulty'] = course_info.get('difficulty_rating', courses[code]['difficulty'])
                courses[code]['is_critical'] = course_info.get('is_critical', courses[code]['is_critical'])
                if course_info.get('time_commitment'):
                    courses[code]['time_commitment'] = course_info.get('time_commitment', '')
                if course_info.get('difficulty_level'):
                    courses[code]['difficulty_level'] = course_info.get('difficulty_level', '')
    
    # Add sample from complete catalog (CS courses only to keep manageable)
    cs_courses_from_catalog = 0
    for course in data['complete_catalog']:
        if course.get('department_code') == 'CS' and cs_courses_from_catalog < 100:  # Limit for demo
            code = course.get('full_course_code', '')
            if code and code not in courses:
                courses[code] = {
                    'code': code,
                    'title': course.get('course_title', ''),
                    'credits': float(course.get('credit_hours', 0)) if course.get('credit_hours') else 0,
                    'description': course.get('description', ''),
                    'course_type': 'catalog',
                    'typical_semester': '',
                    'difficulty': 0,
                    'workload_hours': 0,
                    'required': False,
                    'is_critical': False,
                    'offered_semesters': course.get('term', ''),
                    'source': 'complete_catalog'
                }
                cs_courses_from_catalog += 1
    
    # Write to CSV
    with open('neo4j_courses.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['code', 'title', 'credits', 'description', 'course_type', 
                     'typical_semester', 'difficulty', 'workload_hours', 'required', 
                     'is_critical', 'offered_semesters', 'source', 'time_commitment', 
                     'difficulty_level']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for course in courses.values():
            # Ensure all fields exist
            for field in fieldnames:
                if field not in course:
                    course[field] = ''
            writer.writerow(course)
    
    print(f"✅ Created neo4j_courses.csv with {len(courses)} courses")
    return courses

def create_prerequisites_csv(data):
    """Create prerequisites.csv for course relationships"""
    prerequisites = []
    
    # From comprehensive knowledge graph
    if 'courses' in data['comprehensive']:
        for code, course_info in data['comprehensive']['courses'].items():
            # Prerequisites
            for prereq in course_info.get('prerequisites', []):
                prerequisites.append({
                    'course_code': code,
                    'prerequisite_code': prereq,
                    'relationship_type': 'prerequisite',
                    'source': 'comprehensive'
                })
            
            # Corequisites
            for coreq in course_info.get('corequisites', []):
                prerequisites.append({
                    'course_code': code,
                    'prerequisite_code': coreq,
                    'relationship_type': 'corequisite',
                    'source': 'comprehensive'
                })
    
    # From CLI bot data (if it has prerequisite info)
    if 'courses' in data['cli_bot']:
        for code, course_info in data['cli_bot']['courses'].items():
            if 'prerequisites' in course_info:
                for prereq in course_info.get('prerequisites', []):
                    # Avoid duplicates
                    exists = any(p['course_code'] == code and p['prerequisite_code'] == prereq 
                               for p in prerequisites)
                    if not exists:
                        prerequisites.append({
                            'course_code': code,
                            'prerequisite_code': prereq,
                            'relationship_type': 'prerequisite',
                            'source': 'cli_bot'
                        })
    
    # Write to CSV
    with open('neo4j_prerequisites.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['course_code', 'prerequisite_code', 'relationship_type', 'source']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(prerequisites)
    
    print(f"✅ Created neo4j_prerequisites.csv with {len(prerequisites)} relationships")
    return prerequisites

def create_tracks_csv(data):
    """Create tracks.csv and track_requirements.csv"""
    tracks = []
    track_requirements = []
    
    # From comprehensive knowledge graph
    if 'tracks' in data['comprehensive']:
        for track_code, track_info in data['comprehensive']['tracks'].items():
            tracks.append({
                'code': track_code,
                'name': track_info.get('name', ''),
                'description': track_info.get('description', ''),
                'career_focus': track_info.get('career_focus', ''),
                'difficulty_rating': track_info.get('difficulty_rating', 0),
                'research_oriented': track_info.get('research_oriented', False),
                'source': 'comprehensive'
            })
            
            # Track requirements
            for req_type, courses in track_info.get('requirements', {}).items():
                if isinstance(courses, list):
                    for course in courses:
                        track_requirements.append({
                            'track_code': track_code,
                            'course_code': course,
                            'requirement_type': req_type,
                            'source': 'comprehensive'
                        })
    
    # From CLI bot data
    if 'tracks' in data['cli_bot']:
        for track_code, track_info in data['cli_bot']['tracks'].items():
            # Check if track already exists
            exists = any(t['code'] == track_code for t in tracks)
            if not exists:
                tracks.append({
                    'code': track_code,
                    'name': track_info.get('name', ''),
                    'description': track_info.get('description', ''),
                    'career_focus': track_info.get('career_focus', ''),
                    'difficulty_rating': track_info.get('difficulty_rating', 0),
                    'research_oriented': track_info.get('research_oriented', False),
                    'source': 'cli_bot'
                })
    
    # Write tracks CSV
    with open('neo4j_tracks.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['code', 'name', 'description', 'career_focus', 
                     'difficulty_rating', 'research_oriented', 'source']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(tracks)
    
    # Write track requirements CSV
    with open('neo4j_track_requirements.csv', 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['track_code', 'course_code', 'requirement_type', 'source']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(track_requirements)
    
    print(f"✅ Created neo4j_tracks.csv with {len(tracks)} tracks")
    print(f"✅ Created neo4j_track_requirements.csv with {len(track_requirements)} requirements")
    return tracks, track_requirements

def load_sqlite_data():
    """Load data from SQLite databases"""
    sqlite_data = {}
    
    # Try to load from the main database
    db_paths = [
        'purdue_cs_knowledge.db',
        'src/cli test1/my_cli_bot/data/purdue_cs_advisor.db',
        'src/cli test1/my_cli_bot/purdue_cs_knowledge.db'
    ]
    
    for db_path in db_paths:
        if os.path.exists(db_path):
            try:
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row
                
                # Get courses
                try:
                    cursor = conn.execute("SELECT * FROM courses LIMIT 100")
                    sqlite_data['courses'] = [dict(row) for row in cursor.fetchall()]
                    print(f"✅ Loaded {len(sqlite_data['courses'])} courses from {db_path}")
                except sqlite3.OperationalError:
                    pass
                
                # Get prerequisites
                try:
                    cursor = conn.execute("SELECT * FROM prerequisites LIMIT 500")
                    sqlite_data['prerequisites'] = [dict(row) for row in cursor.fetchall()]
                    print(f"✅ Loaded {len(sqlite_data['prerequisites'])} prerequisites from {db_path}")
                except sqlite3.OperationalError:
                    pass
                
                # Get tracks
                try:
                    cursor = conn.execute("SELECT * FROM tracks")
                    sqlite_data['tracks'] = [dict(row) for row in cursor.fetchall()]
                    print(f"✅ Loaded {len(sqlite_data['tracks'])} tracks from {db_path}")
                except sqlite3.OperationalError:
                    pass
                
                conn.close()
                break  # Use first successful database
                
            except Exception as e:
                print(f"⚠️ Could not load {db_path}: {e}")
                continue
    
    return sqlite_data

def create_sqlite_csvs(sqlite_data):
    """Create CSV files from SQLite data"""
    if 'courses' in sqlite_data and sqlite_data['courses']:
        with open('neo4j_sqlite_courses.csv', 'w', newline='', encoding='utf-8') as f:
            if sqlite_data['courses']:
                fieldnames = sqlite_data['courses'][0].keys()
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(sqlite_data['courses'])
        print(f"✅ Created neo4j_sqlite_courses.csv with {len(sqlite_data['courses'])} courses")
    
    if 'prerequisites' in sqlite_data and sqlite_data['prerequisites']:
        with open('neo4j_sqlite_prerequisites.csv', 'w', newline='', encoding='utf-8') as f:
            if sqlite_data['prerequisites']:
                fieldnames = sqlite_data['prerequisites'][0].keys()
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(sqlite_data['prerequisites'])
        print(f"✅ Created neo4j_sqlite_prerequisites.csv with {len(sqlite_data['prerequisites'])} prerequisites")
    
    if 'tracks' in sqlite_data and sqlite_data['tracks']:
        with open('neo4j_sqlite_tracks.csv', 'w', newline='', encoding='utf-8') as f:
            if sqlite_data['tracks']:
                fieldnames = sqlite_data['tracks'][0].keys()
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(sqlite_data['tracks'])
        print(f"✅ Created neo4j_sqlite_tracks.csv with {len(sqlite_data['tracks'])} tracks")

def create_neo4j_import_script():
    """Create Cypher script for importing CSV data into Neo4j"""
    script = """
// Neo4j Import Script for Purdue CS Knowledge Graph
// Run these commands in Neo4j Browser or cypher-shell

// Clear existing data (optional - be careful!)
// MATCH (n) DETACH DELETE n;

// Create constraints and indexes
CREATE CONSTRAINT course_code IF NOT EXISTS FOR (c:Course) REQUIRE c.code IS UNIQUE;
CREATE CONSTRAINT track_code IF NOT EXISTS FOR (t:Track) REQUIRE t.code IS UNIQUE;
CREATE INDEX course_type IF NOT EXISTS FOR (c:Course) ON (c.course_type);
CREATE INDEX course_difficulty IF NOT EXISTS FOR (c:Course) ON (c.difficulty);

// Import Courses from JSON data
LOAD CSV WITH HEADERS FROM 'file:///neo4j_courses.csv' AS row
CREATE (c:Course {
    code: row.code,
    title: row.title,
    credits: toInteger(row.credits),
    description: row.description,
    course_type: row.course_type,
    typical_semester: row.typical_semester,
    difficulty: toFloat(row.difficulty),
    workload_hours: toInteger(row.workload_hours),
    required: toBoolean(row.required),
    is_critical: toBoolean(row.is_critical),
    offered_semesters: split(row.offered_semesters, '|'),
    source: row.source,
    time_commitment: row.time_commitment,
    difficulty_level: row.difficulty_level
});

// Import Prerequisites relationships
LOAD CSV WITH HEADERS FROM 'file:///neo4j_prerequisites.csv' AS row
MATCH (course:Course {code: row.course_code})
MATCH (prereq:Course {code: row.prerequisite_code})
CREATE (prereq)-[:PREREQUISITE_OF {type: row.relationship_type, source: row.source}]->(course);

// Import Tracks
LOAD CSV WITH HEADERS FROM 'file:///neo4j_tracks.csv' AS row
CREATE (t:Track {
    code: row.code,
    name: row.name,
    description: row.description,
    career_focus: row.career_focus,
    difficulty_rating: toFloat(row.difficulty_rating),
    research_oriented: toBoolean(row.research_oriented),
    source: row.source
});

// Import Track Requirements
LOAD CSV WITH HEADERS FROM 'file:///neo4j_track_requirements.csv' AS row
MATCH (track:Track {code: row.track_code})
MATCH (course:Course {code: row.course_code})
CREATE (track)-[:REQUIRES {type: row.requirement_type, source: row.source}]->(course);

// Import SQLite data if available
// Courses from SQLite
LOAD CSV WITH HEADERS FROM 'file:///neo4j_sqlite_courses.csv' AS row
MERGE (c:Course {code: row.code})
SET c.sqlite_title = row.title,
    c.sqlite_credits = toInteger(row.credits),
    c.sqlite_description = row.description,
    c.sqlite_course_type = row.course_type,
    c.sqlite_difficulty_rating = toFloat(row.difficulty_rating),
    c.sqlite_is_critical = toBoolean(row.is_critical);

// Prerequisites from SQLite
LOAD CSV WITH HEADERS FROM 'file:///neo4j_sqlite_prerequisites.csv' AS row
MATCH (course:Course {code: row.course_code})
MATCH (prereq:Course {code: row.prerequisite_code})
MERGE (prereq)-[r:PREREQUISITE_OF]->(course)
SET r.sqlite_type = row.requirement_type,
    r.is_corequisite = toBoolean(row.is_corequisite);

// Create some useful derived relationships
// Courses in the same semester
MATCH (c1:Course), (c2:Course)
WHERE c1.typical_semester = c2.typical_semester 
  AND c1.typical_semester <> '' 
  AND c1 <> c2
CREATE (c1)-[:SAME_SEMESTER]->(c2);

// Foundation courses
MATCH (c:Course)
WHERE c.course_type = 'foundation'
SET c:FoundationCourse;

// Critical path courses
MATCH (c:Course)
WHERE c.is_critical = true
SET c:CriticalCourse;

// Query examples:
// 1. Find all prerequisites for a course:
// MATCH (prereq)-[:PREREQUISITE_OF*]->(course:Course {code: 'CS 25000'})
// RETURN prereq.code, prereq.title;

// 2. Find prerequisite chain:
// MATCH path = (start:Course)-[:PREREQUISITE_OF*]->(end:Course {code: 'CS 35400'})
// WHERE NOT (()-[:PREREQUISITE_OF]->(start))
// RETURN path;

// 3. Find courses by difficulty:
// MATCH (c:Course)
// WHERE c.difficulty > 4.0
// RETURN c.code, c.title, c.difficulty
// ORDER BY c.difficulty DESC;

// 4. Find track requirements:
// MATCH (t:Track)-[:REQUIRES]->(c:Course)
// WHERE t.code = 'SE'
// RETURN c.code, c.title;
"""
    
    with open('neo4j_import_script.cypher', 'w') as f:
        f.write(script)
    
    print("✅ Created neo4j_import_script.cypher")

def main():
    print("🚀 Generating Neo4j CSV files from knowledge graph data...")
    print()
    
    # Load all JSON data
    data = load_json_data()
    
    # Create CSV files from JSON data
    courses = create_courses_csv(data)
    prerequisites = create_prerequisites_csv(data)
    tracks, track_requirements = create_tracks_csv(data)
    
    # Load and create CSV files from SQLite data
    sqlite_data = load_sqlite_data()
    create_sqlite_csvs(sqlite_data)
    
    # Create Neo4j import script
    create_neo4j_import_script()
    
    print()
    print("📊 Summary:")
    print(f"   • {len(courses)} courses exported")
    print(f"   • {len(prerequisites)} prerequisite relationships")
    print(f"   • {len(tracks)} academic tracks")
    print(f"   • {len(track_requirements)} track requirements")
    print()
    print("📁 Files created:")
    print("   • neo4j_courses.csv - All course data")
    print("   • neo4j_prerequisites.csv - Course relationships")
    print("   • neo4j_tracks.csv - Academic tracks")
    print("   • neo4j_track_requirements.csv - Track requirements")
    print("   • neo4j_sqlite_*.csv - SQLite database exports")
    print("   • neo4j_import_script.cypher - Import commands")
    print()
    print("🎯 Next steps:")
    print("   1. Copy CSV files to Neo4j import directory")
    print("   2. Run the Cypher import script in Neo4j Browser")
    print("   3. Explore your knowledge graph!")

if __name__ == "__main__":
    main()