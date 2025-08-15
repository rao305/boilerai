# 🛠️ DEVELOPMENT.md - Development Workflow & Guidelines

Comprehensive development guide for BoilerAI platform covering workflows, coding standards, testing procedures, and contribution guidelines.

## 🚀 Development Environment Setup

### Initial Setup (One-time)
```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd boilerai-master

# 2. Install all dependencies
npm install                    # Frontend
cd backend && npm install && cd ..  # Backend
cd src/services/cliBridge && ./setup_venv.sh && cd ../../..  # Python AI

# 3. Setup environment files
cp .env.example .env
cp backend/.env.example backend/.env

# 4. Make scripts executable
chmod +x start-dev.sh
chmod +x start-boilerai.sh
chmod +x src/services/cliBridge/setup_venv.sh
```

### Daily Development Workflow
```bash
# Start all services
./start-dev.sh

# Services will be available at:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5001
# - AI Bridge: http://localhost:5003

# Stop all services: Ctrl+C
```

---

## 📁 Project Architecture

### Service Communication
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Backend API   │───▶│   Database      │
│   (React)       │    │   (Node.js)     │    │   (SQLite/PG)   │
│   Port 3000     │    │   Port 5001     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              ▲
         │              ┌─────────────────┐              │
         └─────────────▶│   AI Bridge     │──────────────┘
                        │   (Python)      │
                        │   Port 5003     │
                        └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   OpenAI API    │
                        │   (External)    │
                        └─────────────────┘
```

### Directory Structure
```
boilerai-master/
├── 🎨 Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page-level components  
│   │   ├── contexts/       # React contexts (API key, auth)
│   │   ├── services/       # API client code
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Helper functions
│   ├── public/             # Static assets
│   ├── package.json        # Dependencies & scripts
│   └── vite.config.ts      # Build configuration
│
├── 🔧 Backend (Node.js + Express)
│   ├── src/
│   │   ├── routes/         # API route definitions
│   │   │   └── settings.js # ⭐ API key validation
│   │   ├── controllers/    # Business logic
│   │   ├── models/         # Database models
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Helper functions
│   ├── database/           # Database files (SQLite)
│   ├── tests/              # Test files
│   └── package.json        # Dependencies & scripts
│
├── 🤖 AI Bridge (Python + FastAPI)
│   ├── src/services/cliBridge/
│   │   ├── main.py         # ⭐ Primary AI service
│   │   ├── simple_main.py  # ⭐ Fallback service
│   │   ├── requirements.txt # Python dependencies
│   │   ├── setup_venv.sh   # Environment setup
│   │   └── venv/           # Virtual environment
│
├── 📚 Documentation
│   ├── README.md           # Project overview & setup
│   ├── AI_CONTEXT.md       # AI assistant onboarding
│   ├── API.md              # Complete API reference
│   ├── TROUBLESHOOTING.md  # Problem resolution
│   └── DEVELOPMENT.md      # This file
│
└── 🚀 Scripts & Configuration
    ├── start-dev.sh        # Development startup
    ├── start-boilerai.sh   # Production startup
    ├── package.json        # Root dependencies
    └── .gitignore          # Git ignore rules
```

---

## 🎯 Coding Standards

### TypeScript/React (Frontend)

#### Component Structure
```typescript
// PreferredComponentStructure.tsx
import React, { useState, useEffect } from 'react';
import { SomeService } from '../services/api';
import { Button } from '../components/ui/button';

interface ComponentProps {
  title: string;
  onSubmit: (data: FormData) => void;
  className?: string;
}

