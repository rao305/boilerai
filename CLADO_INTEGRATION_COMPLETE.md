# 🔗 Clado LinkedIn Search Integration - Complete Documentation

## Overview

The Clado integration provides LinkedIn professional networking search capabilities to the BoilerAI Purdue Academic Planner. This feature allows users to search for professionals, alumni, and career networking opportunities directly within the AI Assistant.

## 🏗️ Architecture

### Components

1. **Frontend Service** (`src/services/cladoService.ts`)
   - Main Clado API service with embedded key
   - Rate limiting (20 requests/minute)
   - Toggle system for enabling/disabling
   - Result formatting

2. **AI Assistant Integration** (`src/pages/AIAssistant.tsx`)
   - `/clado` command for toggling mode
   - Smart detection of LinkedIn search queries
   - Seamless fallback to OpenAI for non-LinkedIn queries

3. **Backend Bridge Service** (`src/services/cliBridge/pure_ai_main.py`)
   - Python FastAPI service for advanced Clado integration
   - Provides REST API at localhost:5003
   - Environment variable support

## 🔑 API Key Management

### Current Configuration

**Active API Key**: `sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct`

**Hardcoded Locations** (6 files):
1. `src/services/cladoService.ts` - Main frontend service
2. `src/services/cliBridge/test_clado_direct.py` - Direct API test
3. `test_clado_integration.py` - Integration test
4. `test-clado-integration.html` - HTML test page
5. `test_frontend_backend_clado.py` - Frontend-backend test
6. `src/services/cliBridge/pure_ai_main.py` - Backend bridge fallback

### Key Features
- **Embedded by Design**: No user configuration required
- **Prefix Support**: Accepts both `lk_` and `sk-` prefixed keys
- **Environment Override**: Can be overridden with `CLADO_API_KEY` env var
- **Automatic Validation**: Validates key format and length

## 🚀 How It Works

### User Flow

1. **Default Mode**: AI Assistant starts in OpenAI mode
2. **Enable Clado**: User types `/clado` to toggle LinkedIn search ON
3. **Smart Detection**: System automatically detects LinkedIn-related queries
4. **Professional Search**: Clado API searches LinkedIn profiles
5. **Formatted Results**: Results displayed with rich profile information
6. **Fallback**: Non-LinkedIn queries fall back to OpenAI

### Query Detection

The system automatically detects LinkedIn search queries based on keywords:

```javascript
const linkedInKeywords = [
  'software engineer', 'product manager', 'data scientist',
  'professionals', 'alumni', 'engineers', 'managers',
  'at google', 'at apple', 'at microsoft', 'at meta',
  'in silicon valley', 'in bay area', 'purdue alumni',
  'find people', 'networking', 'career'
];
```

### Rate Limiting

- **Free Tier**: 20 requests per minute
- **Cost**: 5 credits per successful search
- **Automatic Enforcement**: Built-in rate limiting prevents quota exhaustion
- **User Feedback**: Shows remaining requests in results

## 🎯 Usage Examples

### Basic Usage

```
User: /clado
AI: Switched to Clado AI mode! I can now search LinkedIn profiles...

User: find me software engineers at Apple in the Bay Area
AI: [Returns formatted LinkedIn profiles with contact info, experience, skills]
```

### Advanced Queries

```
# Alumni Search
"Purdue University alumni in machine learning"

# Company + Role Search  
"senior developers at startups in San Francisco"

# Skills-Based Search
"product managers with technical background"

# Location-Based Search
"data scientists in Silicon Valley"
```

## 🛠️ Technical Implementation

### Frontend Service Architecture

```typescript
class CladoService {
  private baseUrl = 'https://search.clado.ai';
  private EMBEDDED_API_KEY = 'sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct';
  private isEnabled: boolean = false;
  private rateLimit: RateLimitInfo;
  
  // Core methods
  async searchPeople(params: CladoSearchParams): Promise<CladoSearchResponse>
  formatSearchResults(response: CladoSearchResponse): string
  getRateLimitStatus(): RateLimitStatus
}
```

