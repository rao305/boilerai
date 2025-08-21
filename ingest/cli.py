import os, json, csv, sys
from api_gateway.db import db_query, get_conn

REQUIRED = ["requirements.json","courses.csv","offerings.csv","prereqs.jsonl","tracks.json","policies.json"]

def _load_json(path): return json.load(open(path))
def _load_jsonl(path): return [json.loads(line) for line in open(path) if line.strip()]
def _load_csv(path): return list(csv.DictReader(open(path)))

def main(major_id: str, dir_path: str):
    # Upsert majors if requirements.json present; else create a placeholder.
    conn = get_conn(); cur = conn.cursor()
    def safe(path): return os.path.join(dir_path, path)
    def exists(p): return os.path.exists(safe(p))
    if exists("requirements.json"):
        req = _load_json(safe("requirements.json"))
        cur.execute("INSERT INTO majors(id,name,version,active) VALUES (%s,%s,%s,TRUE) ON CONFLICT (id) DO UPDATE SET version=EXCLUDED.version",
                    (major_id, "Computer Science", req.get("version","unknown")))
        # explode requirement groups
        for g in req.get("groups", []):
            cur.execute("INSERT INTO requirements(major_id,key,rule) VALUES (%s,%s,%s::jsonb)",
                        (major_id, g["key"], json.dumps({"need":g["need"],"from":g["from"]})))
    else:
        # minimal placeholder
        cur.execute("INSERT INTO majors(id,name,version,active) VALUES (%s,%s,%s,TRUE) ON CONFLICT (id) DO NOTHING",
                    (major_id, "Computer Science", "unknown"))

    if exists("courses.csv"):
        for r in _load_csv(safe("courses.csv")):
            cur.execute("INSERT INTO courses(id,major_id,title,credits,level) VALUES (%s,%s,%s,%s,%s) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, credits=EXCLUDED.credits, level=EXCLUDED.level",
                        (r["id"], major_id, r["title"], r.get("credits",0), r.get("level")))
    if exists("offerings.csv"):
        for r in _load_csv(safe("offerings.csv")):
            cur.execute("INSERT INTO offerings(course_id,term_pattern) VALUES (%s,%s)", (r["course_id"], r["term_pattern"]))
    if exists("prereqs.jsonl"):
        for row in _load_jsonl(safe("prereqs.jsonl")):
            cur.execute("INSERT INTO prereqs(major_id,dst_course,kind,expr,min_grade) VALUES (%s,%s,%s,%s::jsonb,%s)",
                        (row["major_id"], row["dst"], row["kind"], json.dumps(row["expr"]), row.get("min_grade","C")))
    if exists("tracks.json"):
        tj = _load_json(safe("tracks.json"))
        for t in tj.get("tracks", []):
            cur.execute("INSERT INTO tracks(id,major_id,name) VALUES (%s,%s,%s) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name",
                        (t["id"], major_id, t["name"]))
            for g in t.get("groups", []):
                cur.execute("INSERT INTO track_groups(track_id,key,need,course_list) VALUES (%s,%s,%s,%s::jsonb)",
                            (t["id"], g["key"], g["need"], json.dumps(g["from"])))
    if exists("policies.json"):
        pj = _load_json(safe("policies.json"))
        cur.execute("""INSERT INTO policies(major_id,max_credits_per_term,summer_allowed_default,min_grade_default,overload_requires_approval)
                       VALUES (%s,%s,%s,%s,%s)
                       ON CONFLICT (major_id) DO UPDATE SET max_credits_per_term=EXCLUDED.max_credits_per_term,
                         summer_allowed_default=EXCLUDED.summer_allowed_default, min_grade_default=EXCLUDED.min_grade_default,
                         overload_requires_approval=EXCLUDED.overload_requires_approval""",
                    (major_id, pj["max_credits_per_term"], pj["summer_allowed_default"], pj["min_grade_default"], pj["overload_requires_approval"]))
    conn.commit()
    
    # Integrity checks
    print("[ingest] Running integrity checks...")
    
    # Integrity: track groups reference existing courses
    missing = db_query("""
      WITH ref AS (
        SELECT tg.track_id, tg.key, jsonb_array_elements_text(tg.course_list) AS cid
        FROM track_groups tg
      )
      SELECT r.track_id, r.key, r.cid
      FROM ref r
      LEFT JOIN courses c ON c.id = r.cid
      WHERE c.id IS NULL
      ORDER BY r.track_id, r.key, r.cid
    """, [])
    if missing:
        print("❌ track_groups references missing courses:")
        for row in missing:
            print(f"  - {row['track_id']} / {row['key']} -> {row['cid']}")
        if os.getenv("STRICT_INGEST","0") == "1":
            cur.close(); conn.close()
            raise SystemExit(2)
    else:
        print("✅ track_groups course_list validated")

    # Integrity: prereq expr references existing courses
    missing2 = db_query("""
      WITH all_refs AS (
        SELECT DISTINCT p.id AS prereq_rule_id,
               jsonb_path_query(p.expr, '$.** ? (@.type() == "string")')::text AS cid
        FROM prereqs p
      ),
      norm AS (SELECT trim(both '"' FROM cid) AS cid FROM all_refs)
      SELECT n.cid
      FROM norm n LEFT JOIN courses c ON c.id = n.cid
      WHERE c.id IS NULL
    """, [])
    if missing2:
        print("❌ prereqs.expr references missing courses:")
        for row in missing2:
            print(f"  - {row['cid']}")
        if os.getenv("STRICT_INGEST","0") == "1":
            cur.close(); conn.close()
            raise SystemExit(2)
    else:
        print("✅ prereqs expr validated")
    
    cur.close(); conn.close()
    missing = [f for f in REQUIRED if not exists(f)]
    if missing:
        print(f"[ingest] Completed partial ingest. Missing files skipped: {missing}")
    else:
        print("[ingest] Ingest complete.")

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--major_id", required=True)
    ap.add_argument("--dir", required=True)
    args = ap.parse_args()
    main(args.major_id, args.dir)

