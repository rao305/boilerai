# 🔧 TROUBLESHOOTING.md - Complete Problem Resolution Guide

Comprehensive troubleshooting guide for BoilerAI platform. This document covers common issues, their causes, and step-by-step solutions.

## 🚨 Emergency Quick Fixes

### Platform Won't Start
```bash
# Kill all processes and restart
pkill -f "node\|python\|vite"
./start-dev.sh
```

### "Failed to fetch" Error
```bash
# Use the proper development script
./start-dev.sh
# NOT: npm run dev
```

### API Key Validation Fails
```bash
# Test both validation endpoints
curl -X POST http://localhost:5001/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-key-here"}'

curl -X POST http://localhost:5003/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-key-here"}'
```

---

## 🔍 Diagnostic Commands

### Check Service Status
```bash
# Check running processes
ps aux | grep -E "(node|python|vite)"

# Check port usage
lsof -i :3000,5001,5003

# Check network connectivity
curl -I http://localhost:3000
curl -I http://localhost:5001/api/health
curl -I http://localhost:5003/health
```

### View Service Logs
```bash
# When using start-dev.sh
tail -f frontend.log backend.log ai-bridge.log

# Individual service logs
npm run dev                           # Frontend logs
cd backend && npm run dev             # Backend logs
cd src/services/cliBridge && python main.py  # AI service logs
```

---

## 🌐 Frontend Issues (Port 3000)

### Issue: "Failed to fetch" API Error

**Symptoms**:
- API calls returning network errors
- Settings page can't validate API keys
- Console shows fetch errors

**Causes**:
1. Using `npm run dev` instead of `./start-dev.sh`
2. Vite proxy configuration issues
3. Backend not running on expected port

**Solutions**:

**Option 1: Use Proper Startup Script (Recommended)**
```bash
# Stop current processes
pkill -f "node\|vite"

# Use the proper script
chmod +x start-dev.sh
./start-dev.sh
```

**Option 2: Check Vite Configuration**
```javascript
// vite.config.ts should have:
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5001'
    }
  }
})
```

**Option 3: Manual Port Verification**
```bash
# Verify backend is on port 5001
curl http://localhost:5001/api/health

# If on different port, update frontend config
```

---

### Issue: TypeScript Compilation Errors

**Symptoms**:
- Build fails with TS errors
- IDE showing type errors
- Import resolution failures

**Solutions**:

**Check Dependencies**
```bash
# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install

# Update TypeScript
npm install --save-dev typescript@latest
```

**Check tsconfig.json**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

### Issue: API Key Not Persisting

**Symptoms**:
- API key validation succeeds but not remembered
- Settings page shows invalid after refresh
- localStorage not working

**Causes**:
1. localStorage being cleared
2. Browser security settings
3. Frontend context issues

**Solutions**:

**Debug localStorage**
```javascript
// In browser console
localStorage.getItem('openai_api_key')
localStorage.getItem('api_key_validation_status')

// Clear and retry
localStorage.clear()
// Re-enter API key
```

**Check ApiKeyContext**
```typescript
// Verify context is properly wrapped around App
<ApiKeyProvider>
  <App />
</ApiKeyProvider>
```

---

## 🔧 Backend Issues (Port 5001)

### Issue: Backend Won't Start

**Symptoms**:
- "Port already in use" error
- Process crashes on startup
- Module not found errors

**Solutions**:

**Port Conflicts**
```bash
# Find what's using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or use different port
PORT=5002 npm run dev
```

**Missing Dependencies**
```bash
cd backend

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for peer dependencies
npm list --depth=0
```

**Environment Issues**
```bash
# Check .env file exists
ls -la backend/.env

# Copy from example if missing
cp backend/env.example backend/.env
```

---

### Issue: Database Connection Errors

**Symptoms**:
- "ECONNREFUSED" database errors
- Migration failures
- Data not persisting

**Solutions**:

**SQLite (Development)**
```bash
# Check database file permissions
ls -la backend/database/
chmod 664 backend/database/dev.db

# Reset database
rm backend/database/dev.db
npm run migrate
```

**PostgreSQL (Production)**
```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check service status
brew services list | grep postgresql  # macOS
systemctl status postgresql           # Linux
```

---

### Issue: API Key Validation Always Fails