### API Integration

- **Base URL**: `https://search.clado.ai`
- **Endpoint**: `GET /api/search`
- **Authentication**: Bearer token with API key
- **Parameters**: `query`, `limit`, `company[]`, `school[]`
- **Response**: JSON with profiles, experience, education, skills

### Error Handling

```typescript
// Comprehensive error handling for all scenarios
if (response.status === 401) {
  throw new Error('⚠️ **Clado API Key Issue**\n\nThe LinkedIn search feature is temporarily unavailable...');
} else if (response.status === 429) {
  throw new Error('Rate limit exceeded. Please wait before making another request.');
}
```

## 🔧 Configuration & Setup

### Environment Variables (Optional)

```bash
# Override hardcoded key (optional)
CLADO_API_KEY=sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct
```

### Toggle State Persistence

```javascript
// State stored in localStorage
localStorage.setItem('clado_enabled', 'true');
```

### Bridge Service Configuration

The Python bridge service runs on port 5003 and provides advanced integration:

```python
# Environment setup
os.environ["CLADO_API_KEY"] = "sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct"

# FastAPI service
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

## 📊 Feature Status & Monitoring

### Real-Time Status Indicators

- ✅ **LinkedIn Search Ready**: API key valid and rate limit available
- ❌ **LinkedIn Search Unavailable**: Invalid key or service down
- 🔒 **Rate Limited**: Too many requests, shows wait time
- ⚠️ **API Error**: Service temporarily unavailable

### Usage Monitoring

```javascript
// Rate limit status displayed in results
const rateLimitStatus = this.getRateLimitStatus();
formatted += `\n📊 API Usage: ${rateLimitStatus.requestsRemaining} requests remaining this minute`;
```

## 🔒 Security & Privacy

### Security Measures

- **Hardcoded Keys**: No user key storage required
- **Client-Side Requests**: All API calls made directly from browser
- **Rate Limiting**: Prevents abuse and quota exhaustion
- **Input Validation**: Query sanitization and parameter validation

### Privacy Protection

- **No Server Storage**: No logging of search queries or results
- **Local State**: Toggle state stored in browser localStorage only
- **Direct Integration**: No data passes through BoilerAI servers
- **Anonymous Requests**: No user identification in API calls

## 🧪 Testing & Validation

### Test Suite

1. **Direct API Test**: `test_clado_integration.py`
2. **Frontend Integration**: `test-clado-integration.html`
3. **Backend Bridge**: `test_frontend_backend_clado.py`
4. **Service Test**: `src/services/cliBridge/test_clado_direct.py`

### Validation Commands

```bash
# Test direct API
python test_clado_integration.py

# Test backend bridge
python test_frontend_backend_clado.py

# Test frontend service (open in browser)
open test-clado-integration.html
```

## 🚨 Troubleshooting

### Common Issues

#### 1. API Key Expired
```
Error: "Invalid or expired API key"
Solution: Update API key in all 6 files with new key from Clado dashboard
```

#### 2. Rate Limit Exceeded
```
Error: "Rate limit exceeded"
Solution: Wait 60 seconds for rate limit window to reset
```

#### 3. CORS Issues
```
Error: "blocked by CORS policy"
Solution: Ensure requests are made client-side, not server-side
```

#### 4. Service Unavailable
```
Error: "Clado service error"
Solution: Check Clado service status, implement fallback to OpenAI
```

### Debug Commands

```javascript
// Check service status
cladoService.getStatus()

// Check rate limit
cladoService.getRateLimitStatus()

