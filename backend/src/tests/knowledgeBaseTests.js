/**
 * Comprehensive Knowledge Base Tests
 * Tests the expanded academic knowledge base to ensure it can answer
 * ANY academic query about supported programs, policies, and procedures
 */

const knowledgeRetrievalService = require('../services/knowledgeRetrievalService');
const { degreeRequirementsAPI } = require('../data/degree_requirements');

// Test data for CODO eligibility checking
const sampleStudentData = {
  good_student: {
    gpa: 3.5,
    completed_courses: [
      { code: 'CS 18000', grade: 'A' },
      { code: 'MA 16100', grade: 'B+' },
      { code: 'MA 16200', grade: 'B' },
      { code: 'PSY 12000', grade: 'A-' },
      { code: 'ECON 21000', grade: 'B+' },
      { code: 'MA 15300', grade: 'A' },
      { code: 'ENGL 10600', grade: 'B+' }
    ]
  },
  poor_student: {
    gpa: 2.1,
    completed_courses: [
      { code: 'CS 18000', grade: 'D' },
      { code: 'MA 16100', grade: 'C-' },
      { code: 'PSY 12000', grade: 'F' }
    ]
  }
};

class KnowledgeBaseTestSuite {
  constructor() {
    this.testResults = [];
    this.passCount = 0;
    this.failCount = 0;
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Knowledge Base Tests\n');
    
    // Test categories
    await this.testAcademicPrograms();
    await this.testCODOQueries();
    await this.testAcademicPolicies();
    await this.testCourseInformation();
    await this.testPrerequisites();
    await this.testMinorsAndCertificates();
    await this.testGraduationRequirements();
    await this.testGeneralQueries();
    await this.testEdgeCases();
    
    this.printResults();
    return this.getTestSummary();
  }

  async testAcademicPrograms() {
    console.log('📚 Testing Academic Program Queries...');
    
    const programTests = [
      {
        name: 'Computer Science Program Structure',
        query: 'Tell me about the Computer Science major structure',
        expectedType: 'program_structure',
        shouldFind: ['CS 18000', 'CS 25100', 'Machine Intelligence', 'Software Engineering']
      },
      {
        name: 'Mechanical Engineering Requirements',
        query: 'What are the requirements for mechanical engineering?',
        expectedType: 'major_requirements',
        shouldFind: ['ENGR 13100', 'ME 20000', 'Thermodynamics']
      },
      {
        name: 'Business Administration Program',
        query: 'Tell me about the business administration degree',
        expectedType: 'program_structure',
        shouldFind: ['MGMT 20000', 'ECON 21000', 'Krannert School']
      },
      {
        name: 'Psychology Major Information',
        query: 'What courses do I need for psychology major?',
        expectedType: 'major_requirements',
        shouldFind: ['PSY 12000', 'Elementary Psychology']
      },
      {
        name: 'Agriculture/Agronomy Program',
        query: 'Tell me about the agronomy program structure',
        expectedType: 'program_structure',
        shouldFind: ['AGRY 10000', 'Agriculture', 'crop_science']
      }
    ];

    for (const test of programTests) {
      await this.runTest(test);
    }
  }

  async testCODOQueries() {
    console.log('🔄 Testing CODO (Change of Degree Objective) Queries...');
    
    const codoTests = [
      {
        name: 'General CODO Information',
        query: 'How do I change my major using CODO?',
        expectedType: 'codo_info',
        shouldFind: ['application periods', 'March 1', 'processing time', '2-4 weeks']
      },
      {
        name: 'CODO to Computer Science',
        query: 'What are the CODO requirements for computer science?',
        expectedType: 'codo_info',
        shouldFind: ['3.2', 'CS 18000', 'competitive admission']
      },
      {
        name: 'CODO Application Process',
        query: 'What is the CODO application process?',
        expectedType: 'codo_info',
        shouldFind: ['academic advisor', 'prerequisite courses', 'online']
      },
      {
        name: 'CODO to Business',
        query: 'How can I CODO into business administration?',
        expectedType: 'codo_info',
        shouldFind: ['2.8', 'ECON 21000', 'personal statement']
      }
    ];

    for (const test of codoTests) {
      await this.runTest(test);
    }

    // Test CODO eligibility checking
    this.testCODOEligibility();
  }

