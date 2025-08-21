const axios = require('axios');
const { logger } = require('../utils/logger');

/**
 * Simple Unified AI Service - Basic API key routing without complex pattern matching
 * Supports both OpenAI (sk-*) and Gemini (AI*) API keys
 */

class UnifiedAIService {
  constructor() {
    this.providers = {
      openai: {
        baseURL: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        formatRequest: this.formatOpenAIRequest.bind(this),
        formatResponse: this.formatOpenAIResponse.bind(this)
      },
      gemini: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
        formatRequest: this.formatGeminiRequest.bind(this),
        formatResponse: this.formatGeminiResponse.bind(this)
      }
    };
    
    // Supported providers list
    this.supportedProviders = Object.keys(this.providers);
  }

  /**
   * Detect API key type based on prefix
   * @param {string} apiKey - The API key to analyze
   * @returns {string|null} - 'openai', 'gemini', or null if unknown
   */
  detectApiKeyType(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return null;
    }

    // OpenAI keys start with 'sk-'
    if (apiKey.startsWith('sk-')) {
      return 'openai';
    }

    // Gemini keys start with 'AI' followed by alphanumeric characters
    if (apiKey.match(/^AI[a-zA-Z0-9_-]+$/)) {
      return 'gemini';
    }

    // Could be other patterns for Gemini keys
    if (apiKey.length > 30 && apiKey.includes('AI')) {
      return 'gemini';
    }

    return null;
  }

  /**
   * Enhanced message sending with per-request provider selection
   * @param {Object} options - Message options (message, apiKey, provider, model, userId, sessionId)
   * @returns {Promise<string>} - The AI response
   */
  async sendMessage(options = {}) {
    const { message, apiKey, provider: explicitProvider, model, userId, sessionId } = options;
    
    // Use explicit provider if provided, otherwise detect from API key
    let detectedProvider = explicitProvider;
    if (!detectedProvider && apiKey) {
      detectedProvider = this.detectApiKeyType(apiKey);
    }
    
    if (!detectedProvider) {
      throw new Error('Provider must be specified or API key format must be recognizable. Supported: "openai", "gemini"');
    }

    if (!this.providers[detectedProvider]) {
      throw new Error(`Unsupported provider: ${detectedProvider}. Supported: ${Object.keys(this.providers).join(', ')}`);
    }

    if (!apiKey) {
      throw new Error(`API key is required for ${detectedProvider} provider`);
    }

    const systemPrompt = 'You are a helpful AI assistant for Purdue University students.';
    
    try {
      logger.info(`Using ${detectedProvider} provider for message`, { provider: detectedProvider, userId, explicitProvider: !!explicitProvider });
      
      const response = await this.generateResponse(message, apiKey, { systemPrompt, provider: detectedProvider, model });
      
      return response;
    } catch (error) {
      logger.error(`${detectedProvider} API error`, { 
        provider: detectedProvider, 
        error: error.message, 
        status: error.response?.status 
      });
      
      throw this.formatError(detectedProvider, error);
    }
  }

  /**
   * Generate AI response using the specified provider
   * @param {string} prompt - The prompt to send
   * @param {string} apiKey - The API key
   * @param {Object} options - Additional options (provider, model, systemPrompt, etc.)
   * @returns {Promise<string>} - The AI response
   */
  async generateResponse(prompt, apiKey, options = {}) {
    // Use explicit provider if provided, otherwise detect from API key
    let provider = options.provider;
    if (!provider) {
      provider = this.detectApiKeyType(apiKey);
    }
    
    if (!provider) {
      throw new Error('Provider must be specified or API key format must be recognizable. Supported: "openai", "gemini"');
    }

    if (!this.providers[provider]) {
      throw new Error(`Unsupported provider: ${provider}. Supported: ${Object.keys(this.providers).join(', ')}`);
    }

    const providerConfig = this.providers[provider];
    
    try {
      logger.info(`Using ${provider} provider for AI generation`, { provider, promptLength: prompt.length, explicitProvider: !!options.provider });
      
      const requestData = providerConfig.formatRequest(prompt, options);
      const response = await this.makeRequest(provider, apiKey, requestData, options);
      
      return providerConfig.formatResponse(response);
    } catch (error) {
      logger.error(`${provider} API error`, { 
        provider, 
        error: error.message, 
        status: error.response?.status 
      });
      
      throw this.formatError(provider, error);
    }
  }

  /**
   * Format OpenAI request
   */
  formatOpenAIRequest(prompt, options = {}) {
    return {
      model: options.model || this.providers.openai.model,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a helpful AI assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature || 0.3
    };
  }

  /**
   * Format Gemini request
   */
  formatGeminiRequest(prompt, options = {}) {
    const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant.';
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
    
    return {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.3,
        maxOutputTokens: options.maxTokens || 800,
        topP: 0.8,
        topK: 10
      }
    };
  }

  /**
   * Format OpenAI response
   */
  formatOpenAIResponse(response) {
    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * Format Gemini response
   */
  formatGeminiResponse(response) {
    return response.data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * Make HTTP request to the appropriate provider
   */
  async makeRequest(provider, apiKey, requestData, options = {}) {
    const providerConfig = this.providers[provider];
    let url = providerConfig.baseURL;
    let headers = {
      'Content-Type': 'application/json'
    };

    // Provider-specific configurations
    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['User-Agent'] = 'BoilerAI/2.0';
    } else if (provider === 'gemini') {
      // Use custom model if provided, otherwise use default
      const model = options.model || providerConfig.model;
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    }

    return await axios.post(url, requestData, {
      headers,
      timeout: options.timeout || 15000
    });
  }

  /**
   * Format error messages for different providers
   */
  formatError(provider, error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.message;

    if (provider === 'openai') {
      if (status === 401) {
        return new Error('Invalid OpenAI API key. Please check your API key in settings.');
      } else if (status === 429) {
        return new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
      } else if (status === 403) {
        return new Error('OpenAI API access denied. Please check your API key permissions.');
      }
    } else if (provider === 'gemini') {
      if (status === 400 && message?.includes('API_KEY_INVALID')) {
        return new Error('Invalid Gemini API key. Please check your API key in settings.');
      } else if (status === 429) {
        return new Error('Gemini rate limit exceeded. Please wait a moment and try again.');
      } else if (message?.includes('QUOTA_EXCEEDED')) {
        return new Error('Gemini API quota exceeded. Please check your usage limits.');
      }
    }

    return new Error(`${provider} API error: ${message}`);
  }
}

module.exports = new UnifiedAIService();