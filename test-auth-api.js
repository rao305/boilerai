// Test script to verify authentication API is working
const fetch = require('node-fetch');

async function testAuth() {
  try {
    console.log('🧪 Testing authentication API...');
    
    // Test with correct credentials
    const response = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testdev@purdue.edu',
        password: 'DevPassword2024!'
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Authentication API working!');
      console.log('📧 User:', result.user.email);
      console.log('🔑 Token received:', !!result.token);
      console.log('👤 User ID:', result.user.id);
    } else {
      console.log('❌ Authentication failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing auth:', error.message);
  }
}

testAuth();