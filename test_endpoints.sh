#!/bin/bash

BASE_URL="http://127.0.0.1:8001"

echo "🏥 Health check..."
curl -s -X GET "$BASE_URL/healthz" | jq

echo
echo "📚 Course endpoint (CS18000)..."
curl -s -X GET "$BASE_URL/courses/CS18000" | jq

echo  
echo "📚 Course endpoint via alias (CS240)..."
curl -s -X GET "$BASE_URL/courses/CS240" | jq

echo
echo "🎯 Track endpoint (machine_intelligence)..."
curl -s -X GET "$BASE_URL/tracks/machine_intelligence" | jq