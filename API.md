# 🔌 API.md - Complete API Reference

Comprehensive API documentation for BoilerAI platform covering all endpoints across Frontend, Backend, and AI Bridge services.

## 📊 API Overview

| Service | Base URL | Port | Technology | Purpose |
|---------|----------|------|------------|---------|
| **Frontend** | `http://localhost:3000` | 3000 | React/Vite | User interface |
| **Backend API** | `http://localhost:5001` | 5001 | Node.js/Express | Data & auth |
| **AI Bridge** | `http://localhost:5003` | 5003 | Python/FastAPI | AI processing |

## 🔑 Authentication & API Keys

### API Key Management
- **No server storage**: API keys are never stored in backend
- **Session-only**: Keys exist only during active user sessions
- **Frontend validation**: Real-time validation before AI requests
- **Multi-service**: Both Node.js and Python services validate keys

### Security Headers
```http
Content-Type: application/json
Authorization: Bearer <api-key>  # For OpenAI requests only
```

## 🌐 Backend API Endpoints (Port 5001)

### Health & Status

#### GET /api/health
Check backend service health and database connectivity.

```http
GET /api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

**Status Codes**:
- `200`: Service healthy
- `503`: Service unavailable

---

### API Key Validation

#### POST /api/settings/validate-openai-key
Validate OpenAI API key without storing it on server.

```http
POST /api/settings/validate-openai-key
Content-Type: application/json

{
  "apiKey": "sk-your-openai-api-key-here"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "valid": true,
  "status": 200,
  "reason": "API key is valid and authenticated with OpenAI."
}
```

**Response (Invalid Key)**:
```json
{
  "success": false,
  "valid": false,
  "status": 401,
  "reason": "Invalid API key. Please check your OpenAI API key."
}
```

**Response (Rate Limited)**:
```json
{
  "success": false,
  "valid": false,
  "status": 429,
  "reason": "Rate limit exceeded. Please try again later."
}
```

**Edge Cases Handled**:
- Empty/missing API key
- Invalid format (not starting with `sk-`)
- Too short/long keys
- Network connectivity issues
- OpenAI service errors
- Rate limiting
- Permission errors

**Status Codes**:
- `200`: Validation completed (check `valid` field)
- `400`: Invalid request format
- `500`: Internal server error

---

### Authentication

#### POST /api/auth/login
User authentication with email and password.

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### POST /api/auth/register
User registration with email verification.

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepassword",
  "name": "New User"
}
```

---

### Course Management

#### GET /api/courses
Retrieve all available courses.

```http
GET /api/courses?search=CS&level=undergraduate
```

**Query Parameters**:
- `search`: Filter by course code or title
- `level`: Filter by level (undergraduate, graduate)
- `department`: Filter by department code
- `credits`: Filter by credit hours

**Response**:
```json
{
  "courses": [
    {
      "id": "CS180",
      "title": "Introduction to Computer Science",
      "credits": 3,
      "department": "Computer Science",
      "prerequisites": ["MATH 159"],
      "description": "Course description here"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

#### GET /api/courses/:courseId
Get detailed information about a specific course.

```http
GET /api/courses/CS180
```

---

### Academic Planning

#### GET /api/planner/:userId
Get user's academic plan.

```http
GET /api/planner/user-id
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "plan": {
    "userId": "user-id",
    "semesters": [
      {
        "year": 2024,
        "semester": "Fall",
        "courses": [
          {
            "courseId": "CS180",
            "title": "Introduction to Computer Science",
            "credits": 3,
            "grade": "A"
          }
        ],
        "totalCredits": 15,
        "gpa": 3.8
      }
    ],
    "overallGPA": 3.75,
    "totalCredits": 120,
    "graduationDate": "2026-05-15"
  }
}
```

#### POST /api/planner/:userId
Save or update user's academic plan.

```http
POST /api/planner/user-id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "semesters": [
    {
      "year": 2024,
      "semester": "Fall",
      "courses": ["CS180", "MATH159", "ENGL106"]
    }
  ]
}
```

---

## 🤖 AI Bridge Endpoints (Port 5003)

### Health & Status

#### GET /health
Check AI service health and OpenAI connectivity.

```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "ai_system_available": true,
  "openai_configured": false,
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

---

### API Key Validation

#### POST /api/settings/validate-openai-key
Frontend-compatible API key validation (same as backend).

```http
POST /api/settings/validate-openai-key
Content-Type: application/json

{
  "apiKey": "sk-your-openai-api-key-here"
}
```

**Response (Valid Key with AI Features)**:
```json
{
  "success": true,
  "valid": true,
  "message": "API key validated successfully and AI systems initialized",
  "reason": "API key is valid and authenticated with OpenAI.",
  "ai_features_available": true,
  "service_status": "fully_operational",
  "status": 200
}
```

**Response (Valid Key, AI Init Failed)**:
```json
{
  "success": false,
  "valid": true,
  "message": "API key is valid but AI service initialization failed.",
  "reason": "API key validated with OpenAI but internal services failed to initialize.",
  "ai_features_available": false,
  "service_status": "limited_functionality"
}
```

**15 Edge Cases Handled**:
1. Missing API key
2. Empty/whitespace strings
3. Invalid format
4. Too short/long keys
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

#### POST /test-key
Legacy API key validation endpoint.

```http
POST /test-key
Content-Type: application/json

{
  "apiKey": "sk-your-openai-api-key-here"
}
```

Same response format as `/api/settings/validate-openai-key`.

---

### Academic Planning AI

#### POST /generate-plan
Generate personalized academic plan using AI.

