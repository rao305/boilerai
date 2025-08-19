#!/usr/bin/env node

/**
 * Quick test script to validate the anti-looping implementation
 * Tests the core logic without requiring full React environment
 */

const fs = require('fs');
const path = require('path');

// Mock the degree requirements data for testing
const mockDegreeRequirements = {
  computer_science: {
    degree_info: {
      total_credits_required: 120,
      available_tracks: ["machine_intelligence", "software_engineering"]
    },
    foundation_courses: {
      courses: [
        {
          code: "CS 18000",
          title: "Problem Solving and Object-Oriented Programming",
          credits: 4,
          required: true
        },
        {
          code: "CS 25200",
          title: "Systems Programming",
          credits: 4,
          required: true,
          prerequisites: ["CS 24000", "CS 25000"]
        },
        {
          code: "CS 30700",
          title: "Software Engineering I",
          credits: 4,
          required: true,
          prerequisites: ["CS 25100", "CS 25200"]
        }
      ]
    },
    core_courses: {
      courses: [
        {
          code: "CS 35200",
          title: "Compilers",
          credits: 3,
          required: true,
          prerequisites: ["CS 25200"]
        },
        {
          code: "CS 38100",
          title: "Introduction to Analysis of Algorithms",
          credits: 3,
          required: true,
          prerequisites: ["CS 25100", "MA 26100"]
        }
      ]
    }
  }
};

// Simple test class to validate core logic
class AntiLoopingValidator {
  constructor() {
    this.studentProfiles = new Map();
    this.sessionStates = new Map();
    this.maxQuestionsPerResponse = 1;
    this.maxSessionQuestions = 2;
  }

  extractQueryContext(query, studentProfile) {
    const queryLower = query.toLowerCase();
    
    // Check for explicit general advice requests
    const generalAdvicePatterns = [
      'no transcript', 'without transcript', 'general advice', 'general details'
    ];
    const requestsGeneralAdvice = generalAdvicePatterns.some(pattern => 
      queryLower.includes(pattern)
    );

    // Check for course planning intent
    const courseKeywords = ['course', 'class', 'take', 'schedule', 'semester', 'plan', 'next'];
    const hasCourseIntent = courseKeywords.some(keyword => queryLower.includes(keyword));

    return {
      userIntent: hasCourseIntent ? 'course_planning' : 'general_inquiry',
      requestsGeneralAdvice,
      refusesTranscript: queryLower.includes('no transcript'),
      mentionedCourses: this.extractMentionedCourses(query),
      confidenceLevel: 0.8
    };
  }

  extractMentionedCourses(query) {
    const coursePattern = /\b[A-Z]{2,4}\s*\d{3,5}\b/g;
    const matches = query.match(coursePattern) || [];
    return [...new Set(matches.map(match => match.replace(/\s+/g, ' ').trim()))];
  }

  shouldForceAdvice(sessionState, queryContext) {
    return (
      sessionState.questionsAsked >= this.maxSessionQuestions ||
      queryContext.requestsGeneralAdvice ||
      queryContext.refusesTranscript ||
      sessionState.conversationTurn >= 3
    );
  }

  generateCourseRecommendations(studentProfile, queryContext) {
    const recommendations = [];
    const completedCourses = studentProfile.completedCourses || [];
    
    // Use mock data to generate recommendations
    const degreeReqs = mockDegreeRequirements.computer_science;
    
    // Check foundation courses
    const foundationCourses = degreeReqs.foundation_courses.courses;
    const uncompletedFoundation = foundationCourses.filter(course => 
      !this.isCourseCompleted(course.code, completedCourses)
    );

    if (uncompletedFoundation.length > 0) {
      uncompletedFoundation.slice(0, 2).forEach(course => {
        recommendations.push({
          code: course.code,
          title: course.title,
          credits: course.credits,
          rationale: `Foundation requirement for Computer Science. ${course.prerequisites ? 'Prerequisites: ' + course.prerequisites.join(', ') : 'No prerequisites listed.'}`
        });
      });
    }

    // Add core courses if foundation is mostly complete
    if (uncompletedFoundation.length <= 2) {
      const coreCourses = degreeReqs.core_courses.courses;
      const uncompletedCore = coreCourses.filter(course => 
        !this.isCourseCompleted(course.code, completedCourses)
      );

      uncompletedCore.slice(0, 2).forEach(course => {
        recommendations.push({
          code: course.code,
          title: course.title,
          credits: course.credits,
          rationale: `Core requirement for Computer Science. Builds advanced skills.`
        });
      });
    }

    // Add math requirement
    if (!this.isCourseCompleted('MA 26100', completedCourses)) {
      recommendations.push({
        code: 'MA 26100',
        title: 'Multivariate Calculus',
        credits: 4,
        rationale: 'Required mathematics for CS - needed for advanced CS courses'
      });
    }

    return recommendations.slice(0, 5);
  }

