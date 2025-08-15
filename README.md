# BoilerAI - Privacy-First AI Assistant

A Next.js application providing AI assistance for Purdue University students with privacy-by-design architecture. Features client-side encryption, differential privacy, and zero-knowledge server architecture.

## 🔒 Privacy Principles

- **Private by Default**: No server-side storage of chats, transcripts, grades, or AI logs
- **Client-Side Encryption**: User API keys and settings encrypted before leaving device
- **Differential Privacy**: Anonymous metrics protected with mathematical noise
- **Purdue-Only Access**: Microsoft Entra ID SSO with tenant validation
- **Transparent Redaction**: User-reviewed PII removal for optional examples

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Browser (Trusted Boundary)                              │
├─────────────────────────────────────────────────────────────────┤
│ • IndexedDB: Chat history (local-only)                         │
│ • WebCrypto: AES-GCM encryption with device-bound DEKs         │
│ • DP Client: Randomized response with ε-configurable noise     │
│ • PII Redaction: Client-side regex + NER patterns              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Next.js Edge/API (Semi-Trusted)                                │
├─────────────────────────────────────────────────────────────────┤
│ • NextAuth: Microsoft Entra ID + Purdue tenant validation      │
│ • Vault API: Stores only encrypted blobs (ciphertext + nonce)  │
│ • Signals API: Accepts only DP-noised aggregates               │
│ • Rate Limiting: Redis sliding window + token bucket           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ Data Layer (Untrusted for Privacy)                             │
├─────────────────────────────────────────────────────────────────┤
│ • Postgres: User profiles + encrypted vault items              │
│ • Redis: Rate limiting counters + session management           │
│ • Row-Level Security: User isolation via RLS policies          │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Postgres database (local or cloud)
- Redis instance (Upstash recommended)
- Azure AD app registration with Purdue tenant

### Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd boilerai
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

   Configure the following in `.env.local`:

   ```env
   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here

   # Microsoft Entra ID (Azure AD)
   AZURE_CLIENT_ID=your-azure-app-client-id
   AZURE_CLIENT_SECRET=your-azure-app-client-secret
   AZURE_TENANT_ID=your-azure-tenant-id

   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/boilerai

   # Redis (Upstash)
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   ```

3. **Database Setup**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

### Azure AD Configuration

1. **App Registration**
   - Navigate to Azure Portal → App Registrations
   - Create new registration for "BoilerAI"
   - Set redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`

2. **API Permissions**
   - Add Microsoft Graph permissions:
     - `openid`
     - `email`
     - `profile`
   - Grant admin consent for Purdue tenant

3. **Authentication**
   - Enable ID tokens
   - Configure tenant restrictions to Purdue domain

## 🛠️ Development

### Project Structure

```
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── vault/         # Encrypted storage API
│   │   ├── signals/       # DP metrics ingestion
│   │   └── share-example/ # Redacted example sharing
│   ├── app/               # Authenticated app pages
│   │   ├── settings/      # Privacy settings
│   │   └── share-example/ # Example sharing workflow
│   └── signin/            # Sign-in page
├── lib/                   # Core libraries
│   ├── vault/             # Client-side encryption
│   ├── dp/                # Differential privacy
│   ├── redact/            # PII redaction
│   └── auth/              # NextAuth configuration
├── prisma/                # Database schema & migrations
├── tests/                 # Test suites
│   ├── unit/              # Unit tests
│   ├── integration/       # API integration tests
│   └── e2e/               # Playwright end-to-end tests
└── docs/                  # Architecture documentation
```

### Key Libraries

- **Encryption**: WebCrypto API with AES-GCM, device-bound DEKs
- **Differential Privacy**: Randomized response with configurable ε
- **Authentication**: NextAuth.js with Microsoft provider
- **Database**: Prisma ORM with Postgres and RLS policies
- **Rate Limiting**: Redis with sliding window and token bucket
- **Testing**: Jest (unit/integration) + Playwright (e2e)

### Testing

```bash
# Unit and integration tests
npm test

# End-to-end tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Privacy Features Implementation

#### 1. Client-Side Encryption
```typescript
// Generate device-bound encryption key
const dek = await VaultCrypto.generateDEK()

// Encrypt sensitive data before sending to server
const encrypted = await VaultCrypto.encrypt(apiKey, dek)
// Result: { ciphertext, nonce, aad } - no plaintext sent
```

#### 2. Differential Privacy
```typescript
// Add mathematical noise to protect individual actions
const dpClient = new DifferentialPrivacyClient({ epsilon: 0.5 })
dpClient.recordEvent('thumbs_down')

// Send only noisy aggregates, never raw events
const batch = dpClient.generateBatch() // { noisyCount: 3, epsilon: 0.5 }
```

