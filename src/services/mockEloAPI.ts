// Mock ELO API for development - intercepts fetch calls to ELO endpoints
import { eloAPI } from '../api/elo';

class MockEloAPIService {
  private isEnabled = true;
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = window.fetch.bind(window);
    this.setupFetchInterceptor();
  }

  enable() {
    this.isEnabled = true;
    console.log('🔧 Mock ELO API enabled');
  }

  disable() {
    this.isEnabled = false;
    console.log('🔧 Mock ELO API disabled');
  }

  private setupFetchInterceptor() {
    const self = this;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Only intercept ELO API calls when enabled
      if (self.isEnabled && url.includes('/api/elo/')) {
        return self.handleEloAPICall(url, init);
      }
      
      // Pass through other calls to original fetch
      return self.originalFetch(input, init);
    };
  }

  private async handleEloAPICall(url: string, init?: RequestInit): Promise<Response> {
    console.log('🔧 Intercepting ELO API call:', url, init?.method || 'GET');
    
    try {
      // Route to appropriate handler based on URL
      let result;
      const method = init?.method || 'GET';
      
      // Better body parsing with error handling
      let parsedBody = null;
      if (init?.body) {
        try {
          parsedBody = JSON.parse(init.body as string);
        } catch (parseError) {
          console.error('❌ Failed to parse request body:', parseError);
          return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
            status: 400,
            statusText: 'Bad Request',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      const req = {
        method,
        headers: (init?.headers as Record<string, string>) || {},
        body: parsedBody
      };

      if (url.includes('/api/elo/submit')) {
        const { submitEloRating } = await import('../api/elo');
        result = await submitEloRating(req);
      } else if (url.includes('/api/elo/store')) {
        const { storeEloData } = await import('../api/elo');
        result = await storeEloData(req);
      } else if (url.includes('/api/elo/review-queue-get')) {
        const { getHumanReviewQueue } = await import('../api/elo');
        result = await getHumanReviewQueue(req);
      } else if (url.includes('/api/elo/review-queue')) {
        const { storeHumanReviewItem } = await import('../api/elo');
        result = await storeHumanReviewItem(req);
      } else if (url.includes('/api/elo/submit-review')) {
        const { submitHumanReview } = await import('../api/elo');
        result = await submitHumanReview(req);
      } else if (url.includes('/api/elo/training-data')) {
        const { storeTrainingData } = await import('../api/elo');
        result = await storeTrainingData(req);
      } else if (url.includes('/api/elo/analytics')) {
        const { getEloAnalytics } = await import('../api/elo');
        result = await getEloAnalytics(req);
      } else if (url.includes('/api/elo/reset')) {
        const { resetEloData } = await import('../api/elo');
        result = await resetEloData(req);
      } else {
        result = { status: 404, error: 'ELO API endpoint not found' };
      }

      // Create mock Response object
      const response = new Response(JSON.stringify(result.data || { error: result.error }), {
        status: result.status,
        statusText: result.status === 200 ? 'OK' : 'Error',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response;
    } catch (error) {
      console.error('🚨 Mock ELO API error:', error);
      
      return new Response(JSON.stringify({ error: 'Mock API error' }), {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }

  // Comprehensive testing method for all edge cases
  async testAPI() {
    console.log('🧪 Testing Mock ELO API...');
    
    const tests = [
      // Test 1: Valid rating submission
      async () => {
        const testRating = {
          messageId: 'test-123',
          query: 'What courses should I take for computer science?',
          response: 'I recommend starting with CS 18000 and MA 16100.',
          context: { hasTranscript: false, aiService: 'openai' },
          userId: 'test-user',
          rating: 'positive',
          score: 1,
          timestamp: new Date().toISOString()
        };

        const response = await fetch('/api/elo/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testRating)
        });

        if (!response.ok) throw new Error(`Submit rating failed: ${response.status}`);
        const result = await response.json();
        console.log('✅ Test 1 - Valid rating submission:', result);
        return true;
      },

      // Test 2: Invalid rating data
      async () => {
        const invalidRating = {
          messageId: 'test-invalid',
          // Missing required fields
          rating: 'invalid-rating'
        };

        const response = await fetch('/api/elo/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidRating)
        });

        if (response.status === 400) {
          console.log('✅ Test 2 - Invalid data properly rejected');
          return true;
        }
        throw new Error('Should have rejected invalid data');
      },

      // Test 3: Analytics endpoint
      async () => {
        const response = await fetch('/api/elo/analytics');
        if (!response.ok) throw new Error(`Analytics failed: ${response.status}`);
        const analytics = await response.json();
        console.log('✅ Test 3 - Analytics:', analytics);
        return true;
      },

      // Test 4: Human review queue
      async () => {
        const response = await fetch('/api/elo/review-queue-get');
        if (!response.ok) throw new Error(`Review queue failed: ${response.status}`);
        const queue = await response.json();
        console.log('✅ Test 4 - Review queue:', queue);
        return true;
      },

      // Test 5: Invalid JSON
      async () => {
        const response = await fetch('/api/elo/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json{'
        });

        if (response.status === 400) {
          console.log('✅ Test 5 - Invalid JSON properly rejected');
          return true;
        }
        throw new Error('Should have rejected invalid JSON');
      },

      // Test 6: Non-existent endpoint
      async () => {
        const response = await fetch('/api/elo/nonexistent');
        if (response.status === 404) {
          console.log('✅ Test 6 - Non-existent endpoint properly handled');
          return true;
        }
        throw new Error('Should have returned 404 for non-existent endpoint');
      }
    ];

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < tests.length; i++) {
      try {
        await tests[i]();
        passed++;
      } catch (error) {
        console.error(`❌ Test ${i + 1} failed:`, error);
        failed++;
      }
    }

    console.log(`🧪 Test Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  // Development helper to populate test data
  async populateTestData() {
    console.log('🎭 Populating test ELO data...');
    
    const testQueries = [
      {
        query: 'What courses should I take for computer science?',
        response: 'I recommend CS 18000, MA 16100, and ENGL 10600 for your first semester.',
        rating: 'positive'
      },
      {
        query: 'How do I calculate my GPA?',
        response: 'GPA is calculated by dividing total grade points by total credit hours.',
        rating: 'positive'
      },
      {
        query: 'What are the prerequisites for CS 25000?',
        response: 'You need CS 18000 and CS 18200 with C- or better.',
        rating: 'positive'
      },
      {
        query: 'Can you help me with quantum physics?',
        response: 'I can provide basic information about quantum mechanics principles.',
        rating: 'negative'
      },
      {
        query: 'What time does the dining court close?',
        response: 'I am not sure about current dining hours. Please check the Purdue dining website.',
        rating: 'negative'
      }
    ];

    for (let i = 0; i < testQueries.length; i++) {
      const testQuery = testQueries[i];
      
      await fetch('/api/elo/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: `test-${Date.now()}-${i}`,
          query: testQuery.query,
          response: testQuery.response,
          context: { hasTranscript: false, aiService: 'openai' },
          userId: 'test-user',
          rating: testQuery.rating,
          score: testQuery.rating === 'positive' ? 1 : -1,
          timestamp: new Date().toISOString()
        })
      });

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('✅ Test data populated');
  }
}

// Create and export singleton instance
export const mockEloAPI = new MockEloAPIService();

// Auto-enable in development (temporarily disabled for debugging)
if (import.meta.env.DEV) {
  // mockEloAPI.enable(); // Temporarily disabled
  
  // Add to window for debugging
  (window as any).mockEloAPI = mockEloAPI;
  
  console.log('🔧 Mock ELO API available but disabled for debugging');
  console.log('💡 Use mockEloAPI.enable() to activate, mockEloAPI.testAPI() to test');
}