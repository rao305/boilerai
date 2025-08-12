# OpenAI API Setup Guide

## Quick Setup

To use the AI-powered transcript processing, you need to configure an OpenAI API key.

### Step 1: Get OpenAI API Key
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in or create an OpenAI account
3. Create a new API key
4. Copy the key (starts with `sk-`)

### Step 2: Configure Environment
1. Open the `.env` file in the project root
2. Replace `your_openai_api_key_here` with your actual API key:

```
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

### Step 3: Restart Development Server
After updating the `.env` file, restart the development server:
```bash
npm run dev
```

## Features Enabled
With OpenAI configured, you can:
- Upload PDF transcripts for intelligent parsing
- Paste transcript text for processing
- Get accurate course recognition and matching
- Use the AI assistant for academic planning

## Troubleshooting

**Error: "OpenAI API key is required for transcript processing"**
- Make sure you've replaced the placeholder in the `.env` file
- Ensure the API key starts with `sk-`
- Restart the development server after making changes

**Error: "Could not read the file"**
- Verify your API key is valid and has sufficient credits
- Check that the PDF contains text (not just images)
- Try pasting the transcript text instead of uploading the PDF

## Support
- Visit [OpenAI Help Center](https://help.openai.com/) for API key issues
- Check the browser console for detailed error messages