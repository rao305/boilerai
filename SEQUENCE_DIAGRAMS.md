# BoilerAI Privacy-First Sequence Diagrams

## 1. Microsoft Entra ID SSO Login Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Browser as Browser
    participant NextJS as Next.js App
    participant AuthJS as Auth.js
    participant Entra as Microsoft Entra ID
    participant DB as Postgres

    User->>Browser: Click "Sign in with Microsoft"
    Browser->>NextJS: GET /api/auth/signin/azure-ad
    NextJS->>AuthJS: Initialize OAuth flow
    AuthJS->>AuthJS: Generate state, nonce, PKCE challenge
    AuthJS->>Browser: Redirect to Entra ID
    Browser->>Entra: Authorization request + PKCE challenge
    
    Note over Entra: User authenticates with Purdue credentials
    
    Entra->>Browser: Redirect with auth code + state
    Browser->>NextJS: GET /api/auth/callback/azure-ad?code=...&state=...
    NextJS->>AuthJS: Handle callback
    AuthJS->>AuthJS: Verify state, nonce
    AuthJS->>Entra: POST /token (code + PKCE verifier)
    Entra->>AuthJS: Access token + ID token
    AuthJS->>AuthJS: Validate JWT (iss=Microsoft, tid=Purdue, upn ends with @purdue.edu)
    
    alt Valid Purdue user
        AuthJS->>DB: Create/update User, Account, Session
        AuthJS->>Browser: Set secure session cookie
        Browser->>NextJS: Redirect to /app
        NextJS->>Browser: Show privacy intro modal
    else Invalid tenant or email
        AuthJS->>Browser: Redirect to /signin?error=AccessDenied
    end
```

## 2. First-Device Bootstrap (DEK Generation & Wrapping)

```mermaid
sequenceDiagram
    participant User as User
    participant Browser as Browser
    participant WebCrypto as WebCrypto API
    participant IndexedDB as IndexedDB
    participant VaultAPI as Vault API
    participant DB as Postgres

    User->>Browser: First login on new device
    Browser->>Browser: Check IndexedDB for existing DEK
    
    alt No existing DEK
        Browser->>WebCrypto: Generate AES-GCM key (256-bit)
        WebCrypto->>Browser: DEK (non-extractable CryptoKey)
        Browser->>IndexedDB: Store DEK reference locally
        
        Note over Browser: Optionally sync DEK (wrapped)
        Browser->>WebCrypto: Generate random wrapping key
        Browser->>WebCrypto: Wrap DEK with wrapping key
        WebCrypto->>Browser: Wrapped DEK blob
        Browser->>VaultAPI: POST /api/vault/DEK_WRAPPED
        VaultAPI->>DB: Store ciphertext (wrapped DEK)
        
        Browser->>User: "Keys saved locally. Enable sync for other devices?"
    else DEK exists
        Browser->>IndexedDB: Load existing DEK
        Browser->>User: "Welcome back! Your keys are ready."
    end
```

## 3. API Key Storage (Client-Side Encryption)

```mermaid
sequenceDiagram
    participant User as User
    participant Browser as Browser
    participant WebCrypto as WebCrypto API
    participant IndexedDB as IndexedDB
    participant VaultAPI as Vault API
    participant DB as Postgres

    User->>Browser: Enter OpenAI API key in settings
    Browser->>IndexedDB: Retrieve DEK
    Browser->>WebCrypto: Generate random nonce (96-bit)
    Browser->>WebCrypto: AES-GCM encrypt(API_KEY, DEK, nonce)
    WebCrypto->>Browser: Ciphertext
    
    Browser->>VaultAPI: POST /api/vault/API_KEY
    Note over VaultAPI: Request body: { ciphertext: ArrayBuffer, nonce: ArrayBuffer }
    
    VaultAPI->>VaultAPI: Validate session, rate limit
    VaultAPI->>DB: INSERT VaultItem (userId, 'API_KEY', ciphertext, nonce)
    DB->>VaultAPI: Success
    VaultAPI->>Browser: 201 Created
    
    Browser->>User: "API key saved securely"
    
    Note over Browser, DB: Server NEVER sees plaintext API key
