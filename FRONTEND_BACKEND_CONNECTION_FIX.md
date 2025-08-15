# Frontend-Backend Connection Fix

## Issue Identified
The "Failed to fetch" error when saving OpenAI API keys occurs because:

1. **Frontend server not running** - The Settings page tries to make API calls to `/api/settings/api-key`
2. **Missing proxy connection** - Without the frontend server, there's no proxy to route API requests to the backend
3. **CORS issues** - Direct browser requests to `localhost:5001` are blocked due to CORS policy

## Root Cause Analysis

### Current Architecture
- **Frontend**: Vite dev server on port 3000 with proxy configuration
- **Backend**: Express server on port 5001
- **Proxy**: Vite routes `/api/*` requests to `http://localhost:5001`

### The Problem
When users try to save their API key:
- Settings.tsx makes a POST request to `/api/settings/api-key`
- If frontend server isn't running, this request fails with "Failed to fetch"
- The request cannot reach the backend at localhost:5001 due to browser security policies

## Solution

### 1. Always Start Both Servers
Use the provided startup script:
```bash
./start-dev.sh
```

This script:
- Starts backend server on port 5001
- Starts frontend server on port 3000
- Waits for both to be ready
- Provides proper cleanup on exit

### 2. Verify Services Are Running
Check both services are running:
```bash
# Backend health check
curl http://localhost:5001/api/health

# Frontend check  
curl http://localhost:3000
```

### 3. Access the Application Correctly
- **Correct**: http://localhost:3000 (with proxy)
- **Incorrect**: http://localhost:5001 (direct backend access)

## Technical Details

### Frontend Configuration (vite.config.ts)
```typescript
server: {
  host: "0.0.0.0",
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5001',
      changeOrigin: true,
      secure: false,
      ws: true,
    }
  }
}
```

### Backend CORS Configuration (server.js)
```javascript
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive with localhost origins
    if (process.env.NODE_ENV !== 'production' && origin && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

## Prevention Measures

### 1. Enhanced Error Handling
The Settings component now includes better error handling and user feedback.

### 2. Service Status Indicators
The UI shows connection status for both frontend and backend services.

### 3. Startup Validation
The startup script validates both services are running before declaring success.

## Testing the Fix

1. **Start the application properly**:
   ```bash
   ./start-dev.sh
   ```

2. **Wait for all services to be ready**:
   - Backend: ✅ Backend ready on http://localhost:5001
   - Frontend: ✅ Frontend ready on http://localhost:3000

3. **Access the application**:
   - Go to http://localhost:3000
   - Navigate to Settings
   - Try saving your OpenAI API key

4. **Verify the fix**:
   - No "Failed to fetch" errors
   - API key saves successfully
   - AI service status shows "Connected"

## Never Let This Happen Again

**Always use the startup script**: `./start-dev.sh`
**Never access the backend directly** in the browser for the UI
**Check service status** before reporting issues
**Follow the proxy architecture** - frontend routes to backend