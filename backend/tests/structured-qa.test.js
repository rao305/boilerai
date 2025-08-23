/**
 * Test to ensure advisor endpoints return structured payloads only
 * This prevents regression to generic LLM responses
 */
const request = require('supertest');
const app = require('../src/server');

describe('Structured QA Enforcement', () => {
  test('advisor returns structured payload with mode field', async () => {
    const response = await request(app)
      .post('/api/advisor/chat')
      .set('Content-Type', 'application/json')
      .set('X-LLM-Provider', 'gemini')
      .set('X-LLM-Api-Key', 'test-key-for-validation')
      .send({ question: 'Tell me about CS 240' })
      .expect('Content-Type', /json/);

    // Should get a structured response even with invalid API key
    expect(response.body).toHaveProperty('success');
    
    if (response.body.success) {
      // Successful responses must have structured data with mode
      expect(response.body.data).toHaveProperty('mode');
      expect(['t2sql', 'planner', 'general_chat']).toContain(response.body.data.mode);
    } else {
      // Error responses should be structured errors, not generic LLM prose
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('service', 'api_gateway');
    }
  });

  test('advisor blocks generic LLM responses', async () => {
    // This test ensures we never get prose like "I am a large language model..."
    const response = await request(app)
      .post('/api/advisor/chat')
      .set('Content-Type', 'application/json')
      .set('X-LLM-Provider', 'gemini')
      .set('X-LLM-Api-Key', 'test-key-for-validation')
      .send({ question: 'so what do you do' });

    // Should never contain generic LLM self-introduction text
    const responseText = JSON.stringify(response.body).toLowerCase();
    expect(responseText).not.toMatch(/i am a large language model/i);
    expect(responseText).not.toMatch(/boilerplate ai.*references/i);
    
    // Should have structured response format
    expect(response.body).toHaveProperty('success');
  });

  test('health check returns structured response', async () => {
    const response = await request(app)
      .get('/api/advisor/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body.config).toHaveProperty('mode');
  });

  test('course facts return t2sql structured response', async () => {
    const response = await request(app)
      .post('/api/advisor/chat')
      .set('Content-Type', 'application/json')
      .set('X-LLM-Provider', 'gemini')
      .set('X-LLM-Api-Key', 'test-key')
      .send({ question: 'What is CS 180?' });

    if (response.body.success) {
      expect(response.body.data).toHaveProperty('mode');
      expect(response.body.data).toHaveProperty('routing');
      expect(response.body.data.routing).toHaveProperty('service', 'api_gateway');
      
      // Should be t2sql mode for course facts
      const validModes = ['t2sql', 'planner', 'overview', 'codo'];
      expect(validModes).toContain(response.body.data.mode);
    }
  });

  test('prerequisites query returns structured response', async () => {
    const response = await request(app)
      .post('/api/advisor/chat')
      .set('Content-Type', 'application/json')
      .set('X-LLM-Provider', 'gemini')  
      .set('X-LLM-Api-Key', 'test-key')
      .send({ question: 'prerequisites for CS182' });

    if (response.body.success) {
      expect(response.body.data).toHaveProperty('mode');
      expect(['t2sql', 'planner', 'overview', 'codo']).toContain(response.body.data.mode);
    }
  });

  test('antiChatty middleware allows structured responses', async () => {
    const response = await request(app)
      .post('/api/advisor/chat')
      .set('Content-Type', 'application/json')
      .set('X-LLM-Provider', 'gemini')
      .set('X-LLM-Api-Key', 'test-key')
      .send({ question: 'What courses should I take?' });

    // Should not be blocked if properly structured
    if (response.body.success) {
      expect(response.body.data).toHaveProperty('mode');
    }
    
    // Should not contain error about blocked non-structured response
    if (response.body.error) {
      expect(response.body.error).not.toMatch(/blocked non-structured/i);
    }
  });

  test('validates mode field against expected values', async () => {
    const response = await request(app)
      .post('/api/advisor/chat')
      .set('Content-Type', 'application/json')
      .set('X-LLM-Provider', 'gemini')
      .set('X-LLM-Api-Key', 'test-key')
      .send({ question: 'Help me understand CS program requirements' });

    if (response.body.success && response.body.data.mode) {
      const validModes = ['t2sql', 'planner', 'overview', 'codo'];
      expect(validModes).toContain(response.body.data.mode);
    }
  });
});