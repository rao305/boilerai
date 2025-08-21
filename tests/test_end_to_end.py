import os, json
import requests

BASE_URL = "http://127.0.0.1:8001"

def test_healthz():
    r = requests.get(f"{BASE_URL}/healthz")
    assert r.status_code == 200 and r.json()["ok"] is True

def test_tell_me_about_cs240_alias():
    # works via alias CS240 -> CS24000 when alias exists + details loaded
    r = requests.post(f"{BASE_URL}/qa", json={"question":"tell me about CS 240"})
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "t2sql"
    assert any(k in body["rows"][0] for k in ("description","credits","title"))

def test_prereqs_cs250():
    r = requests.post(f"{BASE_URL}/qa", json={"question":"prereqs for CS25000"})
    assert r.status_code == 200
    j = r.json()
    assert j["mode"] == "t2sql"
    cols = j["rows"][0].keys()
    assert {"kind","expr","min_grade"} <= set(cols)

def test_planner_track_advisory():
    profile = {
      "student":{"gpa":3.4,"start_term":"F2025"},
      "major":"CS",
      "track_id": None,
      "completed":[{"course_id":"CS18000","grade":"A","term":"F2024"}],
      "in_progress":[{"course_id":"CS25200"}],
      "constraints":{"target_grad_term":"S2028","max_credits":16,"summer_ok":True,"pace":"normal"}
    }
    r = requests.post(f"{BASE_URL}/plan/compute", json={"profile_json": profile})
    assert r.status_code == 200
    out = r.json()
    assert any("Track declaration" in a for a in out.get("advisories", []))

def test_mi_groups_present():
    # Ensure 5 MI groups are present
    from api_gateway.db import db_query
    rows = db_query("""
      SELECT tg.key FROM track_groups tg
      JOIN tracks t ON t.id=tg.track_id
      WHERE t.id='machine_intelligence' ORDER BY tg.key
    """, [])
    keys = [r["key"] for r in rows]
    assert set(keys) >= {"mi_req_ml_dm","mi_req_alg","mi_req_ai_or_ir","mi_req_prob","mi_electives"}