// Complete authentication reset script
console.log('🧹 Clearing all authentication data...');

// Clear localStorage
const keysToRemove = [
  'msUser',
  'msAccessToken', 
  'user',
  'session',
  'apiKey',
  'authToken',
  'accessToken',
  'refreshToken'
];

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`❌ Removed ${key}`);
});

// Clear all localStorage
localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

console.log('✅ All authentication data cleared');
console.log('🔄 Please refresh the page manually');