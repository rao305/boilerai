// Pure AI Fallback System - No hardcoded messages, everything AI-generated
import { OpenAI } from 'openai';

interface AIFallbackConfig {
  systemContext: string;
  userContext?: any;
  errorContext?: string;
  serviceStatus?: 'offline' | 'limited' | 'error';
}

class PureAIFallbackSystem {
  private openaiClient: OpenAI | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initializeOpenAI();
  }

  private getUserApiKey(): string {
    // Use same logic as openaiChatService for consistent API key detection
    try {
      // First check session storage (for non-remembered keys)
      const sessionKey = sessionStorage.getItem('current_session_openai_key');
      if (sessionKey && sessionKey.length > 10) {
        return sessionKey;
      }

      // Then check user-specific storage (for remembered keys)
      // Note: We don't have user ID here, so we'll check legacy storage as fallback
      const legacyKey = localStorage.getItem('openai_api_key');
      if (legacyKey && legacyKey.length > 10) {
        return legacyKey;
      }

      // Environment key (typically empty in user API key model)
      const envKey = (window as any).VITE_OPENAI_API_KEY;
      if (envKey && envKey.length > 10) {
        return envKey;
      }

      return '';
    } catch (error) {
      console.error('Error getting user API key in fallback:', error);
      return '';
    }
  }

  private initializeOpenAI(): boolean {
    try {
      // Use the same API key detection logic as openaiChatService
      const apiKey = this.getUserApiKey();
      if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.length < 10) {
        return false;
      }

      // Ensure we have the global fetch properly bound
      const globalFetch = window.fetch.bind(window);

      this.openaiClient = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        fetch: globalFetch  // Explicitly bind fetch to prevent illegal invocation
      });
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AI fallback system:', error);
      return false;
    }
  }

  async generateContextualResponse(
    userMessage: string, 
    config: AIFallbackConfig
  ): Promise<string> {
    if (!this.initialized && !this.initializeOpenAI()) {
      // If no AI available, throw error to maintain pure AI approach
      throw new Error('AI_UNAVAILABLE');
    }

    try {
      const systemPrompt = this.buildSystemPrompt(config);
      
      // For rate limit errors, use most efficient model with minimal tokens
      const modelToUse = config.serviceStatus === 'error' && 
        (config.errorContext?.includes('rate limit') || config.errorContext?.includes('429'))
        ? 'gpt-4o-mini' : 'gpt-4o-mini'; // Use gpt-4o-mini for all fallback scenarios
      
      const maxTokens = config.serviceStatus === 'error' && 
        (config.errorContext?.includes('rate limit') || config.errorContext?.includes('429'))
        ? 50 : 200; // Reduced token usage for efficiency
      
      const response = await this.openaiClient!.chat.completions.create({
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: maxTokens,
        temperature: 0.1
      });

      return response.choices[0]?.message?.content || 'Unable to generate response';
    } catch (error: any) {
      console.error('AI fallback generation failed:', error);
      
      // Check for specific error types and provide more informative error messages
      if (error.message && (
        error.message.includes('rate limit') || 
        error.message.includes('429') ||
        error.message.includes('quota') ||
        error.message.includes('RateLimitError')
      )) {
        throw new Error('RATE_LIMIT_ERROR');
      }
      
      // Maintain pure AI approach - throw error instead of hardcoded responses
      throw new Error('AI_UNAVAILABLE');
    }
  }

  private buildSystemPrompt(config: AIFallbackConfig): string {
    let prompt = `You are BoilerAI, an academic advisor for Purdue University students. `;

    // Add context about current system state
    if (config.serviceStatus === 'offline') {
      prompt += `The main AI system is currently offline. `;
    } else if (config.serviceStatus === 'limited') {
      prompt += `You're running in limited mode. `;
    } else if (config.serviceStatus === 'error') {
      prompt += `There was a system error. `;
    }

    // Add error context if provided
    if (config.errorContext) {
      prompt += `Context: ${config.errorContext}. `;
    }

    // Core instructions
    prompt += `
Your role:
- Provide helpful academic guidance for Purdue undergraduate programs
- Be encouraging and supportive while being honest about limitations
- Focus on Computer Science, Data Science, and AI programs
- Never use technical jargon or mention system internals
- Keep responses conversational and helpful

Response guidelines:
- Acknowledge the current situation naturally
- Offer to help with what you can
- Ask clarifying questions to better assist
- Be warm and personable, not robotic
- Suggest alternative ways to get help if needed
- Never mention API keys, technical errors, or system details

Generate a natural, helpful response that addresses their query while being transparent about any current limitations.`;

    return prompt;
  }

  async generateErrorResponse(
    originalMessage: string,
    errorType: 'connection' | 'api_key' | 'rate_limit' | 'quota' | 'general',
    additionalContext?: string
  ): Promise<string> {
    const errorContextMap = {
      connection: "having trouble connecting to AI services",
      api_key: "experiencing authentication issues", 
      rate_limit: "receiving high request volume",
      quota: "approaching service limits",
      general: "experiencing technical difficulties"
    };

    const config: AIFallbackConfig = {
      systemContext: "error_handling",
      serviceStatus: 'error',
      errorContext: `${errorContextMap[errorType]}${additionalContext ? ': ' + additionalContext : ''}`
    };

    return this.generateContextualResponse(originalMessage, config);
  }

  async generateLimitedModeResponse(
    userMessage: string,
    missingCapability: string
  ): Promise<string> {
    const config: AIFallbackConfig = {
      systemContext: "limited_mode",
      serviceStatus: 'limited',
      errorContext: `Missing capability: ${missingCapability}`
    };

    return this.generateContextualResponse(userMessage, config);
  }

  async generateOfflineResponse(
    userMessage: string,
    serviceInfo?: string
  ): Promise<string> {
    const config: AIFallbackConfig = {
      systemContext: "offline_mode", 
      serviceStatus: 'offline',
      errorContext: serviceInfo
    };

    return this.generateContextualResponse(userMessage, config);
  }

  private generateBasicResponse(userMessage: string, config: AIFallbackConfig): string {
    // Return empty response when AI is unavailable - let the calling code handle this
    // This maintains pure AI-driven approach with no hardcoded responses
    throw new Error('AI_UNAVAILABLE');
  }



  // Check if the fallback system is available
  isAvailable(): boolean {
    return this.initialized;
  }

  // Force re-initialization (useful when API key is updated)
  reinitialize(): boolean {
    this.initialized = false;
    this.openaiClient = null;
    return this.initializeOpenAI();
  }

  // Generic generateResponse method for backward compatibility
  async generateResponse(
    userMessage: string, 
    context: 'academic' | 'general' = 'general',
    userData?: any
  ): Promise<string> {
    const config: AIFallbackConfig = {
      systemContext: context,
      userContext: userData,
      serviceStatus: 'limited'
    };

    return this.generateContextualResponse(userMessage, config);
  }
}

// Export singleton instance
export const pureAIFallback = new PureAIFallbackSystem();
export default pureAIFallback;