```

## 4. Anonymous Metrics Flow (Differential Privacy)

```mermaid
sequenceDiagram
    participant User as User
    participant Browser as Browser
    participant DPClient as DP Client
    participant SignalsAPI as Signals API
    participant DB as Postgres
    participant CronJob as Cron Job

    User->>Browser: Thumbs down on AI response
    Browser->>DPClient: Record event ('thumbs_down')
    
    loop Every UI interaction
        Browser->>DPClient: Record events locally
        DPClient->>DPClient: Buffer events in memory
    end
    
    Note over DPClient: Hourly batch processing
    DPClient->>DPClient: Apply randomized response (ε=0.5)
    DPClient->>DPClient: Aggregate to counts: {thumbs_down: 3, no_answer: 1}
    DPClient->>DPClient: Add DP noise to each count
    
    DPClient->>SignalsAPI: POST /api/signals/ingest
    Note over SignalsAPI: Body: { metrics: { thumbs_down: { noisy_count: 3, epsilon: 0.5 } } }
    
    SignalsAPI->>SignalsAPI: Validate: requires noisy_count + epsilon
    SignalsAPI->>SignalsAPI: Reject if raw events detected
    SignalsAPI->>DB: INSERT SignalMetric (day, name, noisy_count, epsilon)
    
    Note over CronJob: Daily aggregation
    CronJob->>DB: Aggregate metrics across users
    CronJob->>DB: Apply k-anonymity (suppress < 20 contributors)
    
    Note over User, DB: No user IDs, no IP logging, no raw events
```

## 5. Redacted Example Sharing Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Browser as Browser
    participant Redactor as Redaction Engine
    participant ShareAPI as Share Example API
    participant DB as Postgres
    participant CronJob as Cron Job

    User->>Browser: Navigate to /app/share-example
    User->>Browser: Paste chat snippet
    
    Browser->>Redactor: Apply PII redaction pipeline
    Redactor->>Redactor: Regex patterns (emails, phones, student IDs)
    Redactor->>Redactor: NER (names, locations, organizations)
    Redactor->>Redactor: Course code patterns (CS 180, MATH 261)
    Redactor->>Browser: Redacted text + confidence scores
    
    Browser->>User: Show preview with [REDACTED] placeholders
    Browser->>User: "Remove more" chips for manual editing
    
    alt User approves
        User->>Browser: Click "Send to improve AI"
        Browser->>ShareAPI: POST /api/share-example
        Note over ShareAPI: Body: { text_redacted: "...", category: "math_help", tag: "no_answer" }
        
        ShareAPI->>ShareAPI: Validate no PII in redacted text
        ShareAPI->>DB: INSERT RedactedExample (text_redacted, tag, expiresAt)
        Note over DB: No user ID stored, 30-day TTL
        
        ShareAPI->>Browser: 201 Created
        Browser->>User: "Thank you! Your example will help improve answers."
    else User cancels
        User->>Browser: Click "Cancel"
        Browser->>Browser: Clear form, no data sent
    end
    
    Note over CronJob: Daily cleanup
    CronJob->>DB: DELETE RedactedExample WHERE expiresAt < NOW()
```

## 6. E2EE Chat History Sync (Optional Feature)

```mermaid
sequenceDiagram
    participant User as User
    participant Device1 as Device 1
    participant Device2 as Device 2
    participant VaultAPI as Vault API
    participant DB as Postgres

    Note over User: User enables "Sync encrypted chat history"
    
    User->>Device1: Creates new chat
    Device1->>Device1: Store in IndexedDB locally
    Device1->>Device1: Encrypt chat with DEK
    Device1->>VaultAPI: POST /api/vault/CHAT_HISTORY
    VaultAPI->>DB: Store encrypted blob
    
    User->>Device2: Login on second device
    Device2->>Device2: Bootstrap DEK (wrapped key sync)
    Device2->>VaultAPI: GET /api/vault/CHAT_HISTORY
    VaultAPI->>DB: Retrieve encrypted blobs for user
    DB->>VaultAPI: Ciphertext + nonce
    VaultAPI->>Device2: Encrypted chat data
    
    Device2->>Device2: Decrypt with local DEK
    Device2->>Device2: Merge with IndexedDB
    Device2->>User: Chat history available
    
    Note over Device1, DB: Server never sees plaintext chat content
```

## Security & Privacy Invariants

### Authentication Security
- State and nonce validation prevents CSRF and replay attacks
- PKCE prevents authorization code interception
- Tenant ID validation ensures Purdue-only access
- JWT signature validation against Microsoft's keys

### Client-Side Encryption Guarantees
- DEK never leaves browser in plaintext form
- All vault operations use authenticated encryption (AES-GCM)
- Server stores only ciphertext + nonce, never plaintext
- Non-extractable CryptoKey prevents key export

### Differential Privacy Guarantees  
- Randomized response with calibrated noise (ε=0.5 default)
- No raw events accepted by server
- K-anonymity enforcement (≥20 contributors)
- IP addresses dropped at edge, no user tracking

### Data Retention & Deletion
- Chat history: local-only by default, optional E2EE sync
- Redacted examples: 30-day automatic purge
- Metrics: aggregated only, no per-user data
- Vault items: user-controlled via settings UI