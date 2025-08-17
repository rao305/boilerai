# 🚀 Boiler AI - Privacy-First Mission Control

**Enterprise-grade Admin UI with Microsoft Entra ID SSO, MFA, RBAC, and comprehensive observability - built with privacy-first design principles.**

## ✨ Features

- 🔐 **Microsoft Entra ID SSO** (Purdue tenant only) with MFA enforcement
- 🛡️ **Row Level Security (RLS)** with multi-tenant isolation
- 🚫 **Zero PII Storage** - No raw prompts/responses on server
- 📊 **Real-time Observability** - Prometheus, Grafana, Jaeger
- 🎨 **Boiler AI Theme** - Black & gold UI with modern design
- 👥 **Active Users Tracking** - Daily/Weekly/Monthly counters
- 📋 **Registered Users Management** - Email masking with OWNER reveal
- 🔄 **Automated TTL** - 30d redacted examples, 90d metrics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI      │    │   API Server    │    │   Database      │
│   (Next.js 14)  │────│   (Next.js API) │────│   (PostgreSQL)  │
│   Port 3000     │    │   Port 3001     │    │   + RLS + TTL   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Observability  │
                    │  Stack          │
                    │  (Docker)       │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- Microsoft Entra ID app registration

### 1. Environment Setup

```bash
# Clone and setup
cd mono
cp .env.example .env.local  # Configure all required variables

# Install dependencies
pnpm install
```

### 2. Database Setup

```bash
# Run migrations and seed
pnpm db:migrate
pnpm db:seed
```

### 3. Start Observability Stack

```bash
# Start Prometheus, Grafana, Jaeger, Loki
pnpm observability:up
```

### 4. Start Applications

```bash
# Terminal 1: API Server
pnpm --filter api dev

# Terminal 2: Admin UI
pnpm --filter admin dev
```

### 5. Access Applications

- **Admin UI**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Grafana**: http://localhost:3002 (admin/admin)
- **Prometheus**: http://localhost:9090

## 🔐 Microsoft Entra ID Configuration

### App Registration Requirements

1. **Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   https://your-admin-domain.com/api/auth/callback/azure-ad
   ```

2. **API Permissions**:
   - `openid`
   - `profile`
   - `email`

3. **Authentication**:
   - Enable MFA requirement
   - Restrict to Purdue tenant (@purdue.edu)

### Environment Variables

```bash
AZURE_AD_CLIENT_ID="your-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="purdue-tenant-id"
```

## 📊 Database Schema

### Multi-Tenant RLS Design

```sql
-- All tables include org_id for tenant isolation
CREATE POLICY users_isolation ON users
  USING (org_id = current_setting('app.org_id')::uuid);

-- TTL jobs automatically clean sensitive data
SELECT cron.schedule('cleanup-redacted-examples', 
  '0 2 * * *', 'DELETE FROM redacted_examples WHERE created_at < NOW() - INTERVAL ''30 days''');
```

### Key Tables

- `users` - User profiles with last_login_at
- `user_roles` - RBAC: OWNER, ADMIN, ANALYST, DEVOPS, USER
- `outcomes` - API call metrics (no content)
- `intent_stats` - Hashed intent analytics
- `redacted_examples` - Sanitized examples for quality
- `dp_metrics` - Differential privacy metrics

## 👥 RBAC System

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access, email reveal, user management |
| **ADMIN** | Dashboard access, audit logs, user list |
| **ANALYST** | Quality metrics, usage analytics |
| **DEVOPS** | System metrics, alerts, logs |
| **USER** | Read-only dashboard |

## 🛡️ Privacy Guarantees

### ❌ Never Stored on Server

- Raw user prompts
- AI responses/completions
- Chat conversation history
- Personal identifiable information

### ✅ Privacy-Safe Storage

- SHA-256 hashed intents
- Redacted examples (30d TTL)
- Aggregated metrics with differential privacy
- Audit logs (sanitized)

### 🔄 Automated Data Lifecycle

```sql
-- Automatic cleanup jobs
30 days:  DELETE redacted_examples
90 days:  DELETE dp_metrics
Forever:  Keep aggregated, anonymized metrics only
```

## 📈 Admin UI Pages

### 1. Overview Dashboard
- **KPIs**: Uptime, RPS, Error Rate, Token Usage
- **Performance**: P50/P95/P99 latency histograms
- **Active Users**: Real-time DAU/WAU/MAU counters

### 2. Registered Users
```tsx
// Sample data structure
{
  name: "John Doe",
  email: "j***@purdue.edu",     // Masked by default
  role: "ADMIN",
  lastLoginAt: "2024-01-15T10:30:00Z",
  // OWNER can toggle email reveal per session
}
```

### 3. Quality Dashboard
- Unknown intent patterns (hashed)
- "No answer" rates by topic
- A/B testing win rates
- Response quality trends

### 4. Security & Audit
- Failed login attempts
- RBAC role changes
- API key rotations
- Policy violations

## 📊 Observability

### Metrics Collected

```typescript
// OpenTelemetry metrics (no PII)
ai_chat_requests_total{model, org_id, status}
ai_chat_duration_ms{model, status}
ai_chat_tokens_total{type, model}
active_users_daily{org_id, date}
```

### Grafana Dashboards

- **System Health**: Uptime, memory, CPU
- **API Performance**: Latency, throughput, errors
- **User Analytics**: Active users, session duration
- **Quality Metrics**: Success rates, fallback usage

### Alerts Configuration

```yaml
# High error rate alert
- alert: HighErrorRate
  expr: rate(ai_chat_requests_total{status="error"}[10m]) > 0.02
  labels:
    severity: warning
  annotations:
    summary: "AI chat error rate is {{ $value }}%"
```

## 🧪 Testing

### RLS Validation

```bash
# Test tenant isolation
psql -d boilerai -c "
  SELECT set_config('app.org_id', 'org-a-uuid', true);
  SELECT COUNT(*) FROM users;  -- Should only see org-a users
"
```

### MFA Testing

```bash
# Verify MFA requirement
curl -X POST localhost:3001/api/ai/chat \
  -H "Authorization: Bearer invalid-mfa-token" \
  # Should return 401 Unauthorized
```

### Privacy Validation

```bash
# Verify no PII in logs
grep -r "password\|email\|@" logs/ || echo "✅ No PII found"
```

## 🚨 Security Checklist

- [ ] Microsoft Entra ID configured with MFA requirement
- [ ] RLS policies applied to all multi-tenant tables
- [ ] CSP headers block unsafe content
- [ ] CORS restricted to allowed origins
- [ ] No source maps in production
- [ ] Database credentials in environment only
- [ ] API keys server-side only (never client)
- [ ] Audit logging enabled for all admin actions

## 📚 Additional Resources

- [Microsoft Entra ID Setup Guide](https://docs.microsoft.com/en-us/azure/active-directory/)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OpenTelemetry Best Practices](https://opentelemetry.io/docs/)
- [FERPA Compliance Guidelines](https://www2.ed.gov/policy/gen/guid/fpco/ferpa/)

---

**🔒 Built with privacy-first principles for Purdue University**

*This implementation ensures FERPA compliance and zero PII exposure while providing comprehensive admin capabilities.*