**Symptoms**:
- All API keys show as invalid
- OpenAI API returns 401
- Network timeout errors

**Debugging Steps**:

**Test OpenAI Connectivity**
```bash
# Test direct OpenAI API call
curl -H "Authorization: Bearer sk-your-key" \
  https://api.openai.com/v1/models

# Should return list of models if key is valid
```

**Check Backend Validation Logic**
```javascript
// backend/src/routes/settings.js
// Ensure axios configuration is correct
const response = await axios.get('https://api.openai.com/v1/models', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});
```

**Network Issues**
```bash
# Check DNS resolution
nslookup api.openai.com

# Check firewall/proxy
curl -v https://api.openai.com/v1/models
```

---

## 🤖 AI Bridge Issues (Port 5003)

### Issue: Python Service Won't Start

**Symptoms**:
- ImportError for required packages
- "Module not found" errors
- Virtual environment issues

**Solutions**:

**Virtual Environment Setup**
```bash
cd src/services/cliBridge

# Remove existing venv
rm -rf venv

# Create new virtual environment
python3 -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Python Version Issues**
```bash
# Check Python version (need 3.9+)
python --version

# Use specific Python version
python3.9 -m venv venv
```

**Missing System Dependencies**
```bash
# Ubuntu/Debian
sudo apt-get install python3-dev python3-pip

# macOS (Homebrew)
brew install python@3.9

# Windows (Chocolatey)
choco install python
```

---

### Issue: FastAPI Import Errors

**Symptoms**:
- "ModuleNotFoundError: No module named 'fastapi'"
- "ImportError: No module named 'uvicorn'"

**Solutions**:

**Install FastAPI Dependencies**
```bash
cd src/services/cliBridge
source venv/bin/activate

# Install core dependencies
pip install fastapi uvicorn python-multipart

# Install OpenAI dependencies
pip install openai requests

# Update requirements.txt
pip freeze > requirements.txt
```

**Requirements.txt Content**
```txt
fastapi==0.104.1
uvicorn==0.24.0
openai==1.3.0
requests==2.31.0
python-multipart==0.0.6
pydantic==2.5.0
```

---

### Issue: OpenAI API Integration Fails

**Symptoms**:
- API key validation returns unexpected errors
- AI generation requests fail
- Timeout errors from OpenAI

**Debugging**:

**Test OpenAI Client**
```python
# Test script: test_openai.py
import openai
import os

client = openai.OpenAI(api_key="sk-your-key-here")

try:
    response = client.models.list()
    print("✅ OpenAI connection successful")
    print(f"Available models: {len(response.data)}")
except Exception as e:
    print(f"❌ OpenAI connection failed: {e}")
```

**Check Network Configuration**
```python
# In main.py, add timeout and retry logic
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()
retry = Retry(total=3, backoff_factor=0.3)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)
```

---

### Issue: AI Service Memory Errors

**Symptoms**:
- "MemoryError" during processing
- Service crashes with large requests
- Slow response times

**Solutions**:

**Memory Optimization**
```python
# Limit response tokens
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=messages,
    max_tokens=1000,  # Limit response size
    stream=True       # Use streaming for large responses
)
```

**Process Management**
```bash
# Monitor memory usage
htop
# or
ps aux --sort=-%mem | head

# Restart service if memory usage high
pkill -f "python.*main.py"
python main.py
```

---

## 🔑 API Key Issues

### Issue: Valid API Keys Show as Invalid

**Comprehensive Diagnosis**:

**Step 1: Verify Key Format**
```bash
# Check key format
echo "Your key should look like: sk-proj-..."
echo "Length should be 140+ characters"

# Test key format validation
curl -X POST http://localhost:5003/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-short"}' # Should fail

curl -X POST http://localhost:5003/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"not-sk-key"}' # Should fail
```

**Step 2: Test Direct OpenAI API**
```bash
# Replace with your actual key
API_KEY="sk-your-actual-key-here"

