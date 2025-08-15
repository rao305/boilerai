# Gemini API Setup for Transcript Processing

## 🚀 Current Status
✅ **Transcript processing is working with MOCK DATA**
✅ **You can test the feature immediately** 
⚠️ **To get real AI processing, follow the steps below**

## 📝 How to Get a Gemini API Key

### Step 1: Get Your Free Gemini API Key
1. Go to **Google AI Studio**: https://makersuite.google.com/app/apikey
2. **Sign in** with your Google account
3. Click **"Create API Key"**
4. **Copy the API key** (it starts with `AIza...`)

### Step 2: Add API Key to Your Project
1. Open `/backend/.env` file
2. Replace this line:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```
   With your actual key:
   ```
   GEMINI_API_KEY=AIza...your-actual-key-here
   ```
3. **Save the file**
4. **Restart your backend server**:
   ```bash
   cd backend
   npm run dev
   ```

## 🧪 Testing the Feature

### With Mock Data (Current):
- Upload any PDF transcript or paste text
- You'll get realistic mock course data for development
- Perfect for testing the UI and features

### With Real AI (After API key setup):
- Upload real transcript PDFs 
- Get actual AI-powered parsing of your courses
- Real GPA calculations and course matching

## 🔧 Troubleshooting

**If you see "No API key available":**
1. Check that `GEMINI_API_KEY` is set in `/backend/.env`
2. Restart the backend server
3. Make sure the key starts with `AIza`

**If AI processing fails:**
- The system will automatically fall back to mock data
- Check backend console for error messages
- Verify your API key is correct

## 💡 Features Working Right Now

Even without the real API key, you can test:
- ✅ File upload (PDF/text)
- ✅ Transcript parsing (mock data)
- ✅ Course display and management
- ✅ GPA calculations
- ✅ Academic planning features
- ✅ Course recommendations

## 🎯 Free Tier Limits

Gemini API free tier includes:
- **15 requests per minute**
- **1,500 requests per day** 
- **1 million tokens per month**

Perfect for development and testing!