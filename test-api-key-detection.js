// Test script for API key detection functionality
// Run this in the browser console to test the new features

console.log('🧪 Testing API Key Detection Functionality');

// Test API key detection function
function detectApiKeyProvider(apiKey) {
  if (!apiKey || apiKey.length < 10) return null;
  
  // OpenAI keys start with 'sk-' and are typically 40+ characters
  if (apiKey.startsWith('sk-') && apiKey.length >= 20) {
    return 'openai';
  }
  
  // Gemini keys start with 'AIzaSy' and are typically 30+ characters
  if (apiKey.startsWith('AIzaSy') && apiKey.length >= 30) {
    return 'gemini';
  }
  
  return null;
}

// Test cases
const testCases = [
  {
    key: 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
    expected: 'openai',
    description: 'Valid OpenAI API key format'
  },
  {
    key: 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
    expected: 'gemini',
    description: 'Valid Gemini API key format'
  },
  {
    key: 'sk-short',
    expected: null,
    description: 'Too short OpenAI key'
  },
  {
    key: 'AIzaSyShort',
    expected: null,
    description: 'Too short Gemini key'
  },
  {
    key: 'invalid-key-format',
    expected: null,
    description: 'Invalid key format'
  },
  {
    key: '',
    expected: null,
    description: 'Empty key'
  }
];

console.log('\n📋 Running Test Cases:');
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = detectApiKeyProvider(testCase.key);
  const success = result === testCase.expected;
  
  console.log(`${index + 1}. ${testCase.description}`);
  console.log(`   Input: "${testCase.key.substring(0, 20)}${testCase.key.length > 20 ? '...' : ''}"`);
  console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`   ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (success) passed++;
  else failed++;
});

console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

// Test the unified chat service status
if (typeof window !== 'undefined' && window.debugUnifiedChat) {
  console.log('\n🤖 Unified Chat Service Status:');
  console.log(window.debugUnifiedChat.getStatus());
}

// Test Gemini service status  
if (typeof window !== 'undefined' && window.debugGemini) {
  console.log('\n💎 Gemini Service Debug Info:');
  console.log(window.debugGemini.checkApiKey());
}