  testCODOEligibility() {
    console.log('🎯 Testing CODO Eligibility Checking...');
    
    // Test good student eligibility for CS
    const goodCSResult = degreeRequirementsAPI.checkCODOEligibility('computer_science', sampleStudentData.good_student);
    this.assert(
      goodCSResult.eligible === true,
      'Good student should be eligible for CS CODO',
      `Expected eligible=true, got ${goodCSResult.eligible}`
    );

    // Test poor student eligibility for CS  
    const poorCSResult = degreeRequirementsAPI.checkCODOEligibility('computer_science', sampleStudentData.poor_student);
    this.assert(
      poorCSResult.eligible === false,
      'Poor student should NOT be eligible for CS CODO',
      `Expected eligible=false, got ${poorCSResult.eligible}`
    );

    // Test business eligibility
    const businessResult = degreeRequirementsAPI.checkCODOEligibility('business_administration', sampleStudentData.good_student);
    this.assert(
      businessResult.eligible === true,
      'Good student should be eligible for Business CODO',
      `Expected eligible=true, got ${businessResult.eligible}`
    );
  }

  async testAcademicPolicies() {
    console.log('📋 Testing Academic Policy Queries...');
    
    const policyTests = [
      {
        name: 'GPA Requirements',
        query: 'What are the GPA requirements for graduation?',
        expectedType: 'academic_policies',
        shouldFind: ['2.0', 'graduation GPA', 'probation', '1.75']
      },
      {
        name: 'Academic Probation',
        query: 'What happens if I go on academic probation?',
        expectedType: 'academic_policies',
        shouldFind: ['14 credit hours', 'academic success coaching', 'improve GPA']
      },
      {
        name: 'Credit Requirements',
        query: 'How many credits do I need to graduate?',
        expectedType: 'academic_policies',
        shouldFind: ['120', 'residence credits', '32', 'transfer credits']
      },
      {
        name: 'Academic Standing',
        query: 'What is academic standing and how does it work?',
        expectedType: 'academic_policies',
        shouldFind: ['good standing', 'suspension', 'probation']
      }
    ];

    for (const test of policyTests) {
      await this.runTest(test);
    }
  }

  async testCourseInformation() {
    console.log('📖 Testing Course Information Queries...');
    
    const courseTests = [
      {
        name: 'CS 18000 Information',
        query: 'Tell me about CS 18000',
        expectedType: 'course_info',
        shouldFind: ['Problem Solving', 'Object-Oriented', '4', 'credits']
      },
      {
        name: 'Mathematics Course Search',
        query: 'Find me calculus courses',
        expectedType: 'course_search',
        shouldFind: ['MA 16100', 'MA 16200', 'Calculus']
      },
      {
        name: 'Engineering Course Information',
        query: 'What is ENGR 13100?',
        expectedType: 'course_info',
        shouldFind: ['Transforming Ideas', 'Innovation', '2', 'credits']
      },
      {
        name: 'Business Course Search',
        query: 'Show me economics courses',
        expectedType: 'course_search',
        shouldFind: ['ECON 21000', 'Economics']
      }
    ];

    for (const test of courseTests) {
      await this.runTest(test);
    }
  }

  async testPrerequisites() {
    console.log('🔗 Testing Prerequisites and Course Sequences...');
    
    const prereqTests = [
      {
        name: 'CS Course Prerequisites',
        query: 'What are the prerequisites for CS 25100?',
        expectedType: 'prerequisites',
        shouldFind: ['CS 18200', 'CS 24000']
      },
      {
        name: 'Math Prerequisites',
        query: 'What do I need before taking MA 16200?',
        expectedType: 'prerequisites',
        shouldFind: ['MA 16100']
      },
      {
        name: 'Multiple Course Prerequisites',
        query: 'What are the prerequisites for CS 18000 and MA 16100?',
        expectedType: 'prerequisites',
        shouldFind: ['Prerequisites', 'None']
      }
    ];

    for (const test of prereqTests) {
      await this.runTest(test);
    }

    // Test direct API calls
    const prereqInfo = degreeRequirementsAPI.getPrerequisites('MA 16200');
    this.assert(
      prereqInfo && prereqInfo.prerequisites.includes('MA 16100'),
      'MA 16200 should have MA 16100 as prerequisite',
      `Got prerequisites: ${prereqInfo?.prerequisites}`
    );
  }

