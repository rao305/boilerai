#!/bin/bash

echo "🗄️ Database validation..."

echo "📊 Table counts:"
docker exec boilerai-master-postgres-1 psql -U app -d boilerai -c "
SELECT 
  (SELECT COUNT(*) FROM courses) as courses,
  (SELECT COUNT(*) FROM course_aliases) as aliases,
  (SELECT COUNT(*) FROM prereqs) as prereq_rules,
  (SELECT COUNT(*) FROM requirements WHERE major_id='CS') as cs_req_groups,
  (SELECT COUNT(*) FROM track_groups tg JOIN tracks t ON t.id=tg.track_id WHERE t.id='machine_intelligence') as mi_groups,
  (SELECT COUNT(*) FROM course_details) as course_details;
"

echo
echo "🎯 MI Track groups:"
docker exec boilerai-master-postgres-1 psql -U app -d boilerai -c "
SELECT t.id AS track, tg.key, tg.need
FROM track_groups tg
JOIN tracks t ON t.id = tg.track_id
WHERE t.id='machine_intelligence'
ORDER BY tg.key;
"

echo
echo "❌ Missing course details:"
docker exec boilerai-master-postgres-1 psql -U app -d boilerai -c "
SELECT COUNT(*) as missing_details
FROM courses c
LEFT JOIN course_details d ON d.course_id = c.id
WHERE d.course_id IS NULL;
"

echo
echo "❌ Orphaned prereqs:"
docker exec boilerai-master-postgres-1 psql -U app -d boilerai -c "
SELECT COUNT(*) as orphaned_prereqs
FROM prereqs p
LEFT JOIN courses c ON c.id = p.dst_course
WHERE c.id IS NULL;
"