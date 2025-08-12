# 🚀 BoilerAI Quick Start Guide

Your CLI chatbot is now integrated! Here's how to get it running in 3 simple steps.

## ✅ Integration Status

**✅ Bridge Service**: FastAPI service connecting web app to CLI  
**✅ Enhanced AI Service**: TypeScript service with intelligent fallbacks  
**✅ UI Integration**: AI Assistant page ready for BoilerAI  
**✅ Knowledge Merger**: Combines CLI and web knowledge bases  
**✅ OpenAI API Key**: Configured and ready for full AI mode  

## 🎯 Quick Start (3 Steps)

### Step 1: Start BoilerAI Service
```bash
# Option A: Simple Python starter (recommended)
python3 start-boilerai-simple.py

# Option B: Shell script starter  
./start-boilerai.sh
```

### Step 2: Start Your Web App
```bash
# In a new terminal
npm run dev
# or
yarn dev
```

### Step 3: Test Integration
- Go to http://localhost:3000
- Navigate to **AI Assistant** page
- Ask: "What are the CODO requirements for Computer Science?"
- Enjoy intelligent responses from BoilerAI! 🎉

## 🧪 Testing Your Setup

Run integration tests:
```bash
./test-boilerai-integration.sh  # Tests file structure
python3 test-boilerai-live.py   # Tests live functionality
```

## 🤖 What BoilerAI Can Do

### 🎓 Academic Planning
- **Course Prerequisites**: "What do I need before taking CS 251?"
- **Graduation Timeline**: "How can I graduate in 3.5 years?"
- **Track Selection**: "Should I choose Machine Intelligence or Software Engineering?"

### 📚 Purdue CS Expertise
- **CODO Requirements**: "How do I change my major to CS?"
- **Course Load Planning**: "How many CS courses can I take per semester?"
- **Failure Recovery**: "I failed CS 180, how does this affect my timeline?"

### 💡 Intelligent Conversation
- **Memory**: Remembers your previous questions and context
- **Personalization**: Adapts responses to your academic profile
- **Natural Language**: No robotic responses, just helpful conversation

## 🔧 Troubleshooting

### Service Won't Start
```bash
# Check Python virtual environment
cd src/services/cliBridge
source venv/bin/activate
pip install -r requirements_minimal.txt
```

### Web App Can't Connect
- Verify BoilerAI service is running on port 5000
- Check browser console for connection errors
- Look for "Connected to BoilerAI Knowledge Base" status

### AI Not Responding Intelligently
- Verify OpenAI API key is set in the starter script
- Check service logs for errors
- Try asking simpler questions first

## 📊 Service Status

Check service health: http://localhost:5000/health

Expected response:
```json
{
  "status": "healthy",
  "cli_process_running": true,
  "openai_configured": true,
  "knowledge_base_loaded": true
}
```

## 🎨 UI Features

### AI Assistant Page
- **Full Chat Interface**: Multi-turn conversations with memory
- **Service Status**: Real-time connection status
- **Context Awareness**: Integrates with your transcript data

### Dashboard
- **Quick AI Access**: MiniAI assistant for quick questions
- **Status Indicators**: Shows when BoilerAI is connected
- **Fallback Mode**: Works even when service is offline

## 🚀 Advanced Usage

### Upload Transcript for Personalization
1. Go to Transcript Management page
2. Upload your unofficial transcript
3. Return to AI Assistant
4. BoilerAI will now give personalized advice based on your courses!

### Example Conversations
```
You: "I'm a sophomore CS major with a 3.2 GPA. Should I do CODO?"
BoilerAI: [Personalized advice based on your situation]

You: "Plan my courses for next semester"
BoilerAI: [Custom course recommendations based on your transcript]
```

## 🎉 Success!

Your BoilerAI integration is complete! You now have:

- ✅ **Intelligent Academic AI** with Purdue CS expertise
- ✅ **Conversation Memory** that remembers your context  
- ✅ **Seamless Web Integration** with beautiful UI
- ✅ **Fallback Support** that works even offline
- ✅ **OpenAI-Powered** responses for natural conversation

Ready to revolutionize academic planning at Purdue! 🚀