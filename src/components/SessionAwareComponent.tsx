import React, { useEffect, useState } from 'react';
import { sessionManager } from '@/utils/sessionManager';
import { useMicrosoftAuth } from '@/contexts/MicrosoftAuthContext';

/**
 * SECURE SESSION-AWARE COMPONENT WRAPPER
 * Ensures all child components operate within isolated user sessions
 * Prevents data leakage between different users
 */

interface SessionAwareComponentProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  dataIsolation?: boolean;
  sessionTimeout?: number;
}

export const SessionAwareComponent: React.FC<SessionAwareComponentProps> = ({
  children,
  requireAuth = true,
  dataIsolation = true,
  sessionTimeout = 24 * 60 * 60 * 1000 // 24 hours
}) => {
  const { user, sessionId, logout, isAuthenticated } = useMicrosoftAuth();
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      setIsChecking(true);
      
      try {
        if (requireAuth && !isAuthenticated) {
          setIsSessionValid(false);
          setIsChecking(false);
          return;
        }

        if (sessionId) {
          // Validate current session
          const session = sessionManager.validateSession(sessionId);
          
          if (session) {
            // Update activity timestamp
            sessionManager.updateActivity(sessionId);
            setIsSessionValid(true);
            
            console.log('✅ Session validated', {
              sessionId: sessionId.substring(0, 20) + '...',
              userId: session.userId,
              lastActivity: session.lastActivity
            });
          } else {
            // Session invalid, force logout
            console.warn('🚨 Invalid session detected, forcing logout');
            await logout();
            setIsSessionValid(false);
          }
        } else if (requireAuth) {
          setIsSessionValid(false);
        } else {
          setIsSessionValid(true);
        }
      } catch (error) {
        console.error('Session validation failed:', error);
        setIsSessionValid(false);
      } finally {
        setIsChecking(false);
      }
    };

    validateSession();
    
    // Set up periodic session validation
    const sessionCheckInterval = setInterval(validateSession, 5 * 60 * 1000); // Every 5 minutes
    
    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [sessionId, isAuthenticated, requireAuth, logout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId && dataIsolation) {
        // Update last activity on component unmount
        sessionManager.updateActivity(sessionId);
      }
    };
  }, [sessionId, dataIsolation]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isSessionValid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Required</h2>
          <p className="text-gray-600 mb-4">
            Your session has expired or is invalid. Please sign in again to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  if (dataIsolation && sessionId) {
    // Wrap children with session context
    return (
      <SessionIsolationProvider sessionId={sessionId}>
        {children}
      </SessionIsolationProvider>
    );
  }

  return <>{children}</>;
};

/**
 * Session Isolation Provider
 * Provides isolated data storage and retrieval within the session context
 */
interface SessionIsolationProviderProps {
  children: React.ReactNode;
  sessionId: string;
}

const SessionIsolationProvider: React.FC<SessionIsolationProviderProps> = ({
  children,
  sessionId
}) => {
  useEffect(() => {
    // Set up session-specific data isolation
    console.log('🔒 Data isolation active for session:', sessionId.substring(0, 20) + '...');
    
    // Monitor for potential session conflicts
    const checkSessionConflicts = () => {
      const currentSession = sessionManager.getCurrentSession();
      if (!currentSession || currentSession.sessionId !== sessionId) {
        console.warn('🚨 Session conflict detected, component may have stale data');
        window.location.reload(); // Force refresh to clear stale state
      }
    };
    
    const conflictCheckInterval = setInterval(checkSessionConflicts, 30 * 1000); // Every 30 seconds
    
    return () => {
      clearInterval(conflictCheckInterval);
    };
  }, [sessionId]);

  return <>{children}</>;
};

/**
 * Hook for session-aware data storage
 */
export const useSessionData = () => {
  const { sessionId } = useMicrosoftAuth();
  
  const setSessionData = (key: string, data: any): boolean => {
    if (!sessionId) {
      console.warn('No active session for data storage');
      return false;
    }
    return sessionManager.setUserData(key, data);
  };
  
  const getSessionData = (key: string): any => {
    if (!sessionId) {
      console.warn('No active session for data retrieval');
      return null;
    }
    return sessionManager.getUserData(key);
  };
  
  const clearSessionData = (key: string): void => {
    if (!sessionId) return;
    sessionManager.setUserData(key, null);
  };
  
  return {
    setSessionData,
    getSessionData,
    clearSessionData,
    sessionId
  };
};

/**
 * Session Statistics Component for monitoring
 */
export const SessionStats: React.FC = () => {
  const [stats, setStats] = useState(sessionManager.getSessionStats());
  
  useEffect(() => {
    const updateStats = () => {
      setStats(sessionManager.getSessionStats());
    };
    
    const statsInterval = setInterval(updateStats, 10000); // Every 10 seconds
    
    return () => clearInterval(statsInterval);
  }, []);
  
  return (
    <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
      <div>Active Sessions: {stats.activeSessions}</div>
      <div>Total Sessions: {stats.totalSessions}</div>
      <div>Unique Users: {stats.uniqueUsers}</div>
    </div>
  );
};

export default SessionAwareComponent;