// Test API key validity
cladoService.hasApiKey()
```

## 🔄 Integration with AI Assistant

### Service Routing Logic

```typescript
if (aiService === 'clado') {
  if (isLinkedInSearchQuery(trimmedInput)) {
    // Use Clado API for LinkedIn searches
    const cladoResponse = await cladoService.searchPeople({
      query: trimmedInput,
      limit: 10
    });
    aiResponseText = cladoService.formatSearchResults(cladoResponse);
  } else {
    // Fall back to OpenAI for general queries
    if (reasoningMode) {
      const reasoningResponse = await openaiChatService.sendMessageWithReasoning(trimmedInput, userId);
      aiResponseText = reasoningResponse.final_response;
    } else {
      aiResponseText = await openaiChatService.sendMessage(trimmedInput, userId);
    }
  }
}
```

### Metadata Tracking

```typescript
metadata: {
  thinkingSummary: isLinkedInSearchQuery(trimmedInput) 
    ? `LinkedIn Search via Clado: analyzed query → searched professional profiles → formatted networking results`
    : `Clado Mode + OpenAI: analyzed query → applied professional knowledge → generated career-focused guidance`
}
```

## 📈 Future Enhancements

### Planned Features

1. **Enhanced Filtering**: Company size, experience level, location radius
2. **Bulk Search**: Multiple query processing
3. **Export Options**: CSV, PDF export of search results
4. **Smart Recommendations**: AI-powered connection suggestions
5. **Integration Analytics**: Usage tracking and insights

### API Expansion

1. **Contact Enrichment**: Email/phone discovery (paid tier)
2. **Company Insights**: Company data and employee counts
3. **Skill Matching**: Match user skills with professional profiles
4. **Network Analysis**: Connection paths and mutual connections

## 📋 Maintenance Checklist

### Monthly Tasks

- [ ] Verify API key validity
- [ ] Check rate limit usage
- [ ] Test core search functionality
- [ ] Review error logs
- [ ] Update documentation

### API Key Management

**Hardcoded Design Philosophy:**
- API key is embedded directly in code for zero-configuration deployment
- No external key retrieval or user setup required
- Key is provided and maintained by development team
- Updates handled through code commits, not external services

When updating API keys:

1. Receive new key from development team
2. Update all 6 hardcoded locations simultaneously
3. Test with sample query to verify functionality
4. Commit changes and deploy

### Monitoring Metrics

- API response times
- Success/failure rates
- Rate limit utilization
- User engagement with feature
- Error frequency and types

## 🤝 Support & Resources

### Clado Resources

- **API Documentation**: https://docs.clado.ai (reference only)
- **Internal Integration**: Fully embedded, no external setup required
- **Support**: Contact development team for API key updates

### Internal Resources

- **Integration Tests**: Run test suite in `/test_*.py` files
- **Debug Mode**: Enable console logging in browser DevTools
- **Error Monitoring**: Check browser console for API errors

## 📝 Rules & Guidelines

### API Usage Rules

1. **Rate Limits**: Never exceed 20 requests/minute
2. **Key Security**: Keep API keys secure, rotate regularly
3. **Error Handling**: Always provide fallback options
4. **User Experience**: Show clear status indicators
5. **Privacy**: No logging of search queries

### Integration Rules

1. **Embedded Design**: API key must be hardcoded for seamless UX
2. **Toggle Control**: Users must be able to enable/disable easily
3. **Fallback Required**: Always fallback to OpenAI for non-LinkedIn queries
4. **Smart Detection**: Auto-detect LinkedIn queries when enabled
5. **Rich Formatting**: Format results for optimal readability

### Development Rules

1. **Test All Changes**: Run full test suite before deployment
2. **Update All Files**: Keep all 6 API key locations synchronized
3. **Document Changes**: Update this documentation for any modifications
4. **Error Messages**: Provide helpful, actionable error messages
5. **Performance**: Maintain sub-3-second response times

---

**Last Updated**: 2025-01-16  
**API Key Status**: ✅ Active (`sk-MDE5OGIwOGYtMTliNC03MDAwLTk2NTct`)  
**Integration Version**: 2.0  
**Maintainer**: BoilerAI Development Team