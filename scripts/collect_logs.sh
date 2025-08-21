#!/bin/bash
# Collect diagnostic logs and evidence

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOGS_DIR="diagnostics/logs"
mkdir -p "$LOGS_DIR"

echo "=== Collecting BoilerAI Diagnostic Evidence ==="
echo "Timestamp: $TIMESTAMP"

# Collect backend logs (if available)
if pgrep -f "npm start" > /dev/null; then
    echo "Backend process running, collecting recent logs..."
    # Get recent logs from the running backend
    echo "Backend process logs not directly accessible via file"
    echo "Logs shown in terminal where 'npm start' was run"
else
    echo "Backend process not running"
fi

# Collect system information
echo "Collecting system information..."
{
    echo "=== System Info ==="
    echo "Date: $(date)"
    echo "PWD: $(pwd)"
    echo ""
    
    echo "=== Process Status ==="
    echo "Node.js processes:"
    pgrep -fl node || echo "No node processes"
    echo ""
    echo "Python processes:"  
    pgrep -fl python || echo "No python processes"
    echo ""
    echo "PostgreSQL status:"
    pg_isready -h localhost -p 5432 2>/dev/null && echo "PostgreSQL: Running" || echo "PostgreSQL: Not running"
    echo ""
    
    echo "=== Port Status ==="
    echo "Port 3001 (Backend):" 
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health 2>/dev/null || echo "Not responding"
    echo ""
    echo "Port 8000 (API Gateway):"
    curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/healthz 2>/dev/null || echo "Not responding"
    echo ""
    
    echo "=== Environment Variables ==="
    echo "DATABASE_URL: ${DATABASE_URL:-not set}"
    echo "DEBUG_TRACE: ${DEBUG_TRACE:-not set}"
    echo "API_GATEWAY_URL: ${API_GATEWAY_URL:-not set}"
    echo ""
    
    echo "=== File Structure ==="
    echo "API Gateway exists: $([ -f api_gateway/main.py ] && echo Yes || echo No)"
    echo "Backend advisor route: $([ -f backend/src/routes/advisor.js ] && echo Yes || echo No)"
    echo "Python router: $([ -f router/router.py ] && echo Yes || echo No)"
    echo "T2SQL generator: $([ -f t2sql/generate.py ] && echo Yes || echo No)"
    echo ""
    
} > "$LOGS_DIR/${TIMESTAMP}_system_info.log"

echo "System information saved to: $LOGS_DIR/${TIMESTAMP}_system_info.log"

# Test current endpoints
echo "Testing current endpoint behavior..."
{
    echo "=== Endpoint Tests ==="
    echo "Testing backend health..."
    curl -s http://localhost:3001/api/advisor/health || echo "Backend health check failed"
    echo ""
    
    echo "Testing API gateway health..."  
    curl -s http://localhost:8000/healthz || echo "API Gateway health check failed"
    echo ""
    
} > "$LOGS_DIR/${TIMESTAMP}_endpoint_tests.log"

echo "Endpoint tests saved to: $LOGS_DIR/${TIMESTAMP}_endpoint_tests.log"

# Analyze snapshots if they exist  
if [ -d "diagnostics/snapshots" ] && [ "$(ls -A diagnostics/snapshots 2>/dev/null)" ]; then
    echo "Analyzing response snapshots..."
    {
        echo "=== Snapshot Analysis ==="
        for file in diagnostics/snapshots/*.json; do
            if [ -f "$file" ]; then
                echo "File: $(basename $file)"
                echo "Size: $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null) bytes"
                
                # Check for freeform prose indicators
                if grep -qi "highly regarded\|cutting-edge\|world-class" "$file" 2>/dev/null; then
                    echo "⚠️  MARKETING PROSE DETECTED"
                fi
                
                # Check for structured response indicators
                if grep -qi '"mode"\|"ast"\|"sql"\|"rows"' "$file" 2>/dev/null; then
                    echo "✅ Structured response detected" 
                else
                    echo "❌ No structured response detected"
                fi
                
                echo "---"
            fi
        done
    } > "$LOGS_DIR/${TIMESTAMP}_snapshot_analysis.log"
    
    echo "Snapshot analysis saved to: $LOGS_DIR/${TIMESTAMP}_snapshot_analysis.log"
else
    echo "No response snapshots found to analyze"
fi

echo ""
echo "=== Evidence Collection Complete ==="
echo "Files created in: $LOGS_DIR/"
echo "- ${TIMESTAMP}_system_info.log"
echo "- ${TIMESTAMP}_endpoint_tests.log"
if [ -f "$LOGS_DIR/${TIMESTAMP}_snapshot_analysis.log" ]; then
    echo "- ${TIMESTAMP}_snapshot_analysis.log"
fi