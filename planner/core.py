from __future__ import annotations
from typing import Dict, Any, List, Set, Tuple
import networkx as nx
import json
from api_gateway.db import db_query

def _load_rules():
    reqs = db_query("SELECT key, rule FROM requirements WHERE major_id='CS'", [])
    tgroups = db_query("""SELECT tg.key, tg.need, tg.course_list, t.id as track_id
                          FROM track_groups tg JOIN tracks t ON t.id=tg.track_id""", [])
    policies = db_query("SELECT * FROM policies WHERE major_id='CS'", [])
    prereqs = db_query("SELECT dst_course, kind, expr, min_grade FROM prereqs WHERE major_id='CS'", [])
    courses = db_query("SELECT id, title, credits FROM courses WHERE major_id='CS'", [])
    offerings = db_query("SELECT course_id, term_pattern FROM offerings", [])
    return reqs, tgroups, (policies[0] if policies else None), prereqs, courses, offerings

def _build_prereq_graph(prereqs: List[Dict], courses: List[Dict]) -> nx.DiGraph:
    """Build prerequisite dependency graph"""
    G = nx.DiGraph()
    course_ids = {c["id"] for c in courses}
    
    # Add all courses as nodes
    for course in courses:
        G.add_node(course["id"], **course)
    
    # Add prerequisite edges
    for prereq in prereqs:
        dst = prereq["dst_course"]
        if dst not in course_ids:
            continue
            
        kind = prereq["kind"]
        expr = json.loads(prereq["expr"]) if isinstance(prereq["expr"], str) else prereq["expr"]
        min_grade = prereq["min_grade"]
        
        if kind == "allof":
            # All courses in expr are required
            for src in expr:
                if src in course_ids:
                    G.add_edge(src, dst, kind="allof", min_grade=min_grade)
        elif kind == "oneof":
            # One of the courses/groups in expr is required
            # For now, add edges from all options (scheduler will pick one)
            for option in expr:
                if isinstance(option, list):
                    # Multiple course sequence (e.g., ["MA22100","MA22200"])
                    for src in option:
                        if src in course_ids:
                            G.add_edge(src, dst, kind="oneof", min_grade=min_grade, group=str(option))
                else:
                    # Single course
                    if option in course_ids:
                        G.add_edge(option, dst, kind="oneof", min_grade=min_grade)
    
    return G

def _check_grade_requirement(grade: str, min_grade: str) -> bool:
    """Check if achieved grade meets minimum requirement"""
    grade_points = {"A+": 4.3, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, 
                   "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "D-": 0.7, "F": 0.0}
    return grade_points.get(grade, 0.0) >= grade_points.get(min_grade, 2.0)

def _validate_completed_requirements(completed: List[Dict], track_id: str, reqs: List[Dict], tgroups: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """Validate completion against major requirements and track requirements"""
    completed_courses = {c["course_id"]: c for c in completed}
    unmet_requirements = []
    unmet_track_groups = []
    
    # Check major requirements
    for req in reqs:
        rule = json.loads(req["rule"]) if isinstance(req["rule"], str) else req["rule"]
        need = rule["need"]
        from_courses = rule["from"]
        
        # Count courses with grade >= C (policy requirement)
        satisfied = sum(1 for cid in from_courses 
                       if cid in completed_courses and 
                       _check_grade_requirement(completed_courses[cid].get("grade", "F"), "C"))
        
        if satisfied < need:
            unmet_requirements.append({
                "key": req["key"],
                "need": need,
                "have": satisfied,
                "missing": need - satisfied,
                "from": from_courses
            })
    
    # Check track requirements if track is declared
    if track_id:
        track_buckets = [g for g in tgroups if g["track_id"] == track_id]
        for bucket in track_buckets:
            need = int(bucket["need"])
            course_list = json.loads(bucket["course_list"]) if isinstance(bucket["course_list"], str) else bucket["course_list"]
            
            # Count courses with grade >= C (policy requirement)
            satisfied = sum(1 for cid in course_list 
                           if cid in completed_courses and 
                           _check_grade_requirement(completed_courses[cid].get("grade", "F"), "C"))
            
            if satisfied < need:
                unmet_track_groups.append({
                    "key": bucket["key"],
                    "need": need,
                    "have": satisfied,
                    "missing": need - satisfied,
                    "from": course_list
                })
    
    return unmet_requirements, unmet_track_groups

def compute_plan(profile_json: Dict[str,Any]) -> Dict[str,Any]:
    """
    Compute academic plan with track validation and prerequisite checking.
    
    Input profile_json:
    {
      "student": {"gpa": 3.5, "start_term": "F2025"},
      "major": "CS",
      "track_id": "machine_intelligence" | "software_engineering" | null,
      "completed": [{"course_id": "CS18000", "grade": "A", "term": "F2024"}],
      "in_progress": [{"course_id": "CS18200"}],
      "constraints": {
        "target_grad_term": "S2028",
        "max_credits": 16,
        "summer_ok": true,
        "pace": "normal"
      }
    }
    """
    reqs, tgroups, policy, prereqs, courses, offerings = _load_rules()
    
    completed = profile_json.get("completed", [])
    in_progress = profile_json.get("in_progress", [])
    track_id = profile_json.get("track_id")
    constraints = profile_json.get("constraints", {})
    
    # Build prerequisite graph
    G = _build_prereq_graph(prereqs, courses)
    
    completed_ids = {c["course_id"] for c in completed}
    inprog_ids = {c["course_id"] for c in in_progress}
    
    advisories = []
    
    # Critical track declaration rule
    cs25200_scheduled = "CS25200" in completed_ids or "CS25200" in inprog_ids
    if cs25200_scheduled and not track_id:
        advisories.append("Track declaration required by the term containing CS25200.")
        # Stop planning if this critical requirement is not met
        return {
            "plan": [],
            "advisories": advisories,
            "unmet_requirements": [],
            "unmet_track_groups": [],
            "bottlenecks": [],
            "rationales": ["Cannot generate plan: Track declaration required by CS25200 term"],
            "caps": policy
        }
    
    # Validate completion against requirements
    unmet_requirements, unmet_track_groups = _validate_completed_requirements(completed, track_id, reqs, tgroups)
    
    # Simple bottleneck detection
    bottlenecks = []
    if not completed_ids:
        bottlenecks.append("No completed courses - recommend starting with CS18000")
    elif "CS18000" not in completed_ids and "CS17600" not in completed_ids:
        bottlenecks.append("Missing foundational programming course - CS18000 or CS17600 required")
    
    # Basic plan generation (simplified for now)
    plan = []
    rationales = ["Basic validation complete", "Prerequisite graph built", 
                 f"Track: {track_id or 'Not declared'}", f"Completed: {len(completed)} courses"]
    
    if track_id:
        rationales.append(f"Track '{track_id}' requirements being validated")
    
    return {
        "plan": plan,
        "advisories": advisories,
        "unmet_requirements": unmet_requirements,
        "unmet_track_groups": unmet_track_groups,
        "bottlenecks": bottlenecks,
        "rationales": rationales,
        "caps": policy
    }

