// Simple unified chat service for OpenAI and Gemini API keys
import { openaiChatService } from './openaiChatService';
import { geminiChatService } from './geminiChatService';
import { TranscriptData } from '@/types';
import { AIReasoningResponse } from '@/types/thinking';
import { logger } from '@/utils/logger';
import { rateLimitManager } from './rateLimitManager';
import type { StudentProfile, DataContainer } from '@/types/common';

type AIProvider = 'openai' | 'gemini';

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
    // Provider selection based on user preference and availability
    const validationStatus = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}');
    const userKeys = JSON.parse(localStorage.getItem('user_api_keys') || '[]');
    
    // Find the most recently added valid key (user's preferred choice)
    let preferredProvider: AIProvider | null = null;
    if (userKeys.length > 0) {
      const latestKey = userKeys[userKeys.length - 1];
      if (latestKey.provider === 'gemini' && validationStatus.gemini && geminiChatService.isAvailable()) {
        preferredProvider = 'gemini';
      } else if (latestKey.provider === 'openai' && validationStatus.openai && openaiChatService.isAvailable()) {
        preferredProvider = 'openai';
      }
    }
    
    // Use preferred provider or fallback to any available provider
    if (preferredProvider) {
      this.selectedProvider = preferredProvider;
      logger.info(`Unified chat service initialized with ${preferredProvider} provider (user preference)`, 'UNIFIED');
    } else if (validationStatus.gemini && geminiChatService.isAvailable()) {
      this.selectedProvider = 'gemini';
      logger.info('Unified chat service initialized with Gemini provider', 'UNIFIED');
    } else if (validationStatus.openai && openaiChatService.isAvailable()) {
      this.selectedProvider = 'openai';
      logger.info('Unified chat service initialized with OpenAI provider', 'UNIFIED');
    } else {
      this.selectedProvider = null;
      logger.warn('No AI providers available', 'UNIFIED');
    }
  }

  private getActiveService() {
    if (this.selectedProvider === 'openai') {
      return openaiChatService;
    } else if (this.selectedProvider === 'gemini') {
      return geminiChatService;
    }
    return null;
  }

  // Intelligent provider selection based on rate limits and availability
  private selectBestProvider(message: string): AIProvider | null {
    const availableProviders = this.getAvailableProviders();
    if (availableProviders.length === 0) return null;

    // Estimate tokens for the message
    const estimatedTokens = Math.ceil(message.length / 4) + 1500; // Rough estimation

    // Check rate limits for each available provider
    const providerScores: { provider: AIProvider; score: number }[] = [];

    for (const provider of availableProviders) {
      const status = rateLimitManager.getProviderStatus(provider);
      let score = 100; // Base score

      // Penalize throttled providers heavily
      if (status.isThrottled) {
        score -= 90;
      }

      // Penalize providers with high usage
      const recentUsageRatio = status.recentRequests / (provider === 'gemini' ? 1000 : 500);
      score -= recentUsageRatio * 30;

      const tokenUsageRatio = status.recentTokens / (provider === 'gemini' ? 1000000 : 30000);
      score -= tokenUsageRatio * 40;

      // Penalize providers with consecutive errors
      score -= status.consecutiveErrors * 20;

      // Bonus for preferred provider (if user has a preference)
      if (provider === this.selectedProvider) {
        score += 10;
      }

      providerScores.push({ provider, score });
    }

    // Sort by score and return the best provider
    providerScores.sort((a, b) => b.score - a.score);
    const bestProvider = providerScores[0];

    logger.info('Provider selection analysis', 'UNIFIED', {
      scores: providerScores,
      selected: bestProvider.provider,
      currentProvider: this.selectedProvider
    });

    return bestProvider.score > 0 ? bestProvider.provider : null;
  }

  private async tryFallbackProvider(message: string, userId: string, sessionId?: string): Promise<string> {
    logger.warn(`Primary provider (${this.selectedProvider}) failed, attempting fallback`, 'UNIFIED');
    
    // Simple fallback strategy between OpenAI and Gemini
    if (this.selectedProvider === 'openai' && geminiChatService.isAvailable()) {
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
    
    // Simple fallback strategy for reasoning
    if (this.selectedProvider === 'openai' && geminiChatService.isAvailable()) {
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
    // Use intelligent provider selection
    const bestProvider = this.selectBestProvider(message);
    if (!bestProvider) {
      return `No AI providers are currently available. Please configure either OpenAI or Gemini API keys in Settings.

💡 Quick setup:
- Gemini: Free with generous limits at https://aistudio.google.com/app/apikey
- OpenAI: Pay-as-you-go at https://platform.openai.com/api-keys

Once you add an API key, your AI features will be unlocked!`;
    }

    // Switch to best provider if different from current
    if (bestProvider !== this.selectedProvider) {
      logger.info(`Switching from ${this.selectedProvider} to ${bestProvider} for better performance`, 'UNIFIED');
      this.selectedProvider = bestProvider;
    }

    const activeService = this.getActiveService();

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
          
          // Get current status of all providers for detailed error message
          const providerStatuses = this.getAvailableProviders().map(provider => {
            const status = rateLimitManager.getProviderStatus(provider);
            return {
              provider,
              throttled: status.isThrottled,
              throttleUntil: status.throttleUntil,
              recentRequests: status.recentRequests,
              errors: status.consecutiveErrors
            };
          });

          return `${error.message || 'AI service temporarily unavailable'}

🔄 We tried switching to backup providers, but all are currently unavailable.

📊 Provider Status:
${providerStatuses.map(p => 
  `• ${p.provider.toUpperCase()}: ${p.throttled ? `Throttled until ${p.throttleUntil?.toLocaleTimeString()}` : `${p.recentRequests} recent requests${p.errors ? `, ${p.errors} errors` : ''}`}`
).join('\n')}

💡 What to do:
1. Check your API keys in Settings
2. Ensure you have credits/quota available  
3. Wait ${Math.max(...providerStatuses.filter(p => p.throttled).map(p => Math.ceil((p.throttleUntil!.getTime() - Date.now()) / 60000))) || 5} minutes and try again
4. Consider using a different provider if available

The system will automatically retry when providers become available.`;
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

  // Simple context management
  setTranscriptContext(transcriptData: TranscriptData): void {
    const activeService = this.getActiveService();
    if (activeService && activeService.setTranscriptContext) {
      activeService.setTranscriptContext(transcriptData);
    }
    
    // Also set on both services for seamless switching
    if (openaiChatService.setTranscriptContext) openaiChatService.setTranscriptContext(transcriptData);
    if (geminiChatService.setTranscriptContext) geminiChatService.setTranscriptContext(transcriptData);
  }

  setEnhancedContext(context: EnhancedContext): void {
    const activeService = this.getActiveService();
    if (activeService && activeService.setEnhancedContext) {
      activeService.setEnhancedContext(context);
    }
    
    // Also set on both services for seamless switching
    if (openaiChatService.setEnhancedContext) openaiChatService.setEnhancedContext(context);
    if (geminiChatService.setEnhancedContext) geminiChatService.setEnhancedContext(context);
  }

  setContextualMemory(userId: string, sessionId: string): void {
    const activeService = this.getActiveService();
    if (activeService && activeService.setContextualMemory) {
      activeService.setContextualMemory(userId, sessionId);
    }
    
    // Also set on both services for seamless switching
    if (openaiChatService.setContextualMemory) openaiChatService.setContextualMemory(userId, sessionId);
    if (geminiChatService.setContextualMemory) geminiChatService.setContextualMemory(userId, sessionId);
  }

  getEnhancedContext(): EnhancedContext | null {
    const activeService = this.getActiveService();
    return activeService && activeService.getEnhancedContext ? activeService.getEnhancedContext() : null;
  }

  clearEnhancedContext(): void {
    const activeService = this.getActiveService();
    if (activeService && activeService.clearEnhancedContext) {
      activeService.clearEnhancedContext();
    }
    
    // Also clear on both services
    if (openaiChatService.clearEnhancedContext) openaiChatService.clearEnhancedContext();
    if (geminiChatService.clearEnhancedContext) geminiChatService.clearEnhancedContext();
  }

  // Reasoning mode controls
  setReasoningMode(enabled: boolean): void {
    this.reasoningMode = enabled;
    
    // Set on both services if they support it
    if (openaiChatService.setReasoningMode) openaiChatService.setReasoningMode(enabled);
    if (geminiChatService.setReasoningMode) geminiChatService.setReasoningMode(enabled);
  }

  getReasoningMode(): boolean {
    return this.reasoningMode;
  }

  // Force provider selection (for testing/debugging)
  forceProvider(provider: AIProvider): boolean {
    if (provider === 'gemini' && geminiChatService.isAvailable()) {
      this.selectedProvider = 'gemini';
      logger.info('Forced provider selection to Gemini', 'UNIFIED');
      return true;
    } else if (provider === 'openai' && openaiChatService.isAvailable()) {
      this.selectedProvider = 'openai';
      logger.info('Forced provider selection to OpenAI', 'UNIFIED');
      return true;
    }
    return false;
  }

  // Reinitialize providers (useful after API key changes)
  reinitialize(): void {
    this.initializeProvider();
    
    // Force both services to reinitialize if they support it
    if ((openaiChatService as any).initializeOpenAI) (openaiChatService as any).initializeOpenAI();
    if ((geminiChatService as any).initializeGemini) (geminiChatService as any).initializeGemini();
    
    logger.info('Unified chat service reinitialized', 'UNIFIED');
  }

  // Get service status for debugging
  getStatus(): {
    selectedProvider: AIProvider | null;
    availableProviders: AIProvider[];
    isActive: boolean;
    reasoningMode: boolean;
    rateLimitStatus: Record<string, any>;
  } {
    const rateLimitStatus: Record<string, any> = {};
    this.getAvailableProviders().forEach(provider => {
      rateLimitStatus[provider] = rateLimitManager.getProviderStatus(provider);
    });

    return {
      selectedProvider: this.selectedProvider,
      availableProviders: this.getAvailableProviders(),
      isActive: this.isAvailable(),
      reasoningMode: this.reasoningMode,
      rateLimitStatus
    };
  }

  // Get detailed quota information for monitoring
  getQuotaStatus(): Record<AIProvider, {
    provider: AIProvider;
    isThrottled: boolean;
    throttleUntil?: Date;
    usage: {
      requestsPerMinute: number;
      tokensPerMinute: number;
      requestsPerDay: number;
      tokensPerDay: number;
    };
    limits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
      requestsPerDay: number;
      tokensPerDay: number;
    };
    health: {
      consecutiveErrors: number;
      lastErrorTime?: Date;
    };
  }> {
    const status: any = {};
    
    ['openai', 'gemini'].forEach(provider => {
      const providerStatus = rateLimitManager.getProviderStatus(provider as AIProvider);
      const limits = provider === 'gemini' 
        ? { requestsPerMinute: 1000, tokensPerMinute: 1000000, requestsPerDay: 50000, tokensPerDay: 4000000 }
        : { requestsPerMinute: 500, tokensPerMinute: 30000, requestsPerDay: 10000, tokensPerDay: 1000000 };
      
      status[provider] = {
        provider,
        isThrottled: providerStatus.isThrottled,
        throttleUntil: providerStatus.throttleUntil,
        usage: {
          requestsPerMinute: providerStatus.recentRequests,
          tokensPerMinute: providerStatus.recentTokens,
          requestsPerDay: providerStatus.dailyRequests,
          tokensPerDay: providerStatus.dailyTokens
        },
        limits,
        health: {
          consecutiveErrors: providerStatus.consecutiveErrors
        }
      };
    });
    
    return status;
  }
}

export const unifiedChatService = new UnifiedChatService();

// Debug function for troubleshooting - accessible from browser console
if (typeof window !== 'undefined') {
  (window as any).debugUnifiedChat = {
    getStatus: () => unifiedChatService.getStatus(),
    getQuotaStatus: () => unifiedChatService.getQuotaStatus(),
    setProvider: (provider: string) => unifiedChatService.setProvider(provider as AIProvider),
    forceProvider: (provider: string) => unifiedChatService.forceProvider(provider as AIProvider),
    reinitialize: () => unifiedChatService.reinitialize(),
    checkRateLimits: () => {
      const status = unifiedChatService.getQuotaStatus();
      console.table(status);
      return status;
    },
    testMessage: async (message: string) => {
      try {
        const response = await unifiedChatService.sendMessage(message, 'debug-user');
        console.log('Test response:', response);
        return response;
      } catch (error) {
        console.error('Test failed:', error);
        return error;
      }
    },
    testReasoning: async (message: string) => {
      try {
        const response = await unifiedChatService.sendMessageWithReasoning(message, 'debug-user');
        console.log('Test reasoning response:', response);
        return response;
      } catch (error) {
        console.error('Test reasoning failed:', error);
        return error;
      }
    },
    simulateQuotaError: (provider: string) => {
      // Simulate quota error for testing
      const error = new Error('QUOTA_EXCEEDED');
      (error as any).status = 429;
      rateLimitManager.recordError(provider, error);
      console.log(`Simulated quota error for ${provider}`);
      return rateLimitManager.getProviderStatus(provider);
    }
  };
}

export default unifiedChatService;