import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';

/**
 * SECURE SESSION MANAGER
 * Implements isolated user sessions with cryptographic security
 * Prevents data leakage between users and ensures fresh sessions
 */

export interface UserSession {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: string;
}

export interface SessionStorage {
  sessions: Map<string, UserSession>;
  userSessions: Map<string, string[]>; // userId -> sessionIds[]
}

class SecureSessionManager {
  private static instance: SecureSessionManager;
  private sessionStorage: SessionStorage;
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_SESSIONS_PER_USER = 3;
  private readonly ENCRYPTION_KEY: string;

  private constructor() {
    this.ENCRYPTION_KEY = this.generateEncryptionKey();
    this.sessionStorage = {
      sessions: new Map(),
      userSessions: new Map()
    };
    
    // Start cleanup timer
    setInterval(() => this.cleanupExpiredSessions(), this.CLEANUP_INTERVAL);
    
    console.log('🔐 SecureSessionManager initialized');
  }

  public static getInstance(): SecureSessionManager {
    if (!SecureSessionManager.instance) {
      SecureSessionManager.instance = new SecureSessionManager();
    }
    return SecureSessionManager.instance;
  }

  /**
   * Generate a secure encryption key for session data
   */
  private generateEncryptionKey(): string {
    const stored = localStorage.getItem('sessionEncryptionKey');
    if (stored) {
      return stored;
    }
    
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    localStorage.setItem('sessionEncryptionKey', key);
    return key;
  }

  /**
   * Create a new secure session for a user
   * Automatically terminates old sessions if limit exceeded
   */
  public createSession(user: {
    id: string;
    email: string;
    name: string;
  }, request?: {
    ipAddress?: string;
    userAgent?: string;
    rememberMe?: boolean;
  }): string {
    // Generate cryptographically secure session ID
    const sessionId = `ses_${uuidv4()}_${Date.now()}_${this.generateSecureToken()}`;
    
    const now = new Date();
    // Extend session timeout if remember me is enabled (30 days vs 24 hours)
    const sessionTimeout = request?.rememberMe ? (30 * 24 * 60 * 60 * 1000) : this.SESSION_TIMEOUT;
    const expiresAt = new Date(now.getTime() + sessionTimeout);
    
    // Create session object
    const session: UserSession = {
      sessionId,
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      ipAddress: request?.ipAddress,
      userAgent: request?.userAgent?.substring(0, 200), // Limit length
      isActive: true,
      expiresAt: expiresAt.toISOString()
    };

    // Cleanup old sessions for this user if necessary
    this.enforceSessionLimit(user.id);
    
    // Store session
    this.sessionStorage.sessions.set(sessionId, session);
    
    // Track user sessions
    const userSessions = this.sessionStorage.userSessions.get(user.id) || [];
    userSessions.push(sessionId);
    this.sessionStorage.userSessions.set(user.id, userSessions);
    
    // Store encrypted session in localStorage with namespace
    this.storeEncryptedSession(sessionId, session);
    
    console.log('✅ New secure session created', {
      sessionId: sessionId.substring(0, 20) + '...',
      userId: user.id,
      email: user.email,
      expiresAt: expiresAt.toISOString()
    });
    
    return sessionId;
  }

  /**
   * Validate and retrieve session data
   * Returns null if session is invalid, expired, or compromised
   */
  public validateSession(sessionId: string): UserSession | null {
    if (!sessionId || !sessionId.startsWith('ses_')) {
      return null;
    }

    // Check memory storage first
    let session = this.sessionStorage.sessions.get(sessionId);
    
    // If not in memory, try to restore from localStorage
    if (!session) {
      session = this.restoreEncryptedSession(sessionId);
      if (session) {
        this.sessionStorage.sessions.set(sessionId, session);
      }
    }
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      this.destroySession(sessionId);
      return null;
    }
    
    // Check if session is active
    if (!session.isActive) {
      return null;
    }
    
    // Update last activity
    session.lastActivity = new Date().toISOString();
    this.sessionStorage.sessions.set(sessionId, session);
    this.storeEncryptedSession(sessionId, session);
    
