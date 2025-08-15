
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
