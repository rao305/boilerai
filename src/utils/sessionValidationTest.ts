/**
 * SESSION VALIDATION TEST UTILITY
 * Comprehensive testing for secure session isolation and data protection
 * Ensures no data leakage between different user sessions
 */

import { sessionManager } from './sessionManager';

export interface ValidationResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

export class SessionValidationTest {
  private results: ValidationResult[] = [];

  /**
   * Run comprehensive session isolation tests
   */
  public async runAllTests(): Promise<ValidationResult[]> {
    this.results = [];
    console.log('🧪 Starting comprehensive session validation tests...');

    // Clear all existing sessions for clean test
    this.clearAllTestSessions();

    await this.testBasicSessionCreation();
    await this.testSessionIsolation();
    await this.testDataIsolation();
    await this.testSessionSecurity();
    await this.testSessionCleanup();
    await this.testConcurrentSessions();
    await this.testDataLeakageProtection();

    this.logResults();
    return this.results;
  }

  /**
   * Test basic session creation and validation
   */
  private async testBasicSessionCreation(): Promise<void> {
    try {
      const user1 = {
        id: 'test-user-1',
        email: 'user1@purdue.edu',
        name: 'Test User 1'
      };

      const sessionId = sessionManager.createSession(user1);
      
      if (!sessionId || !sessionId.startsWith('ses_')) {
        this.addResult('Basic Session Creation', false, 'Invalid session ID format');
        return;
      }

      const session = sessionManager.validateSession(sessionId);
      
      if (!session || session.userId !== user1.id) {
        this.addResult('Basic Session Creation', false, 'Session validation failed');
        return;
      }

      this.addResult('Basic Session Creation', true, 'Session created and validated successfully');
    } catch (error) {
      this.addResult('Basic Session Creation', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test session isolation between different users
   */
  private async testSessionIsolation(): Promise<void> {
    try {
      const user1 = { id: 'test-user-1', email: 'user1@purdue.edu', name: 'User 1' };
      const user2 = { id: 'test-user-2', email: 'user2@purdue.edu', name: 'User 2' };

      const session1 = sessionManager.createSession(user1);
      const session2 = sessionManager.createSession(user2);

      // Verify sessions are different
      if (session1 === session2) {
        this.addResult('Session Isolation', false, 'Identical session IDs generated for different users');
        return;
      }

      // Verify each session only validates for its own user
      const validatedSession1 = sessionManager.validateSession(session1);
      const validatedSession2 = sessionManager.validateSession(session2);

      if (!validatedSession1 || validatedSession1.userId !== user1.id) {
        this.addResult('Session Isolation', false, 'User 1 session validation failed');
        return;
      }

      if (!validatedSession2 || validatedSession2.userId !== user2.id) {
        this.addResult('Session Isolation', false, 'User 2 session validation failed');
        return;
      }

      this.addResult('Session Isolation', true, 'Sessions properly isolated between users');
    } catch (error) {
      this.addResult('Session Isolation', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test data isolation between users
   */
  private async testDataIsolation(): Promise<void> {
    try {
      const user1 = { id: 'test-user-1', email: 'user1@purdue.edu', name: 'User 1' };
      const user2 = { id: 'test-user-2', email: 'user2@purdue.edu', name: 'User 2' };

      const session1 = sessionManager.createSession(user1);
      const session2 = sessionManager.createSession(user2);

      // Set current session to user1 and store data
      sessionManager.setCurrentSession(session1);
      const dataStored1 = sessionManager.setUserData('testData', { sensitive: 'user1-secret', value: 123 });

      // Set current session to user2 and store different data
      sessionManager.setCurrentSession(session2);
      const dataStored2 = sessionManager.setUserData('testData', { sensitive: 'user2-secret', value: 456 });

      if (!dataStored1 || !dataStored2) {
        this.addResult('Data Isolation', false, 'Failed to store user data');
        return;
      }

      // Switch back to user1 and verify data
      sessionManager.setCurrentSession(session1);
      const retrievedData1 = sessionManager.getUserData('testData');

      // Switch to user2 and verify data
      sessionManager.setCurrentSession(session2);
      const retrievedData2 = sessionManager.getUserData('testData');

      if (!retrievedData1 || retrievedData1.sensitive !== 'user1-secret' || retrievedData1.value !== 123) {
        this.addResult('Data Isolation', false, 'User 1 data corrupted or inaccessible');
        return;
      }

      if (!retrievedData2 || retrievedData2.sensitive !== 'user2-secret' || retrievedData2.value !== 456) {
        this.addResult('Data Isolation', false, 'User 2 data corrupted or inaccessible');
        return;
      }

      this.addResult('Data Isolation', true, 'User data properly isolated and secure');
    } catch (error) {
      this.addResult('Data Isolation', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test session security features
   */
  private async testSessionSecurity(): Promise<void> {
    try {
      const user = { id: 'test-user-security', email: 'security@purdue.edu', name: 'Security Test' };
      const sessionId = sessionManager.createSession(user);

      // Test invalid session ID format
      const invalidSession = sessionManager.validateSession('invalid-session-id');
      if (invalidSession) {
        this.addResult('Session Security', false, 'Invalid session ID accepted');
        return;
      }

      // Test tampered session ID
      const tamperedSessionId = sessionId.replace(/[0-9]/g, '9');
      const tamperedSession = sessionManager.validateSession(tamperedSessionId);
      if (tamperedSession) {
        this.addResult('Session Security', false, 'Tampered session ID accepted');
        return;
      }

      // Test session encryption
      const storedSessionData = localStorage.getItem(`session_${sessionId}`);
      if (!storedSessionData) {
        this.addResult('Session Security', false, 'Session data not stored');
        return;
      }

      // Verify data is encrypted (should not contain plain text user info)
      if (storedSessionData.includes(user.email) || storedSessionData.includes(user.name)) {
        this.addResult('Session Security', false, 'Session data not properly encrypted');
        return;
      }

      this.addResult('Session Security', true, 'Session security features working correctly');
    } catch (error) {
      this.addResult('Session Security', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test session cleanup and expiration
   */
  private async testSessionCleanup(): Promise<void> {
    try {
      const user = { id: 'test-user-cleanup', email: 'cleanup@purdue.edu', name: 'Cleanup Test' };
      const sessionId = sessionManager.createSession(user);

      // Verify session exists
      let session = sessionManager.validateSession(sessionId);
      if (!session) {
        this.addResult('Session Cleanup', false, 'Session not created properly');
        return;
      }

      // Destroy session
      sessionManager.destroySession(sessionId);

      // Verify session is destroyed
      session = sessionManager.validateSession(sessionId);
      if (session) {
        this.addResult('Session Cleanup', false, 'Session not properly destroyed');
        return;
      }

      // Verify localStorage is cleaned
      const storedData = localStorage.getItem(`session_${sessionId}`);
      if (storedData) {
        this.addResult('Session Cleanup', false, 'Session data not cleaned from localStorage');
        return;
      }

      this.addResult('Session Cleanup', true, 'Session cleanup working correctly');
    } catch (error) {
      this.addResult('Session Cleanup', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test concurrent sessions and limits
   */
  private async testConcurrentSessions(): Promise<void> {
    try {
      const user = { id: 'test-user-concurrent', email: 'concurrent@purdue.edu', name: 'Concurrent Test' };
      
      // Create multiple sessions for same user
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        sessions.push(sessionManager.createSession(user));
      }

      // Verify session limit enforcement (should be max 3 sessions)
      let validSessions = 0;
      for (const sessionId of sessions) {
        if (sessionManager.validateSession(sessionId)) {
          validSessions++;
        }
      }

      if (validSessions > 3) {
        this.addResult('Concurrent Sessions', false, `Too many concurrent sessions allowed: ${validSessions}`);
        return;
      }

      this.addResult('Concurrent Sessions', true, `Session limit properly enforced: ${validSessions} sessions`);
    } catch (error) {
      this.addResult('Concurrent Sessions', false, `Error: ${error.message}`);
    }
  }

  /**
   * Test protection against data leakage between users
   */
  private async testDataLeakageProtection(): Promise<void> {
    try {
      const user1 = { id: 'test-user-leak1', email: 'leak1@purdue.edu', name: 'Leak Test 1' };
      const user2 = { id: 'test-user-leak2', email: 'leak2@purdue.edu', name: 'Leak Test 2' };

      const session1 = sessionManager.createSession(user1);
      const session2 = sessionManager.createSession(user2);

      // Store sensitive data for user1
      sessionManager.setCurrentSession(session1);
      sessionManager.setUserData('sensitiveData', {
        ssn: '123-45-6789',
        grades: ['A', 'B+', 'A-'],
        transcriptData: 'HIGHLY_CONFIDENTIAL'
      });

      // Switch to user2 and try to access user1's data
      sessionManager.setCurrentSession(session2);
      const leakedData = sessionManager.getUserData('sensitiveData');

      if (leakedData && (leakedData.ssn || leakedData.grades || leakedData.transcriptData)) {
        this.addResult('Data Leakage Protection', false, 'Sensitive data leaked between users');
        return;
      }

      // Try to manually access user1's data storage key from user2's session
      const user1DataKey = `userData_${user1.id}_sensitiveData`;
      const directAccess = localStorage.getItem(user1DataKey);
      
      if (directAccess) {
        // This is expected, but try to decrypt it without proper session
        try {
          // If we can decrypt without proper session context, it's a security issue
          const decryptedData = JSON.parse(directAccess);
          if (decryptedData && typeof decryptedData === 'object' && !decryptedData.encrypted) {
            this.addResult('Data Leakage Protection', false, 'Data stored in plain text');
            return;
          }
        } catch {
          // This is good - data should be encrypted and not parseable without proper session
        }
      }

      this.addResult('Data Leakage Protection', true, 'Data leakage protection working correctly');
    } catch (error) {
      this.addResult('Data Leakage Protection', false, `Error: ${error.message}`);
    }
  }

  /**
   * Add test result
   */
  private addResult(testName: string, passed: boolean, message: string, details?: any): void {
    this.results.push({ testName, passed, message, details });
  }

  /**
   * Clear all test sessions
   */
  private clearAllTestSessions(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('session_ses_') || key.startsWith('userData_test-user')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Log test results
   */
  private logResults(): void {
    console.log('\n🧪 SESSION VALIDATION TEST RESULTS');
    console.log('=====================================');
    
    let passed = 0;
    let failed = 0;

    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${result.testName}: ${result.message}`);
      
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    });

    console.log('=====================================');
    console.log(`📊 SUMMARY: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED - Session isolation is secure!');
    } else {
      console.log('🚨 SECURITY ISSUES DETECTED - Review failed tests!');
    }
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const securityScore = Math.round((passedTests / totalTests) * 100);

    return `
# Session Security Validation Report
**Generated:** ${new Date().toISOString()}

## Summary
- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests}
- **Failed:** ${failedTests}
- **Security Score:** ${securityScore}%

## Test Results
${this.results.map(result => 
  `### ${result.testName}
**Status:** ${result.passed ? '✅ PASS' : '❌ FAIL'}
**Message:** ${result.message}
${result.details ? `**Details:** ${JSON.stringify(result.details, null, 2)}` : ''}
`).join('\n')}

## Security Assessment
${securityScore >= 100 ? 
  '🛡️ **EXCELLENT**: All security tests passed. Session isolation is fully secure.' :
  securityScore >= 80 ?
  '⚠️ **GOOD**: Most security tests passed. Review failed tests and address issues.' :
  '🚨 **CRITICAL**: Multiple security tests failed. Immediate attention required.'
}

## Recommendations
${failedTests > 0 ? 
  `- Address the ${failedTests} failed security test(s) immediately
- Review session management implementation
- Verify data encryption and isolation mechanisms
- Test with different user scenarios` :
  `- Continue monitoring session security
- Perform regular security audits
- Consider penetration testing for production`
}
`;
  }
}

// Export singleton for easy use
export const sessionValidationTest = new SessionValidationTest();

// Quick test function for development
export const runQuickSessionTest = async (): Promise<boolean> => {
  const results = await sessionValidationTest.runAllTests();
  const allPassed = results.every(r => r.passed);
  
  if (allPassed) {
    console.log('🎉 Quick session test PASSED - System is secure!');
  } else {
    console.log('🚨 Quick session test FAILED - Security issues detected!');
  }
  
  return allPassed;
};