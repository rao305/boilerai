/**
 * Comprehensive Test Suite for BoilerAI Institutional Knowledge-Based Academic Advisor
 * Tests all components and integration scenarios from the system prompt
 */

const BoilerAIInstitutionalAdvisor = require('../services/boilerAIInstitutionalAdvisor');
const { logger } = require('../utils/logger');

class BoilerAITestSuite {
  constructor() {
    this.advisor = new BoilerAIInstitutionalAdvisor();
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  /**
   * Run all test scenarios
   */
  async runAllTests() {
    console.log('🚀 Starting BoilerAI Institutional Advisor Test Suite\n');

    try {
      // Test 1: System Health and Initialization
      await this.testSystemHealth();

      // Test 2: Basic Query Processing
      await this.testBasicQueryProcessing();

      // Test 3: Course Requirements Queries (Examples from prompt)
      await this.testCourseRequirements();

      // Test 4: Prerequisite Checking (Examples from prompt)  
      await this.testPrerequisiteChecking();

      // Test 5: Policy Queries (Examples from prompt)
      await this.testPolicyQueries();

      // Test 6: Context Tracking and Conversation Management
      await this.testContextTracking();

      // Test 7: Response Validation and Quality
      await this.testResponseValidation();

      // Test 8: Error Handling and Edge Cases
      await this.testErrorHandling();

      // Test 9: Integration Test - Complete Academic Scenarios
      await this.testCompleteAcademicScenarios();

      this.printTestResults();

    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      logger.error('Test suite error', { error: error.message, stack: error.stack });
    }
  }

  /**
   * Test 1: System Health and Initialization
   */
  async testSystemHealth() {
    console.log('📋 Test 1: System Health and Initialization');

    await this.runTest('System initialization', async () => {
      const health = await this.advisor.healthCheck();
      this.assert(health.healthy, 'System should be healthy');
      this.assert(health.components.queryProcessor, 'Query processor should be available');
      this.assert(health.components.conversationProtocol, 'Conversation protocol should be available');
      this.assert(health.components.databaseManager, 'Database manager should be available');
      this.assert(health.components.responseValidator, 'Response validator should be available');
    });

    await this.runTest('System statistics', async () => {
      const stats = this.advisor.getSystemStats();
      this.assert(typeof stats.totalQueries === 'number', 'Total queries should be tracked');
      this.assert(typeof stats.successRate === 'number', 'Success rate should be calculated');
      this.assert(stats.conversationStats, 'Conversation stats should be available');
    });

    console.log('✅ System Health Tests Complete\n');
  }

  /**
   * Test 2: Basic Query Processing
   */
  async testBasicQueryProcessing() {
    console.log('📋 Test 2: Basic Query Processing');

    await this.runTest('Simple greeting query', async () => {
      const result = await this.advisor.processAcademicQuery(
        'test-session-1',
        'hi',
        'test-user-1'
      );

      this.assert(result.success, 'Query should process successfully');
      this.assert(result.response.includes('BoilerAI'), 'Response should identify as BoilerAI');
      this.assert(result.response.includes('academic advisor'), 'Response should mention academic advisor role');
      this.assert(!result.response.includes('AI') || result.response.includes('BoilerAI'), 'Should not say "I\'m an AI"');
    });

    await this.runTest('Introduction with major context', async () => {
      const result = await this.advisor.processAcademicQuery(
        'test-session-2',
        "i'm a freshman and im pursuing a data science major",
        'test-user-2'
      );

      this.assert(result.success, 'Query should process successfully');
      this.assert(result.response.includes('freshman'), 'Response should reference academic year');
      this.assert(result.response.includes('Data Science') || result.response.includes('data science'), 'Response should reference major');
      this.assert(result.conversation.context.major === 'Data Science', 'Context should capture major');
      this.assert(result.conversation.context.academic_year === 'freshman', 'Context should capture academic year');
    });

    console.log('✅ Basic Query Processing Tests Complete\n');
  }

  /**
   * Test 3: Course Requirements Queries (From System Prompt Examples)
   */
  async testCourseRequirements() {
    console.log('📋 Test 3: Course Requirements Queries');

    // Example from prompt: "What [DEPARTMENT] courses do I need for the [TRACK_NAME] track?"
    await this.runTest('Computer Science core requirements', async () => {
      const result = await this.advisor.queryCourseRequirements(
        'Computer Science',
        null,
        'core'
      );

      this.assert(result.success, 'Query should succeed');
      this.assert(result.data.length > 0, 'Should return course data');
      this.assert(result.response.includes('CS'), 'Response should include CS courses');
      this.assert(result.response.includes('credits'), 'Response should mention credits');
    });

    await this.runTest('Machine Intelligence track requirements', async () => {
      const result = await this.advisor.queryCourseRequirements(
        'Computer Science',
        'Machine Intelligence',
        'math'
      );

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('Machine Intelligence'), 'Response should reference track');
      this.assert(result.response.includes('MA'), 'Response should include math courses');
    });

    await this.runTest('Data Science requirements', async () => {
      const result = await this.advisor.queryCourseRequirements(
        'Data Science',
        null,
        'core'
      );

      this.assert(result.success, 'Query should succeed');
      this.assert(result.queryType === 'course_requirements', 'Should identify as course requirements query');
    });

    console.log('✅ Course Requirements Tests Complete\n');
  }

