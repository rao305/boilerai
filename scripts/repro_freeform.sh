#!/bin/bash
# Reproduction script for freeform prose responses

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SNAPSHOTS_DIR="diagnostics/snapshots"
BACKEND_URL="http://localhost:3001/api/advisor"

# Ensure directories exist
mkdir -p "${SNAPSHOTS_DIR}"

echo "=== BoilerAI Freeform Response Reproduction Script ==="
echo "Timestamp: ${TIMESTAMP}"
echo "Backend URL: ${BACKEND_URL}"
echo ""

# Function to make curl request and save response
make_request() {
    local name="$1"
    local headers="$2"
    local payload="$3"
    local filename="${SNAPSHOTS_DIR}/${TIMESTAMP}_${name}.json"
    
    echo "Making request: $name"
    echo "Headers: $headers"
    echo "Payload: $payload"
    
    # Make the request with full output
    curl -s -w "\n---CURL_INFO---\nHTTP_CODE: %{http_code}\nTIME_TOTAL: %{time_total}\nSIZE_DOWNLOAD: %{size_download}\n" \
         -H "Content-Type: application/json" \
         $headers \
         -d "$payload" \
         "${BACKEND_URL}/chat" > "$filename" 2>&1
    
    echo "Response saved to: $filename"
    echo "Response preview:"
    head -n 5 "$filename" | grep -v "^---CURL_INFO---" || true
    echo "---"
    echo ""
}

# Test A: Gemini headers set
echo "=== TEST A: Gemini Headers ==="
GEMINI_HEADERS="-H 'X-LLM-Provider: gemini' -H 'X-LLM-Api-Key: ${GEMINI_API_KEY:-test_key}' -H 'X-LLM-Model: gemini-1.5-flash'"

make_request "A1_gemini_cs_program" "$GEMINI_HEADERS" '{"question":"so tell me more about the computer science program"}'
make_request "A2_gemini_cs_courses" "$GEMINI_HEADERS" '{"question":"tell me more about computer science courses"}'  
make_request "A3_gemini_freshman_year" "$GEMINI_HEADERS" '{"question":"lets say for freshman year"}'
make_request "A4_gemini_cs180" "$GEMINI_HEADERS" '{"question":"tell me more about cs 180"}'

# Test B: OpenAI headers (if available)
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo "=== TEST B: OpenAI Headers ==="
    OPENAI_HEADERS="-H 'X-LLM-Provider: openai' -H 'X-LLM-Api-Key: ${OPENAI_API_KEY}' -H 'X-LLM-Model: gpt-4o-mini'"
    
    make_request "B1_openai_cs_program" "$OPENAI_HEADERS" '{"question":"so tell me more about the computer science program"}'
    make_request "B2_openai_cs_courses" "$OPENAI_HEADERS" '{"question":"tell me more about computer science courses"}'
    make_request "B3_openai_freshman_year" "$OPENAI_HEADERS" '{"question":"lets say for freshman year"}'
    make_request "B4_openai_cs180" "$OPENAI_HEADERS" '{"question":"tell me more about cs 180"}'
else
    echo "OPENAI_API_KEY not set, skipping OpenAI tests"
fi

# Test C: No headers (fallback behavior)
echo "=== TEST C: No Headers (Fallback) ==="
make_request "C1_no_headers_cs_program" "" '{"question":"so tell me more about the computer science program"}'
make_request "C2_no_headers_cs_courses" "" '{"question":"tell me more about computer science courses"}'
make_request "C3_no_headers_freshman_year" "" '{"question":"lets say for freshman year"}'
make_request "C4_no_headers_cs180" "" '{"question":"tell me more about cs 180"}'

# Test D: Positive controls (should be DB-backed)
echo "=== TEST D: Positive Controls (Should be Structured) ==="
make_request "D1_cs240_course" "$GEMINI_HEADERS" '{"question":"Tell me about CS 240"}'
make_request "D2_cs381_prereqs" "$GEMINI_HEADERS" '{"question":"Prereqs for CS38100"}'
make_request "D3_mi_electives" "$GEMINI_HEADERS" '{"question":"Which MI electives are offered in Fall?"}'

echo "=== Reproduction Complete ==="
echo "All responses saved in: ${SNAPSHOTS_DIR}/"
echo ""
echo "Next steps:"
echo "1. Check diagnostics/logs/ for server logs"
echo "2. Analyze responses for freeform prose vs structured data"
echo "3. Run: scripts/analyze_responses.sh"