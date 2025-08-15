import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
  created_at?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    onboardingCompleted?: boolean;
    major?: string;
    year?: string;
    graduationYear?: string;
    interests?: string[];
    goals?: string[];
    hasTranscript?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ needsVerification?: boolean }>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  checkVerificationStatus: (email: string) => Promise<{ emailVerified: boolean }>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!session;

  // Initialize auth state and listen for changes
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          await loadUserProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        return;
      }

      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        emailVerified: data.email_verified,
        created_at: data.created_at,
        preferences: data.preferences
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Development bypass
      if (email === "/dev" && password === "bypass" && process.env.NODE_ENV === 'development') {
        console.log('🔧 Development bypass - creating mock user session');
        
        const mockUser = {
          id: 'dev-user-123',
          email: 'dev@purdue.edu',
          name: 'Development User',
          emailVerified: true,
          created_at: new Date().toISOString(),
          preferences: { theme: 'system' as const, notifications: true }
        };
        
        // Create a mock session
        const mockSession = {
          access_token: 'dev-token-bypass-' + Date.now(),
          refresh_token: 'dev-refresh-' + Date.now(),
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: {
            id: 'dev-user-123',
            email: 'dev@purdue.edu',
            aud: 'authenticated',
            role: 'authenticated',
            email_confirmed_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: { name: 'Development User' },
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
        
        // Update state directly
        setSession(mockSession as any);
        setUser(mockUser);
        
        console.log('✅ Development bypass successful');
        return;
      }
      
      console.log('🔐 Supabase login attempt:', { email });

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) {
        console.error('❌ Supabase login error:', authError);
        
        // Handle specific error cases
        if (authError.message.includes('Email not confirmed')) {
          const error = new Error('Please verify your email before logging in');
          (error as any).needsVerification = true;
          throw error;
        }
        
        throw new Error(authError.message);
      }

      if (!data.session) {
        throw new Error('Login failed - no session created');
      }
      
      console.log('✅ Supabase login successful');
      // User state will be set automatically by the auth state change listener
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ needsVerification?: boolean }> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔐 Supabase registration attempt:', { email, name });

      // Validate Purdue email
      if (!email.endsWith('@purdue.edu')) {
        throw new Error('Must use a Purdue email address (@purdue.edu)');
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (authError) {
        console.error('❌ Supabase registration error:', authError);
        throw new Error(authError.message);
      }

      console.log('✅ Supabase registration successful');
      
      // Check if email confirmation is required
      if (!data.session) {
        return { needsVerification: true };
      }
      
      return {};
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        throw new Error(error.message);
      }
      
      console.log('✅ Logout successful');
      // State will be cleared automatically by the auth state change listener
      
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Logout failed');
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Supabase handles email verification via URL parameters automatically
      // When users click the verification link, they're redirected with tokens in the URL
      // The auth state change listener will handle the verification automatically
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });

      if (verifyError) {
        console.error('Email verification error:', verifyError);
        throw new Error(verifyError.message);
      }

      console.log('✅ Email verification successful');
      // User state will be updated automatically by the auth state change listener
      
    } catch (error: any) {
      console.error('Email verification error:', error);
      setError(error.message || 'Email verification failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (resendError) {
        console.error('Resend verification error:', resendError);
        throw new Error(resendError.message);
      }

      console.log('✅ Verification email resent successfully');
      
    } catch (error: any) {
      console.error('Resend verification error:', error);
      setError(error.message || 'Failed to resend verification email.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkVerificationStatus = async (email: string): Promise<{ emailVerified: boolean }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      return {
        emailVerified: user?.email_confirmed_at ? true : false
      };
    } catch (error: any) {
      console.error('Check verification status error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    try {
      setError(null);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Updating profile via backend API:', updates);

      // Use backend API instead of Supabase for profile updates
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await window.fetch(`${backendUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          updates: updates
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      console.log('Profile updated successfully via backend');

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
      
    } catch (error: any) {
      console.error('Update profile error:', error);
      setError(error.message || 'Failed to update profile');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    error,
    clearError,
    verifyEmail,
    resendVerification,
    checkVerificationStatus,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};