export const PreferredComponent: React.FC<ComponentProps> = ({
  title,
  onSubmit,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<FormData | null>(null);

  useEffect(() => {
    // Effect logic here
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`component-container ${className}`}>
      <h2>{title}</h2>
      <Button 
        onClick={() => handleSubmit(data)}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Submit'}
      </Button>
    </div>
  );
};

export default PreferredComponent;
```

#### API Service Pattern
```typescript
// src/services/api.ts
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async validateApiKey(apiKey: string): Promise<ValidationResponse> {
    const response = await fetch(`${this.baseUrl}/api/settings/validate-openai-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}

export const apiService = new ApiService(
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001'
);
```

#### Context Pattern
```typescript
// src/contexts/ExampleContext.tsx
interface ExampleContextType {
  data: SomeData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const ExampleContext = createContext<ExampleContextType | undefined>(undefined);

export const useExample = () => {
  const context = useContext(ExampleContext);
  if (!context) {
    throw new Error('useExample must be used within ExampleProvider');
  }
  return context;
};

export const ExampleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Provider implementation
};
```

---

### Node.js/Express (Backend)

#### Route Structure
```javascript
// backend/src/routes/example.js
const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { ExampleController } = require('../controllers/exampleController');

const router = express.Router();

// Route with validation and error handling
router.post('/endpoint', 
  validateRequest(['field1', 'field2']),
  async (req, res) => {
    try {
      const result = await ExampleController.handleRequest(req.body);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Endpoint error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    }
  }
);

module.exports = router;
```

#### Controller Pattern
```javascript
// backend/src/controllers/exampleController.js
class ExampleController {
  static async handleRequest(data) {
    // Validate input
    if (!data.field1) {
      throw new Error('field1 is required');
    }

    // Business logic
    const result = await SomeService.process(data);
    
    // Return standardized response
    return {
      id: result.id,
      status: result.status,
      processedAt: new Date().toISOString()
    };
  }

  static async validateApiKey(apiKey) {
    // Comprehensive validation with error handling
    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        timeout: 10000
      });
      
      return {
        success: true,
        valid: response.status === 200,
        reason: 'API key validated successfully'
      };
    } catch (error) {
      if (error.response?.status === 401) {
        return {
          success: false,
          valid: false,
          reason: 'Invalid API key'
        };
      }
      throw error; // Re-throw unexpected errors
    }
  }
}

module.exports = { ExampleController };
```

---

### Python/FastAPI (AI Bridge)

#### Endpoint Structure
```python
# src/services/cliBridge/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

app = FastAPI(title="BoilerAI Bridge Service")

class ApiKeyRequest(BaseModel):
    apiKey: str

class ApiKeyResponse(BaseModel):
    success: bool
    valid: bool
    message: str
    reason: str

@app.post("/api/settings/validate-openai-key", response_model=ApiKeyResponse)
async def validate_openai_key(request: ApiKeyRequest):
    """Validate OpenAI API key with comprehensive error handling"""
    try:
        # Input validation
        if not request.apiKey:
            return ApiKeyResponse(
                success=False,
                valid=False,
                message="No API key provided",
                reason="API key is required"
            )
        
        # Clean and validate format
        api_key = request.apiKey.strip()
        if not api_key.startswith("sk-"):
            return ApiKeyResponse(
                success=False,
                valid=False,
                message="Invalid API key format",
                reason="API key must start with 'sk-'"
            )
        
        # Test with OpenAI API
        response = requests.get(
            'https://api.openai.com/v1/models',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=10
        )
        
        if response.status_code == 200:
            return ApiKeyResponse(
                success=True,
                valid=True,
                message="API key validated successfully",
                reason="API key is valid and authenticated with OpenAI"
            )
        elif response.status_code == 401:
            return ApiKeyResponse(
                success=False,
                valid=False,
                message="Invalid API key",
                reason="API key authentication failed"
            )
        else:
            return ApiKeyResponse(
                success=False,
                valid=False,
                message=f"OpenAI API error: {response.status_code}",
                reason=f"HTTP {response.status_code}: {response.reason}"
            )
            
    except requests.exceptions.Timeout:
        return ApiKeyResponse(
            success=False,
            valid=False,
            message="Request timeout",
            reason="Connection timeout - OpenAI API not reachable"
        )
    except Exception as e:
        logging.error(f"Unexpected validation error: {e}")
        return ApiKeyResponse(
            success=False,
            valid=False,
            message="Validation failed",
            reason="Internal validation error"
        )
```

---

## 🧪 Testing Guidelines

### Frontend Testing

#### Component Testing
```typescript
// src/components/__tests__/Component.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ExampleComponent } from '../ExampleComponent';

describe('ExampleComponent', () => {
  it('renders with correct title', () => {
    render(<ExampleComponent title="Test Title" onSubmit={vi.fn()} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles submit correctly', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({});
    render(<ExampleComponent title="Test" onSubmit={mockSubmit} />);
    
    fireEvent.click(screen.getByText('Submit'));
    
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state during submission', async () => {
    const mockSubmit = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ExampleComponent title="Test" onSubmit={mockSubmit} />);
    
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

#### API Service Testing
```typescript
// src/services/__tests__/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from '../api';

// Mock fetch
global.fetch = vi.fn();

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates API key successfully', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ success: true, valid: true })
    };
    
    (fetch as any).mockResolvedValueOnce(mockResponse);
    
    const result = await apiService.validateApiKey('sk-test-key');
    
    expect(result).toEqual({ success: true, valid: true });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:5001/api/settings/validate-openai-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'sk-test-key' })
      }
    );
  });
});
```

### Backend Testing

#### Route Testing
```javascript
// backend/src/routes/__tests__/settings.test.js
const request = require('supertest');
const app = require('../../app');

