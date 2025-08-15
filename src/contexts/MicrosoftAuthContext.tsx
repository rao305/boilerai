import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

// Microsoft auth configuration for Purdue
const MICROSOFT_AUTH_CONFIG = {
  clientId: import.meta.env.VITE_AZURE_CLIENT_ID || 'dev-client-id',
  tenantId: import.meta.env.VITE_AZURE_TENANT_ID || 'dev-tenant-id',
  redirectUri: window.location.origin,
  scopes: ['openid', 'profile', 'User.Read', 'email'],
};

// Microsoft Graph API endpoints
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface User {
  id: string;
  name: string;
  email: string;
  photo?: string;
}

interface MicrosoftAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const MicrosoftAuthContext = createContext<MicrosoftAuthContextType | undefined>(undefined);

export function MicrosoftAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For development, provide a fallback auth system
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // Check for stored Microsoft session
        if (isDevelopment) {
          const storedUser = localStorage.getItem('msUser');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } else {
          // In production, check for auth code callback
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const state = urlParams.get('state');
          
          if (code && state === 'microsoft-auth') {
            console.log('🔐 Microsoft auth code received, processing...');
            await handleMicrosoftCallback(code);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            // Check for existing stored session
            const storedUser = localStorage.getItem('msUser');
            const storedToken = localStorage.getItem('msAccessToken');
            if (storedUser && storedToken) {
              // Verify token is still valid
              const isValid = await verifyToken(storedToken);
              if (isValid) {
                setUser(JSON.parse(storedUser));
              } else {
                // Token expired, clear storage
                localStorage.removeItem('msUser');
                localStorage.removeItem('msAccessToken');
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
  }, [isDevelopment]);

  // Handle Microsoft OAuth callback
  const handleMicrosoftCallback = async (authCode: string) => {
    try {
      console.log('🔄 Exchanging auth code for access token...');
      
      // Exchange auth code for access token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${MICROSOFT_AUTH_CONFIG.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: MICROSOFT_AUTH_CONFIG.clientId,
          scope: MICROSOFT_AUTH_CONFIG.scopes.join(' '),
          code: authCode,
          redirect_uri: MICROSOFT_AUTH_CONFIG.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      console.log('✅ Access token obtained, fetching user profile...');
      
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
      
      // Store in localStorage
      localStorage.setItem('msUser', JSON.stringify(msUser));
      localStorage.setItem('msAccessToken', accessToken);
      
      // Create or update user in Supabase
      await createOrUpdateSupabaseUser(msUser, accessToken);
      
      setUser(msUser);
      console.log('🎉 Microsoft authentication successful!');
      
    } catch (err: any) {
      console.error('❌ Microsoft callback error:', err);
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
          console.log('✅ User updated in Supabase');
        }
      } else {
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
            },
          });
          
        if (insertError) {
          console.error('Error creating user:', insertError);
        } else {
          console.log('✅ New user created in Supabase');
        }
      }
    } catch (err) {
      console.error('Supabase user creation/update error:', err);
      // Don't throw - auth can still work without Supabase
    }
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

  const login = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isDevelopment) {
        // Development fallback
        const devUser: User = {
          id: 'dev-user-ms',
          name: 'Microsoft Dev User',
          email: 'msdev@purdue.edu',
        };
        setUser(devUser);
        localStorage.setItem('msUser', JSON.stringify(devUser));
        console.log('🔧 Development Microsoft auth bypass');
      } else {
        console.log('🚀 Redirecting to Microsoft login...');
        
        // Production: Build Microsoft OAuth URL with state parameter
        const state = 'microsoft-auth';
        const authUrl = `https://login.microsoftonline.com/${MICROSOFT_AUTH_CONFIG.tenantId}/oauth2/v2.0/authorize` +
          `?client_id=${MICROSOFT_AUTH_CONFIG.clientId}` +
          `&response_type=code` +
          `&redirect_uri=${encodeURIComponent(MICROSOFT_AUTH_CONFIG.redirectUri)}` +
          `&scope=${encodeURIComponent(MICROSOFT_AUTH_CONFIG.scopes.join(' '))}` +
          `&response_mode=query` +
          `&state=${state}` +
          `&prompt=select_account`;
        
        // Redirect to Microsoft login
        window.location.href = authUrl;
      }
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
      // Clear local storage
      localStorage.removeItem('msUser');
      localStorage.removeItem('msAccessToken');
      
      // Clear state
      setUser(null);
      setError(null);
      
      console.log('🔓 Microsoft logout successful');
    } catch (err: any) {
      console.error('❌ Logout error:', err);
      setError(err.message || 'Logout failed');
    } finally {
      setIsLoading(false);
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