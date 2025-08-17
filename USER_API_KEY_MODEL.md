# User API Key Model

## Overview

BoilerAI uses a **user-provided API key model** where each user brings their own OpenAI API key. This ensures:

- **Privacy**: No centralized API key storage
- **Cost Control**: Users control their own OpenAI usage and billing
- **FERPA Compliance**: No sensitive data stored on our servers
- **Security**: API keys remain in user's browser localStorage only

## How It Works

### 1. User Setup Process
1. User opens the app → Settings page
2. Navigate to "AI Configuration" section
3. Enter their OpenAI API key from https://platform.openai.com/api-keys
4. Click "Save & Test" to validate the key
5. System shows "AI Ready" when validated

### 2. API Key Storage
- **Client-side only**: Stored in browser's localStorage
- **No server storage**: API keys never sent to our backend for storage
- **Direct to OpenAI**: Keys sent directly to OpenAI for validation and usage

### 3. Validation Process
- Backend validates key format and connectivity
- Stores validation status (not the key itself)
- Shows real-time status in UI with clear feedback

## Environment Configuration

The `.env` file intentionally has an empty `VITE_OPENAI_API_KEY`:
```env
# OpenAI API Configuration - USER API KEY MODEL
# Users provide their own OpenAI API keys through the Settings page in the app
# This environment variable is intentionally left empty
VITE_OPENAI_API_KEY=
```

## Developer Notes

- Environment warnings about missing OpenAI API key are expected and normal
- The system is designed to work without a centralized API key
- Users see clear prompts to add their own API key when needed
- All AI features are enabled once user provides valid API key

## User Experience

### Without API Key
- App functions normally for basic features
- AI features show "Add Your API Key" prompts
- Clear guidance to Settings page for setup

### With Valid API Key
- All AI features unlock immediately
- "AI Ready" status shown in top navigation
- Chat assistant, transcript parsing, and academic planning enabled

## Security Features

- API keys never logged or stored on backend
- Direct browser-to-OpenAI communication for AI requests
- FERPA compliant data handling
- User controls their own API usage and costs