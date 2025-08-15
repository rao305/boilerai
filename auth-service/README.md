# Purdue Authentication Service

A production-grade, high-scale authentication service for Purdue University that exclusively admits users from the `purdue.edu` domain. Built with Express.js, TypeScript, and Microsoft Entra ID SSO via OAuth 2.0 Authorization Code + PKCE flow.

## Features

🔒 **Purdue-Only Access**
- Strict tenant validation via Azure AD
- Email domain verification (`@purdue.edu`)
- Generic error messages (no account enumeration)

⚡ **High-Scale Architecture**
- Horizontal scaling support
- Redis-based rate limiting and session storage
- Connection pooling and caching
- Edge-ready authentication checks

🛡️ **Security First**
- OAuth 2.0 + PKCE flow (no QR codes, no numeric codes)
- Secure session management with HTTP-only cookies
- CSRF protection and security headers
- Comprehensive audit logging

🚀 **Production Ready**
- Docker containerization
- Kubernetes manifests
- OpenTelemetry observability
- Comprehensive monitoring and alerting
- Automated testing (unit, integration, E2E)

🔄 **Fallback Support**
- Optional magic link authentication (feature-flagged)
- Graceful degradation when Microsoft is unavailable
- Circuit breaker patterns

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Azure AD application registration

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd auth-service
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up Azure AD** (see [Azure AD Setup](#azure-ad-setup))

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3000`

### Docker Quick Start

```bash
# Start all services
docker-compose up -d

# Check health
curl http://localhost:3000/health

# View logs
docker-compose logs -f auth-service
```

## Azure AD Setup

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure:
   - **Name**: `Purdue Auth Service`
   - **Supported account types**: 
     - If you have Purdue tenant ID: "Accounts in this organizational directory only"
     - Otherwise: "Accounts in any organizational directory"
   - **Redirect URI**: `https://your-domain.com/auth/callback`

### 2. Configure Authentication

1. Go to **Authentication** in your app registration
2. **Platform configurations** → Add platform → Web
3. **Redirect URIs**:
   ```
   https://your-domain.com/auth/callback
   http://localhost:3000/auth/callback  # Development only
   ```
4. **Logout URL**:
   ```
   https://your-domain.com/auth/signout
   ```
5. **Implicit grant and hybrid flows**: Uncheck all (we use Authorization Code + PKCE)
6. **Advanced settings**:
   - ✅ Allow public client flows: **Yes**
   - ✅ Enable PKCE: **Yes**

### 3. Configure API Permissions

1. Go to **API permissions**
2. Add permissions → Microsoft Graph → Delegated permissions:
   - `openid` (Sign users in)
   - `profile` (View basic profile)
   - `email` (View email address)
   - `offline_access` (Maintain access to data)
3. Click "Grant admin consent"

### 4. Configure Certificates & Secrets

1. Go to **Certificates & secrets** → Client secrets
2. Click "New client secret"
3. Description: `Auth Service Secret`
4. Expires: 90 days (recommended for production)
5. Copy the **Value** (not ID) - you won't see it again!

### 5. Get Configuration Values

From your app registration overview:
- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value (if using single-tenant)

### 6. Update Environment Variables

```bash
# Azure AD Configuration
AZURE_CLIENT_ID="your-application-client-id"
AZURE_CLIENT_SECRET="your-client-secret-value"
AZURE_TENANT_ID="your-tenant-id-or-leave-empty"

# If you don't have the Purdue tenant ID, leave AZURE_TENANT_ID empty
# The service will validate by email domain instead
```

### Tenant ID vs Email Validation

**Option 1: With Purdue Tenant ID (Preferred)**
```bash
AZURE_TENANT_ID="purdue-university-tenant-id"
```
- More secure - validates at OAuth level
- Prevents external Microsoft accounts with @purdue.edu aliases
- Requires knowing the actual Purdue tenant ID

**Option 2: Email Domain Validation (Fallback)**
```bash
AZURE_TENANT_ID=""  # Leave empty
```
- Validates email domain after authentication
- Less secure but works without tenant ID
- Still blocks non-Purdue accounts with generic error

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/purdue_auth"

# Redis
REDIS_URL="redis://localhost:6379"

# Azure AD
AZURE_CLIENT_ID="your-azure-client-id"
AZURE_CLIENT_SECRET="your-azure-client-secret"
AZURE_TENANT_ID="purdue-tenant-id-optional"

# Application
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
DOMAIN="https://your-domain.com"
PORT="3000"
NODE_ENV="production"
```

### Optional Variables

```bash
# Magic Link Fallback (OFF by default)
FALLBACK_MAGIC_LINK="false"
SMTP_HOST="smtp.office365.com"
SMTP_PORT="587"
SMTP_USER="your-email@purdue.edu"
SMTP_PASSWORD="your-app-password"
FROM_EMAIL="noreply@your-domain.com"

# Observability
JAEGER_ENDPOINT="http://jaeger:14250"
PROMETHEUS_ENABLED="true"
PROMETHEUS_PORT="9090"

# Security
SESSION_MAX_AGE="86400"  # 24 hours
RATE_LIMIT_WINDOW="900"  # 15 minutes
RATE_LIMIT_MAX="10"      # 10 attempts per window
```

## API Reference

### Authentication Endpoints

#### `GET /auth/signin`
Sign-in page with Microsoft SSO button

#### `GET /auth/azure`
Initiate Azure AD OAuth flow

#### `GET /auth/callback`
OAuth callback handler

#### `POST /auth/signout`
Sign out and clear session

#### `GET /auth/session`
Get current session (JSON)

### Magic Link Endpoints (when enabled)

#### `POST /api/auth/magic-link/request`
Request magic link via email
```json
{
  "email": "user@purdue.edu"
}
```

#### `GET /auth/magic-link/verify?token=<token>`
Verify magic link token

### API Endpoints

#### `GET /api/profile`
Get user profile (requires authentication)

#### `PUT /api/profile`
Update user profile (requires authentication)

#### `GET /health`
Health check endpoint

#### `GET /health/detailed`
Detailed health check with dependencies

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests with Playwright
npm run migrate      # Run database migrations
npm run migrate:dev  # Run migrations in development
npm run seed         # Seed database with test data
npm run db:studio    # Open Prisma Studio
```

### Database Management

```bash
# Create new migration
npx prisma migrate dev --name add_new_feature

# Reset database (development only)
npx prisma migrate reset

# View database in browser
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate
```

### Testing

#### Unit Tests
```bash
# Run all unit tests
npm run test

# Run specific test file
npm test -- validation.test.ts

# Run with coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Start test database
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Clean up
docker-compose -f docker-compose.test.yml down
```

#### E2E Tests
```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- auth.spec.ts
```

## Deployment

### Docker Deployment

1. **Build image**
   ```bash
   docker build -t purdue-auth-service .
   ```

2. **Run with docker-compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Kubernetes Deployment

1. **Create namespace**
   ```bash
   kubectl create namespace auth
   ```

2. **Create secrets**
   ```bash
   kubectl create secret generic auth-secrets \
     --from-literal=database-url="$DATABASE_URL" \
     --from-literal=redis-url="$REDIS_URL" \
     --from-literal=azure-client-secret="$AZURE_CLIENT_SECRET" \
     --from-literal=nextauth-secret="$NEXTAUTH_SECRET" \
     -n auth
   ```

3. **Deploy**
   ```bash
   kubectl apply -f k8s/ -n auth
   ```

4. **Check deployment**
   ```bash
   kubectl get pods -n auth
   kubectl logs deployment/auth-service -n auth
   ```

### Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure environment variables** in Vercel dashboard

3. **Deploy**
   ```bash
   vercel --prod
   ```

## Monitoring and Observability

### Metrics

The service exposes Prometheus metrics on `/metrics`:

```
# Authentication metrics
auth_login_attempts_total
auth_login_successes_total  
auth_login_failures_total
auth_login_duration_seconds

# System metrics
http_requests_total
http_request_duration_seconds
database_connected
redis_connected

# Security metrics
security_violations_total
auth_rate_limit_hits_total
```

### Logging

Structured JSON logs with multiple levels:
- **ERROR**: Immediate attention required
- **WARN**: Review within 24 hours  
- **INFO**: Normal operations
- **DEBUG**: Development troubleshooting

### Tracing

OpenTelemetry integration for distributed tracing:
- HTTP requests
- Database queries
- Redis operations
- Authentication flows

### Health Checks

- `GET /health` - Basic health check
- `GET /health/detailed` - Database and Redis connectivity

## Security Considerations

### Authentication Security
- OAuth 2.0 + PKCE prevents authorization code interception
- State parameter prevents CSRF on OAuth flow
- Nonce prevents token replay attacks
- Tenant validation prevents account enumeration

### Session Security  
- HTTP-only cookies prevent XSS
- Secure flag in production (HTTPS only)
- SameSite=Lax prevents CSRF
- Session rotation on privilege changes

### Rate Limiting
- 10 attempts per 15 minutes per IP for sign-in
- 5 attempts per 15 minutes per email for magic links
- Token bucket for burst protection
- Redis-based distributed rate limiting

### Input Validation
- Email format validation
- Redirect URL allowlist
- SQL injection prevention via Prisma
- XSS prevention via CSP headers

### Error Handling
- Generic error messages (no account enumeration)
- Sensitive data redaction in logs
- Stack traces only in development
- Audit logging for security events

## Troubleshooting

### Common Issues

#### "Authentication failed" errors
1. Check Azure AD configuration
2. Verify redirect URIs match exactly
3. Check system time synchronization
4. Validate client ID and secret

#### High response times  
1. Check database query performance
2. Monitor Redis latency
3. Review connection pool settings
4. Analyze OpenTelemetry traces

#### Session issues
1. Verify cookie settings
2. Check session expiration
3. Validate Redis connectivity
4. Review CSRF token handling

### Debug Mode

Enable debug logging:
```bash
DEBUG="auth:*" npm run dev
```

### Log Analysis

```bash
# Authentication failures
grep "auth_failed" logs/error.log

# Rate limiting
grep "rate_limit_exceeded" logs/access.log  

# Security violations
grep "security_violation" logs/security.log
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Follow conventional commits
- Run linting and type checking

### Code Style

- ESLint + Prettier configuration
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas
- Semicolons required

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: This README and `/docs` folder
- **Issues**: GitHub Issues for bugs and feature requests
- **Security**: Report security issues via email (not public issues)
- **Operations**: See `docs/runbooks.md` for production procedures

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│                 │    │                  │    │                 │
│   Microsoft     │◄───┤  Auth Service    │────► PostgreSQL     │
│   Entra ID      │    │  (Express.js)    │    │ (User data)     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              │
                       ┌──────▼──────┐
                       │             │
                       │   Redis     │
                       │ (Sessions)  │
                       │             │
                       └─────────────┘
```

The service acts as a secure authentication gateway, validating Purdue users via Microsoft Entra ID and managing sessions in Redis with user data stored in PostgreSQL.