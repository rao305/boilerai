# 🤖 AI_CONTEXT.md - AI Assistant Onboarding Guide

This document provides comprehensive context for AI assistants working on the BoilerAI codebase. Read this file to quickly understand the project structure, patterns, and workflows.

## 📖 Project Overview

**BoilerAI** is an AI-powered academic planning platform with three core services:

1. **Frontend (React + TypeScript)** - Port 3000
2. **Backend (Node.js + Express)** - Port 5001 
3. **AI Bridge (Python + FastAPI)** - Port 5003

**Key Philosophy**: No API key storage on server, session-only validation, comprehensive error handling.

## 🏗️ Architecture Deep Dive

### Service Communication Flow
```
User → Frontend (3000) → Backend API (5001) → Database
                    ↓
                AI Bridge (5003) → OpenAI API
```

### Port Mapping
- **3000**: React development server (Vite)
- **5001**: Node.js backend API (Express)
- **5003**: Python AI service (FastAPI)

### Critical Files
```
boilerai-master/
├── src/contexts/ApiKeyContext.tsx    # Frontend API key management
├── backend/src/routes/settings.js    # Backend API validation
├── src/services/cliBridge/main.py    # Python AI service (primary)
├── src/services/cliBridge/simple_main.py  # Python fallback service
├── start-dev.sh                      # Development startup script
└── start-boilerai.sh                 # Production startup script
```

## 🔑 API Key Management System

### Frontend Flow (ApiKeyContext.tsx)
1. User enters API key in Settings page
2. Frontend validates format (`sk-` prefix, length checks)
3. Calls backend endpoint: `POST /api/settings/validate-openai-key`
4. Stores validation status in localStorage (not the key itself)
5. Uses key for AI requests (session-only)

### Backend Validation (settings.js)
```javascript
// Node.js endpoint
POST /api/settings/validate-openai-key
// Response format:
{
  "success": true/false,
  "valid": true/false, 
  "reason": "descriptive message"
}
```

### Python AI Service (main.py)
```python
# Python endpoints (both available)
POST /api/settings/validate-openai-key  # Frontend-compatible
POST /test-key                          # Legacy endpoint

# Response includes 15 edge cases handled
```

### Edge Cases Handled
1. Missing API key
2. Empty/whitespace strings
3. Invalid format (not starting with `sk-`)
4. Too short/too long keys
5. Invalid characters
6. Network timeouts
7. DNS resolution failures
8. SSL/TLS errors
9. HTTP errors (500, 502, 503)
10. Rate limiting (429)
11. Permission errors (403)
12. JSON parsing errors
13. Missing dependencies
14. Memory errors
15. Unexpected exceptions

## 📁 File Structure & Patterns

### Frontend Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   └── ...
├── pages/               # Main application pages
│   ├── Dashboard.tsx
│   ├── Settings.tsx     # API key configuration
│   └── ...
├── contexts/            # React contexts
│   ├── ApiKeyContext.tsx # ⭐ API key management
│   └── ...
├── services/            # API services
│   ├── aiConfig.ts      # AI configuration
│   └── api.ts           # HTTP client
└── utils/               # Helper functions
```

### Backend Structure
```
backend/src/
├── routes/              # API endpoints
│   ├── settings.js      # ⭐ API key validation
│   ├── auth.js          # Authentication
│   └── ...
├── controllers/         # Business logic
├── models/              # Database models
└── middleware/          # Express middleware
```

### Python AI Service Structure
```
src/services/cliBridge/
├── main.py              # ⭐ Primary AI service
├── simple_main.py       # ⭐ Fallback service
├── requirements.txt     # Python dependencies
├── setup_venv.sh        # Environment setup
├── venv/               # Virtual environment
└── ...
```

## 🔧 Development Patterns

### Starting Services
```bash
# ALWAYS use this for development
./start-dev.sh

