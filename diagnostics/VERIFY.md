# BoilerAI Structured QA Verification Report

Generated on: $(date)

## System Health Checks

### API Gateway Health: ✅ HEALTHY
```json
{"ok":true}
```

### Backend Advisor Health: ✅ HEALTHY
```json
{"success":true,"message":"AI Assistant service is running","config":{"apiGatewayUrl":"http://127.0.0.1:8001","unifiedAIDisabled":true,"mode":"structured_proxy"},"timestamp":"2025-08-21T18:54:44.422Z"}
```

## Structured Response Tests

### Course Facts Query: ❌ NON-STRUCTURED
```json
{"success":false,"error":"400 API key not valid. Please pass a valid API key. [reason: \"API_KEY_INVALID\"\ndomain: \"googleapis.com\"\nmetadata {\n  key: \"service\"\n  value: \"generativelanguage.googleapis.com\"\n}\n, locale: \"en-US\"\nmessage: \"API key not valid. Please pass a valid API key.\"\n]","service":"api_gateway","fallback":false,"retry":true}
```
### Prerequisites Query: ✅ STRUCTURED
**Mode:** t2sql
t2sql

## LLM Bypass Checks

### Direct Provider Usage Audit
- ✅ No @google/generative-ai imports in source code
- ❌ Found OpenAI instantiation:
backend/src/controllers/aiTranscriptController.js:      this.openaiClient = new OpenAI({
- 📊 unifiedAIService references:       14 (should be disabled/guarded)

## Automated Test Results

### Test Suite: ✅ ALL PASSED

## Final Verification Summary

### Status: ❌ ISSUES DETECTED (1)
Manual intervention required to fix identified issues.
