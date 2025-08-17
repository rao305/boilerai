import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { sessionManager, UserSession } from '@/utils/sessionManager';

// Microsoft auth configuration for Purdue
const MICROSOFT_AUTH_CONFIG = {
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
  tenantId: import.meta.env.VITE_AZURE_TENANT_ID,
  redirectUri: window.location.origin,
  scopes: ['openid', 'profile', 'User.Read', 'email'],
};

// Check if Azure configuration is missing
const isAzureConfigured = MICROSOFT_AUTH_CONFIG.clientId && 
                         MICROSOFT_AUTH_CONFIG.tenantId && 
                         MICROSOFT_AUTH_CONFIG.clientId !== 'your_azure_client_id_here' &&
                         MICROSOFT_AUTH_CONFIG.tenantId !== 'your_azure_tenant_id_here' &&
                         MICROSOFT_AUTH_CONFIG.clientId !== '12345678-1234-1234-1234-123456789012';

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
  sessionId?: string;
}

interface MicrosoftAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  sessionId: string | null;
  switchUser: () => Promise<void>;
  isFirstTimeUser: boolean;
  completeOnboarding: () => Promise<void>;
}

const MicrosoftAuthContext = createContext<MicrosoftAuthContextType | undefined>(undefined);

export function MicrosoftAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // For development, provide a fallback auth system
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const clearError = () => {
    setError(null);
  };

  // Verify if access token is still valid
  const verifyToken = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch(`${GRAPH_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  // Handle Microsoft OAuth implicit flow callback
  const handleImplicitCallback = async (accessToken: string) => {
    try {
      console.log('✅ Access token received, fetching user profile...');
      
      // Get user profile from Microsoft Graph
      const profileResponse = await fetch(`${GRAPH_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch user profile from Microsoft Graph');
      }

      const profile = await profileResponse.json();
      
      // Validate Purdue email
      if (!profile.mail?.endsWith('@purdue.edu') && !profile.userPrincipalName?.endsWith('@purdue.edu')) {
        throw new Error('Please use your Purdue email address (@purdue.edu)');
      }

      const msUser: User = {
        id: profile.id,
        name: profile.displayName || profile.givenName + ' ' + profile.surname,
        email: profile.mail || profile.userPrincipalName,
        photo: null, // Can be fetched separately if needed
      };

      console.log('👤 Microsoft user profile:', msUser);
      
      // Check remember me preference
      const rememberMe = sessionStorage.getItem('rememberMe') === 'true';
      sessionStorage.removeItem('rememberMe'); // Clean up
      
      // Create secure session with extended timeout if remember me is enabled
      const newSessionId = sessionManager.createSession(
        {
          id: msUser.id,
          email: msUser.email,
          name: msUser.name
        },
        {
          ipAddress: 'client-side', // Will be updated by backend
          userAgent: navigator.userAgent,
          rememberMe: rememberMe
        }
      );
      
      // Store session data securely
      sessionManager.setUserData('accessToken', accessToken);
      sessionManager.setUserData('userProfile', msUser);
      sessionManager.setCurrentSession(newSessionId);
      
      // Create or update user in Supabase
      await createOrUpdateSupabaseUser(msUser, accessToken);
      
      // Update component state
      msUser.sessionId = newSessionId;
      setUser(msUser);
      setSessionId(newSessionId);
      console.log('🎉 Microsoft authentication successful with secure session!');
      
    } catch (err: any) {
      console.error('❌ Microsoft implicit flow error:', err);
      setError(err.message || 'Microsoft authentication failed');
      throw err;
    }
  };
  
  // Create or update user in Supabase
  const createOrUpdateSupabaseUser = async (msUser: User, accessToken: string) => {
    try {
      console.log('💾 Creating/updating user in Supabase...');
      
      // Check if user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', msUser.email)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing user:', fetchError);
      }
      
      if (existingUser) {
        // Existing user - check if onboarding completed
        const hasCompletedOnboarding = existingUser.preferences?.onboardingCompleted || false;
        setIsFirstTimeUser(!hasCompletedOnboarding);
        
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: msUser.name,
            email_verified: true,
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
          
        if (updateError) {
          console.error('Error updating user:', updateError);
        } else {
          console.log('✅ Existing user updated in Supabase');
        }
      } else {
        // First-time user - needs onboarding
        setIsFirstTimeUser(true);
        
        // Create new user
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: msUser.id,
            email: msUser.email,
            name: msUser.name,
            email_verified: true,
            last_login: new Date().toISOString(),
            preferences: {
              theme: 'system',
              notifications: true,
              onboardingCompleted: false,
            },
          });
          
        if (insertError) {
          console.error('Error creating user:', insertError);
        } else {
          console.log('✅ New user created in Supabase - onboarding required');
        }
      }
    } catch (err) {
      console.error('Supabase user creation/update error:', err);
      // Don't throw - auth can still work without Supabase
    }
  };

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // Check for implicit flow callback (tokens in URL fragment)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const state = hashParams.get('state');
        
        if (accessToken && state === 'microsoft-auth') {
          console.log('🔐 Microsoft access token received, processing...');
          await handleImplicitCallback(accessToken);
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          // Check for existing secure session
          const currentSession = sessionManager.getCurrentSession();
          if (currentSession) {
            // Restore user from secure session
            const storedProfile = sessionManager.getUserData('userProfile');
            const storedToken = sessionManager.getUserData('accessToken');
            
            if (storedProfile && storedToken) {
              // Verify token is still valid
              const isValid = await verifyToken(storedToken);
              if (isValid) {
                const restoredUser: User = {
                  ...storedProfile,
                  sessionId: currentSession.sessionId
                };
                setUser(restoredUser);
                setSessionId(currentSession.sessionId);
                console.log('✅ Session restored successfully');
              } else {
                // Token expired, destroy session
                sessionManager.clearCurrentSession();
                console.log('🔒 Session token expired, cleared');
              }
            }
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setError('Failed to restore session');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (rememberMe: boolean = true) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Azure is configured
      if (!isAzureConfigured) {
        throw new Error('Microsoft authentication not configured. Please set up VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID in your .env file. See MICROSOFT_AUTH_SETUP.md for instructions.');
      }

      console.log('🚀 Redirecting to Microsoft login...');
      
      // Store remember me preference for post-login processing
      sessionStorage.setItem('rememberMe', rememberMe.toString());
      
      // Build Microsoft OAuth URL with state parameter (using implicit flow for SPA)
      const state = 'microsoft-auth';
      const authUrl = `https://login.microsoftonline.com/${MICROSOFT_AUTH_CONFIG.tenantId}/oauth2/v2.0/authorize` +
        `?client_id=${MICROSOFT_AUTH_CONFIG.clientId}` +
        `&response_type=token id_token` +
        `&redirect_uri=${encodeURIComponent(MICROSOFT_AUTH_CONFIG.redirectUri)}` +
        `&scope=${encodeURIComponent(MICROSOFT_AUTH_CONFIG.scopes.join(' '))}` +
        `&response_mode=fragment` +
        `&state=${state}` +
        `&nonce=${Date.now()}` +
        `&prompt=select_account`;
      
      // Redirect to Microsoft login
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('❌ Microsoft login error:', err);
      setError(err.message || 'Microsoft login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // Clear secure session and all user data
      sessionManager.clearCurrentSession();
      
      // Clear state
      setUser(null);
      setSessionId(null);
      setError(null);
      
      console.log('🔓 Microsoft logout successful - all sessions cleared');
    } catch (err: any) {
      console.error('❌ Logout error:', err);
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async () => {
    setIsLoading(true);
    try {
      // Clear current session but allow new login
      sessionManager.clearCurrentSession();
      
      // Clear state
      setUser(null);
      setSessionId(null);
      setError(null);
      
      console.log('🔄 User switch initiated - session cleared for new login');
      
      // Automatically trigger new login
      await login();
    } catch (err: any) {
      console.error('❌ User switch error:', err);
      setError(err.message || 'User switch failed');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    if (!user || !supabase) return;
    
    try {
      // Update user preferences to mark onboarding as completed
      const { error } = await supabase
        .from('users')
        .update({
          preferences: {
            ...user.preferences,
            onboardingCompleted: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Error completing onboarding:', error);
      } else {
        setIsFirstTimeUser(false);
        console.log('✅ Onboarding completed successfully');
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  };

  const value: MicrosoftAuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    error,
    clearError,
    sessionId,
    switchUser,
    isFirstTimeUser,
    completeOnboarding,
  };

  return (
    <MicrosoftAuthContext.Provider value={value}>
      {children}
    </MicrosoftAuthContext.Provider>
  );
}

export function useMicrosoftAuth() {
  const context = useContext(MicrosoftAuthContext);
  if (context === undefined) {
    throw new Error('useMicrosoftAuth must be used within a MicrosoftAuthProvider');
  }
  return context;
}