// Unified chat service that abstracts between OpenAI and Gemini
import { openaiChatService } from './openaiChatService';
import { geminiChatService } from './geminiChatService';
import { backendChatService } from './backendChatService';
import { TranscriptData } from '@/types';
import { AIReasoningResponse } from '@/types/thinking';
import { logger } from '@/utils/logger';
import type { StudentProfile, DataContainer } from '@/types/common';

type AIProvider = 'openai' | 'gemini' | 'backend';

interface EnhancedContext {
  studentProfile: StudentProfile | null;
  contextPrompt: string;
  transcriptData: TranscriptData | null;
}

class UnifiedChatService {
  private selectedProvider: AIProvider | null = null;
  private reasoningMode: boolean = false;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    // Check which providers are available and select the best one
    const validationStatus = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
    
    // PREFER BACKEND ROUTING to fix Gemini API communication issues
    if (backendChatService.isAvailable()) {
      this.selectedProvider = 'backend';
      logger.info('Unified chat service initialized with backend-routed provider (fixes direct API call issues)', 'UNIFIED');
    } else if (validationStatus.gemini && geminiChatService.isAvailable()) {
      this.selectedProvider = 'gemini';
      logger.info('Unified chat service initialized with Gemini provider (direct API calls)', 'UNIFIED');
    } else if (validationStatus.openai && openaiChatService.isAvailable()) {
      this.selectedProvider = 'openai';
      logger.info('Unified chat service initialized with OpenAI provider (direct API calls)', 'UNIFIED');
    } else {
      this.selectedProvider = null;
      logger.warn('No AI providers available', 'UNIFIED');
    }
  }

  private getActiveService() {
    if (this.selectedProvider === 'backend') {
      return backendChatService;
    } else if (this.selectedProvider === 'openai') {
      return openaiChatService;
    } else if (this.selectedProvider === 'gemini') {
      return geminiChatService;
    }
    return null;
  }

  private async tryFallbackProvider(message: string, userId: string, sessionId?: string): Promise<string> {
    logger.warn(`Primary provider (${this.selectedProvider}) failed, attempting fallback`, 'UNIFIED');
    
    // Smart fallback strategy - try backend routing first, then direct API calls
    if (this.selectedProvider !== 'backend' && backendChatService.isAvailable()) {
      logger.info('Falling back to backend-routed provider', 'UNIFIED');
      this.selectedProvider = 'backend';
      return await backendChatService.sendMessage(message, userId, sessionId);
    } else if (this.selectedProvider === 'openai' && geminiChatService.isAvailable()) {
      logger.info('Falling back to Gemini provider', 'UNIFIED');
      this.selectedProvider = 'gemini';
      return await geminiChatService.sendMessage(message, userId, sessionId);
    } else if (this.selectedProvider === 'gemini' && openaiChatService.isAvailable()) {
      logger.info('Falling back to OpenAI provider', 'UNIFIED');
      this.selectedProvider = 'openai';
      return await openaiChatService.sendMessage(message, userId, sessionId);
    }
    
    throw new Error('All AI providers are unavailable');
  }

  private async tryFallbackProviderWithReasoning(message: string, userId: string, sessionId?: string): Promise<AIReasoningResponse> {
    logger.warn(`Primary provider (${this.selectedProvider}) failed, attempting fallback for reasoning`, 'UNIFIED');
    
    // Smart fallback strategy for reasoning - try backend routing first
    if (this.selectedProvider !== 'backend' && backendChatService.isAvailable()) {
      logger.info('Falling back to backend-routed provider for reasoning', 'UNIFIED');
      this.selectedProvider = 'backend';
      return await backendChatService.sendMessageWithReasoning(message, userId, sessionId);
    } else if (this.selectedProvider === 'openai' && geminiChatService.isAvailable()) {
      logger.info('Falling back to Gemini provider for reasoning', 'UNIFIED');
      this.selectedProvider = 'gemini';
      return await geminiChatService.sendMessageWithReasoning(message, userId, sessionId);
    } else if (this.selectedProvider === 'gemini' && openaiChatService.isAvailable()) {
      logger.info('Falling back to OpenAI provider for reasoning', 'UNIFIED');
      this.selectedProvider = 'openai';
      return await openaiChatService.sendMessageWithReasoning(message, userId, sessionId);
    }
    
    throw new Error('All AI providers are unavailable');
  }

  // Main chat interface
  async sendMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    // Reinitialize if no provider is selected
    if (!this.selectedProvider) {
      this.initializeProvider();
    }

    const activeService = this.getActiveService();
    if (!activeService) {
      return `No AI providers are currently available. Please configure either OpenAI or Gemini API keys in Settings.

💡 Quick setup:
- Gemini: Free with generous limits at https://aistudio.google.com/app/apikey
- OpenAI: Pay-as-you-go at https://platform.openai.com/api-keys

Once you add an API key, your AI features will be unlocked!`;
    }

    try {
      const response = await activeService.sendMessage(message, userId, sessionId);
      logger.info(`Message sent successfully via ${this.selectedProvider}`, 'UNIFIED');
      return response;
    } catch (error: any) {
      logger.error(`${this.selectedProvider} provider failed:`, 'UNIFIED', error);
      
      // Try fallback if the error suggests API issues
      if (error.status === 429 || error.status === 401 || error.status === 402 || error.message?.includes('quota') || error.message?.includes('API_KEY')) {
        try {
          return await this.tryFallbackProvider(message, userId, sessionId);
        } catch (fallbackError) {
          logger.error('Fallback provider also failed:', 'UNIFIED', fallbackError);
          // Return the original error message with fallback info
          return `${error.message || 'AI service temporarily unavailable'}

🔄 We tried switching to backup providers, but all are currently unavailable. Please:
1. Check your API keys in Settings
2. Ensure you have credits/quota available
3. Try again in a few moments

Provider status: ${this.selectedProvider} (primary) - failed`;
        }
      }

      throw error;
    }
  }

  // Reasoning interface
  async sendMessageWithReasoning(message: string, userId: string, sessionId?: string): Promise<AIReasoningResponse> {
    // Reinitialize if no provider is selected
    if (!this.selectedProvider) {
      this.initializeProvider();
    }

    const activeService = this.getActiveService();
    if (!activeService) {
      return {
        thinking_steps: [{
          id: 'no-provider',
          title: 'analyze',
          content: 'No AI providers configured - please add API keys in Settings',
          status: 'completed',
          timestamp: new Date()
        }],
        final_response: `No AI providers are currently available. Please configure either OpenAI or Gemini API keys in Settings.

💡 Quick setup:
- Gemini: Free with generous limits at https://aistudio.google.com/app/apikey
- OpenAI: Pay-as-you-go at https://platform.openai.com/api-keys

Once you add an API key, your AI features will be unlocked!`,
        reasoning_time: 0,
        model_used: 'none'
      };
    }

    try {
      const response = await activeService.sendMessageWithReasoning(message, userId, sessionId);
      logger.info(`Reasoning message sent successfully via ${this.selectedProvider}`, 'UNIFIED');
      return response;
    } catch (error: any) {
      logger.error(`${this.selectedProvider} provider failed for reasoning:`, 'UNIFIED', error);
      
      // Try fallback if the error suggests API issues
      if (error.status === 429 || error.status === 401 || error.status === 402 || error.message?.includes('quota') || error.message?.includes('API_KEY')) {
        try {
          return await this.tryFallbackProviderWithReasoning(message, userId, sessionId);
        } catch (fallbackError) {
          logger.error('Fallback provider also failed for reasoning:', 'UNIFIED', fallbackError);
          // Return error reasoning response
          return {
            thinking_steps: [{
              id: 'provider-error',
              title: 'analyze',
              content: 'All AI providers failed - API quota or key issues detected',
              status: 'completed',
              timestamp: new Date()
            }],
            final_response: `${error.message || 'AI service temporarily unavailable'}

🔄 We tried switching to backup providers, but all are currently unavailable. Please:
1. Check your API keys in Settings
2. Ensure you have credits/quota available
3. Try again in a few moments

Provider status: ${this.selectedProvider} (primary) - failed`,
            reasoning_time: 0,
            model_used: 'error-fallback'
          };
        }
      }

      throw error;
    }
  }

  // Provider management
  setProvider(provider: AIProvider): boolean {
    const service = provider === 'openai' ? openaiChatService : geminiChatService;
    if (service.isAvailable()) {
      this.selectedProvider = provider;
      logger.info(`Switched to ${provider} provider`, 'UNIFIED');
      return true;
    }
    logger.warn(`Cannot switch to ${provider} - provider not available`, 'UNIFIED');
    return false;
  }

  getCurrentProvider(): AIProvider | null {
    return this.selectedProvider;
  }

  getAvailableProviders(): AIProvider[] {
    const available: AIProvider[] = [];
    if (openaiChatService.isAvailable()) available.push('openai');
    if (geminiChatService.isAvailable()) available.push('gemini');
    return available;
  }

  isAvailable(): boolean {
    return this.getActiveService()?.isAvailable() || false;
  }

  async isApiAvailable(): Promise<boolean> {
    const activeService = this.getActiveService();
    return activeService ? await activeService.isApiAvailable() : false;
  }

  // Context management - delegates to active service
  setTranscriptContext(transcriptData: TranscriptData): void {
    const activeService = this.getActiveService();
    if (activeService) {
      activeService.setTranscriptContext(transcriptData);
    }
    
    // Also set on both services for seamless switching
    openaiChatService.setTranscriptContext(transcriptData);
    geminiChatService.setTranscriptContext(transcriptData);
  }

  setEnhancedContext(context: EnhancedContext): void {
    const activeService = this.getActiveService();
    if (activeService) {
      activeService.setEnhancedContext(context);
    }
    
    // Also set on both services for seamless switching
    openaiChatService.setEnhancedContext(context);
    geminiChatService.setEnhancedContext(context);
  }

  setContextualMemory(userId: string, sessionId: string): void {
    const activeService = this.getActiveService();
    if (activeService) {
      activeService.setContextualMemory(userId, sessionId);
    }
    
    // Also set on both services for seamless switching
    openaiChatService.setContextualMemory(userId, sessionId);
    geminiChatService.setContextualMemory(userId, sessionId);
  }

  getEnhancedContext(): EnhancedContext | null {
    const activeService = this.getActiveService();
    return activeService ? activeService.getEnhancedContext() : null;
  }

  clearEnhancedContext(): void {
    const activeService = this.getActiveService();
    if (activeService) {
      activeService.clearEnhancedContext();
    }
    
    // Also clear on both services
    openaiChatService.clearEnhancedContext();
    geminiChatService.clearEnhancedContext();
  }

  // Reasoning mode controls
  setReasoningMode(enabled: boolean): void {
    this.reasoningMode = enabled;
    
    // Set on both services
    openaiChatService.setReasoningMode(enabled);
    geminiChatService.setReasoningMode(enabled);
  }

  getReasoningMode(): boolean {
    return this.reasoningMode;
  }

  // Reinitialize providers (useful after API key changes)
  reinitialize(): void {
    this.initializeProvider();
    
    // Force both services to reinitialize
    (openaiChatService as any).initializeOpenAI?.();
    (geminiChatService as any).initializeGemini?.();
    
    logger.info('Unified chat service reinitialized', 'UNIFIED');
  }

  // Get service status for debugging
  getStatus(): {
    selectedProvider: AIProvider | null;
    availableProviders: AIProvider[];
    isActive: boolean;
    reasoningMode: boolean;
  } {
    return {
      selectedProvider: this.selectedProvider,
      availableProviders: this.getAvailableProviders(),
      isActive: this.isAvailable(),
      reasoningMode: this.reasoningMode
    };
  }
}

export const unifiedChatService = new UnifiedChatService();

// Debug function for troubleshooting - accessible from browser console
if (typeof window !== 'undefined') {
  (window as any).debugUnifiedChat = {
    getStatus: () => unifiedChatService.getStatus(),
    setProvider: (provider: string) => unifiedChatService.setProvider(provider as AIProvider),
    reinitialize: () => unifiedChatService.reinitialize(),
    testMessage: async (message: string) => {
      try {
        const response = await unifiedChatService.sendMessage(message, 'debug-user');
        console.log('Test response:', response);
        return response;
      } catch (error) {
        console.error('Test failed:', error);
        return error;
      }
    }
  };
}

export default unifiedChatService;