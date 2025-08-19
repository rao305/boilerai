/**
 * Anti-Looping Test Suite for Enhanced Academic Advisor
 * Tests the fix for BoilerAI's query looping behavior
 */

import { enhancedAcademicAdvisor } from '../services/enhancedAcademicAdvisor';
import { proactiveAdvisorService } from '../services/proactiveAdvisorService';

interface TestScenario {
  name: string;
  userId: string;
  studentContext: any;
  queries: string[];
  expectedBehavior: {
    maxQuestionsTotal: number;
    shouldHaveRecommendations: boolean;
    shouldRespectNoTranscript: boolean;
    shouldProvideGeneralAdvice: boolean;
  };
}

class AntiLoopingTestSuite {
  private testScenarios: TestScenario[] = [
    {
      name: "Sophomore CS Student with Completed Courses - No Transcript Request",
      userId: "test_user_1",
      studentContext: {
        major: 'Computer Science',
        track: 'Machine Intelligence',
        academicLevel: 'sophomore',
        gradYear: '2028',
        completedCourses: ['CS 18000', 'CS 18200', 'CS 25000', 'CS 25100']
      },
      queries: [
        "I'm a sophomore Computer Science major, Machine Intelligence track, completed CS 18000, CS 18200, CS 25000, CS 25100, aiming for 2028. What courses for Fall? No transcript.",
        "Can you give me more course suggestions?",
        "What about spring semester courses?"
      ],
      expectedBehavior: {
        maxQuestionsTotal: 2,
        shouldHaveRecommendations: true,
        shouldRespectNoTranscript: true,
        shouldProvideGeneralAdvice: true
      }
    },
    {
      name: "General Advice Request - Should Not Loop",
      userId: "test_user_2", 
      studentContext: {
        major: 'Computer Science',
        academicLevel: 'sophomore'
      },
      queries: [
        "Give me general course advice without transcript",
        "What other courses do you recommend?",
        "Tell me more about the Machine Intelligence track"
      ],
      expectedBehavior: {
        maxQuestionsTotal: 1,
        shouldHaveRecommendations: true,
        shouldRespectNoTranscript: true,
        shouldProvideGeneralAdvice: true
      }
    },
    {
      name: "Vague Initial Query - Should Provide Advice Before Asking",
      userId: "test_user_3",
      studentContext: {
        major: 'Computer Science',
        academicLevel: 'junior'
      },
      queries: [
        "What should I take next?",
        "Help me plan my courses",
        "I need academic guidance"
      ],
      expectedBehavior: {
        maxQuestionsTotal: 2,
        shouldHaveRecommendations: true,
        shouldRespectNoTranscript: false,
        shouldProvideGeneralAdvice: true
      }
    }
  ];