  /**
   * Test 4: Prerequisite Checking (From System Prompt Examples)
   */
  async testPrerequisiteChecking() {
    console.log('📋 Test 4: Prerequisite Checking');

    // Example from prompt: "Can I take [NEXT_COURSE] with a [GRADE] in [PREREQ_COURSE]?"
    await this.runTest('CS 25000 with CS 18000 grade A', async () => {
      const result = await this.advisor.checkPrerequisites('CS 25000', 'A', 'CS 18000');

      this.assert(result.success, 'Query should succeed');
      this.assert(result.canTake === true, 'Should be able to take course with A grade');
      this.assert(result.response.includes('✅ Yes') || result.response.includes('can take'), 'Response should indicate student can take the course');
    });

    await this.runTest('CS 25000 with CS 18000 grade D', async () => {
      const result = await this.advisor.checkPrerequisites('CS 25000', 'D', 'CS 18000');

      this.assert(result.success, 'Query should succeed');
      this.assert(result.canTake === false, 'Should not be able to take course with D grade');
      this.assert(result.response.includes('❌ No') || result.response.includes('cannot take'), 'Response should indicate student cannot take the course');
    });

    await this.runTest('Course with no prerequisites', async () => {
      const result = await this.advisor.checkPrerequisites('CS 18000');

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('no prerequisites') || result.canTake === true, 'Should handle courses with no prerequisites');
    });

