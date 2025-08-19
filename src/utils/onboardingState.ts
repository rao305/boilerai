/**
 * Onboarding State Management Utilities
 * Provides reliable utilities for managing user onboarding completion state
 */

const ONBOARDING_STORAGE_KEY = 'onboardingCompleted';

export interface OnboardingState {
  isCompleted: boolean;
  completedAt?: string;
  source: 'localStorage' | 'database' | 'memory';
}

/**
 * Get the current onboarding completion state from localStorage
 */
export function getOnboardingState(): OnboardingState {
  const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  const completedAt = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_timestamp`);
  
  return {
    isCompleted: completed,
    completedAt: completedAt || undefined,
    source: 'localStorage'
  };
}

/**
 * Mark onboarding as completed with timestamp
 */
export function markOnboardingCompleted(): void {
  const timestamp = new Date().toISOString();
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_timestamp`, timestamp);
  
  console.log('✅ Onboarding marked as completed locally', { timestamp });
}

/**
 * Clear onboarding completion state (for testing/development)
 */
export function clearOnboardingState(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  localStorage.removeItem(`${ONBOARDING_STORAGE_KEY}_timestamp`);
  
  console.log('🧹 Onboarding state cleared');
}

/**
 * Check if user should be treated as returning user
 * Combines multiple sources of truth for onboarding completion
 */
export function isReturningUser(
  isFirstTimeUser: boolean,
  dbOnboardingCompleted?: boolean
): boolean {
  const localState = getOnboardingState();
  
  // User is returning if:
  // 1. Database indicates onboarding completed, OR
  // 2. Local storage indicates onboarding completed, OR
  // 3. Auth context indicates not first time user
  const isReturning = 
    dbOnboardingCompleted === true ||
    localState.isCompleted ||
    !isFirstTimeUser;
  
  console.log('🔍 Returning user check:', {
    isFirstTimeUser,
    dbOnboardingCompleted,
    localOnboardingCompleted: localState.isCompleted,
    isReturning,
    localCompletedAt: localState.completedAt
  });
  
  return isReturning;
}

/**
 * Development helper: Add to window for console debugging
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).onboardingDebug = {
    getState: getOnboardingState,
    markCompleted: markOnboardingCompleted,
    clear: clearOnboardingState,
    isReturning: isReturningUser
  };
  
  console.log('🔧 Onboarding debug utilities available at window.onboardingDebug');
}