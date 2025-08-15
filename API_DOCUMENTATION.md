# Purdue Academic Planner API Documentation

## Overview

The Purdue Academic Planner API provides endpoints for user authentication, transcript processing, and academic planning features.

**Base URL**: `http://localhost:5001/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "student@purdue.edu",
  "password": "password123",
  "name": "John Doe",
  "classStatus": "senior",
  "major": "Computer Science"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "student@purdue.edu",
    "name": "John Doe",
    "classStatus": "senior",
    "major": "Computer Science"
  },
  "needsVerification": true,
  "previewUrl": "preview-url-if-applicable"
}
```

**Validation Rules:**
- Email must be a valid @purdue.edu address
- Password must be at least 8 characters
- Name is required
- Class status must be one of: freshman, sophomore, junior, senior, graduate
- Major is required

### POST /auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "student@purdue.edu",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "student@purdue.edu",
    "name": "John Doe",
    "classStatus": "senior",
    "major": "Computer Science"
  }
}
```

### GET /auth/profile

Get current user profile (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "student@purdue.edu",
    "name": "John Doe",
    "classStatus": "senior",
    "major": "Computer Science",
    "emailVerified": true
  }
}
```

### POST /auth/verify-email

Verify email address with verification token.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

### POST /auth/resend-verification

Resend email verification.

**Request Body:**
```json
{
  "email": "student@purdue.edu"
}
```

## Transcript Processing

### POST /transcript/process-text

Process transcript text using AI.

**Request Body:**
```json
{
  "transcriptText": "CS 18000 Problem Solving A 4.0\nMA 16100 Calculus B+ 5.0",
  "apiKey": "optional-gemini-api-key",
  "model": "gemini-1.5-flash"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "studentInfo": {
      "name": "John Doe",
      "studentId": "12345",
      "program": "Computer Science",
      "college": "College of Science",
      "campus": "West Lafayette"
    },
    "completedCourses": {
      "Fall2023": {
        "semester": "Fall",
        "year": 2023,
        "courses": [
          {
            "id": "cs18000_fall2023",
            "subject": "CS",
            "courseNumber": "18000",
            "courseCode": "CS 18000",
            "courseTitle": "Problem Solving and Object-Oriented Programming",
            "level": "Undergraduate",
            "credits": 4,
            "grade": "A",
            "gradePoints": 4.0,
            "qualityPoints": 16.0,
            "semester": "Fall",
            "year": 2023,
            "status": "completed",
            "matchStatus": "verified",
            "matchConfidence": 0.95,
            "verified": true,
            "purdueCourseMatch": "CS 18000",
            "classification": "foundation"
          }
        ],
        "semesterGpa": 4.0,
        "semesterCredits": 4
      }
    },
    "coursesInProgress": [],
    "gpaSummary": {
      "cumulativeGPA": 4.0,
      "totalCreditsAttempted": 4,
      "totalCreditsEarned": 4,
      "totalQualityPoints": 16.0,
      "majorGPA": 4.0
    },
    "uploadDate": "2024-01-01T00:00:00.000Z",
    "verificationStatus": "pending"
  },
  "rawAIResponse": "AI processing response"
}
```

### POST /transcript/upload

Upload and process transcript file.

**Request (multipart/form-data):**
- `transcript`: File (PDF, TXT, or DOCX)
- `apiKey`: Optional Gemini API key
- `model`: Optional AI model name

**File Restrictions:**
- Maximum size: 5MB
- Allowed types: PDF, TXT, DOCX
- Filename length: max 255 characters
- Security scanning for malicious content

**Response:** Same as `/transcript/process-text`

### GET /transcript/status/:jobId

Get processing status for a job.

**Response:**
```json
{
  "jobId": "job-id",
  "status": "processing|completed|failed",
  "progress": 75,
  "result": "processing-result-if-completed"
}
```

## Health Check

### GET /health

Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created (registration)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `413` - Payload Too Large (file upload)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Rate Limiting

**Authentication endpoints**: 5 requests per minute per IP
**File upload endpoints**: 10 requests per minute per user
**General endpoints**: 100 requests per minute per user

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Security

### Headers
All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### File Upload Security
- File type validation
- Content scanning
- Filename sanitization
- Size limits
- Malicious content detection

### Data Validation
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

## Testing

### Test Credentials
For development/testing:
- Email: `testdev@purdue.edu`
- Password: `password123`

### Mock Data
When Gemini API is not configured, the system returns realistic mock data for development.

## Examples

### Complete Registration Flow
```bash
# 1. Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@purdue.edu",
    "password": "password123",
    "name": "Jane Doe",
    "classStatus": "junior",
    "major": "Computer Science"
  }'

# 2. Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@purdue.edu",
    "password": "password123"
  }'

# 3. Process transcript
curl -X POST http://localhost:5001/api/transcript/process-text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transcriptText": "CS 18000 Problem Solving A 4.0"
  }'
```

### File Upload Example
```bash
curl -X POST http://localhost:5001/api/transcript/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "transcript=@transcript.pdf" \
  -F "model=gemini-1.5-flash"
```

## Environment Variables

Required environment variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/purdue-academic-planner

# JWT
JWT_SECRET=your-secret-key

# Server
PORT=5001
NODE_ENV=development

# Email (for verification)
EMAIL_FROM="Purdue Academic Planner" <noreply@example.com>
FRONTEND_URL=http://localhost:3000

# AI Processing (optional)
GEMINI_API_KEY=your-gemini-api-key
```

## Support

For API support or bug reports, please contact the development team or check the application logs for detailed error information.