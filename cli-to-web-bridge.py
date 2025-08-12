#!/usr/bin/env python3
"""
CLI to Web Bridge for AI Chatbot Integration
This service wraps your existing CLI chatbot and exposes it via HTTP API
"""

import sys
import subprocess
import json
import threading
import queue
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import signal
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow your React app to connect

class CLIChatbotBridge:
    def __init__(self, cli_script_path):
        self.cli_script_path = cli_script_path
        self.process = None
        self.input_queue = queue.Queue()
        self.output_queue = queue.Queue()
        self.user_contexts = {}  # Store user transcript data
        
    def start_cli_process(self):
        """Start the CLI chatbot as a subprocess"""
        try:
            self.process = subprocess.Popen(
                ['python', self.cli_script_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=0
            )
            print(f"✅ CLI chatbot started: {self.cli_script_path}")
            return True
        except Exception as e:
            print(f"❌ Failed to start CLI chatbot: {e}")
            return False
    
    def send_to_cli(self, message, user_context=None):
        """Send message to CLI and get response"""
        if not self.process or self.process.poll() is not None:
            if not self.start_cli_process():
                raise Exception("Failed to start CLI chatbot")
        
        try:
            # Build enhanced message with user context
            enhanced_message = self.build_enhanced_message(message, user_context)
            
            # Send to CLI
            self.process.stdin.write(enhanced_message + '\n')
            self.process.stdin.flush()
            
            # Read response (assuming CLI outputs one line per response)
            response = self.process.stdout.readline().strip()
            
            return response
            
        except Exception as e:
            print(f"❌ CLI communication error: {e}")
            # Restart process and retry once
            self.start_cli_process()
            raise Exception(f"CLI communication failed: {e}")
    
    def build_enhanced_message(self, message, user_context):
        """Enhance user message with transcript context"""
        if not user_context:
            return message
            
        enhanced = f"""
CONTEXT: User has uploaded transcript data.
STUDENT INFO: {json.dumps(user_context.get('studentInfo', {}), indent=2)}
COMPLETED COURSES: {json.dumps(user_context.get('completedCourses', {}), indent=2)}
IN-PROGRESS COURSES: {json.dumps(user_context.get('coursesInProgress', []), indent=2)}
GPA SUMMARY: {json.dumps(user_context.get('gpaSummary', {}), indent=2)}

USER QUESTION: {message}

Please provide personalized advice based on this student's specific academic situation.
"""
        return enhanced
    
    def update_user_context(self, user_id, transcript_data):
        """Store user's transcript data for context"""
        self.user_contexts[user_id] = {
            'transcript': transcript_data,
            'updated_at': datetime.now().isoformat()
        }
        print(f"✅ Updated context for user {user_id}")
    
    def get_user_context(self, user_id):
        """Get user's stored context"""
        return self.user_contexts.get(user_id, {}).get('transcript')

# Initialize the bridge (UPDATE THIS PATH TO YOUR CLI SCRIPT)
CLI_SCRIPT_PATH = "/Users/rrao/Desktop/final/backend/mock_ai_chatbot.py"  # Updated to mock chatbot
chatbot_bridge = CLIChatbotBridge(CLI_SCRIPT_PATH)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'cli_process_running': chatbot_bridge.process is not None and chatbot_bridge.process.poll() is None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint that connects to your CLI chatbot"""
    try:
        data = request.json
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
            
        # Get user context
        user_context = data.get('context', {})
        user_id = user_context.get('userId', 'anonymous')
        
        # Get stored transcript context for this user
        stored_context = chatbot_bridge.get_user_context(user_id)
        
        print(f"📝 Chat request from {user_id}: {message[:50]}...")
        
        # Send to CLI chatbot with context
        ai_response = chatbot_bridge.send_to_cli(message, stored_context)
        
        print(f"🤖 AI response: {ai_response[:100]}...")
        
        return jsonify({
            'response': ai_response,
            'timestamp': datetime.now().isoformat(),
            'user_id': user_id
        })
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        return jsonify({
            'error': f'Chat service failed: {str(e)}',
            'fallback_response': "I'm having trouble accessing my knowledge base right now. Please try again in a moment."
        }), 500

@app.route('/transcript/upload', methods=['POST'])
def upload_transcript_context():
    """Endpoint to receive transcript data from frontend"""
    try:
        data = request.json
        user_id = data.get('userId', 'anonymous')
        transcript_data = data.get('transcript')
        
        if not transcript_data:
            return jsonify({'error': 'Transcript data is required'}), 400
            
        # Store transcript context
        chatbot_bridge.update_user_context(user_id, transcript_data)
        
        # Optionally send a welcome message to CLI with new context
        try:
            welcome_message = "A student has uploaded their transcript. Please analyze their academic situation and be ready to provide personalized advice."
            chatbot_bridge.send_to_cli(welcome_message, transcript_data)
        except Exception as e:
            print(f"⚠️ Welcome message failed: {e}")
        
        return jsonify({
            'status': 'success',
            'message': 'Transcript context updated successfully',
            'user_id': user_id
        })
        
    except Exception as e:
        print(f"❌ Transcript upload error: {e}")
        return jsonify({'error': f'Failed to update transcript context: {str(e)}'}), 500

@app.route('/users/<user_id>/context', methods=['GET'])
def get_user_context(user_id):
    """Get user's stored context"""
    context = chatbot_bridge.get_user_context(user_id)
    if context:
        return jsonify({
            'user_id': user_id,
            'has_context': True,
            'context_keys': list(context.keys())
        })
    else:
        return jsonify({
            'user_id': user_id,
            'has_context': False
        })

def signal_handler(sig, frame):
    """Gracefully shutdown CLI process"""
    print('\n🛑 Shutting down CLI chatbot bridge...')
    if chatbot_bridge.process:
        chatbot_bridge.process.terminate()
    sys.exit(0)

if __name__ == '__main__':
    print("🚀 Starting CLI Chatbot Bridge Service")
    print(f"📁 CLI Script Path: {CLI_SCRIPT_PATH}")
    print("🌐 Starting web server on http://localhost:5000")
    
    # Handle graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start the bridge
    if not os.path.exists(CLI_SCRIPT_PATH):
        print(f"❌ ERROR: CLI script not found at {CLI_SCRIPT_PATH}")
        print("Please update CLI_SCRIPT_PATH in this file to point to your chatbot script")
        sys.exit(1)
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
    except KeyboardInterrupt:
        signal_handler(None, None)