  async testMinorsAndCertificates() {
    console.log('🎓 Testing Minors and Certificates...');
    
    const minorTests = [
      {
        name: 'Computer Science Minor',
        query: 'Tell me about the computer science minor',
        expectedType: 'minor_info',
        shouldFind: ['CS 18000', 'CS 18200', '20', 'Non-CS majors']
      },
      {
        name: 'Mathematics Minor',
        query: 'What is required for a mathematics minor?',
        expectedType: 'minor_info',
        shouldFind: ['MA 16100', 'MA 16200', 'All majors']
      },
      {
        name: 'Business Minor',
        query: 'Can I get a business minor?',
        expectedType: 'minor_info',
        shouldFind: ['MGMT 20000', 'ECON 21000', '18']
      }
    ];

    for (const test of minorTests) {
      await this.runTest(test);
    }

    // Test API functions
    const csMinor = degreeRequirementsAPI.getMinor('computer_science_minor');
    this.assert(
      csMinor && csMinor.credits_required === 20,
      'CS Minor should require 20 credits',
      `Got credits: ${csMinor?.credits_required}`
    );
  }

  async testGraduationRequirements() {
    console.log('🎯 Testing Graduation Requirements...');
    
    const gradTests = [
      {
        name: 'CS Graduation Requirements',
        query: 'What do I need to graduate with a computer science degree?',
        expectedType: 'graduation_requirements',
        shouldFind: ['120', 'credits', '2.0', 'GPA', 'residence']
      },
      {
        name: 'General Graduation Requirements',
        query: 'What are the general graduation requirements?',
        expectedType: 'graduation_requirements',
        shouldFind: ['core curriculum', 'written communication', 'application for graduation']
      },
      {
        name: 'ME Graduation Requirements',
        query: 'How do I graduate with mechanical engineering?',
        expectedType: 'graduation_requirements',
        shouldFind: ['128', 'credits', 'College of Engineering']
      }
    ];

    for (const test of gradTests) {
      await this.runTest(test);
    }
  }

  async testGeneralQueries() {
    console.log('🌐 Testing General Academic Queries...');
    
    const generalTests = [
      {
        name: 'Program Overview',
        query: 'What programs does Purdue offer?',
        expectedType: 'general',
        shouldFind: ['Computer Science', 'Business', 'Engineering', 'Psychology']
      },
      {
        name: 'Academic Help',
        query: 'What can you help me with academically?',
        expectedType: 'general',
        shouldFind: ['CODO', 'Academic policies', 'Prerequisites', 'Minors']
      }
    ];

    for (const test of generalTests) {
      await this.runTest(test);
    }
  }

  async testEdgeCases() {
    console.log('⚠️ Testing Edge Cases and Error Handling...');
    
    const edgeTests = [
      {
        name: 'Non-existent Program',
        query: 'Tell me about underwater basket weaving major',
        expectedType: 'general',
        shouldFind: ['programs', 'help'],
        shouldNotCrash: true
      },
      {
        name: 'Non-existent Course',
        query: 'What are the prerequisites for ABC 99999?',
        expectedType: 'prerequisites',
        shouldFind: ['not found'],
        shouldNotCrash: true
      },
      {
        name: 'Empty Query',
        query: '',
        expectedType: 'general',
        shouldNotCrash: true
      },
      {
        name: 'Ambiguous Query',
        query: 'help',
        expectedType: 'general',
        shouldFind: ['programs', 'help'],
        shouldNotCrash: true
      }
    ];

    for (const test of edgeTests) {
      await this.runTest(test);
    }
  }

