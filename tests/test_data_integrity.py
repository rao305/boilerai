import pytest
from api_gateway.db import db_query

def test_mi_course_refs_exist():
    """Test that all MI track group course references exist in courses table"""
    rows = db_query("""
      WITH ref AS (
        SELECT jsonb_array_elements_text(tg.course_list) AS cid
        FROM track_groups tg JOIN tracks t ON t.id=tg.track_id
        WHERE t.id='machine_intelligence'
      )
      SELECT COUNT(*) AS missing
      FROM ref r LEFT JOIN courses c ON c.id = r.cid
      WHERE c.id IS NULL
    """, [])
    assert rows[0]["missing"] == 0, "All MI track course references should exist in courses table"

def test_prereq_refs_exist():
    """Test that all prerequisite expressions reference existing courses"""
    rows = db_query("""
      WITH all_refs AS (
        SELECT DISTINCT jsonb_path_query(p.expr, '$.** ? (@.type() == "string")')::text AS cid
        FROM prereqs p
      ),
      norm AS (SELECT trim(both '"' FROM cid) AS cid FROM all_refs)
      SELECT COUNT(*) AS missing
      FROM norm n LEFT JOIN courses c ON c.id = n.cid
      WHERE c.id IS NULL
    """, [])
    assert rows[0]["missing"] == 0, "All prerequisite course references should exist in courses table"

def test_track_groups_integrity():
    """Test that MI track has all required groups"""
    rows = db_query("""
      SELECT key FROM track_groups tg
      JOIN tracks t ON t.id = tg.track_id
      WHERE t.id = 'machine_intelligence'
      ORDER BY key
    """, [])
    
    expected_groups = ['mi_electives', 'mi_req_ai_or_ir', 'mi_req_alg', 'mi_req_ml_dm', 'mi_req_prob']
    actual_groups = [row['key'] for row in rows]
    
    assert actual_groups == expected_groups, f"Expected {expected_groups}, got {actual_groups}"

def test_course_counts():
    """Test that we have the expected number of courses after adding missing ones"""
    rows = db_query("SELECT COUNT(*) as course_count FROM courses", [])
    # Original 24 + 35 new courses = 59 total
    assert rows[0]["course_count"] >= 59, f"Expected at least 59 courses, got {rows[0]['course_count']}"

def test_aliases_integrity():
    """Test that all course aliases reference existing courses"""
    rows = db_query("""
      SELECT COUNT(*) AS missing_aliases
      FROM course_aliases ca
      LEFT JOIN courses c ON c.id = ca.course_id
      WHERE c.id IS NULL
    """, [])
    assert rows[0]["missing_aliases"] == 0, "All course aliases should reference existing courses"

def test_offering_integrity():
    """Test that all offerings reference existing courses"""
    rows = db_query("""
      SELECT COUNT(*) AS missing_offerings
      FROM offerings o
      LEFT JOIN courses c ON c.id = o.course_id
      WHERE c.id IS NULL
    """, [])
    assert rows[0]["missing_offerings"] == 0, "All offerings should reference existing courses"

def test_mi_track_completeness():
    """Test that MI track groups contain expected number of courses"""
    rows = db_query("""
      SELECT tg.key, jsonb_array_length(tg.course_list) as course_count
      FROM track_groups tg
      JOIN tracks t ON t.id = tg.track_id
      WHERE t.id = 'machine_intelligence'
      ORDER BY tg.key
    """, [])
    
    group_counts = {row['key']: row['course_count'] for row in rows}
    
    # Verify each group has courses
    assert group_counts['mi_electives'] > 10, "MI electives should have multiple courses"
    assert group_counts['mi_req_ai_or_ir'] >= 2, "AI/IR requirement should have options"
    assert group_counts['mi_req_alg'] >= 1, "Algorithms requirement should exist"
    assert group_counts['mi_req_ml_dm'] >= 1, "ML/DM requirement should exist"
    assert group_counts['mi_req_prob'] >= 3, "Probability requirement should have options"