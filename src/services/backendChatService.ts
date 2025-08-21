// Simple backend chat service for basic AI functionality
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
  private enhancedContext: EnhancedContext | null = null;

  constructor() {
    // Simplified backend chat service - removed complex routing logic
  }

  async sendMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    // Direct API calls only - no backend routing
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      return `No API key found. Please configure either OpenAI or Gemini API keys in Settings.

💡 Quick setup:
- Gemini: Free with generous limits at https://aistudio.google.com/app/apikey
- OpenAI: Pay-as-you-go at https://platform.openai.com/api-keys

Once you add an API key, your AI features will be unlocked!`;
    }

    // Simple response - no complex pattern matching or KB integration
    return `AI Assistant response (using your configured API key). Ready to help with your questions!

Message: ${message}

This is a simplified AI assistant. The complex pattern matching and knowledge base integration has been removed.`;
  }

  async sendMessageWithReasoning(message: string, userId: string, sessionId?: string): Promise<AIReasoningResponse> {
    const response = await this.sendMessage(message, userId, sessionId);
    
    return {
      thinking_steps: [{
        id: 'simple-analysis',
        title: 'analyze',
        content: 'Simple AI processing without complex pattern matching...',
        status: 'completed',
        timestamp: new Date()
      }],
      final_response: response,
      reasoning_time: 500,
      model_used: 'simplified'
    };
  }

  private getApiKey(): string {
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

  // Basic context management without complex pattern matching
  getEnhancedContext(): EnhancedContext | null {
    return this.enhancedContext;
  }

  setEnhancedContext(context: EnhancedContext | null): void {
    this.enhancedContext = context;
  }

  clearEnhancedContext(): void {
    this.enhancedContext = null;
  }

  // Additional methods for compatibility
  setTranscriptContext(transcriptData: TranscriptData): void {
    // Simplified - no complex transcript processing
  }

  setContextualMemory(userId: string, sessionId: string): void {
    // Simplified - no complex memory management
  }

  setReasoningMode(enabled: boolean): void {
    // Simplified - no complex reasoning modes
  }

  async isApiAvailable(): Promise<boolean> {
    return this.isAvailable();
  }
}

export const backendChatService = new BackendChatService();