    console.log('✅ Prerequisite Checking Tests Complete\n');
  }

  /**
   * Test 5: Policy Queries (From System Prompt Examples)
   */
  async testPolicyQueries() {
    console.log('📋 Test 5: Policy Queries');

    // Example from prompt: "What's the GPA requirement for [MAJOR_NAME] major?"
    await this.runTest('Computer Science GPA requirements', async () => {
      const result = await this.advisor.queryAcademicPolicy('gpa_requirements', 'Computer Science');

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('2.0') || result.response.includes('GPA'), 'Response should mention GPA requirements');
      this.assert(result.response.includes('Computer Science'), 'Response should mention the major');
    });

    await this.runTest('CODO requirements', async () => {
      const result = await this.advisor.queryAcademicPolicy('codo', 'Computer Science');

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('CODO') || result.response.includes('Change of Degree'), 'Response should explain CODO');
      this.assert(result.queryType === 'academic_policy', 'Should identify as policy query');
    });

    await this.runTest('Graduation requirements', async () => {
      const result = await this.advisor.queryAcademicPolicy('graduation', 'Computer Science');

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('graduation') || result.response.includes('graduate'), 'Response should address graduation');
    });

    console.log('✅ Policy Queries Tests Complete\n');
  }

  /**
   * Test 6: Context Tracking and Conversation Management
   */
  async testContextTracking() {
    console.log('📋 Test 6: Context Tracking and Conversation Management');

    const sessionId = 'context-test-session';

    await this.runTest('Context accumulation across messages', async () => {
      // First message - establish major
      const msg1 = await this.advisor.processAcademicQuery(
        sessionId,
        "I'm pursuing computer science",
        'context-user'
      );

      this.assert(msg1.conversation.context.major === 'Computer Science', 'Should capture major from first message');

      // Second message - add academic year
      const msg2 = await this.advisor.processAcademicQuery(
        sessionId,
        "I'm a sophomore with a 3.5 GPA",
        'context-user'
      );

      this.assert(msg2.conversation.context.major === 'Computer Science', 'Should retain major from previous message');
      this.assert(msg2.conversation.context.academic_year === 'sophomore', 'Should capture academic year');
      this.assert(msg2.conversation.context.current_gpa === 3.5, 'Should capture GPA');

      // Third message - add completed courses
      const msg3 = await this.advisor.processAcademicQuery(
        sessionId,
        "I've completed CS 18000 and MA 16100",
        'context-user'
      );

      this.assert(msg3.conversation.context.completed_courses.length > 0, 'Should capture completed courses');
      this.assert(msg3.conversation.context.completed_courses.includes('CS 18000') ||
                 msg3.conversation.context.completed_courses.some(c => c.includes('18000')), 
                 'Should include CS 18000 in completed courses');
    });

    await this.runTest('Message count tracking', async () => {
      const result = await this.advisor.processAcademicQuery(
        sessionId,
        "What courses should I take next?",
        'context-user'
      );

      this.assert(result.conversation.messageCount > 1, 'Should track message count across session');
    });

    console.log('✅ Context Tracking Tests Complete\n');
  }

  /**
   * Test 7: Response Validation and Quality
   */
  async testResponseValidation() {
    console.log('📋 Test 7: Response Validation and Quality');

    await this.runTest('Response validation rules', async () => {
      const result = await this.advisor.processAcademicQuery(
        'validation-test',
        "What CS courses do I need as a junior Computer Science major?",
        'validation-user',
        { major: 'Computer Science', academic_year: 'junior' }
      );

      this.assert(result.validation.passed, 'Response should pass validation');
      this.assert(result.validation.qualityScore > 0.5, 'Response should have reasonable quality score');
      this.assert(result.response.includes('junior') && result.response.includes('Computer Science'), 
                 'Response should reference student context');
    });

    await this.runTest('Professional tone validation', async () => {
      const result = await this.advisor.processAcademicQuery(
        'tone-test',
        "What are you?",
        'tone-user'
      );

      this.assert(!result.response.includes("I'm an AI"), 'Should not say "I\'m an AI"');
      this.assert(!result.response.includes('language model'), 'Should not mention language model');
      this.assert(result.response.includes('BoilerAI'), 'Should identify as BoilerAI');
      this.assert(result.response.includes('academic advisor'), 'Should mention academic advisor role');
    });

    await this.runTest('Single follow-up question rule', async () => {
      const result = await this.advisor.processAcademicQuery(
        'question-test',
        "Tell me about Computer Science requirements",
        'question-user'
      );

      const questionCount = (result.response.match(/\?/g) || []).length;
      this.assert(questionCount <= 1, 'Response should have at most one question mark');
    });

    console.log('✅ Response Validation Tests Complete\n');
  }

  /**
   * Test 8: Error Handling and Edge Cases
   */
  async testErrorHandling() {
    console.log('📋 Test 8: Error Handling and Edge Cases');

    await this.runTest('Invalid course code', async () => {
      const result = await this.advisor.checkPrerequisites('INVALID 99999');

      this.assert(!result.success, 'Should fail for invalid course');
      this.assert(result.fallback, 'Should provide fallback response');
    });

    await this.runTest('Unknown major', async () => {
      const result = await this.advisor.queryCourseRequirements('Unknown Major');

      this.assert(result.success || result.fallback, 'Should handle gracefully with success or fallback');
    });

    await this.runTest('Empty message', async () => {
      const result = await this.advisor.processAcademicQuery(
        'empty-test',
        '',
        'empty-user'
      );

      this.assert(result.response, 'Should provide some response to empty message');
    });

    await this.runTest('Very long message', async () => {
      const longMessage = 'I need help with course planning. '.repeat(100);
      const result = await this.advisor.processAcademicQuery(
        'long-test',
        longMessage,
        'long-user'
      );

      this.assert(result.success, 'Should handle long messages');
    });

    console.log('✅ Error Handling Tests Complete\n');
  }

  /**
   * Test 9: Complete Academic Scenarios (Integration Tests)
   */
  async testCompleteAcademicScenarios() {
    console.log('📋 Test 9: Complete Academic Scenarios');

    // Scenario 1: New freshman needing course guidance
    await this.runTest('New freshman guidance scenario', async () => {
      const sessionId = 'freshman-scenario';
      
      // Step 1: Introduction
      const intro = await this.advisor.processAcademicQuery(
        sessionId,
        "Hi, I'm a new freshman interested in computer science",
        'freshman-user'
      );

      this.assert(intro.success, 'Introduction should succeed');
      this.assert(intro.response.includes('freshman'), 'Should acknowledge freshman status');

      // Step 2: Ask about course requirements
      const courseQuery = await this.advisor.processAcademicQuery(
        sessionId,
        "What courses should I take in my first semester?",
        'freshman-user'
      );

      this.assert(courseQuery.success, 'Course query should succeed');
      this.assert(courseQuery.response.includes('CS 18000') || courseQuery.response.includes('18000'), 
                 'Should recommend CS 18000 for freshman');
    });

    // Scenario 2: Sophomore planning track selection
    await this.runTest('Sophomore track selection scenario', async () => {
      const sessionId = 'sophomore-scenario';

      const result = await this.advisor.processAcademicQuery(
        sessionId,
        "I'm a CS sophomore who completed CS 180, 182, and 240. I'm interested in AI and want to know about the Machine Intelligence track",
        'sophomore-user'
      );

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('Machine Intelligence'), 'Should discuss Machine Intelligence track');
      this.assert(result.conversation.context.completed_courses.length > 0, 'Should capture completed courses');
    });

    // Scenario 3: Junior checking graduation requirements  
    await this.runTest('Junior graduation planning scenario', async () => {
      const sessionId = 'junior-scenario';

      const result = await this.advisor.processAcademicQuery(
        sessionId,
        "I'm a junior CS major. What do I need to graduate on time?",
        'junior-user',
        { major: 'Computer Science', academic_year: 'junior' }
      );

      this.assert(result.success, 'Query should succeed');
      this.assert(result.response.includes('graduation') || result.response.includes('graduate'), 
                 'Should address graduation planning');
      this.assert(result.response.includes('junior') && result.response.includes('CS'), 
                 'Should reference student context');
    });

    console.log('✅ Complete Academic Scenarios Tests Complete\n');
  }

  /**
   * Helper method to run individual tests
   */
  async runTest(testName, testFunction) {
    this.testResults.total++;

    try {
      await testFunction();
      this.testResults.passed++;
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ testName, error: error.message });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * Helper method for assertions
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Print final test results
   */
  printTestResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed} ✅`);
    console.log(`Failed: ${this.testResults.failed} ❌`);
    console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.errors.forEach(({ testName, error }) => {
        console.log(`  • ${testName}: ${error}`);
      });
    }

    console.log('\n🎉 Test Suite Complete!');

    // System stats
    const stats = this.advisor.getSystemStats();
    console.log('\n📈 SYSTEM STATISTICS:');
    console.log(`Total Queries Processed: ${stats.totalQueries}`);
    console.log(`System Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`Average Processing Time: ${stats.averageProcessingTime.toFixed(2)}ms`);
    console.log(`Average Validation Score: ${stats.validationScore.toFixed(3)}`);
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks() {
    console.log('\n⚡ Performance Benchmarks');
    console.log('='.repeat(30));

    const benchmarks = [
      {
        name: 'Simple Query',
        query: 'What courses do I need for CS?',
        iterations: 10
      },
      {
        name: 'Complex Query with Context',
        query: "I'm a sophomore CS major who completed CS 180, 182, 240 and Calc 1,2,3. What should I take for Machine Intelligence track?",
        iterations: 10
      },
      {
        name: 'Policy Query',
        query: 'What are the GPA requirements for Computer Science?',
        iterations: 10
      }
    ];

    for (const benchmark of benchmarks) {
      const times = [];
      
      for (let i = 0; i < benchmark.iterations; i++) {
        const start = Date.now();
        await this.advisor.processAcademicQuery(
          `benchmark-${i}`,
          benchmark.query,
          `benchmark-user-${i}`
        );
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`${benchmark.name}:`);
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime}ms`);
      console.log(`  Max: ${maxTime}ms\n`);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new BoilerAITestSuite();
  testSuite.runAllTests()
    .then(() => testSuite.runPerformanceBenchmarks())
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = BoilerAITestSuite;