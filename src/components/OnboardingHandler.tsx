import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMicrosoftAuth } from '@/contexts/MicrosoftAuthContext';

/**
 * AUTOMATIC ONBOARDING HANDLER
 * Redirects first-time users to onboarding and returning users to dashboard
 * Handles post-authentication routing logic
 */

interface OnboardingHandlerProps {
  children: React.ReactNode;
}

export const OnboardingHandler: React.FC<OnboardingHandlerProps> = ({ children }) => {
  const { isAuthenticated, isFirstTimeUser, isLoading } = useMicrosoftAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only handle routing if we're authenticated and not loading
    if (!isLoading && isAuthenticated) {
      const currentPath = location.pathname;
      
      // Don't redirect if already on the correct page
      if (isFirstTimeUser && currentPath === '/onboarding') {
        console.log('✅ First-time user already on onboarding page');
        return;
      }
      
      if (!isFirstTimeUser && currentPath === '/main') {
        console.log('✅ Returning user already on main app');
        return;
      }
      
      // Don't redirect if user is manually navigating onboarding
      if (currentPath === '/onboarding' && !isFirstTimeUser) {
        console.log('ℹ️ User manually accessing onboarding - allowing');
        return;
      }
      
      // Handle automatic redirects
      if (isFirstTimeUser && currentPath !== '/onboarding') {
        console.log('🎯 First-time user detected, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      } else if (!isFirstTimeUser && (currentPath === '/login' || currentPath === '/' || currentPath === '/onboarding')) {
        console.log('🎯 Returning user, redirecting to main app');
        navigate('/main', { replace: true });
      }
    }
  }, [isAuthenticated, isFirstTimeUser, isLoading, location.pathname, navigate]);

  // If not authenticated, don't interfere with routing
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If authenticated but still loading user state, show children
  if (isLoading) {
    return <>{children}</>;
  }

  // Normal authenticated flow
  return <>{children}</>;
};

export default OnboardingHandler;