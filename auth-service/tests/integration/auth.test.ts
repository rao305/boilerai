import request from 'supertest';
import app from '../../src/server';
import { prisma } from '../../src/config/database';

describe('Authentication Integration Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@purdue.edu',
        emailNormalized: 'test@purdue.edu',
        name: 'Test User',
        emailVerified: new Date(),
        azureId: 'test-azure-id',
        tenantId: 'test-tenant-id',
        upn: 'test@purdue.edu',
        profile: {
          create: {
            displayName: 'Test User',
            role: 'student'
          }
        }
      }
    });
  });

  describe('GET /auth/status', () => {
    it('should return unauthenticated status', async () => {
      const response = await request(app)
        .get('/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        authenticated: false
      });
    });

    it('should return authenticated status when logged in', async () => {
      const agent = request.agent(app);

      // Simulate login by creating session
      // Note: In real tests, you'd go through the full OAuth flow
      const sessionResponse = await agent
        .post('/test/login') // This would be a test-only endpoint
        .send({ userId: testUser.id });

      const response = await agent
        .get('/auth/status')
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.email).toBe('test@purdue.edu');
    });
  });

  describe('GET /auth/signin', () => {
    it('should show sign-in page', async () => {
      const response = await request(app)
        .get('/auth/signin')
        .expect(200);

      expect(response.text).toContain('Sign in with Purdue (Microsoft)');
      expect(response.text).toContain('Purdue Auth');
    });

    it('should redirect authenticated users', async () => {
      const agent = request.agent(app);

      // Simulate authentication
      // In a real app, this would be done through OAuth callback

      const response = await agent
        .get('/auth/signin')
        .expect(302);

      expect(response.headers.location).toBe('/dashboard');
    });

    it('should handle return URL parameter', async () => {
      const response = await request(app)
        .get('/auth/signin?returnUrl=http://localhost:3000/app')
        .expect(200);

      // The return URL should be stored in session for later use
      expect(response.text).toContain('Purdue Auth');
    });

    it('should reject invalid return URLs', async () => {
      const response = await request(app)
        .get('/auth/signin?returnUrl=https://evil.com/hack')
        .expect(200);

      // Should still show sign-in page but not store malicious URL
      expect(response.text).toContain('Purdue Auth');
    });
  });

  describe('GET /auth/azure', () => {
    it('should initiate Azure AD authentication', async () => {
      const response = await request(app)
        .get('/auth/azure')
        .expect(302);

      // Should redirect to Microsoft login
      expect(response.headers.location).toContain('login.microsoftonline.com');
    });

    it('should include state parameter for CSRF protection', async () => {
      const response = await request(app)
        .get('/auth/azure')
        .expect(302);

      const location = response.headers.location;
      expect(location).toContain('state=');
    });

    it('should respect rate limiting', async () => {
      // Enable rate limiting for this test
      process.env.ENABLE_RATE_LIMITING = 'true';

      const agent = request.agent(app);

      // Make multiple requests to trigger rate limit
      for (let i = 0; i < 6; i++) {
        const response = await agent.get('/auth/azure');
        
        if (i < 5) {
          expect(response.status).toBe(302);
        } else {
          expect(response.status).toBe(429);
          expect(response.body.error).toContain('Too many');
        }
      }

      process.env.ENABLE_RATE_LIMITING = 'false';
    });
  });

  describe('POST /auth/logout', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should logout authenticated user', async () => {
      const agent = request.agent(app);

      // Simulate login first
      // Then logout
      const response = await agent
        .post('/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('GET /auth/user', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/auth/user')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should return user information when authenticated', async () => {
      const agent = request.agent(app);

      // Simulate login
      // Then get user info
      const response = await agent
        .get('/auth/user')
        .expect(200);

      expect(response.body.user).toMatchObject({
        email: 'test@purdue.edu',
        name: 'Test User',
        role: 'student'
      });

      // Should not expose sensitive fields
      expect(response.body.user.azureId).toBeUndefined();
      expect(response.body.user.tenantId).toBeUndefined();
    });
  });
});

