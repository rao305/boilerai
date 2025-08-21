const { logger } = require('../utils/logger');

/**
 * Middleware to extract LLM configuration from headers
 * Supports per-request provider selection with user BYO API keys
 */

const ALLOWED_PROVIDERS = ['openai', 'gemini'];

/**
 * Extract LLM configuration from request headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next middleware
 */
const extractLLMConfig = (req, res, next) => {
  // Extract LLM configuration from headers
  const provider = req.headers['x-llm-provider']?.toLowerCase().trim();
  const apiKey = req.headers['x-llm-api-key']?.trim();
  const model = req.headers['x-llm-model']?.trim();

  // Validate provider if specified
  if (provider && !ALLOWED_PROVIDERS.includes(provider)) {
    return res.status(400).json({
      error: 'Invalid LLM provider',
      details: `Provider '${provider}' not supported. Allowed providers: ${ALLOWED_PROVIDERS.join(', ')}`
    });
  }

  // Create LLM configuration object
  const llmConfig = {
    provider: provider || null,
    apiKey: apiKey || null,
    model: model || null,
    hasConfig: !!(provider || apiKey)
  };

  // Log configuration (without exposing the actual API key)
  if (llmConfig.hasConfig) {
    logger.info('LLM configuration extracted from headers', {
      provider: llmConfig.provider,
      hasApiKey: !!llmConfig.apiKey,
      keyLength: llmConfig.apiKey?.length,
      keyPrefix: llmConfig.apiKey ? llmConfig.apiKey.substring(0, 8) + '...' : 'none',
      model: llmConfig.model,
      requestId: req.requestId
    });
  }

  // Attach to request object for use in routes
  req.llmConfig = llmConfig;
  
  next();
};

/**
 * Middleware to require LLM configuration
 * Use this on routes that need LLM functionality
 */
const requireLLMConfig = (req, res, next) => {
  if (!req.llmConfig?.hasConfig) {
    return res.status(400).json({
      error: 'LLM configuration required',
      details: 'This endpoint requires LLM provider and API key to be specified in headers',
      headers: {
        'X-LLM-Provider': 'openai or gemini',
        'X-LLM-Api-Key': 'your-api-key',
        'X-LLM-Model': 'model-name (optional)'
      }
    });
  }

  // Validate that we have both provider and API key
  if (!req.llmConfig.provider || !req.llmConfig.apiKey) {
    return res.status(400).json({
      error: 'Incomplete LLM configuration',
      details: 'Both X-LLM-Provider and X-LLM-Api-Key headers are required'
    });
  }

  next();
};

/**
 * Helper function to get LLM options for UnifiedAIService
 * @param {Object} req - Express request object
 * @param {Object} additionalOptions - Additional options to merge
 * @returns {Object} - LLM options for UnifiedAIService
 */
const getLLMOptions = (req, additionalOptions = {}) => {
  const { provider, apiKey, model } = req.llmConfig || {};
  
  return {
    provider,
    apiKey, 
    model,
    userId: req.user?.id,
    sessionId: req.sessionId,
    ...additionalOptions
  };
};

module.exports = {
  extractLLMConfig,
  requireLLMConfig,
  getLLMOptions,
  ALLOWED_PROVIDERS
};