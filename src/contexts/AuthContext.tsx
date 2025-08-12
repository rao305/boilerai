import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{ needsVerification?: boolean; previewUrl?: string }>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<{ previewUrl?: string }>;
  checkVerificationStatus: (email: string) => Promise<{ emailVerified: boolean }>;
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!token;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');

        if (storedToken && storedUser) {
          // Verify token is still valid by making a request to profile endpoint
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5005/api'}/auth/profile`, {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const userData = await response.json();
              setToken(storedToken);
              setUser(userData.user);
            } else {
              // Token is invalid, clear stored data
              localStorage.removeItem('authToken');
              localStorage.removeItem('authUser');
            }
          } catch (error) {
            console.error('Error verifying token:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

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
          name: 'Development User'
        };
        
        const mockToken = 'dev-token-bypass-' + Date.now();
        
        // Store in localStorage
        localStorage.setItem('authToken', mockToken);
        localStorage.setItem('authUser', JSON.stringify(mockUser));
        
        // Update state
        setToken(mockToken);
        setUser(mockUser);
        
        console.log('✅ Development bypass successful');
        return;
      }
      
      console.log('🔐 Login attempt:', { email, baseURL: API_BASE_URL });

      const response = await apiService.login(email, password);
      
      console.log('🔐 Login response:', response);

      if (response.success) {
        const { token: authToken, user: userData } = response;
        
        console.log('✅ Login successful, storing token and user data');
        
        // Store in localStorage
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
        
        // Update state
        setToken(authToken);
        setUser(userData);
        
        console.log('✅ Login state updated successfully');
      } else {
        console.log('❌ Login failed - response not successful:', response);
        // Handle email verification needed case
        if (response.needsVerification) {
          const error = new Error(response.message || 'Email verification required');
          (error as any).needsVerification = true;
          throw error;
        }
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ needsVerification?: boolean; previewUrl?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.register(email, password, name);

      if (response.success) {
        // For email verification flow, don't auto-login
        if (response.needsVerification) {
          return {
            needsVerification: true,
            previewUrl: response.previewUrl
          };
        }
        
        // Legacy flow - auto-login (shouldn't happen with verification)
        const { token: authToken, user: userData } = response;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
        setToken(authToken);
        setUser(userData);
        
        return {};
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    
    // Clear state
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.verifyEmail(token);

      if (response.success) {
        const { token: authToken, user: userData } = response;
        
        // Store in localStorage
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
        
        // Update state
        setToken(authToken);
        setUser(userData);
      } else {
        throw new Error(response.message || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      setError(error.message || 'Email verification failed. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async (email: string): Promise<{ previewUrl?: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.resendVerification(email);

      if (response.success) {
        return {
          previewUrl: response.previewUrl
        };
      } else {
        throw new Error(response.message || 'Failed to resend verification email');
      }
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
      const response = await apiService.checkVerificationStatus(email);

      if (response.success) {
        return {
          emailVerified: response.emailVerified
        };
      } else {
        throw new Error(response.message || 'Failed to check verification status');
      }
    } catch (error: any) {
      console.error('Check verification status error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};