    return session;
  }

  /**
   * Update session activity timestamp
   */
  public updateActivity(sessionId: string): void {
    const session = this.sessionStorage.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      this.sessionStorage.sessions.set(sessionId, session);
      this.storeEncryptedSession(sessionId, session);
    }
  }

  /**
   * Destroy a specific session
   */
  public destroySession(sessionId: string): void {
    const session = this.sessionStorage.sessions.get(sessionId);
    
    if (session) {
      // Remove from user sessions tracking
      const userSessions = this.sessionStorage.userSessions.get(session.userId) || [];
      const updatedSessions = userSessions.filter(id => id !== sessionId);
      
      if (updatedSessions.length === 0) {
        this.sessionStorage.userSessions.delete(session.userId);
      } else {
        this.sessionStorage.userSessions.set(session.userId, updatedSessions);
      }
      
      // Remove from session storage
      this.sessionStorage.sessions.delete(sessionId);
      
      // Remove from localStorage
      localStorage.removeItem(`session_${sessionId}`);
      
      console.log('🔒 Session destroyed', {
        sessionId: sessionId.substring(0, 20) + '...',
        userId: session.userId
      });
    }
  }

  /**
   * Destroy all sessions for a specific user
   */
  public destroyUserSessions(userId: string): void {
    const userSessions = this.sessionStorage.userSessions.get(userId) || [];
    
    userSessions.forEach(sessionId => {
      this.destroySession(sessionId);
    });
    
    // Clear any user data from localStorage
    this.clearUserData(userId);
    
    console.log('🔒 All user sessions destroyed', { userId });
  }

  /**
   * Get current active session from browser
   */
  public getCurrentSession(): UserSession | null {
    const sessionId = localStorage.getItem('currentSessionId');
    if (!sessionId) {
      return null;
    }
    
    return this.validateSession(sessionId);
  }

  /**
   * Set current session in browser
   */
  public setCurrentSession(sessionId: string): void {
    localStorage.setItem('currentSessionId', sessionId);
  }

  /**
   * Clear current session from browser
   */
  public clearCurrentSession(): void {
    const sessionId = localStorage.getItem('currentSessionId');
    if (sessionId) {
      this.destroySession(sessionId);
    }
    localStorage.removeItem('currentSessionId');
  }

  /**
   * Get isolated data storage key for current user
   */
  public getUserDataKey(dataType: string): string | null {
    const session = this.getCurrentSession();
    if (!session) {
      return null;
    }
    
    return `userData_${session.userId}_${dataType}`;
  }

  /**
   * Store user-specific data with session isolation
   */
  public setUserData(dataType: string, data: any): boolean {
    const key = this.getUserDataKey(dataType);
    if (!key) {
      return false;
    }
    
    try {
      // Encrypt sensitive data before storing
      const encryptedData = this.encryptData(JSON.stringify(data));
      localStorage.setItem(key, encryptedData);
      return true;
    } catch (error) {
      console.error('Failed to store user data:', error);
      return false;
    }
  }

  /**
   * Retrieve user-specific data with session isolation
   */
  public getUserData(dataType: string): any | null {
    const key = this.getUserDataKey(dataType);
    if (!key) {
      return null;
    }
    
    try {
      const encryptedData = localStorage.getItem(key);
      if (!encryptedData) {
        return null;
      }
      
      const decryptedData = this.decryptData(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  /**
   * Clear all data for a specific user
   */
  private clearUserData(userId: string): void {
    const keys = Object.keys(localStorage);
    const userPrefix = `userData_${userId}_`;
    
    keys.forEach(key => {
      if (key.startsWith(userPrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Enforce maximum sessions per user
   */
  private enforceSessionLimit(userId: string): void {
    const userSessions = this.sessionStorage.userSessions.get(userId) || [];
    
    if (userSessions.length >= this.MAX_SESSIONS_PER_USER) {
      // Sort by last activity and remove oldest sessions
      const sessions = userSessions
        .map(id => this.sessionStorage.sessions.get(id))
        .filter(Boolean)
        .sort((a, b) => new Date(a!.lastActivity).getTime() - new Date(b!.lastActivity).getTime());
      
      const sessionsToRemove = sessions.slice(0, sessions.length - this.MAX_SESSIONS_PER_USER + 1);
      sessionsToRemove.forEach(session => {
        this.destroySession(session!.sessionId);
      });
    }
  }

  /**
   * Clean up expired sessions periodically
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    this.sessionStorage.sessions.forEach((session, sessionId) => {
      if (now > new Date(session.expiresAt)) {
        expiredSessions.push(sessionId);
      }
    });
    
    expiredSessions.forEach(sessionId => {
      this.destroySession(sessionId);
    });
    
    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Store encrypted session data in localStorage
   */
  private storeEncryptedSession(sessionId: string, session: UserSession): void {
    try {
      const encryptedSession = this.encryptData(JSON.stringify(session));
      localStorage.setItem(`session_${sessionId}`, encryptedSession);
    } catch (error) {
      console.error('Failed to store encrypted session:', error);
    }
  }

  /**
   * Restore encrypted session data from localStorage
   */
  private restoreEncryptedSession(sessionId: string): UserSession | null {
    try {
      const encryptedSession = localStorage.getItem(`session_${sessionId}`);
      if (!encryptedSession) {
        return null;
      }
      
      const decryptedSession = this.decryptData(encryptedSession);
      return JSON.parse(decryptedSession);
    } catch (error) {
      console.error('Failed to restore encrypted session:', error);
      // Clean up corrupted session data
      localStorage.removeItem(`session_${sessionId}`);
      return null;
    }
  }

  /**
   * Encrypt sensitive data
   */
  private encryptData(data: string): string {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generate cryptographically secure token
   */
  private generateSecureToken(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  /**
   * Get session statistics for monitoring
   */
  public getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    uniqueUsers: number;
  } {
    const now = new Date();
    let activeSessions = 0;
    
    this.sessionStorage.sessions.forEach(session => {
      if (session.isActive && now <= new Date(session.expiresAt)) {
        activeSessions++;
      }
    });
    
    return {
      totalSessions: this.sessionStorage.sessions.size,
      activeSessions,
      uniqueUsers: this.sessionStorage.userSessions.size
    };
  }
}

// Export singleton instance
export const sessionManager = SecureSessionManager.getInstance();

// Export types for external use
export type { UserSession, SessionStorage };