# Individual services (if needed)
npm run dev                    # Frontend only
cd backend && npm run dev      # Backend only
cd src/services/cliBridge && python main.py  # AI service only
```

### API Key Validation Pattern
```typescript
// Frontend validation check
const checkApiKey = async (): Promise<boolean> => {
  const key = localStorage.getItem('openai_api_key');
  const response = await fetch(`${backendUrl}/api/settings/validate-openai-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: key })
  });
  const result = await response.json();
  return result.success && result.valid;
};
```

### Python Service Pattern
```python
# Always include comprehensive error handling
async def validate_api_key(request: dict):
    try:
        api_key = request.get("apiKey")
        
        # Multiple validation layers
        if not api_key:
            return {"success": False, "valid": False, "reason": "..."}
        
        # Network request with timeout
        response = requests.get(
            'https://api.openai.com/v1/models', 
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=10
        )
        
        # Handle all HTTP status codes
        if response.status_code == 200:
            return {"success": True, "valid": True, "reason": "..."}
        # ... handle other status codes
        
    except requests.exceptions.Timeout:
        return {"success": False, "valid": False, "reason": "Connection timeout"}
    # ... handle 15+ edge cases
```

## 🚨 Common Issues & Solutions

### "Failed to fetch" Error
**Problem**: Frontend can't reach backend
**Solution**: Always use `./start-dev.sh` instead of `npm run dev`
**Cause**: Proxy configuration in vite.config.ts

### API Key Validation Fails
**Problem**: Valid keys showing as invalid
**Check List**:
- ✅ Key format: starts with `sk-`
- ✅ Backend running on port 5001
- ✅ OpenAI billing configured
- ✅ Network connectivity

### Python Service Won't Start
**Common Causes**:
- Virtual environment not activated
- Missing dependencies in requirements.txt
- Port 5003 already in use
- Missing OpenAI library

### Services Running on Wrong Ports
**Expected Ports**:
- Frontend: 3000 (Vite dev server)
- Backend: 5001 (Express server)
- AI Service: 5003 (FastAPI/Uvicorn)

## 🔍 Debugging Commands

### Check Running Services
```bash
# Check which ports are in use
lsof -i :3000,5001,5003

# Check process status
ps aux | grep -E "(node|python|vite)"

# Test API endpoints
curl -X POST http://localhost:5001/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test-key"}'
```

### View Logs
```bash
# Frontend logs
npm run dev

# Backend logs  
cd backend && npm run dev

# AI service logs
cd src/services/cliBridge && python main.py

# All logs (when using start-dev.sh)
tail -f frontend.log backend.log ai-bridge.log
```

## 📝 Code Conventions

### TypeScript (Frontend)
- Strict mode enabled
- Use functional components with hooks
- Props interfaces for all components
- Error boundaries for API calls

### Node.js (Backend)
- Express.js with async/await
- Middleware for validation
- Structured error responses
- CORS enabled for frontend

### Python (AI Service)
- FastAPI with async endpoints
- Comprehensive exception handling
- Type hints for all functions
- Pydantic models for requests/responses

## 🔄 Common Tasks

### Adding New API Endpoint
1. **Backend**: Add route in `backend/src/routes/`
2. **Frontend**: Add service call in `src/services/`
3. **Python**: Add endpoint in `src/services/cliBridge/main.py`
4. **Test**: Use curl commands to validate

### Updating API Key Validation
1. **Frontend**: Modify `src/contexts/ApiKeyContext.tsx`
2. **Backend**: Update `backend/src/routes/settings.js`
3. **Python**: Update `src/services/cliBridge/main.py`
4. **Test**: All three validation endpoints

### Adding New Dependencies
```bash
# Frontend
npm install package-name
npm install --save-dev @types/package-name

# Backend
cd backend && npm install package-name

# Python AI Service
cd src/services/cliBridge
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt
```

## ⚠️ Security Considerations

### API Key Handling
- ❌ **NEVER** store API keys in backend database
- ❌ **NEVER** log full API keys (use `key[:15]...`)
- ✅ **Session-only** storage in frontend
- ✅ **Validate** before any AI requests
- ✅ **Clear** on user logout

### Error Messages
- ❌ **Don't expose** internal error details
- ✅ **User-friendly** messages in frontend
- ✅ **Detailed logging** in backend console only
- ✅ **Structured responses** with reason codes

## 🎯 AI Assistant Guidelines

### When Debugging Issues
1. **Read error messages** from all three services
2. **Check port conflicts** first
3. **Verify API key format** before investigating
4. **Use curl commands** to isolate issues
5. **Check file permissions** on shell scripts

### When Adding Features
1. **Update all three services** if needed
2. **Follow existing patterns** for consistency
3. **Add comprehensive error handling**
4. **Update documentation** in relevant .md files
5. **Test edge cases** thoroughly

### When Modifying API Key Logic
1. **NEVER introduce API key storage**
2. **Maintain session-only approach**
3. **Test all 15+ edge cases**
4. **Update all validation endpoints**
5. **Preserve security patterns**

## 📚 Additional Resources

- **README.md** - Setup and usage instructions
- **API.md** - Complete API reference
- **TROUBLESHOOTING.md** - Detailed problem solutions
- **DEVELOPMENT.md** - Development workflows

---

**Remember**: This project prioritizes security, user experience, and robust error handling. Always maintain the session-only API key pattern and comprehensive edge case coverage.