curl -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  https://api.openai.com/v1/models
```

**Expected Success Response**:
```json
{
  "data": [
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    }
  ]
}
```

**Step 3: Check OpenAI Account Status**
1. Visit [OpenAI Platform](https://platform.openai.com/account/billing)
2. Verify billing is set up
3. Check usage limits and quotas
4. Ensure API key has correct permissions

---

### Issue: API Key Permissions Error (403)

**Symptoms**:
- OpenAI returns 403 Forbidden
- "insufficient permissions" errors

**Solutions**:

**Check API Key Permissions**
1. Go to [OpenAI API Keys](https://platform.openai.com/account/api-keys)
2. Create new key with full permissions
3. Ensure key is not restricted to specific endpoints

**Billing Requirements**
1. Add payment method to OpenAI account
2. Set usage limits if needed
3. Check current balance and usage

---

### Issue: Rate Limiting (429 Errors)

**Symptoms**:
- "Rate limit exceeded" messages
- Temporary API failures
- 429 HTTP status codes

**Solutions**:

**Implement Exponential Backoff**
```python
import time
import random

def api_call_with_retry(api_function, max_retries=3):
    for attempt in range(max_retries):
        try:
            return api_function()
        except openai.RateLimitError:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(wait_time)
```

**Monitor Usage**
1. Check [OpenAI Usage](https://platform.openai.com/account/usage)
2. Implement client-side rate limiting
3. Cache responses when possible

---

## 🚀 Deployment Issues

### Issue: Production Build Failures

**Frontend Build Issues**
```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
rm -rf dist
npm run build

# Check for environment variables
echo $VITE_BACKEND_URL
echo $VITE_AI_SERVICE_URL
```

**Backend Production Issues**
```bash
# Set production environment
export NODE_ENV=production

# Build and start
npm run build
npm start
```

---

### Issue: Environment Variables Not Loading

**Check .env Files**
```bash
# List all .env files
find . -name ".env*" -type f

# Check content (be careful not to expose secrets)
ls -la .env
head -n 5 .env  # Show first 5 lines only
```

**Verify Loading**
```javascript
// In Node.js
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);

// In React (Vite)
console.log('Backend URL:', import.meta.env.VITE_BACKEND_URL);
```

---

## 🔍 Performance Issues

### Issue: Slow API Responses

**Database Optimization**
```sql
-- Add indexes for common queries
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_users_email ON users(email);
```

**API Response Caching**
```javascript
// Add response caching middleware
const cache = require('memory-cache');

app.use('/api/courses', (req, res, next) => {
  const key = '__express__' + req.originalUrl;
  const cached = cache.get(key);
  if (cached) {
    return res.json(cached);
  }
  next();
});
```

**Frontend Optimization**
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Implement virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

---

## 📞 Getting Help

### Debug Information to Collect

When reporting issues, include:

```bash
# System information
node --version
python --version
npm --version

# Service status
lsof -i :3000,5001,5003

# Recent logs
tail -n 50 frontend.log
tail -n 50 backend.log
tail -n 50 ai-bridge.log

# API test results
curl -X GET http://localhost:5001/api/health
curl -X GET http://localhost:5003/health
```

### Log Analysis
```bash
# Search for errors in logs
grep -i error *.log
grep -i "failed" *.log
grep -i "timeout" *.log

# Check API key validation attempts
grep "api.*key" *.log
```

### Common Log Patterns

**Successful API Key Validation**:
```
✅ OpenAI API response: 200
🎉 API key is valid! Returning success response.
```

**Failed API Key Validation**:
```
❌ OpenAI API response status: 401
Invalid API key authentication failed
```

**Service Startup**:
```
Frontend ready on http://localhost:3000
Backend ready on http://localhost:5001
AI Bridge Service ready on http://localhost:5003
```

---

## 🎯 Prevention Tips

### Development Best Practices
1. **Always use `./start-dev.sh`** for development
2. **Test API keys** before implementing features
3. **Monitor logs** regularly during development
4. **Keep dependencies updated** but test thoroughly
5. **Use virtual environments** for Python services

### Production Readiness
1. **Set up monitoring** for all services
2. **Configure log rotation** to prevent disk space issues
3. **Implement health checks** for automated monitoring
4. **Set up alerting** for critical failures
5. **Document deployment procedures**

---

**For additional resources:**
- **API.md** - Complete API endpoint documentation
- **DEVELOPMENT.md** - Development workflow guidelines
- **AI_CONTEXT.md** - AI assistant context and patterns
- **README.md** - Setup and usage instructions