  public async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      testName: string;
      passed: boolean;
      details: string;
      actualQuestions: number;
      actualRecommendations: number;
    }>;
  }> {
    console.log('🧪 Starting Anti-Looping Test Suite...\n');
    
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const scenario of this.testScenarios) {
      console.log(`📋 Testing: ${scenario.name}`);
      
      try {
        const testResult = await this.runScenarioTest(scenario);
        results.push(testResult);
        
        if (testResult.passed) {
          passed++;
          console.log(`✅ PASSED: ${testResult.details}\n`);
        } else {
          failed++;
          console.log(`❌ FAILED: ${testResult.details}\n`);
        }
      } catch (error) {
        failed++;
        results.push({
          testName: scenario.name,
          passed: false,
          details: `Error: ${error}`,
          actualQuestions: -1,
          actualRecommendations: -1
        });
        console.log(`💥 ERROR: ${scenario.name} - ${error}\n`);
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed, results };
  }

  private async runScenarioTest(scenario: TestScenario): Promise<{
    testName: string;
    passed: boolean;
    details: string;
    actualQuestions: number;
    actualRecommendations: number;
  }> {
    // Reset user session before test
    enhancedAcademicAdvisor.resetSession(scenario.userId);
    
    let totalQuestions = 0;
    let totalRecommendations = 0;
    let respectedNoTranscript = true;
    let providedGeneralAdvice = false;
    const responses: string[] = [];

    // Run through each query in the scenario
    for (let i = 0; i < scenario.queries.length; i++) {
      const query = scenario.queries[i];
      console.log(`  Query ${i + 1}: "${query}"`);
      
      const response = await enhancedAcademicAdvisor.provideGuidance(
        query,
        scenario.userId,
        i === 0 ? scenario.studentContext : undefined
      );

      responses.push(response.responseText);
      
      // Count questions asked
      const questionsInResponse = response.followUpQuestions?.length || 0;
      totalQuestions += questionsInResponse;
      
      // Count recommendations
      totalRecommendations += response.courseRecommendations.length;
      
      // Check if provided general advice
      if (response.courseRecommendations.length > 0) {
        providedGeneralAdvice = true;
      }
      
      // Check transcript respect (should not mention transcript upload if user said no)
      if (query.toLowerCase().includes('no transcript') && 
          response.responseText.toLowerCase().includes('transcript')) {
        respectedNoTranscript = false;
      }

      console.log(`    Response length: ${response.responseText.length} chars`);
      console.log(`    Recommendations: ${response.courseRecommendations.length}`);
      console.log(`    Questions asked: ${questionsInResponse}`);
      console.log(`    Anti-looping triggered: ${response.antiLoopingTriggered || false}`);
    }

    // Evaluate test criteria
    const criteriaResults = {
      questionsWithinLimit: totalQuestions <= scenario.expectedBehavior.maxQuestionsTotal,
      hasRecommendations: totalRecommendations > 0 === scenario.expectedBehavior.shouldHaveRecommendations,
      respectsNoTranscript: respectedNoTranscript === scenario.expectedBehavior.shouldRespectNoTranscript || !scenario.expectedBehavior.shouldRespectNoTranscript,
      providesGeneralAdvice: providedGeneralAdvice === scenario.expectedBehavior.shouldProvideGeneralAdvice
    };

    const allPassed = Object.values(criteriaResults).every(result => result);
    
    let details = `Questions: ${totalQuestions}/${scenario.expectedBehavior.maxQuestionsTotal} `;
    details += `(${criteriaResults.questionsWithinLimit ? 'PASS' : 'FAIL'}), `;
    details += `Recommendations: ${totalRecommendations > 0} `;
    details += `(${criteriaResults.hasRecommendations ? 'PASS' : 'FAIL'}), `;
    details += `No-transcript respect: ${criteriaResults.respectsNoTranscript ? 'PASS' : 'FAIL'}, `;
    details += `General advice: ${criteriaResults.providesGeneralAdvice ? 'PASS' : 'FAIL'}`;

    return {
      testName: scenario.name,
      passed: allPassed,
      details,
      actualQuestions: totalQuestions,
      actualRecommendations: totalRecommendations
    };
  }

  /**
   * Test specific example from the requirements
   */
  public async testRequirementsExample(): Promise<boolean> {
    console.log('🎯 Testing Requirements Example...');
    
    const userId = 'requirements_test';
    enhancedAcademicAdvisor.resetSession(userId);
    
    const query = "I'm a sophomore Computer Science major, Machine Intelligence track, completed CS 180, CS 182, CS 250, CS 251, aiming for 2028. What courses for Fall? No transcript.";
    const studentContext = {
      major: 'Computer Science',
      track: 'Machine Intelligence',
      academicLevel: 'sophomore',
      gradYear: '2028',
      completedCourses: ['CS 18000', 'CS 18200', 'CS 25000', 'CS 25100']
    };

    const response = await enhancedAcademicAdvisor.provideGuidance(query, userId, studentContext);
    
    // Expected behavior from requirements:
    // - Direct course plan with CS 35200, MA 26100, etc.
    // - No redundant questions
    // - Single transcript offer at most
    // - Dynamic tone without hardcoded phrases

    const hasDirectRecommendations = response.courseRecommendations.length >= 3;
    const responseLength = response.responseText.length;
    const questionsAsked = response.followUpQuestions?.length || 0;
    const mentionsSpecificCourses = /CS \d{5}/.test(response.responseText);
    const respectsNoTranscript = !response.responseText.toLowerCase().includes('upload') || 
                                 response.responseText.toLowerCase().includes('prefer not to');

    console.log(`Direct recommendations: ${hasDirectRecommendations} (${response.courseRecommendations.length} courses)`);
    console.log(`Response length: ${responseLength} characters`);
    console.log(`Questions asked: ${questionsAsked}`);
    console.log(`Mentions specific courses: ${mentionsSpecificCourses}`);
    console.log(`Respects no transcript: ${respectsNoTranscript}`);

    const passed = hasDirectRecommendations && 
                   responseLength > 200 && 
                   questionsAsked <= 1 && 
                   mentionsSpecificCourses && 
                   respectsNoTranscript;

    console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'}: Requirements example test`);
    
    if (passed) {
      console.log('Expected behavior achieved: Direct course recommendations without looping');
    } else {
      console.log('Issues detected - review anti-looping implementation');
    }

    return passed;
  }

  /**
   * Test session state persistence and limits
   */
  public async testSessionLimits(): Promise<boolean> {
    console.log('🔄 Testing Session State Limits...');
    
    const userId = 'session_test';
    enhancedAcademicAdvisor.resetSession(userId);
    
    // First query - should be normal
    const response1 = await enhancedAcademicAdvisor.provideGuidance(
      "What courses should I take?", 
      userId, 
      { major: 'Computer Science', academicLevel: 'sophomore' }
    );
    
    // Second query - should still allow questions but be more restrictive
    const response2 = await enhancedAcademicAdvisor.provideGuidance(
      "What about next semester?", 
      userId
    );
    
    // Third query - should trigger anti-looping
    const response3 = await enhancedAcademicAdvisor.provideGuidance(
      "Any other suggestions?", 
      userId
    );

    const sessionState = enhancedAcademicAdvisor.getSessionState(userId);
    
    console.log(`Session questions asked: ${sessionState?.questionsAsked || 0}`);
    console.log(`Third response anti-looping: ${response3.antiLoopingTriggered || false}`);
    console.log(`Third response recommendations: ${response3.courseRecommendations.length}`);

    const sessionManaged = (sessionState?.questionsAsked || 0) <= 2;
    const antiLoopingWorked = response3.antiLoopingTriggered || response3.courseRecommendations.length > 0;
    
    const passed = sessionManaged && antiLoopingWorked;
    console.log(`\n${passed ? '✅ PASSED' : '❌ FAILED'}: Session limits test`);
    
    return passed;
  }
}

// Export for use in other files
export const antiLoopingTestSuite = new AntiLoopingTestSuite();

// Self-executing test if run directly
if (typeof window === 'undefined') {
  // Node.js environment
  antiLoopingTestSuite.runAllTests().then(results => {
    console.log('\n🏁 All tests completed');
    console.log(`Results: ${results.passed} passed, ${results.failed} failed`);
    
    if (results.failed > 0) {
      console.log('\n❌ Some tests failed. Review implementation:');
      results.results.filter(r => !r.passed).forEach(result => {
        console.log(`- ${result.testName}: ${result.details}`);
      });
    } else {
      console.log('\n🎉 All tests passed! Anti-looping system is working correctly.');
    }
  }).catch(error => {
    console.error('Test suite failed to run:', error);
  });
}