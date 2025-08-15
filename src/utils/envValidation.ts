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

  // Optional variables (warnings only)
  const optionalVars = {
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  Object.entries(optionalVars).forEach(([key, value]) => {
    if (!value || value.trim() === '') {
      warnings.push(`${key} is not set. Some features may not work properly.`);
    }
  });

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
  
  // Only show warnings in development mode and only for OpenAI key
  if (import.meta.env.DEV && result.warnings.some(w => w.includes('VITE_OPENAI_API_KEY'))) {
    console.warn('⚠️ OpenAI API key not configured. Users can add their own key in the app.');
  }
};