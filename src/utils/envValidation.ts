/**
 * Environment Variable Validation Utility
 * Validates critical environment variables are properly configured
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const validateEnvironment = (): EnvValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical variables that must be set
  const criticalVars = {
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  };

  // Check critical variables
  Object.entries(criticalVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      errors.push(`${key} is not set or empty. This will cause API validation failures.`);
    }
  });

  // Validate VITE_BACKEND_URL format
  if (criticalVars.VITE_BACKEND_URL) {
    try {
      new URL(criticalVars.VITE_BACKEND_URL);
    } catch {
      errors.push(`VITE_BACKEND_URL "${criticalVars.VITE_BACKEND_URL}" is not a valid URL format`);
    }
  }

  // Optional variables (warnings only) - excluding user-provided API keys
  const optionalVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  Object.entries(optionalVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      warnings.push(`${key} is not set. Some features may not work properly.`);
    }
  });

  // Note: VITE_OPENAI_API_KEY is intentionally not checked here as users provide their own API keys through the app interface

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const logEnvironmentStatus = (): void => {
  const result = validateEnvironment();
  
  // Only log errors and important information
  if (!result.isValid) {
    console.error('❌ Environment configuration errors found:');
    result.errors.forEach(error => console.error(`  • ${error}`));
    
    // Add specific guidance for common issues
    if (result.errors.some(error => error.includes('VITE_BACKEND_URL'))) {
      console.error('\n💡 Quick Fix: Add this line to your .env file:');
      console.error('   VITE_BACKEND_URL=http://localhost:5001');
    }
  }
  
  // Show configuration status in development mode
  if (import.meta.env.DEV) {
    console.info('ℹ️ User API Key Model: Users provide their own OpenAI API keys through the Settings page.');
  }
  
  // Development-only info about common browser extension errors
  if (import.meta.env.DEV) {
    console.info('ℹ️ Browser extension errors (utils.js, extensionState.js, SecretSessionError) are normal and can be ignored.');
  }
};