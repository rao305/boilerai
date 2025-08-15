import { 
  validatePurdueUser, 
  normalizeEmail, 
  isValidEmail, 
  isPurdueEmail, 
  isValidRedirectUrl 
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      expect(normalizeEmail('John.Doe@PURDUE.EDU')).toBe('john.doe@purdue.edu');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  test@purdue.edu  ')).toBe('test@purdue.edu');
    });

    it('should handle empty string', () => {
      expect(normalizeEmail('')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@purdue.edu')).toBe(true);
      expect(isValidEmail('john.doe+test@purdue.edu')).toBe(true);
      expect(isValidEmail('user123@student.purdue.edu')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@purdue.edu')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('isPurdueEmail', () => {
    it('should accept valid Purdue domains', () => {
      expect(isPurdueEmail('test@purdue.edu')).toBe(true);
      expect(isPurdueEmail('student@student.purdue.edu')).toBe(true);
    });

    it('should reject non-Purdue domains', () => {
      expect(isPurdueEmail('test@gmail.com')).toBe(false);
      expect(isPurdueEmail('test@indiana.edu')).toBe(false);
      expect(isPurdueEmail('test@notpurdue.edu')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isPurdueEmail('TEST@PURDUE.EDU')).toBe(true);
    });
  });

  describe('validatePurdueUser', () => {
    const mockProfile = {
      _json: {
        email: 'test@purdue.edu',
        preferred_username: 'test@purdue.edu',
        upn: 'test@purdue.edu',
        tid: 'test-tenant-id'
      },
      displayName: 'Test User'
    };

    it('should validate user with Purdue email', async () => {
      const result = await validatePurdueUser(mockProfile as any, 'https://login.microsoftonline.com/test-tenant-id/v2.0');
      
      expect(result.isValid).toBe(true);
      expect(result.email).toBe('test@purdue.edu');
    });

    it('should reject user without email', async () => {
      const profileWithoutEmail = {
        _json: {},
        displayName: 'Test User'
      };

      const result = await validatePurdueUser(profileWithoutEmail as any, 'issuer');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('No email found in profile');
    });

    it('should reject non-Purdue email', async () => {
      const profileWithInvalidEmail = {
        _json: {
          email: 'test@gmail.com'
        },
        displayName: 'Test User'
      };

      const result = await validatePurdueUser(profileWithInvalidEmail as any, 'issuer');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('is not a Purdue domain');
    });

    it('should validate tenant ID when provided', async () => {
      // Mock environment with specific tenant ID
      const originalTenantId = process.env.AZURE_TENANT_ID;
      process.env.AZURE_TENANT_ID = 'correct-tenant-id';

      const profileWithWrongTenant = {
        _json: {
          email: 'test@purdue.edu',
          tid: 'wrong-tenant-id'
        },
        displayName: 'Test User'
      };

      const result = await validatePurdueUser(profileWithWrongTenant as any, 'issuer');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid tenant');

      // Restore original value
      process.env.AZURE_TENANT_ID = originalTenantId;
    });

    it('should detect external accounts with Purdue email', async () => {
      const profileWithConsumerTenant = {
        _json: {
          email: 'test@purdue.edu',
          tid: '9188040d-6c67-4c5b-b112-36a304b66dad' // Common consumer tenant
        },
        displayName: 'Test User'
      };

      const result = await validatePurdueUser(profileWithConsumerTenant as any, 'issuer');
      
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('External account not allowed');
    });
  });

  describe('isValidRedirectUrl', () => {
    const allowedOrigins = ['http://localhost:3000', 'https://auth.purdue.edu'];

    it('should allow valid redirect URLs', () => {
      expect(isValidRedirectUrl('http://localhost:3000/dashboard', allowedOrigins)).toBe(true);
      expect(isValidRedirectUrl('https://auth.purdue.edu/app', allowedOrigins)).toBe(true);
    });

    it('should reject URLs with invalid origins', () => {
      expect(isValidRedirectUrl('https://evil.com/redirect', allowedOrigins)).toBe(false);
      expect(isValidRedirectUrl('http://malicious.site.com', allowedOrigins)).toBe(false);
    });

    it('should reject non-HTTP protocols', () => {
      expect(isValidRedirectUrl('javascript:alert(1)', allowedOrigins)).toBe(false);
      expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>', allowedOrigins)).toBe(false);
    });

    it('should handle malformed URLs', () => {
      expect(isValidRedirectUrl('not-a-url', allowedOrigins)).toBe(false);
      expect(isValidRedirectUrl('://malformed', allowedOrigins)).toBe(false);
    });
  });
});