# 📊 Neo4j Knowledge Graph Setup Guide

Your Purdue CS knowledge graph data has been successfully extracted into CSV files! Here's everything you need to get it into Neo4j.

## 📁 Generated Files

### **Core Data Files**
- `neo4j_courses.csv` (120 courses) - Complete course information with difficulty ratings, prerequisites, and metadata
- `neo4j_prerequisites.csv` (27 relationships) - Course prerequisites and corequisites 
- `neo4j_tracks.csv` (2 tracks) - Academic tracks (Software Engineering, Machine Intelligence)
- `neo4j_track_requirements.csv` (0 requirements) - Track-specific course requirements
- `neo4j_sqlite_courses.csv` (13 courses) - Enhanced course data from SQLite with success rates
- `neo4j_sqlite_prerequisites.csv` (15 relationships) - Additional prerequisite data from SQLite

### **Import Script**
- `neo4j_import_script.cypher` - Complete Cypher commands to import all data

## 🚀 Quick Start with Neo4j

### Option 1: Neo4j Desktop (Recommended)
1. **Download Neo4j Desktop** from https://neo4j.com/download/
2. **Create a new project** and database
3. **Copy CSV files** to the import directory:
   - Find your database folder (usually `~/.Neo4j/relate-data/dbmss/dbms-xxxxx/import/`)
   - Copy all `neo4j_*.csv` files there
4. **Open Neo4j Browser** and run the import script

### Option 2: Neo4j Aura (Cloud)
1. Create account at https://neo4j.com/cloud/aura/
2. Create a new database
3. Upload CSV files through the interface
4. Run import commands

## 📊 Data Structure Overview

### **Nodes (Entities)**
```
(:Course) - Individual courses
  ├── code: "CS 18000"
  ├── title: "Problem Solving and Object-Oriented Programming" 
  ├── credits: 4
  ├── difficulty: 4.2
  ├── is_critical: true
  └── course_type: "foundation"

(:Track) - Academic specializations  
  ├── code: "SE"
  ├── name: "Software Engineering"
  └── difficulty_rating: 3.8
```

### **Relationships (Connections)**
```
(Course)-[:PREREQUISITE_OF]->(Course)
(Course)-[:SAME_SEMESTER]->(Course)  
(Track)-[:REQUIRES]->(Course)
```

## 🎯 Import Instructions

### Step 1: Prepare Neo4j
```cypher
// Optional: Clear existing data
MATCH (n) DETACH DELETE n;

// Create constraints for data integrity
CREATE CONSTRAINT course_code IF NOT EXISTS FOR (c:Course) REQUIRE c.code IS UNIQUE;
CREATE CONSTRAINT track_code IF NOT EXISTS FOR (t:Track) REQUIRE t.code IS UNIQUE;
```

### Step 2: Import Data
Copy and paste the contents of `neo4j_import_script.cypher` into Neo4j Browser, or run:

```cypher
// Import courses
LOAD CSV WITH HEADERS FROM 'file:///neo4j_courses.csv' AS row
CREATE (c:Course {
    code: row.code,
    title: row.title,
    credits: toInteger(row.credits),
    difficulty: toFloat(row.difficulty),
    is_critical: toBoolean(row.is_critical)
    // ... more properties
});

// Import relationships
LOAD CSV WITH HEADERS FROM 'file:///neo4j_prerequisites.csv' AS row
MATCH (course:Course {code: row.course_code})
MATCH (prereq:Course {code: row.prerequisite_code})  
CREATE (prereq)-[:PREREQUISITE_OF]->(course);
```

## 🔍 Example Queries

### Find Prerequisites for a Course
```cypher
MATCH (prereq)-[:PREREQUISITE_OF*]->(course:Course {code: 'CS 25000'})
RETURN prereq.code, prereq.title;
```

### Find Prerequisite Chain
```cypher  
MATCH path = (start:Course)-[:PREREQUISITE_OF*]->(end:Course {code: 'CS 35400'})
WHERE NOT (()-[:PREREQUISITE_OF]->(start))
RETURN path;
```

### Find Hardest Courses
```cypher
MATCH (c:Course)
WHERE c.difficulty > 4.0
RETURN c.code, c.title, c.difficulty
ORDER BY c.difficulty DESC;
```

### Find Foundation Courses
```cypher
MATCH (c:Course)
WHERE c.course_type = 'foundation'
RETURN c.code, c.title, c.difficulty
ORDER BY c.difficulty DESC;
```

### Course Load Analysis
```cypher
MATCH (c:Course)
WHERE c.typical_semester CONTAINS 'freshman'
RETURN c.typical_semester, 
       count(c) as course_count,
       avg(c.difficulty) as avg_difficulty,
       sum(c.credits) as total_credits;
```

## 📈 Visualization Ideas

Once imported, you can create amazing visualizations:

1. **Prerequisite Flow Charts** - See the entire course dependency tree
2. **Difficulty Heat Maps** - Color courses by difficulty rating  
3. **Critical Path Analysis** - Highlight courses that block graduation
4. **Track Comparisons** - Compare requirements across specializations
5. **Semester Planning** - Visualize course load by semester

## 🔧 Data Sources

Your CSV files combine data from:
- **comprehensive_knowledge_graph.json** - Main course catalog with 489 lines
- **CLI bot knowledge graph** - Enhanced metadata with 4,291 lines  
- **purdue_courses_complete.json** - Complete university catalog with 61K+ courses
- **SQLite databases** - Success rates and difficulty analysis
- **Real curriculum data** - Live academic requirements

## 🎯 Next Steps

1. **Import the data** using the provided Cypher script
2. **Explore relationships** with the example queries
3. **Create visualizations** to understand course dependencies
4. **Analyze academic paths** for different specializations
5. **Build recommendation systems** based on the graph structure

## 🆘 Troubleshooting

### File Path Issues
- Ensure CSV files are in Neo4j's `import` directory
- Use `file:///filename.csv` format in LOAD CSV commands
- Check file permissions (readable by Neo4j)

### Data Type Errors  
- Use `toInteger()`, `toFloat()`, `toBoolean()` for type conversion
- Handle empty values with `CASE WHEN row.field = '' THEN null ELSE row.field END`

### Memory Issues
- Import in smaller batches using `LIMIT`
- Use `PERIODIC COMMIT` for large datasets
- Increase Neo4j heap size if needed

## 📊 Data Statistics

- **120 courses** from multiple knowledge sources
- **27 prerequisite relationships** mapped
- **2 academic tracks** (SE, MI) defined  
- **15 SQLite relationships** with success metrics
- **Rich metadata** including difficulty ratings, time commitments, success tips

Your knowledge graph is ready to unlock insights about academic planning, course dependencies, and graduation pathways! 🎓