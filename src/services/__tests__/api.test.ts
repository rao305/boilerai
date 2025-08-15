import { describe, it, expect, vi } from 'vitest'
import { apiService } from '../api'
import { AuthResponse, TranscriptProcessingResult } from '../../types'

describe('ApiService', () => {
  describe('Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const result = await apiService.login('test@purdue.edu', 'password123')
      
      expect(result.success).toBe(true)
      expect(result.token).toBe('mock-jwt-token')
      expect(result.user.email).toBe('test@purdue.edu')
    })

    it('should fail login with invalid credentials', async () => {
      await expect(
        apiService.login('wrong@email.com', 'wrongpassword')
      ).rejects.toThrow()
    })

    it('should register successfully', async () => {
      const result = await apiService.register(
        'new@purdue.edu',
        'password123',
        'New User',
        'sophomore',
        'Computer Science'
      )
      
      expect(result.success).toBe(true)
      expect(result.user.email).toBe('new@purdue.edu')
      expect(result.user.name).toBe('New User')
    })

    it('should get user profile', async () => {
      const result = await apiService.getProfile()
      
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('test@purdue.edu')
    })
  })

  describe('Transcript Processing', () => {
    it('should process transcript text successfully', async () => {
      const transcriptText = 'CS 18000 Problem Solving A 4.0'
      const result = await apiService.processTranscriptText(transcriptText)
      
      expect(result.success).toBe(true)
      expect(result.data.studentInfo.name).toBe('Test Student')
      expect(result.data.completedCourses).toBeDefined()
    })

    it('should process transcript file successfully', async () => {
      const file = new File(['transcript content'], 'transcript.txt', {
        type: 'text/plain',
      })
      
      const result = await apiService.processTranscript(file)
      
      expect(result.success).toBe(true)
      expect(result.data.studentInfo).toBeDefined()
    })
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const result = await apiService.healthCheck()
      
      expect(result.success).toBe(true)
      expect(result.data.status).toBe('ok')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors properly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      })
      
      global.fetch = mockFetch
      
      await expect(apiService.healthCheck()).rejects.toThrow('Server error')
    })
  })
})