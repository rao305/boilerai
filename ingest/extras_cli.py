import os, json, csv
from api_gateway.db import get_conn
def _jsonl(path): return [json.loads(l) for l in open(path) if l.strip()]
def _csv(path): return list(csv.DictReader(open(path)))
def main(dir_path: str):
    conn = get_conn(); cur = conn.cursor()
    
    # Load course_aliases.csv if present
    aliases_path = os.path.join(dir_path, "course_aliases.csv")
    if os.path.exists(aliases_path):
        for row in _csv(aliases_path):
            cur.execute("INSERT INTO course_aliases(alias,course_id) VALUES (%s,%s) ON CONFLICT (alias) DO UPDATE SET course_id=EXCLUDED.course_id",
                       (row["alias"], row["course_id"]))
        print(f"[extras] Loaded course aliases from {aliases_path}")
    
    # Load course_extras.jsonl if present
    path = os.path.join(dir_path, "course_extras.jsonl")
    if not os.path.exists(path):
        print("[extras] No course_extras.jsonl; skipping details."); 
        if os.path.exists(aliases_path):
            conn.commit(); cur.close(); conn.close()
        return
    rows = _jsonl(path)
    for r in rows:
        cid = r["course_id"]
        cur.execute("""INSERT INTO course_details(course_id,description,credit_hours_min,credit_hours_max,offered_by,department,attribute)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (course_id) DO UPDATE SET description=EXCLUDED.description, credit_hours_min=EXCLUDED.credit_hours_min,
                         credit_hours_max=EXCLUDED.credit_hours_max, offered_by=EXCLUDED.offered_by, department=EXCLUDED.department,
                         attribute=EXCLUDED.attribute""",
                    (cid, r["description"], r.get("credit_hours_min"), r.get("credit_hours_max"), r.get("offered_by"), r.get("department"), r.get("attribute")))
        for tbl, key in (("course_levels","levels"),("course_schedule_types","schedule_types"),("course_campuses","campuses")):
            vals = r.get(key, [])
            # delete + reinsert (idempotent simple)
            cur.execute(f"DELETE FROM {tbl} WHERE course_id=%s", (cid,))
            for v in vals:
                if tbl=="course_levels":
                    cur.execute("INSERT INTO course_levels(course_id,level_name) VALUES (%s,%s)", (cid, v))
                elif tbl=="course_schedule_types":
                    cur.execute("INSERT INTO course_schedule_types(course_id,schedule_type) VALUES (%s,%s)", (cid, v))
                else:
                    cur.execute("INSERT INTO course_campuses(course_id,campus) VALUES (%s,%s)", (cid, v))
        # outcomes
        outs = r.get("outcomes", [])
        cur.execute("DELETE FROM course_outcomes WHERE course_id=%s", (cid,))
        for i, txt in enumerate(outs, start=1):
            cur.execute("INSERT INTO course_outcomes(course_id,outcome_no,text) VALUES (%s,%s,%s)", (cid, i, txt))
        # program restrictions
        allows = r.get("allowed_programs")
        if allows is not None:
            cur.execute("DELETE FROM course_program_restrictions WHERE course_id=%s", (cid,))
            for prog in allows:
                cur.execute("INSERT INTO course_program_restrictions(course_id,program,allow) VALUES (%s,%s,TRUE)", (cid, prog))
    conn.commit(); cur.close(); conn.close()
    print(f"[extras] Upserted {len(rows)} course detail records.")
if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True)
    args = ap.parse_args()
    main(args.dir)

