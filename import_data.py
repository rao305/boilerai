#!/usr/bin/env python3
import json
import psycopg2

# Connect to database
conn = psycopg2.connect("postgresql://app:app@localhost:5432/boilerai")
cur = conn.cursor()

# Load course extras
print("Loading course extras...")
with open('/tmp/course_extras.jsonl', 'r') as f:
    extras_count = 0
    for line in f:
        if line.strip():
            r = json.loads(line)
            cid = r["course_id"]
            cur.execute("""INSERT INTO course_details(course_id,description,credit_hours_min,credit_hours_max,offered_by,department,attribute)
                           VALUES (%s,%s,%s,%s,%s,%s,%s)
                           ON CONFLICT (course_id) DO UPDATE SET description=EXCLUDED.description, credit_hours_min=EXCLUDED.credit_hours_min,
                             credit_hours_max=EXCLUDED.credit_hours_max, offered_by=EXCLUDED.offered_by, department=EXCLUDED.department,
                             attribute=EXCLUDED.attribute""",
                        (cid, r["description"], r.get("credit_hours_min"), r.get("credit_hours_max"), 
                         r.get("offered_by"), r.get("department"), r.get("attribute")))
            extras_count += 1

# Load prereqs
print("Loading prereqs...")
with open('/tmp/prereqs.jsonl', 'r') as f:
    prereq_count = 0
    for line in f:
        if line.strip():
            r = json.loads(line)
            cur.execute("INSERT INTO prereqs(major_id,dst_course,kind,expr,min_grade) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                       (r.get("major_id", "CS"), r["dst"], r["kind"], json.dumps(r["expr"]), r.get("min_grade")))
            prereq_count += 1

conn.commit()
cur.close()
conn.close()

print(f"Loaded {extras_count} course extras and {prereq_count} prereqs")