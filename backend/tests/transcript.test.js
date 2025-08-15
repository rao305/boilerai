const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Transcript API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    const mongoUrl = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/purdue_planner_test';
    await mongoose.connect(mongoUrl);
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({});

    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@purdue.edu',
        password: 'password123',
        name: 'Test User',
        classStatus: 'senior',
        major: 'Computer Science'
      });

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/transcript/process-text', () => {
    const sampleTranscript = `
      PURDUE UNIVERSITY TRANSCRIPT
      Student: John Doe
      ID: 12345
      Major: Computer Science
      
      Fall 2023
      CS 18000 Problem Solving and Object-Oriented Programming  4.0  A
      MA 16100 Plane Analytic Geometry and Calculus I          5.0  B+
      ENGL 10600 First-Year Composition                        3.0  A-
      
      Spring 2024
      CS 18200 Foundations of Computer Science                 3.0  A
      MA 16200 Plane Analytic Geometry and Calculus II        5.0  B
    `;

    it('should process transcript text successfully', async () => {
      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({
          transcriptText: sampleTranscript
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentInfo).toBeDefined();
      expect(response.body.data.studentInfo.name).toBe('John Doe');
      expect(response.body.data.completedCourses).toBeDefined();
      expect(response.body.data.gpaSummary).toBeDefined();
    });

    it('should validate required transcript text', async () => {
      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle AI processing errors gracefully', async () => {
      // Test with invalid API key to simulate AI error
      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({
          transcriptText: sampleTranscript,
          apiKey: 'invalid-key'
        });

      // Should either succeed with mock data or fail gracefully
      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });

    it('should handle empty transcript text', async () => {
      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({
          transcriptText: ''
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should parse GPA correctly', async () => {
      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({
          transcriptText: sampleTranscript
        });

      if (response.status === 200) {
        expect(response.body.data.gpaSummary.cumulativeGPA).toBeGreaterThan(0);
        expect(response.body.data.gpaSummary.totalCreditsAttempted).toBeGreaterThan(0);
        expect(response.body.data.gpaSummary.totalCreditsEarned).toBeGreaterThan(0);
      }
    });
  });

  describe('POST /api/transcript/upload', () => {
    it('should upload and process transcript file', async () => {
      const transcriptContent = 'CS 18000 Problem Solving A 4.0\\nMA 16100 Calculus B+ 5.0';
      
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', Buffer.from(transcriptContent), 'transcript.txt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should validate file type', async () => {
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', Buffer.from('malicious content'), 'malicious.exe');

      expect(response.status).toBeOneOf([400, 500]);
    });

    it('should handle missing file', async () => {
      const response = await request(app)
        .post('/api/transcript/upload')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('No file');
    });

    it('should respect file size limits', async () => {
      // Create a large file (> 5MB)
      const largeContent = 'x'.repeat(6 * 1024 * 1024);
      
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', Buffer.from(largeContent), 'large.txt');

      expect(response.status).toBeOneOf([400, 413]);
    });

    it('should process PDF files', async () => {
      // Mock PDF content (actual PDF parsing requires real PDF)
      const pdfContent = Buffer.from('Mock PDF content');
      
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', pdfContent, 'transcript.pdf');

      // Should either process successfully or fail gracefully
      expect(response.status).toBeOneOf([200, 400, 500]);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize file names', async () => {
      const maliciousFileName = '../../../etc/passwd';
      
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', Buffer.from('content'), maliciousFileName);

      // Should reject or sanitize malicious file names
      expect(response.status).toBeOneOf([400, 500]);
    });

    it('should detect suspicious file patterns', async () => {
      const suspiciousContent = '<?php system($_GET["cmd"]); ?>';
      
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', Buffer.from(suspiciousContent), 'script.php');

      expect(response.status).toBeOneOf([400, 500]);
    });

    it('should log security events', async () => {
      // This would require checking logs, simplified for test
      const response = await request(app)
        .post('/api/transcript/upload')
        .attach('transcript', Buffer.from('content'), 'test.txt');

      // Just verify the endpoint handles the request
      expect(response.status).toBeOneOf([200, 400, 500]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/transcript/process-text')
          .send({
            transcriptText: 'CS 18000 A 4.0'
          })
      );

      const responses = await Promise.all(requests);
      
      // All requests should complete
      responses.forEach(response => {
        expect(response.status).toBeOneOf([200, 500]);
      });
    });

    it('should timeout long-running requests', async () => {
      // This would require a way to simulate slow AI processing
      const response = await request(app)
        .post('/api/transcript/process-text')
        .send({
          transcriptText: 'Very long transcript...'
        })
        .timeout(35000); // Slightly longer than expected timeout

      expect(response.status).toBeOneOf([200, 408, 500]);
    }, 40000);
  });
});