describe('API Key Validation', () => {
  it('should validate correct API key format', async () => {
    const response = await request(app)
      .post('/api/settings/validate-openai-key')
      .send({ apiKey: 'sk-test-key-with-proper-format' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('valid');
  });

  it('should reject invalid API key format', async () => {
    const response = await request(app)
      .post('/api/settings/validate-openai-key')
      .send({ apiKey: 'invalid-key-format' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.valid).toBe(false);
  });

  it('should handle missing API key', async () => {
    const response = await request(app)
      .post('/api/settings/validate-openai-key')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

### Python Testing

#### FastAPI Testing
```python
# src/services/cliBridge/tests/test_main.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

def test_validate_api_key_success():
    """Test successful API key validation"""
    with patch('requests.get') as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response
        
        response = client.post(
            "/api/settings/validate-openai-key",
            json={"apiKey": "sk-test-key-here"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["valid"] is True

def test_validate_api_key_invalid_format():
    """Test API key with invalid format"""
    response = client.post(
        "/api/settings/validate-openai-key",
        json={"apiKey": "invalid-key"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["valid"] is False
    assert "format" in data["reason"].lower()

def test_validate_api_key_missing():
    """Test missing API key"""
    response = client.post(
        "/api/settings/validate-openai-key",
        json={}
    )
    
    assert response.status_code == 422  # Pydantic validation error

@pytest.mark.parametrize("api_key,expected_valid", [
    ("sk-" + "x" * 45, True),   # Valid format
    ("sk-short", False),         # Too short
    ("not-sk-key", False),       # Wrong prefix
    ("", False),                 # Empty
    ("sk-" + "x" * 200, False), # Too long
])
def test_api_key_format_validation(api_key, expected_valid):
    """Test various API key formats"""
    with patch('requests.get') as mock_get:
        if expected_valid:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
        
        response = client.post(
            "/api/settings/validate-openai-key",
            json={"apiKey": api_key}
        )
        
        if api_key == "":
            assert response.status_code == 422  # Pydantic validation
        else:
            data = response.json()
            if expected_valid:
                assert data["valid"] is True
            else:
                assert data["valid"] is False
```

### Running Tests

```bash
# Frontend tests
npm test
npm run test:coverage

# Backend tests
cd backend
npm test
npm run test:watch

# Python tests
cd src/services/cliBridge
source venv/bin/activate
pytest tests/ -v
pytest tests/ --cov=. --cov-report=html
```

---

## 🔄 Development Workflow

### Feature Development Process

1. **Create Feature Branch**
```bash
git checkout -b feature/api-key-enhancement
```

2. **Implement Changes**
   - Write code following established patterns
   - Add comprehensive error handling
   - Include edge case validation
   - Follow coding standards

3. **Test Thoroughly**
```bash
# Test each service individually
npm test                              # Frontend
cd backend && npm test               # Backend
cd src/services/cliBridge && pytest # Python

# Integration testing
./start-dev.sh
# Manual testing of API key flows
```

4. **Update Documentation**
   - Update API.md if endpoints changed
   - Update TROUBLESHOOTING.md for new issues
   - Update AI_CONTEXT.md for new patterns

5. **Commit & Push**
```bash
git add .
git commit -m "feat: enhance API key validation with 15 edge cases

- Add comprehensive input validation
- Implement timeout and retry logic  
- Add detailed error messages for all scenarios
- Update Python service to match Node.js response format"

git push origin feature/api-key-enhancement
```

### Code Review Guidelines

#### For Reviewers
- ✅ **Security**: No API keys stored, proper validation
- ✅ **Error Handling**: All edge cases covered
- ✅ **Testing**: Adequate test coverage
- ✅ **Documentation**: Updates match code changes
- ✅ **Performance**: No obvious bottlenecks
- ✅ **Consistency**: Follows established patterns

#### For Authors
- ✅ **Self-Review**: Review your own PR first
- ✅ **Context**: Provide clear PR description
- ✅ **Testing**: Include test results/screenshots
- ✅ **Breaking Changes**: Document any breaking changes
- ✅ **Dependencies**: Note new dependencies added

### Release Process

1. **Version Bump**
```bash
# Update package.json versions
npm version patch  # or minor/major

# Update Python version if needed
# Edit setup.py or __version__.py
```

2. **Create Release Notes**
```markdown
## v1.2.0 - 2024-01-15

### Added
- Comprehensive API key validation with 15 edge cases
- Real-time validation status indicators
- Enhanced error messages for troubleshooting

### Fixed
- Fixed "Failed to fetch" error with proper proxy configuration
- Resolved API key persistence issues in Safari

### Security
- Improved API key handling security
- Added input sanitization for all validation endpoints
```

3. **Deploy**
```bash
# Build for production
npm run build
cd backend && npm run build

# Deploy using your preferred method
./deploy.sh  # or manual deployment steps
```

---

## 🔧 Debugging Workflows

### API Key Issues Debug Process

1. **Identify the Problem**
```bash
# Check all services are running
lsof -i :3000,5001,5003

# Test each validation endpoint
curl -X POST http://localhost:5001/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test"}'

curl -X POST http://localhost:5003/api/settings/validate-openai-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-test"}'
```

2. **Check Logs**
```bash
# Backend logs
cd backend && npm run dev  # Watch for errors

# Python logs  
cd src/services/cliBridge && python main.py  # Watch for errors

# Frontend console
# Open browser dev tools, check console
```

3. **Isolate the Issue**
```bash
# Test OpenAI directly
curl -H "Authorization: Bearer sk-your-actual-key" \
  https://api.openai.com/v1/models

# Test individual components
# Use browser network tab to see exact requests/responses
```

4. **Fix and Verify**
   - Apply fix to identified service
   - Test the specific scenario that was failing
   - Verify fix doesn't break other functionality

---

## 🎯 Performance Optimization

### Frontend Optimization
```typescript
// Code splitting for large components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Memoization for expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window';
```

### Backend Optimization
```javascript
// Response caching
const cache = new Map();
const getCachedResponse = (key, generator) => {
  if (cache.has(key)) return cache.get(key);
  const value = generator();
  cache.set(key, value);
  return value;
};

// Database query optimization
// Add indexes for frequently queried fields
CREATE INDEX idx_courses_search ON courses(title, code);
```

### Python Optimization
```python
# Async/await for I/O operations
async def validate_multiple_keys(keys):
    tasks = [validate_single_key(key) for key in keys]
    return await asyncio.gather(*tasks)

# Connection pooling for external APIs
import aiohttp
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        return await response.json()
```

---

## 📊 Monitoring & Logging

### Log Levels
```javascript
// Use appropriate log levels
console.error('❌ Critical errors');    // Production
console.warn('⚠️ Warnings');           // Production  
console.info('ℹ️ Information');        // Production
console.log('📝 Debug info');          // Development only
console.debug('🔍 Verbose debug');     // Development only
```

### Performance Monitoring
```typescript
// Frontend performance monitoring
const measureApiCall = async (apiCall: () => Promise<any>) => {
  const start = performance.now();
  try {
    const result = await apiCall();
    const duration = performance.now() - start;
    console.log(`API call took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`API call failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};
```

---

## 🚀 Deployment Guidelines

### Environment Preparation
```bash
# Production environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://...
export REDIS_URL=redis://...

# Build optimization
export GENERATE_SOURCEMAP=false
export INLINE_RUNTIME_CHUNK=false
```

### Health Checks
```javascript
// backend/src/routes/health.js
router.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
  
  const isHealthy = checks.database === 'connected';
  res.status(isHealthy ? 200 : 503).json(checks);
});
```

---

**For more information:**
- **API.md** - Complete API endpoint documentation
- **TROUBLESHOOTING.md** - Problem resolution guide
- **AI_CONTEXT.md** - AI assistant context and patterns
- **README.md** - Project setup and usage instructions