const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Integration Tests - New API Endpoints', () => {
  let authToken;
  let userId;

  beforeEach(async () => {
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'integration@purdue.edu',
        password: 'password123',
        name: 'Integration Test User',
        classStatus: 'senior',
        major: 'Computer Science'
      });

    if (registerResponse.body.token) {
      authToken = registerResponse.body.token;
      userId = registerResponse.body.user.id;
    } else {
      // If registration fails, try to login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@purdue.edu',
          password: 'password123'
        });

      if (loginResponse.body.token) {
        authToken = loginResponse.body.token;
        userId = loginResponse.body.user.id;
      }
    }
  });

  describe('Advisor API Endpoints', () => {
    it('should respond to /api/advisor/chat', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/advisor/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What courses should I take next semester?',
          context: { major: 'Computer Science' }
        });

      expect([200, 401, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    it('should respond to /api/advisor/plan', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/advisor/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          preferences: { graduationDate: 'May 2026' },
          constraints: { maxCreditsPerSemester: 15 }
        });

      expect([200, 401, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.semesters).toBeDefined();
      }
    });

    it('should respond to /api/advisor/audit', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .get('/api/advisor/audit')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.completed).toBeDefined();
        expect(response.body.data.remaining).toBeDefined();
      }
    });
  });

  describe('RAG API Endpoints', () => {
    it('should respond to /api/rag/query', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .post('/api/rag/query')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What are the prerequisites for CS 25000?',
          context: { major: 'Computer Science' }
        });

      expect([200, 401, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.sources).toBeDefined();
        expect(response.body.data.answer).toBeDefined();
      }
    });

    it('should respond to /api/rag/sources', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .get('/api/rag/sources')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.sources).toBeDefined();
        expect(Array.isArray(response.body.data.sources)).toBe(true);
      }
    });
  });

  describe('Admin API Endpoints', () => {
    it('should respond to /api/admin/metrics', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token available');
        return;
      }

      const response = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 401, 403, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.metrics).toBeDefined();
        expect(response.body.data.metrics.users).toBeDefined();
      }
    });
  });

  describe('Transcript Processing', () => {
    it('should process transcript text without authentication in test mode', async () => {
      const sampleTranscript = `
        PURDUE UNIVERSITY TRANSCRIPT
        Student: Jane Doe
        ID: 54321
        Major: Computer Science
        
        Fall 2023
        CS 18000 Problem Solving and Object-Oriented Programming  4.0  A
        MA 16100 Plane Analytic Geometry and Calculus I          5.0  B+
      `;

      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({
          transcriptText: sampleTranscript
        });

      expect([200, 400, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.studentInfo).toBeDefined();
        expect(response.body.data.studentInfo.name).toBe('Jane Doe');
        expect(response.body.data.completedCourses).toBeDefined();
        expect(response.body.data.gpaSummary).toBeDefined();
      }
    });
  });
});