#### 3. PII Redaction
```typescript
// Automatic + manual redaction pipeline
const redacted = await PIIRedactor.redact(originalText)
// Detects emails, SSNs, phone numbers, etc.
// User reviews and approves before sharing
```

## 🔐 Security Hardening

### Content Security Policy
- Strict CSP with nonce-based script execution
- No inline scripts or styles allowed
- External resources from approved domains only

### Headers Configuration
```typescript
// Security headers applied to all responses
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

### Rate Limiting
- API endpoints protected with Redis-based rate limiting
- Sliding window + token bucket algorithms
- Per-user and global rate limits

## 📊 Monitoring & Observability

### Differential Privacy Metrics
Only mathematically-protected aggregates are collected:

- **Thumbs Down**: User dissatisfaction with AI responses
- **No Answer**: AI inability to provide helpful responses
- **Error Rate**: Technical failures in AI processing

All metrics include ε (epsilon) values for privacy accountability.

### Error Tracking
- Client-side encryption failures
- DP batch validation errors
- Rate limiting violations
- Authentication/authorization failures

No personal information is logged in error reports.

## 🚀 Deployment

### Production Environment Variables

```env
# Production URLs
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=production-secret-256-bit

# Azure AD Production App
AZURE_CLIENT_ID=prod-client-id
AZURE_CLIENT_SECRET=prod-client-secret
AZURE_TENANT_ID=purdue-tenant-id

# Production Database
DATABASE_URL=postgresql://user:pass@prod-db:5432/boilerai

# Production Redis
UPSTASH_REDIS_REST_URL=https://prod-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=prod-redis-token

# Security
NODE_ENV=production
```

### Deployment Checklist

- [ ] Environment variables configured securely
- [ ] Database migrations applied
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error monitoring configured
- [ ] Azure AD production app configured
- [ ] Purdue tenant restrictions applied

### Vercel Deployment (Recommended)

1. **Connect Repository**
   - Import project to Vercel
   - Configure build settings: `npm run build`

2. **Environment Variables**
   - Add all production environment variables
   - Enable "sensitive" flag for secrets

3. **Domain Configuration**
   - Add custom domain
   - Update NEXTAUTH_URL and Azure redirect URIs

## 🔧 Operations

### Incident Response

#### Authentication Issues
1. Check Azure AD app status and permissions
2. Verify tenant restrictions for Purdue domain
3. Validate redirect URIs match deployment URL
4. Review NextAuth session configuration

#### Encryption Failures
1. Verify WebCrypto API availability in browser
2. Check for HTTPS requirement in production
3. Validate DEK generation and storage
4. Review vault API error logs

#### Privacy Violations
1. Immediately investigate data exposure
2. Check for plaintext in database or logs
3. Verify DP noise parameters (ε values)
4. Audit redaction pipeline effectiveness

#### Performance Issues
1. Monitor rate limiting effectiveness
2. Check Redis connection and memory usage
3. Review database query performance
4. Analyze client-side encryption overhead

### Maintenance

#### Security Updates
- Regularly update dependencies for security patches
- Monitor CVE databases for relevant vulnerabilities
- Conduct periodic security audits
- Review and update CSP policies

#### Privacy Audits
- Validate no PII in server-side logs
- Verify encryption key rotation procedures
- Test DP noise generation effectiveness
- Review redaction pattern accuracy

#### Performance Monitoring
- Track client-side encryption performance
- Monitor DP batch processing times
- Review rate limiting effectiveness
- Analyze user authentication flows

## 📚 Additional Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed system architecture
- [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md) - Flow diagrams for key operations
- [Privacy Policy](./PRIVACY_POLICY.md) - User-facing privacy documentation
- [API Documentation](./API_DOCS.md) - API endpoint specifications

## 🤝 Contributing

### Development Guidelines

1. **Privacy First**: Every feature must maintain privacy-by-design principles
2. **Client-Side Encryption**: Sensitive data never sent unencrypted
3. **Testing Required**: All privacy features must have comprehensive tests
4. **Documentation**: Update architecture docs for system changes

### Pull Request Process

1. Run full test suite (unit + integration + e2e)
2. Verify privacy principles maintained
3. Update documentation for architecture changes
4. Security review for sensitive modifications

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Security Issues**: Report privately to security team
- **Privacy Questions**: Refer to privacy policy and architecture docs
- **Technical Issues**: Use GitHub issues with privacy-safe information only

---

**Privacy Notice**: This application is designed with privacy-by-design principles. Chats are stored locally on your device, API keys are encrypted before transmission, and any optional data sharing uses mathematical privacy protection.
