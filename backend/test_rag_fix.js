/**
 * Test script to verify the RAG system now returns real data instead of asking for more details
 */

const knowledgeService = require('./src/services/knowledgeRetrievalService');
const unifiedAIService = require('./src/services/unifiedAIService');

async function testRAGFixes() {
  console.log('🧪 Testing RAG System Fixes\n');

  // Test cases that should now return real data
  const testCases = [
    {
      name: 'Computer Science Major Structure',
      query: 'What is the Computer Science major structure?',
      expectedToFind: ['CS 18000', 'CS 18200', 'Problem Solving', '4 credits']
    },
    {
      name: 'CS 18000 Course Info',
      query: 'Tell me about CS 18000',
      expectedToFind: ['CS 18000', 'Problem Solving and Object-Oriented Programming', '4', 'credits']
    },
    {
      name: 'Foundation Courses',
      query: 'What are the Computer Science foundation courses?',
      expectedToFind: ['CS 18000', 'CS 18200', 'CS 24000', 'foundation']
    },
    {
      name: 'Mathematics Requirements',
      query: 'What math courses are required for CS?',
      expectedToFind: ['MA 16100', 'MA 16200', 'Calculus', 'Linear Algebra']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      // Test the knowledge retrieval service directly
      const result = await knowledgeService.processRAGQuery(testCase.query);
      
      console.log(`✅ Confidence: ${result.confidence}`);
      console.log(`📄 Sources: ${result.sources.length}`);
      
      // Check if expected content is found
      const foundContent = testCase.expectedToFind.filter(expected => 
        result.answer.toLowerCase().includes(expected.toLowerCase())
      );
      
      console.log(`🔍 Expected content found: ${foundContent.length}/${testCase.expectedToFind.length}`);
      console.log(`   Found: ${foundContent.join(', ')}`);
      
      if (foundContent.length >= testCase.expectedToFind.length / 2) {
        console.log(`✅ Test PASSED - Real course data returned`);
      } else {
        console.log(`❌ Test FAILED - Expected content not found`);
      }
      
      // Show first 200 characters of response
      console.log(`📝 Response preview: ${result.answer.substring(0, 200)}...`);
      
    } catch (error) {
      console.log(`❌ Test FAILED with error: ${error.message}`);
    }
  }

  // Test the unified AI service integration
  console.log('\n\n🔧 Testing Unified AI Service Integration');
  try {
    const ragResult = await unifiedAIService.generateRAGResponse(
      'What courses are in the Computer Science foundation?', 
      null, 
      {}, 
      null // No API key - should still work with knowledge base
    );
    
    console.log(`✅ Unified service confidence: ${ragResult.confidence}`);
    console.log(`📄 Unified service sources: ${ragResult.sources.length}`);
    
    if (ragResult.answer.includes('CS 18000') && ragResult.answer.includes('CS 18200')) {
      console.log(`✅ Unified service integration PASSED`);
    } else {
      console.log(`❌ Unified service integration FAILED`);
    }
    
  } catch (error) {
    console.log(`❌ Unified service test FAILED: ${error.message}`);
  }

  console.log('\n✨ RAG Fix Testing Complete!');
}

// Run the tests
if (require.main === module) {
  testRAGFixes().catch(console.error);
}

module.exports = { testRAGFixes };