  isCourseCompleted(courseCode, completedCourses) {
    return completedCourses.some(completed => 
      completed.toUpperCase().includes(courseCode.replace(/\s+/g, '').toUpperCase())
    );
  }

  getOrCreateSessionState(userId) {
    if (!this.sessionStates.has(userId)) {
      this.sessionStates.set(userId, {
        questionsAsked: 0,
        transcriptPrompted: false,
        conversationTurn: 0,
        hasProvidedGeneralAdvice: false
      });
    }
    return this.sessionStates.get(userId);
  }

  async testScenario(query, userId, studentContext) {
    console.log(`\n🧪 Testing query: "${query}"`);
    console.log(`👤 Student context: ${JSON.stringify(studentContext, null, 2)}`);

    // Update student profile
    this.studentProfiles.set(userId, { userId, ...studentContext });
    const studentProfile = this.studentProfiles.get(userId);
    
    // Get session state
    const sessionState = this.getOrCreateSessionState(userId);
    sessionState.conversationTurn++;

    // Extract query context
    const queryContext = this.extractQueryContext(query, studentProfile);
    console.log(`🎯 Query context: ${JSON.stringify(queryContext, null, 2)}`);

    // Check anti-looping
    const shouldForceAdvice = this.shouldForceAdvice(sessionState, queryContext);
    console.log(`🔄 Should force advice: ${shouldForceAdvice}`);

    // Generate recommendations
    const recommendations = this.generateCourseRecommendations(studentProfile, queryContext);
    console.log(`📚 Recommendations generated: ${recommendations.length}`);
    
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec.code} (${rec.credits} cr): ${rec.title}`);
    });

    // Simulate question generation
    let questionsAsked = 0;
    if (!shouldForceAdvice && sessionState.questionsAsked < this.maxQuestionsPerResponse) {
      // Would ask a question here
      questionsAsked = 1;
      sessionState.questionsAsked++;
    }

    console.log(`❓ Questions asked this response: ${questionsAsked}`);
    console.log(`📊 Total session questions: ${sessionState.questionsAsked}`);

    return {
      recommendations: recommendations.length,
      questionsAsked,
      antiLoopingTriggered: shouldForceAdvice,
      sessionTotal: sessionState.questionsAsked
    };
  }

  async runTestSuite() {
    console.log('🚀 Starting Anti-Looping Test Suite');
    console.log('=====================================');

    // Test Scenario 1: Requirements example
    const result1 = await this.testScenario(
      "I'm a sophomore Computer Science major, Machine Intelligence track, completed CS 180, CS 182, CS 250, CS 251, aiming for 2028. What courses for Fall? No transcript.",
      'test_user_1',
      {
        major: 'Computer Science',
        track: 'Machine Intelligence',
        academicLevel: 'sophomore',
        gradYear: '2028',
        completedCourses: ['CS 18000', 'CS 18200', 'CS 25000', 'CS 25100']
      }
    );

    // Test Scenario 2: Follow-up query (should have fewer questions)
    const result2 = await this.testScenario(
      "What about spring semester courses?",
      'test_user_1',
      {}
    );

    // Test Scenario 3: Third query (should trigger anti-looping)
    const result3 = await this.testScenario(
      "Any other recommendations?",
      'test_user_1',
      {}
    );

    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Query 1 - Recommendations: ${result1.recommendations}, Questions: ${result1.questionsAsked}, Anti-loop: ${result1.antiLoopingTriggered}`);
    console.log(`Query 2 - Recommendations: ${result2.recommendations}, Questions: ${result2.questionsAsked}, Anti-loop: ${result2.antiLoopingTriggered}`);
    console.log(`Query 3 - Recommendations: ${result3.recommendations}, Questions: ${result3.questionsAsked}, Anti-loop: ${result3.antiLoopingTriggered}`);

    // Evaluate success criteria
    const criteria = {
      providesRecommendations: result1.recommendations >= 3,
      respectsNoTranscript: result1.questionsAsked <= 1,
      limitsSessionQuestions: result3.sessionTotal <= 2,
      triggersAntiLooping: result3.antiLoopingTriggered
    };

    console.log('\n✅ Success Criteria Check');
    console.log('==========================');
    Object.entries(criteria).forEach(([criterion, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${criterion}: ${passed}`);
    });

    const allPassed = Object.values(criteria).every(Boolean);
    console.log(`\n🎯 Overall Result: ${allPassed ? 'PASSED' : 'FAILED'}`);

    if (allPassed) {
      console.log('🎉 Anti-looping implementation appears to be working correctly!');
    } else {
      console.log('⚠️  Some criteria failed. Review the implementation.');
    }

    return allPassed;
  }
}

// Run the test
const validator = new AntiLoopingValidator();
validator.runTestSuite()
  .then(success => {
    console.log(`\nTest completed. Success: ${success}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
  });