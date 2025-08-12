# CLI AI Integration Setup Guide

This guide explains how to integrate your existing CLI chatbot with the web application.

## 🔧 Setup Instructions

### Step 1: Update the Bridge Script

1. **Edit the bridge script:**
```bash
nano cli-to-web-bridge.py
```

2. **Update the CLI_SCRIPT_PATH:**
```python
# Change this line to point to your CLI chatbot script
CLI_SCRIPT_PATH = "/path/to/your/chatbot/cli_script.py"
```

For example:
```python
CLI_SCRIPT_PATH = "/Users/rrao/Desktop/my-ai-chatbot/main.py"
```

### Step 2: Install Python Dependencies

```bash
pip install flask flask-cors
```

### Step 3: Start Your CLI AI Bridge

```bash
cd /Users/rrao/Desktop/final
python cli-to-web-bridge.py
```

You should see:
```
🚀 Starting CLI Chatbot Bridge Service
📁 CLI Script Path: /path/to/your/chatbot/main.py
✅ CLI chatbot started: /path/to/your/chatbot/main.py
🌐 Starting web server on http://localhost:5000
```

### Step 4: Start Your React App

In another terminal:
```bash
cd /Users/rrao/Desktop/final
npm run dev
```

### Step 5: Test the Integration

1. **Visit your app:** http://localhost:5173
2. **Go to AI Assistant page**
3. **Check connection status:** Should show "Connected to AI Knowledge Base" 
4. **Upload a transcript** (optional but recommended for personalized responses)
5. **Ask a question:** "What CS courses should I take next?"

## 🔍 Testing the Connection

### Test 1: Health Check
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "healthy",
  "cli_process_running": true,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Test 2: Chat Message
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the CS degree requirements?", "context": {"userId": "test"}}'
```

### Test 3: Transcript Upload
```bash
curl -X POST http://localhost:5000/transcript/upload \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "transcript": {"studentInfo": {"name": "Test Student", "program": "Computer Science-BS"}}}'
```

## 🔧 How It Works

### Data Flow:
```
React App → AI Service → Bridge Server → Your CLI AI → Response
```

1. **User types message** in React app
2. **AI Service** sends HTTP request to bridge server (port 5000)
3. **Bridge Server** forwards message to your CLI chatbot
4. **CLI AI** processes with its knowledge base and returns response
5. **Response flows back** to React app

### Context Enhancement:
- When user uploads transcript, it's stored in the bridge
- All subsequent messages include transcript context
- Your CLI AI gets enhanced prompts with student's specific data

## 🎯 Key Features

### ✅ **Your CLI AI Integration:**
- Uses your existing CLI chatbot and knowledge base
- No changes needed to your AI system
- Maintains all your scraped data and training

### ✅ **Enhanced Context:**
- Automatically includes user's transcript data
- Personalized responses based on student's situation
- Remembers conversation history

### ✅ **Web Interface:**
- Modern chat UI with your CLI AI backend
- Real-time connection status monitoring
- Loading states and error handling

### ✅ **Health Monitoring:**
- Automatic connection health checks
- Clear status indicators
- Graceful error handling

## 🛠 Customization Options

### Modify the Bridge (cli-to-web-bridge.py):

1. **Change the prompt enhancement:**
```python
def build_enhanced_message(self, message, user_context):
    # Customize how transcript context is added to messages
    return enhanced_message
```

2. **Add conversation memory:**
```python
def update_conversation_history(self, user_id, message, response):
    # Store conversation history for context
```

3. **Modify health checks:**
```python
@app.route('/health', methods=['GET'])
def health_check():
    # Add custom health checks
```

## 🐛 Troubleshooting

### Issue: "AI Service Unavailable"
**Solution:**
1. Check if bridge server is running: `curl http://localhost:5000/health`
2. Verify CLI script path in bridge script
3. Check console for error messages

### Issue: "CLI communication failed"
**Solution:**
1. Test your CLI script manually
2. Check if it accepts stdin and outputs to stdout
3. Verify Python path in bridge script

### Issue: "No response from AI"
**Solution:**
1. Check if your CLI expects specific input format
2. Monitor bridge console for error messages
3. Test CLI script directly: `echo "test question" | python your_cli_script.py`

### Issue: Transcript context not working
**Solution:**
1. Check browser network tab for upload request
2. Verify transcript data structure matches expected format
3. Check bridge logs for context storage

## 🚀 Next Steps

1. **Start both services** (bridge + React app)
2. **Test basic chat functionality**
3. **Upload a transcript** to test personalized responses
4. **Customize the bridge** for your specific CLI format if needed

Your CLI AI system is now integrated with the modern web interface! 🎉