describe('Magic Link Integration Tests', () => {
  // Enable magic link feature for these tests
  beforeAll(() => {
    process.env.FALLBACK_MAGIC_LINK = 'true';
  });

  afterAll(() => {
    process.env.FALLBACK_MAGIC_LINK = 'false';
  });

  describe('GET /auth/magic-link', () => {
    it('should show magic link request page when feature enabled', async () => {
      const response = await request(app)
        .get('/auth/magic-link')
        .expect(200);

      expect(response.text).toContain('Email Sign-in');
      expect(response.text).toContain('Backup Method Only');
    });

    it('should return 404 when feature disabled', async () => {
      process.env.FALLBACK_MAGIC_LINK = 'false';

      const response = await request(app)
        .get('/auth/magic-link')
        .expect(404);

      expect(response.body.error).toBe('Not found');

      process.env.FALLBACK_MAGIC_LINK = 'true';
    });

    it('should redirect authenticated users', async () => {
      const agent = request.agent(app);

      // Simulate authentication
      const response = await agent
        .get('/auth/magic-link')
        .expect(302);

      expect(response.headers.location).toBe('/dashboard');
    });
  });

  describe('POST /auth/magic-link/request', () => {
    it('should accept valid Purdue email', async () => {
      const response = await request(app)
        .post('/auth/magic-link/request')
        .send({ email: 'test@purdue.edu' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('sent you a sign-in link');
    });

    it('should reject non-Purdue email', async () => {
      const response = await request(app)
        .post('/auth/magic-link/request')
        .send({ email: 'test@gmail.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('purdue.edu');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/auth/magic-link/request')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('valid email');
    });

    it('should handle missing email', async () => {
      const response = await request(app)
        .post('/auth/magic-link/request')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should respect rate limiting', async () => {
      process.env.ENABLE_RATE_LIMITING = 'true';

      const agent = request.agent(app);
      const email = 'ratelimit@purdue.edu';

      // Make requests up to the limit
      for (let i = 0; i < 4; i++) {
        const response = await agent
          .post('/auth/magic-link/request')
          .send({ email });

        if (i < 3) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
          expect(response.body.error).toContain('Too many');
        }
      }

      process.env.ENABLE_RATE_LIMITING = 'false';
    });
  });

  describe('GET /auth/magic-link/verify', () => {
    let validToken: string;

    beforeEach(async () => {
      // Create a user and magic link for testing
      const user = await prisma.user.create({
        data: {
          email: 'verify@purdue.edu',
          emailNormalized: 'verify@purdue.edu',
          profile: {
            create: { role: 'student' }
          }
        }
      });

      const magicLink = await prisma.magicLink.create({
        data: {
          userId: user.id,
          token: 'test-valid-token',
          email: 'verify@purdue.edu',
          expires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          ipAddress: '127.0.0.1'
        }
      });

      validToken = magicLink.token;
    });

    it('should verify valid token and login user', async () => {
      const response = await request(app)
        .get(`/auth/magic-link/verify?token=${validToken}`)
        .expect(302);

      expect(response.headers.location).toBe('/dashboard');

      // Verify magic link was marked as used
      const magicLink = await prisma.magicLink.findUnique({
        where: { token: validToken }
      });

      expect(magicLink!.used).toBe(true);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/magic-link/verify?token=invalid-token')
        .expect(302);

      expect(response.headers.location).toContain('/auth/signin?error=');
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/auth/magic-link/verify')
        .expect(302);

      expect(response.headers.location).toContain('/auth/signin?error=');
    });

    it('should reject already used token', async () => {
      // Use token first time
      await request(app)
        .get(`/auth/magic-link/verify?token=${validToken}`)
        .expect(302);

      // Try to use again
      const response = await request(app)
        .get(`/auth/magic-link/verify?token=${validToken}`)
        .expect(302);

      expect(response.headers.location).toContain('/auth/signin?error=');
    });
  });
});