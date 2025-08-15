import { http, HttpResponse } from 'msw'
import { AuthResponse, TranscriptProcessingResult, User } from '../../types'

const API_BASE_URL = 'http://localhost:5001/api'

// Mock user data
const mockUser: User = {
  id: '123',
  email: 'test@purdue.edu',
  name: 'Test User',
  classStatus: 'senior',
  major: 'Computer Science',
  emailVerified: true,
}

// Mock transcript data
const mockTranscriptResult: TranscriptProcessingResult = {
  success: true,
  data: {
    studentInfo: {
      name: 'Test Student',
      studentId: '12345',
      program: 'Computer Science',
      college: 'College of Science',
      campus: 'West Lafayette',
    },
    completedCourses: {
      'Fall2023': {
        semester: 'Fall',
        year: 2023,
        academicStanding: 'Good Standing',
        courses: [
          {
            id: 'cs18000_fall2023',
            subject: 'CS',
            courseNumber: '18000',
            courseCode: 'CS 18000',
            courseTitle: 'Problem Solving and Object-Oriented Programming',
            level: 'Undergraduate',
            credits: 4,
            grade: 'A',
            gradePoints: 4.0,
            qualityPoints: 16.0,
            semester: 'Fall',
            year: 2023,
            status: 'completed',
            matchStatus: 'verified',
            matchConfidence: 0.95,
            verified: true,
            purdueCourseMatch: 'CS 18000',
            classification: 'foundation',
          },
        ],
        semesterGpa: 4.0,
        semesterCredits: 4,
      },
    },
    coursesInProgress: [],
    gpaSummary: {
      cumulativeGPA: 4.0,
      totalCreditsAttempted: 4,
      totalCreditsEarned: 4,
      totalQualityPoints: 16.0,
      majorGPA: 4.0,
    },
    uploadDate: new Date().toISOString(),
    verificationStatus: 'verified',
  },
  rawAIResponse: 'Mock AI response',
}

export const handlers = [
  // Authentication endpoints
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'test@purdue.edu' && body.password === 'password123') {
      const response: AuthResponse = {
        success: true,
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: mockUser,
      }
      return HttpResponse.json(response)
    }
    
    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as {
      email: string
      password: string
      name: string
      classStatus: string
      major: string
    }
    
    const response: AuthResponse = {
      success: true,
      message: 'Registration successful',
      token: 'mock-jwt-token',
      user: {
        ...mockUser,
        email: body.email,
        name: body.name,
        classStatus: body.classStatus,
        major: body.major,
      },
    }
    return HttpResponse.json(response)
  }),

  http.get(`${API_BASE_URL}/auth/profile`, () => {
    return HttpResponse.json({
      success: true,
      data: mockUser,
    })
  }),

  // Transcript endpoints
  http.post(`${API_BASE_URL}/transcript/process-text`, () => {
    return HttpResponse.json(mockTranscriptResult)
  }),

  http.post(`${API_BASE_URL}/transcript/upload`, () => {
    return HttpResponse.json(mockTranscriptResult)
  }),

  // Health check
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    })
  }),
]