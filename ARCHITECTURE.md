# BoilerAI Privacy-First Architecture

## System Overview with Trust Boundaries

```ascii
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT BROWSER (Trust Boundary A)                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐ │
│  │   WebCrypto     │    │   IndexedDB      │    │     Redaction Engine   │ │
│  │   Vault         │    │   Chat Store     │    │     (Client-side PII)  │ │
│  │                 │    │                  │    │                         │ │
│  │ • AES-GCM       │    │ • Local chat     │    │ • Regex patterns        │ │
│  │ • DEK generate  │    │   history        │    │ • Lightweight NER       │ │
│  │ • Non-extractabl│    │ • Private by     │    │ • Preview before send   │ │
│  └─────────────────┘    │   default        │    └─────────────────────────┘ │
│                         └──────────────────┘                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                Differential Privacy Client                              │ │
│  │  • ε-configurable randomized response                                  │ │
│  │  • Local event batching (hourly)                                       │ │
│  │  • Only sends DP-noised aggregates                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                  HTTPS/TLS
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS EDGE/API (Trust Boundary B)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────────┐ │
│  │  Rate Limiting  │    │   Auth.js        │    │   Vault API             │ │
│  │  (Redis)        │    │   Middleware     │    │   (/api/vault/*)        │ │
│  │                 │    │                  │    │                         │ │
│  │ • Sliding window│    │ • Azure AD SSO   │    │ • Ciphertext ONLY       │ │
│  │ • Token bucket  │    │ • Purdue tenant  │    │ • No plaintext storage  │ │
│  │ • Per-user/IP   │    │ • PKCE + state   │    │ • AES-GCM encrypted     │ │
│  └─────────────────┘    └──────────────────┘    └─────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Privacy-First Endpoints                              │ │
│  │                                                                         │ │
│  │  /api/signals/ingest     /api/share-example      Security Headers       │ │
│  │  • Only DP aggregates    • 30-day TTL            • Strict CSP           │ │
│  │  • Rejects raw events    • No user IDs           • HSTS                 │ │
│  │  • K-anonymity checks    • Redacted text only    • X-Frame-Options      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                   Auth/Data
                                       │
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA LAYER (Trust Boundary C)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                       Postgres Database                                 │ │
│  │                                                                         │ │
│  │  Auth Tables (Auth.js)     VaultItem Table      SignalMetric Table      │ │
│  │  • User, Account, Session  • ciphertext bytea   • Aggregated counts     │ │
│  │  • Profile (minimal data)  • nonce bytea        • DP-noised only        │ │
│  │                            • No plaintext cols  • K-anonymity enforced  │ │
│  │                                                                         │ │
│  │  RedactedExample (Optional)                                             │ │
│  │  • text_redacted text                                                   │ │
│  │  • 30-day TTL via cron                                                  │ │
│  │  • No user IDs stored                                                   │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        Upstash Redis Cache                              │ │
│  │  • Rate limit counters                                                  │ │
│  │  • Session data (encrypted)                                             │ │
│  │  • No chat content or transcripts                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Privacy Guarantees

### 1. Chat Content (Private by Default)
```ascii
Chat Input → IndexedDB (local) → ❌ NEVER to server (default)
                              → ✅ Optional E2EE sync (user enables)
```

### 2. Vault Operations (Client-Side Encryption)
```ascii
API Key → WebCrypto AES-GCM → Ciphertext → Server Storage
                           ↓
                    DEK (device-bound) → Never leaves browser
```

### 3. Anonymous Metrics (Differential Privacy)
```ascii
UI Events → DP Randomized Response (ε=0.5) → Hourly Batch → Aggregates Only
                                                        ↓
                                              Server: NO raw events accepted
```

### 4. Redacted Examples (Manual Review Required)
```ascii
Chat → Local Redaction → User Preview → Manual Approval → Server (30d TTL)
    ↓                                                   ↓
PII Removed                                     No User ID stored
```

## Security Controls by Trust Boundary

### Trust Boundary A (Client Browser)
- **Encryption**: WebCrypto AES-GCM with device-bound DEK
- **Privacy**: IndexedDB for local-only chat storage
- **DP Protection**: Randomized response with configurable ε
- **PII Redaction**: Client-side patterns + NER before any transmission

### Trust Boundary B (Next.js Edge/API)
- **Authentication**: Microsoft Entra ID (Purdue tenant only)
- **Rate Limiting**: Redis sliding window + token bucket
- **Security Headers**: Strict CSP, HSTS, X-Frame-Options
- **Data Validation**: Rejects raw events, only accepts DP aggregates

### Trust Boundary C (Data Layer)
- **Encryption at Rest**: Ciphertext-only storage in VaultItem
- **Access Control**: Supabase RLS (users see only their data)
- **Retention**: 30-day TTL for redacted examples
- **Aggregation**: Only DP-noised, k-anonymous metrics stored