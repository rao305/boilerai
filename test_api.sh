#!/bin/bash

# Quick API validation scripts
BASE_URL="http://127.0.0.1:8001"

echo "🏥 Health check..."
curl -s -X GET "$BASE_URL/healthz" | jq

echo
echo "📚 Course info (CS 473)..."
curl -s -X POST "$BASE_URL/qa" \
 -H 'content-type: application/json' \
 -d '{"question":"tell me about CS 473"}' | jq

echo
echo "📋 Prerequisites (CS38100)..."
curl -s -X POST "$BASE_URL/qa" \
 -H 'content-type: application/json' \
 -d '{"question":"what are the prerequisites for CS38100?"}' | jq

echo
echo "🎯 Planner advisory (missing track)..."
curl -s -X POST "$BASE_URL/plan/compute" \
 -H 'content-type: application/json' \
 -d '{"profile_json":{"student":{"gpa":3.4,"start_term":"F2025"},"major":"CS","track_id":null,"completed":[{"course_id":"CS18000","grade":"A"}],"in_progress":[{"course_id":"CS25200"}],"constraints":{"target_grad_term":"S2028","max_credits":16,"summer_ok":true,"pace":"normal"}}}' | jq