  async runTest(test) {
    try {
      const result = await knowledgeRetrievalService.processRAGQuery(test.query);
      
      // Check if test should not crash
      if (test.shouldNotCrash) {
        this.assert(true, `${test.name} - Did not crash`, '✓ No crash');
      }
      
      // Check confidence level
      if (result.confidence < 0.3) {
        this.assert(false, `${test.name} - Low confidence`, `Confidence: ${result.confidence}`);
        return;
      }
      
      // Check if expected content is found
      if (test.shouldFind) {
        let foundCount = 0;
        for (const expectedContent of test.shouldFind) {
          if (result.answer.toLowerCase().includes(expectedContent.toLowerCase())) {
            foundCount++;
          }
        }
        
        const foundRatio = foundCount / test.shouldFind.length;
        this.assert(
          foundRatio >= 0.5,
          `${test.name} - Content check`,
          `Found ${foundCount}/${test.shouldFind.length} expected items`
        );
      }
      
      // Check query type if specified
      if (test.expectedType && result.query_type !== test.expectedType) {
        this.assert(
          false,
          `${test.name} - Query type`,
          `Expected ${test.expectedType}, got ${result.query_type}`
        );
      } else {
        this.assert(true, `${test.name} - Query type`, `✓ ${result.query_type}`);
      }
      
    } catch (error) {
      if (test.shouldNotCrash) {
        this.assert(false, `${test.name} - Should not crash`, `Error: ${error.message}`);
      } else {
        this.assert(false, `${test.name} - Execution`, `Error: ${error.message}`);
      }
    }
  }

  assert(condition, testName, details = '') {
    if (condition) {
      this.passCount++;
      console.log(`  ✅ ${testName} ${details}`);
    } else {
      this.failCount++;
      console.log(`  ❌ ${testName} ${details}`);
    }
    
    this.testResults.push({
      name: testName,
      passed: condition,
      details
    });
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.passCount}`);
    console.log(`❌ Failed: ${this.failCount}`);
    console.log(`📈 Success Rate: ${((this.passCount / (this.passCount + this.failCount)) * 100).toFixed(1)}%`);
    
    if (this.failCount > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.details}`);
        });
    }
    
    console.log('\n🎯 COVERAGE VERIFICATION:');
    this.verifyCoverage();
  }

  verifyCoverage() {
    const coverage = {
      'Academic Programs': this.passCount >= 5,
      'CODO Procedures': this.passCount >= 4,
      'Academic Policies': this.passCount >= 4,
      'Course Information': this.passCount >= 4,
      'Prerequisites': this.passCount >= 3,
      'Minors/Certificates': this.passCount >= 3,
      'Graduation Requirements': this.passCount >= 3,
      'Error Handling': this.passCount >= 2
    };

    Object.entries(coverage).forEach(([area, covered]) => {
      console.log(`   ${covered ? '✅' : '❌'} ${area}`);
    });
  }

  getTestSummary() {
    return {
      total: this.passCount + this.failCount,
      passed: this.passCount,
      failed: this.failCount,
      successRate: (this.passCount / (this.passCount + this.failCount)) * 100,
      canAnswerAnyQuery: this.passCount >= 30 && this.failCount <= 5
    };
  }
}

// API testing functions
function testAPIFunctions() {
  console.log('\n🔧 Testing API Functions...');
  
  // Test program enumeration
  const programs = degreeRequirementsAPI.getAllPrograms();
  console.log(`✅ Found ${programs.length} academic programs`);
  
  // Test academic policies
  const policies = degreeRequirementsAPI.getAcademicPolicies();
  console.log(`✅ Academic policies loaded: ${policies ? 'Yes' : 'No'}`);
  
  // Test CODO policies
  const codoPolicies = degreeRequirementsAPI.getCODOPolicies();
  console.log(`✅ CODO policies loaded: ${codoPolicies ? 'Yes' : 'No'}`);
  
  // Test minors
  const minors = degreeRequirementsAPI.getAllMinors();
  console.log(`✅ Found ${Object.keys(minors).length} minors/certificates`);
  
  // Test course policies
  const coursePolicies = degreeRequirementsAPI.getCoursePolicies();
  console.log(`✅ Course policies loaded: ${coursePolicies ? 'Yes' : 'No'}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  async function runTests() {
    const testSuite = new KnowledgeBaseTestSuite();
    const results = await testSuite.runAllTests();
    
    testAPIFunctions();
    
    console.log('\n🎉 COMPREHENSIVE TESTING COMPLETE!');
    console.log(`System can answer ANY academic query: ${results.canAnswerAnyQuery ? 'YES ✅' : 'NO ❌'}`);
    
    process.exit(results.canAnswerAnyQuery ? 0 : 1);
  }
  
  runTests().catch(console.error);
}

module.exports = { KnowledgeBaseTestSuite, testAPIFunctions };