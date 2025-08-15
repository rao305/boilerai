# Clado LinkedIn Search Integration - Embedded System

This integration adds LinkedIn profile search capabilities to the AI Assistant using an embedded Clado API key with toggle functionality.

## Features

✅ **Embedded API Key**: No need to manually enter API keys - everything is built-in  
✅ **Toggle System**: Simple `/clado` command to enable/disable LinkedIn search  
✅ **Smart Detection**: Automatically detects LinkedIn search queries when enabled  
✅ **Free Tier Support**: Optimized for Clado's free tier (20 requests/minute)  
✅ **Rate Limiting**: Built-in rate limiting to prevent API quota exhaustion  
✅ **Rich Profile Display**: Formatted results with contact info, experience, and skills  
✅ **Visual Indicators**: Shows "Clado Mode ON" when LinkedIn search is active  

## How to Use

### 1. Enable Clado Mode
In the AI Assistant chat, type:
```
/clado
```
This will toggle LinkedIn search ON/OFF and show a confirmation message.

### 2. Search for Professionals
Once Clado mode is ON, simply type natural language queries like:

```
software engineers at Apple in Bay Area
product managers with MBA at Google
Purdue University alumni in machine learning
data scientists in San Francisco
senior developers at startups
```

### 3. Toggle Off (Optional)
To disable LinkedIn search, type `/clado` again:
```
/clado
```

## Free Tier Limitations

- **20 requests per minute**: Rate limiting automatically enforced
- **5 credits per search**: Each successful search consumes 5 credits
- **No contact enrichment**: Contact discovery requires paid credits

## Usage Examples

### Search by Job Title and Company
```
/linkedin senior developers at startups
```

### Find Alumni
```
/linkedin Purdue University alumni in machine learning
```

### Search by Role and Skills
```
/linkedin product managers with technical background
```

### Location-Based Search
```
/linkedin software engineers in Silicon Valley
```

## Technical Implementation

### Files Modified/Created
- `src/services/cladoService.ts` - Main Clado API service with embedded key
- `src/pages/AIAssistant.tsx` - Added `/clado` toggle and smart detection
- `CLADO_INTEGRATION.md` - Updated documentation

### Key Features
- **Embedded API Key**: API key built into the code (replace `lk_your_embedded_api_key_here`)
- **Toggle System**: `/clado` command enables/disables LinkedIn search mode
- **Smart Detection**: Automatically detects job-related queries when enabled
- **Rate Limiting**: Prevents exceeding free tier limits (20 req/min)
- **Visual Indicators**: Shows "Clado Mode ON" indicator in chat
- **Local State**: Toggle state persisted in localStorage

### Developer Setup
To activate the Clado integration:

1. **Get your Clado API key**:
   - Visit https://search.clado.ai
   - Sign up for free account
   - Generate API key (starts with `lk_`)

2. **Update the embedded key**:
   - Open `src/services/cladoService.ts`
   - Replace `lk_your_embedded_api_key_here` with your actual API key
   - Save the file

3. **Test the integration**:
   - Start the application
   - Type `/clado` in AI Assistant to enable
   - Try: "software engineers at Apple in Bay Area"

### API Integration
- **Base URL**: `https://search.clado.ai`
- **Endpoint**: `GET /api/search`
- **Authentication**: Bearer token with `lk_` prefix
- **Free Tier**: 20 requests/minute, 5 credits per search

## Status Indicators

The application shows real-time status for LinkedIn search:

- ✅ **LinkedIn Search Ready**: API key configured and valid
- ❌ **LinkedIn Search Unavailable**: No API key or invalid key
- 🔒 **Rate Limited**: Too many requests, wait before next search
- ⚠️ **API Error**: Service temporarily unavailable

## Error Handling

Common error scenarios and their handling:

1. **No API Key**: Prompts user to add key in Settings
2. **Invalid API Key**: Validates `lk_` prefix and length
3. **Rate Limit Exceeded**: Shows wait time until next request allowed
4. **API Service Down**: Graceful fallback with error message
5. **Network Issues**: Timeout handling and retry suggestions

## Security & Privacy

- API keys stored locally in browser localStorage
- No server-side storage of Clado credentials
- Rate limiting prevents abuse
- All API calls made client-side to Clado servers
- No logging of sensitive search queries

## Testing

Run the integration test:
```bash
node test_clado_integration.js
```

Tests verify:
- Rate limiting functionality
- API key validation
- Search query formatting
- Response formatting
- Error handling

## Support

For Clado API issues:
- Documentation: [Clado API Docs](https://search.clado.ai)
- Support: Contact Clado support team

For integration issues:
- Check browser console for error messages
- Verify API key format (`lk_` prefix)
- Ensure rate limits not exceeded
- Test with sample queries