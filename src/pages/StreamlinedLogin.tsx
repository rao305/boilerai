import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, PurdueButton } from "@/components/PurdueUI";
import { Loader2, AlertCircle, Shield, CheckCircle } from "lucide-react";
import { useMicrosoftAuth } from "@/contexts/MicrosoftAuthContext";
import { BoilerAILogo } from "@/components/BoilerAILogo";

/**
 * STREAMLINED LOGIN PAGE
 * Microsoft-only authentication with remember me functionality
 * Automatic onboarding flow for first-time users
 */

export default function StreamlinedLogin() {
  const { 
    login, 
    isLoading, 
    error, 
    clearError, 
    isAuthenticated, 
    isFirstTimeUser 
  } = useMicrosoftAuth();
  const navigate = useNavigate();
  
  const [rememberMe, setRememberMe] = useState(true);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  // Clear any stuck authentication state on mount
  useEffect(() => {
    // Only clear if we're actually on the login page and not authenticated
    // AND we're not in a loading state (to avoid clearing during auth checks)
    if (!isAuthenticated && !isLoading && window.location.pathname === '/login') {
      console.log('🧹 Clearing any stuck authentication state');
      // Clear old session data but preserve onboarding completion status
      const onboardingCompleted = localStorage.getItem('onboardingCompleted');
      localStorage.removeItem('msUser');
      localStorage.removeItem('msAccessToken');
      sessionStorage.clear();
      // Restore onboarding completion status
      if (onboardingCompleted) {
        localStorage.setItem('onboardingCompleted', onboardingCompleted);
      }
    }
  }, [isAuthenticated, isLoading]);

  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && hasAttemptedLogin) {
      console.log('✅ Authentication successful, determining redirect...');
      
      // Navigate based on onboarding status
      if (isFirstTimeUser) {
        console.log('🎯 First-time user detected, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
      } else {
        console.log('🎯 Returning user, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, isFirstTimeUser, hasAttemptedLogin, navigate]);

  const handleMicrosoftLogin = async () => {
    setHasAttemptedLogin(true);
    clearError();
    
    try {
      console.log('🚀 Initiating Microsoft login with remember me:', rememberMe);
      await login(rememberMe);
    } catch (err) {
      console.error('❌ Login failed:', err);
      setHasAttemptedLogin(false);
    }
  };

  // Show loading state during authentication
  if (isLoading && hasAttemptedLogin) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
          <p className="text-lg">Connecting to Microsoft...</p>
          <p className="text-sm text-neutral-400 mt-2">Please complete the authentication in the popup window</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <BoilerAILogo size="xl" showText={false} variant="default" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to BoilerAI</h1>
          <p className="text-neutral-400">AI-powered academic assistant for Purdue students</p>
        </div>

        <Card title="Sign In">
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <div className="p-4 rounded-lg bg-red-900/20 border border-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-200">
                    <p className="font-medium mb-1">Authentication Error</p>
                    <p>{error}</p>
                    {error.includes('Application with identifier') && (
                      <div className="mt-3 p-3 bg-red-800/30 rounded border border-red-700">
                        <p className="text-xs">
                          <strong>Troubleshooting:</strong> This error usually means your Azure app registration needs to be configured. 
                          Please contact support or try again in a few minutes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Primary Microsoft Login */}
            <div className="space-y-4">
              <PurdueButton
                onClick={handleMicrosoftLogin}
                disabled={isLoading}
                className="w-full h-12 bg-[#0078d4] hover:bg-[#106ebe] border-[#0078d4] text-base font-medium"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" /> 
                    Connecting to Microsoft...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                    </svg>
                    Sign in with Purdue Microsoft
                  </span>
                )}
              </PurdueButton>

              {/* Remember Me Option */}
              <div className="flex items-center justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-neutral-800 border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm text-neutral-300">Remember me for 30 days</span>
                </label>
              </div>
            </div>


            {/* What happens next */}
            <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
              <div className="text-sm">
                <h4 className="font-medium text-blue-200 mb-2">What happens next?</h4>
                <div className="space-y-2 text-blue-300">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">1.</span>
                    <span>Sign in with your @purdue.edu Microsoft account</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">2.</span>
                    <span>Complete a quick onboarding (first-time users only)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 font-bold">3.</span>
                    <span>Start using your AI-powered academic assistant!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-neutral-500">
          <p>Restricted to Purdue University students, faculty, and staff</p>
          <p className="mt-2">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </div>

      </div>
    </div>
  );
}