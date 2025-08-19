// Backend-routed chat service to fix Gemini API communication issues
import { logger } from '@/utils/logger';
import { AIReasoningResponse } from '@/types/thinking';

interface StudentProfile {
  [key: string]: any;
}

interface TranscriptData {
  [key: string]: any;
}

interface EnhancedContext {
  studentProfile: StudentProfile | null;
  contextPrompt: string;
  transcriptData: TranscriptData | null;
}

class BackendChatService {
  private baseURL: string;
  private enhancedContext: EnhancedContext | null = null;

  constructor() {
    // Use VITE_API_URL which already includes '/api', or fall back to the base backend URL
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
  }

  async sendMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    try {
      // Get API key from storage (same logic as geminiChatService)
      const apiKey = this.getApiKey();
      
      if (!apiKey) {
        return `No API key found. Please configure either OpenAI or Gemini API keys in Settings.

💡 Quick setup:
- Gemini: Free with generous limits at https://aistudio.google.com/app/apikey
- OpenAI: Pay-as-you-go at https://platform.openai.com/api-keys

Once you add an API key, your AI features will be unlocked!`;
      }

      const response = await fetch(`${this.baseURL}/advisor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          apiKey,
          userId,
          sessionId,
          context: null,
          onboardingContext: null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get response from AI service');
      }

      logger.info('Message sent successfully via backend API', 'BACKEND_CHAT');
      return data.data.response;

    } catch (error: any) {
      logger.error('Backend chat service error:', 'BACKEND_CHAT', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('API key')) {
        return `Your API key appears to be invalid. Please check your API key in Settings.

💡 To fix this:
1. Go to Settings in this app
2. Enter a valid API key
3. Gemini: Get a free key from https://aistudio.google.com/app/apikey
4. OpenAI: Get a key from https://platform.openai.com/api-keys`;
      }
      
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        return `You're sending requests too quickly. Please wait a moment and try again.

💡 This helps prevent API overuse. Try waiting 30-60 seconds before your next message.`;
      }
      
      if (error.message?.includes('quota') || error.message?.includes('402')) {
        return `API quota exceeded. Please check your usage limits.

💡 For Gemini: Visit https://console.cloud.google.com/apis/api/generativeai.googleapis.com
💡 For OpenAI: Visit https://platform.openai.com/usage`;
      }

      // Generic fallback error
      return `There was a technical issue with the AI service. Please try again in a moment.

💡 If the problem persists:
- Check your internet connection
- Verify your API keys in Settings
- Try refreshing the page

Technical details: ${error.message || 'Unknown error'}`;
    }
  }

  async sendMessageWithReasoning(message: string, userId: string, sessionId?: string): Promise<AIReasoningResponse> {
    // For now, reasoning mode will use regular chat and simulate reasoning structure
    // This can be enhanced to support backend reasoning endpoints later
    const response = await this.sendMessage(message, userId, sessionId);
    
    return {
      thinking_steps: [{
        id: 'backend-analysis',
        title: 'analyze',
        content: 'Processing request through backend AI service...',
        status: 'completed',
        timestamp: new Date()
      }],
      final_response: response,
      reasoning_time: 1000,
      model_used: 'backend-routed'
    };
  }

  private getApiKey(): string {
    // Same logic as geminiChatService.getUserApiKey() but simplified
    
    // Check session storage first
    let apiKey = sessionStorage.getItem('current_session_gemini_key') || 
                 sessionStorage.getItem('current_session_openai_key') || '';
    
    if (!apiKey) {
      // Check user-specific stored keys
      const userKeys = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
      
      if (userKeys.length > 0) {
        const latestUserKey = userKeys[userKeys.length - 1];
        const userKeyData = localStorage.getItem(latestUserKey);
        
        if (userKeyData) {
          try {
            const parsed = JSON.parse(userKeyData);
            apiKey = parsed.gemini || parsed.openai || '';
          } catch (e) {
            // Parse error, continue to fallback
          }
        }
      }
    }
    
    // Fallback to legacy storage
    if (!apiKey) {
      apiKey = localStorage.getItem('gemini_api_key') || 
               localStorage.getItem('openai_api_key') || 
               import.meta.env.VITE_GEMINI_API_KEY || 
               import.meta.env.VITE_OPENAI_API_KEY || '';
    }
    
    return apiKey;
  }

  isAvailable(): boolean {
    const apiKey = this.getApiKey();
    return !!(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey !== 'your_openai_api_key_here' && apiKey.length >= 10);
  }

  getEnhancedContext(): EnhancedContext | null {
    return this.enhancedContext;
  }

  setEnhancedContext(context: EnhancedContext | null): void {
    this.enhancedContext = context;
  }

  clearEnhancedContext(): void {
    this.enhancedContext = null;
  }
}

export const backendChatService = new BackendChatService();