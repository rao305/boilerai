// Quick test script to verify Gemini integration
// Run this in browser console to test the unified service

console.log('🧪 Testing Gemini Integration...');

// Check if debug functions are available
if (typeof debugUnifiedChat !== 'undefined') {
    console.log('✅ Unified Chat Debug Available');
    const status = debugUnifiedChat.getStatus();
    console.log('📊 Unified Service Status:', status);
    
    if (status.selectedProvider === 'gemini') {
        console.log('🎉 SUCCESS: Gemini is the selected provider!');
        
        // Test a simple message
        debugUnifiedChat.testMessage('Hello, test message')
            .then(response => {
                console.log('✅ Test message successful:', response);
                console.log('🎉 INTEGRATION TEST PASSED: Gemini is working!');
            })
            .catch(error => {
                console.log('❌ Test message failed:', error);
            });
    } else if (status.selectedProvider === 'openai') {
        console.log('ℹ️ OpenAI is selected (expected if OpenAI key is also present)');
    } else {
        console.log('⚠️ No provider selected');
    }
} else {
    console.log('❌ Debug functions not available');
}

// Check API key validation status
const validation = JSON.parse(localStorage.getItem('api_key_validation_status') || '{}');
console.log('🔑 API Key Validation Status:', validation);

if (validation.gemini) {
    console.log('✅ Gemini API key is validated');
}
if (validation.openai) {
    console.log('✅ OpenAI API key is validated');
}

console.log('🧪 Test complete. Check results above.');