```http
POST /generate-plan
Content-Type: application/json

{
  "userId": "user-id",
  "student_profile": {
    "major": "Computer Science",
    "year": "Sophomore",
    "completed_courses": ["CS180", "MATH159"],
    "interests": ["AI", "Web Development"],
    "career_goals": "Software Engineer"
  },
  "preferences": {
    "credits_per_semester": 15,
    "summer_courses": true,
    "graduation_timeline": "4 years"
  }
}
```

**Response**:
```json
{
  "success": true,
  "plan": {
    "semesters": [
      {
        "year": 2024,
        "semester": "Fall",
        "recommended_courses": [
          {
            "courseId": "CS240",
            "title": "Programming in C",
            "credits": 3,
            "reason": "Core requirement, builds on CS180",
            "priority": "high"
          }
        ],
        "total_credits": 15,
        "difficulty_rating": "medium"
      }
    ],
    "graduation_timeline": {
      "expected_date": "2026-05-15",
      "total_semesters": 6,
      "summer_required": false
    },
    "recommendations": [
      "Consider taking CS251 next semester for better preparation",
      "Internship opportunities available after CS240"
    ]
  }
}
```

---

### Course Recommendations

#### POST /recommend-courses
Get AI-powered course recommendations.

```http
POST /recommend-courses
Content-Type: application/json

{
  "userId": "user-id",
  "context": {
    "completed_courses": ["CS180", "MATH159"],
    "current_semester": "Fall 2024",
    "available_credits": 15,
    "interests": ["AI", "Machine Learning"]
  }
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "courseId": "CS373",
      "title": "Data Structures and Algorithms",
      "relevance_score": 0.95,
      "reasoning": "Essential foundation for AI courses",
      "prerequisites_met": true,
      "workload_estimate": "high"
    }
  ],
  "alternative_paths": [
    {
      "path_name": "AI Specialization Track",
      "courses": ["CS373", "CS381", "CS390"],
      "timeline": "3 semesters"
    }
  ]
}
```

---

### API Key Help

#### GET /api-key/help
Get guidance for OpenAI API key setup.

```http
GET /api-key/help
```

**Response**:
```json
{
  "title": "OpenAI API Key Setup Guide",
  "steps": [
    {
      "step": 1,
      "title": "Create OpenAI Account",
      "description": "Go to https://platform.openai.com/ and create an account"
    }
  ],
  "key_format": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "validation_endpoint": "/test-key",
  "security_notes": [
    "Never share your API key publicly",
    "Store it securely in environment variables"
  ],
  "troubleshooting": {
    "invalid_format": "Keys must start with 'sk-'",
    "401_unauthorized": "Key is invalid or revoked",
    "403_forbidden": "Key lacks required permissions"
  }
}
```

---

## 🌍 Frontend Routes (Port 3000)

### Public Routes
- `GET /` - Landing page
- `GET /login` - User login page
- `GET /register` - User registration page

### Protected Routes (Require Authentication)
- `GET /dashboard` - Main user dashboard
- `GET /planner` - Academic planning interface
- `GET /courses` - Course catalog browser
- `GET /settings` - User settings and API key configuration
- `GET /profile` - User profile management

---

## 📝 Request/Response Formats

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "details": "Additional technical details",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Standard Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req-uuid-here"
  }
}
```

---

## 🔍 Error Codes

### Backend API Errors
- `AUTH_REQUIRED`: Authentication required
- `AUTH_INVALID`: Invalid authentication token
- `API_KEY_INVALID`: Invalid or expired API key
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server internal error

### AI Bridge Errors
- `AI_SERVICE_UNAVAILABLE`: AI service not responding
- `OPENAI_API_ERROR`: OpenAI API error
- `CONTEXT_TOO_LARGE`: Request context too large
- `GENERATION_FAILED`: AI generation failed
- `QUOTA_EXCEEDED`: API quota exceeded

---

## 🧪 Testing Endpoints

### Using curl

#### Test Backend Health
```bash
curl -X GET http://localhost:5001/api/health
```

#### Test API Key Validation (Backend)
```bash
curl -X POST http://localhost:5001/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test-key-here"}'
```

#### Test API Key Validation (AI Bridge)
```bash
curl -X POST http://localhost:5003/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test-key-here"}'
```

#### Test Course Search
```bash
curl -X GET "http://localhost:5001/api/courses?search=CS&limit=5"
```

### Using JavaScript (Frontend)
```javascript
// Test API key validation
const validateApiKey = async (apiKey) => {
  const response = await fetch('/api/settings/validate-openai-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });
  return await response.json();
};

// Test course search
const searchCourses = async (query) => {
  const response = await fetch(`/api/courses?search=${query}`);
  return await response.json();
};
```

---

## 🔒 Rate Limiting

### Backend API
- **General endpoints**: 100 requests/minute per IP
- **Authentication**: 10 requests/minute per IP
- **API key validation**: 20 requests/minute per IP

### AI Bridge
- **API key validation**: 10 requests/minute per IP
- **AI generation**: 5 requests/minute per user
- **Course recommendations**: 10 requests/minute per user

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642262400
```

---

## 📊 Monitoring & Logging

### Health Check Endpoints
- Backend: `GET /api/health`
- AI Bridge: `GET /health`
- Frontend: Available at root URL

### Log Formats
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "backend",
  "endpoint": "/api/settings/validate-openai-key",
  "method": "POST",
  "status": 200,
  "duration": "350ms",
  "user_id": "user-123",
  "request_id": "req-uuid"
}
```

---

**For additional help, see:**
- **TROUBLESHOOTING.md** - Common API issues and solutions
- **DEVELOPMENT.md** - Development workflow and testing guidelines
- **AI_CONTEXT.md** - AI assistant context for code understanding