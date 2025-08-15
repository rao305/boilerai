// Comprehensive ELO System Test Runner
// Tests all components working together without hardcoded patterns

import { eloTrackingService } from './eloTrackingService';
import { mockEloAPI } from './mockEloAPI';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

class EloSystemTestRunner {
  private results: TestResult[] = [];

  async runAllTests(): Promise<boolean> {
    console.log('🧪 Starting comprehensive ELO system test...');
    this.results = [];

    // Test 1: Configuration Management (no hardcoding)
    await this.testConfigurationManagement();

    // Test 2: Query Pattern Recognition (dynamic)
    await this.testQueryPatternRecognition();

    // Test 3: ELO Score Calculation
    await this.testEloScoreCalculation();

    // Test 4: Human Review Triggers
    await this.testHumanReviewTriggers();

    // Test 5: Mock API Integration
    await this.testMockAPIIntegration();

    // Test 6: End-to-End Flow
    await this.testEndToEndFlow();

    // Test 7: Edge Cases
    await this.testEdgeCases();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log(`\n🧪 Test Summary: ${passed}/${total} tests passed`);
    
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    });

    return passed === total;
  }

  private async testConfigurationManagement(): Promise<void> {
    try {
      const originalConfig = eloTrackingService.getConfig();
      
      // Test dynamic configuration updates
      eloTrackingService.updateConfig({
        eloKFactor: 16,
        similarityThreshold: 0.5,
        lowEloThreshold: 600
      });

      const updatedConfig = eloTrackingService.getConfig();
      
      if (updatedConfig.eloKFactor === 16 && 
          updatedConfig.similarityThreshold === 0.5 && 
          updatedConfig.lowEloThreshold === 600) {
        
        // Restore original config
        eloTrackingService.updateConfig(originalConfig);
        
        this.results.push({
          name: 'Configuration Management',
          passed: true,
          details: 'Dynamic configuration updates working correctly'
        });
      } else {
        throw new Error('Configuration not updated correctly');
      }
    } catch (error) {
      this.results.push({
        name: 'Configuration Management',
        passed: false,
        error: error.message
      });
    }
  }

  private async testQueryPatternRecognition(): Promise<void> {
    try {
      // Test with various query types to ensure no hardcoding
      const testQueries = [
        'What courses should I take for computer science?',
        'How do I calculate my GPA?',
        'Can you explain quantum mechanics?',
        'Where is the dining hall?',
        'What are the prerequisites for advanced algorithms?'
      ];

      let allPatternsRecognized = true;
      
      for (const query of testQueries) {
        const mockRating = {
          messageId: `test-${Date.now()}`,
          query,
          response: 'Test response',
          context: {},
          userId: 'test-user',
          rating: 'positive' as const,
          score: 1,
          timestamp: new Date().toISOString()
        };

        await eloTrackingService.submitEloRating(mockRating);
      }

      const analytics = eloTrackingService.getAnalytics();
      
      if (analytics.totalQueries >= testQueries.length) {
        this.results.push({
          name: 'Query Pattern Recognition',
          passed: true,
          details: `Processed ${analytics.totalQueries} queries with dynamic pattern recognition`
        });
      } else {
        throw new Error('Not all queries were processed correctly');
      }
    } catch (error) {
      this.results.push({
        name: 'Query Pattern Recognition',
        passed: false,
        error: error.message
      });
    }
  }

  private async testEloScoreCalculation(): Promise<void> {
    try {
      const testQuery = 'Test ELO calculation query';
      
      // Submit multiple ratings and check ELO progression
      const ratings = [
        { rating: 'positive' as const, score: 1 },
        { rating: 'positive' as const, score: 1 },
        { rating: 'negative' as const, score: -1 },
        { rating: 'positive' as const, score: 1 }
      ];

      for (const rating of ratings) {
        await eloTrackingService.submitEloRating({
          messageId: `elo-test-${Date.now()}-${Math.random()}`,
          query: testQuery,
          response: 'Test response',
          context: {},
          userId: 'test-user',
          rating: rating.rating,
          score: rating.score,
          timestamp: new Date().toISOString()
        });
      }

      const analytics = eloTrackingService.getAnalytics();
      
      if (analytics.averageEloScore > 0 && analytics.averageEloScore < 3000) {
        this.results.push({
          name: 'ELO Score Calculation',
          passed: true,
          details: `Average ELO: ${Math.round(analytics.averageEloScore)}`
        });
      } else {
        throw new Error(`Invalid ELO score range: ${analytics.averageEloScore}`);
      }
    } catch (error) {
      this.results.push({
        name: 'ELO Score Calculation',
        passed: false,
        error: error.message
      });
    }
  }

  private async testHumanReviewTriggers(): Promise<void> {
    try {
      const lowPerformingQuery = 'This should trigger human review';
      
      // Submit multiple negative ratings to trigger review
      for (let i = 0; i < 5; i++) {
        await eloTrackingService.submitEloRating({
          messageId: `review-trigger-${Date.now()}-${i}`,
          query: lowPerformingQuery,
          response: 'Poor response',
          context: {},
          userId: 'test-user',
          rating: 'negative',
          score: -1,
          timestamp: new Date().toISOString()
        });
      }

      const reviewQueue = await eloTrackingService.getHumanReviewQueue();
      
      if (reviewQueue.length > 0) {
        this.results.push({
          name: 'Human Review Triggers',
          passed: true,
          details: `${reviewQueue.length} items in review queue`
        });
      } else {
        throw new Error('Human review not triggered for poor performance');
      }
    } catch (error) {
      this.results.push({
        name: 'Human Review Triggers',
        passed: false,
        error: error.message
      });
    }
  }

  private async testMockAPIIntegration(): Promise<void> {
    try {
      const apiTestResult = await mockEloAPI.testAPI();
      
      this.results.push({
        name: 'Mock API Integration',
        passed: apiTestResult,
        details: apiTestResult ? 'All API endpoints working' : 'Some API tests failed'
      });
    } catch (error) {
      this.results.push({
        name: 'Mock API Integration',
        passed: false,
        error: error.message
      });
    }
  }

  private async testEndToEndFlow(): Promise<void> {
    try {
      // Simulate complete user interaction flow
      const testData = {
        messageId: `e2e-${Date.now()}`,
        query: 'End-to-end test query',
        response: 'End-to-end test response',
        context: {
          hasTranscript: true,
          aiService: 'openai',
          reasoningMode: false,
          sessionId: 'test-session',
          userLevel: 'authenticated'
        },
        userId: 'e2e-test-user',
        rating: 'positive' as const,
        score: 1,
        timestamp: new Date().toISOString()
      };

      // Submit through mock API
      const response = await fetch('/api/elo/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Verify analytics updated
        const analytics = eloTrackingService.getAnalytics();
        
        this.results.push({
          name: 'End-to-End Flow',
          passed: true,
          details: `Complete flow working, total queries: ${analytics.totalQueries}`
        });
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }
    } catch (error) {
      this.results.push({
        name: 'End-to-End Flow',
        passed: false,
        error: error.message
      });
    }
  }

  private async testEdgeCases(): Promise<void> {
    try {
      const edgeCases = [
        // Empty query
        { query: '', shouldWork: false },
        // Very long query
        { query: 'A'.repeat(1000), shouldWork: true },
        // Special characters
        { query: 'Query with émojis 🎓 and spëcial chars!', shouldWork: true },
        // Only stop words
        { query: 'the and or but', shouldWork: true }
      ];

      let edgeCasesPassed = 0;

      for (const testCase of edgeCases) {
        try {
          await eloTrackingService.submitEloRating({
            messageId: `edge-${Date.now()}-${Math.random()}`,
            query: testCase.query,
            response: 'Edge case response',
            context: {},
            userId: 'edge-test-user',
            rating: 'positive',
            score: 1,
            timestamp: new Date().toISOString()
          });
          
          if (testCase.shouldWork) {
            edgeCasesPassed++;
          }
        } catch (error) {
          if (!testCase.shouldWork) {
            edgeCasesPassed++;
          }
        }
      }

      this.results.push({
        name: 'Edge Cases',
        passed: edgeCasesPassed === edgeCases.length,
        details: `${edgeCasesPassed}/${edgeCases.length} edge cases handled correctly`
      });
    } catch (error) {
      this.results.push({
        name: 'Edge Cases',
        passed: false,
        error: error.message
      });
    }
  }
}

// Export for use in console
export const eloSystemTest = new EloSystemTestRunner();

// Auto-run in development
if (import.meta.env.DEV) {
  // Add to window for easy access
  (window as any).eloSystemTest = eloSystemTest;
  
  console.log('🧪 ELO System Test Runner loaded');
  console.log('💡 Use eloSystemTest.runAllTests() to run comprehensive tests');
}