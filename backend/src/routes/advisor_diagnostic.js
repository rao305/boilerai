const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { requireLLMConfig, getLLMOptions } = require('../middleware/llmConfig');
const unifiedAIService = require('../services/unifiedAIService');

// Debug trace toggle - controlled by DEBUG_TRACE env var
const DEBUG_TRACE = process.env.DEBUG_TRACE === '1';

// Generate request ID for tracking
function generateRequestId() {
  return crypto.randomBytes(8).toString('hex');
}

// Enhanced chat endpoint with comprehensive diagnostic logging
router.post('/chat', requireLLMConfig, async (req, res) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    const { message, userId, sessionId } = req.body;
    const llmConfig = req.llmConfig || {};

    // DIAGNOSTIC LOG: Request details
    if (DEBUG_TRACE) {
      logger.info(`[${requestId}] DIAGNOSTIC: Request received`, {
        requestId,
        path: '/api/advisor/chat',
        method: 'POST',
        provider: llmConfig.provider,
        hasApiKey: !!llmConfig.apiKey,
        apiKeyLength: llmConfig.apiKey ? llmConfig.apiKey.length : 0,
        apiKeyPrefix: llmConfig.apiKey ? `${llmConfig.apiKey.substring(0, 10)}...` : 'none',
        model: llmConfig.model,
        userId: userId || 'anonymous',
        sessionId: sessionId || 'default',
        messageLength: message ? message.length : 0,
        messagePreview: message ? message.substring(0, 100) : 'none',
        timestamp: new Date().toISOString()
      });
    }

    // Validate required fields
    if (!message) {
      if (DEBUG_TRACE) {
        logger.warn(`[${requestId}] DIAGNOSTIC: Missing message in request`);
      }
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        requestId
      });
    }

    // Get LLM configuration from headers via middleware
    const llmOptions = getLLMOptions(req, {
      message: message,
      userId: userId || req.user?.id || 'anonymous',
      sessionId: sessionId || 'default'
    });

    // DIAGNOSTIC LOG: Router decision analysis
    if (DEBUG_TRACE) {
      logger.info(`[${requestId}] DIAGNOSTIC: Router Analysis`, {
        requestId,
        routerDecision: 'freeform_chat', // This is the issue!
        shouldUseT2SQL: false, // This should be analyzed
        shouldUsePlanner: false, // This should be analyzed  
        finalMode: 'unifiedAIService',
        systemPromptUsed: 'generic_chat', // This is the root cause!
        expectedMode: 'structured_qa', // What it should be
        detectedIntent: 'unknown', // Intent classification missing
        question: message,
        timestamp: new Date().toISOString()
      });
    }

    // DIAGNOSTIC LOG: System prompt being used
    const systemPromptPreview = 'You are a helpful AI assistant for Purdue University students.';
    if (DEBUG_TRACE) {
      logger.info(`[${requestId}] DIAGNOSTIC: System prompt`, {
        requestId,
        systemPromptPreview: systemPromptPreview.substring(0, 200),
        systemPromptType: 'generic_chat',
        expectedType: 't2sql_or_planner',
        isStructured: false,
        timestamp: new Date().toISOString()
      });
    }

    // Enhanced AI chat with provider selection support
    const response = await unifiedAIService.sendMessage(llmOptions);

    // DIAGNOSTIC LOG: Response analysis
    const responseLength = response ? response.length : 0;
    const responsePreview = response ? response.substring(0, 200) : '';
    const containsStructuredData = response && (response.includes('"mode"') || response.includes('"ast"') || response.includes('"sql"'));
    
    if (DEBUG_TRACE) {
      logger.info(`[${requestId}] DIAGNOSTIC: Response generated`, {
        requestId,
        provider: req.llmConfig.provider,
        responseLength,
        responsePreview,
        containsStructuredData,
        responseType: containsStructuredData ? 'structured' : 'freeform_prose',
        expectedType: 'structured',
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      // Log if this looks like marketing prose
      const isMarketingProse = response && (
        response.includes("Purdue's computer science program") ||
        response.includes("highly regarded") ||
        response.includes("cutting-edge") ||
        response.includes("world-class faculty")
      );
      
      if (isMarketingProse) {
        logger.warn(`[${requestId}] DIAGNOSTIC: MARKETING PROSE DETECTED`, {
          requestId,
          issue: 'freeform_marketing_prose',
          shouldBe: 'structured_db_response',
          responsePreview: responsePreview,
          timestamp: new Date().toISOString()
        });
      }
    }

    logger.info(`Chat message processed`, {
      provider: req.llmConfig.provider,
      userId: llmOptions.userId,
      hasModel: !!req.llmConfig.model,
      requestId,
      processingTimeMs: Date.now() - startTime
    });

    res.json({
      success: true,
      data: {
        response: response,
        provider: req.llmConfig.provider,
        model: req.llmConfig.model,
        timestamp: new Date().toISOString(),
        requestId,
        diagnostics: DEBUG_TRACE ? {
          routerUsed: 'freeform_chat',
          expectedRouter: 'structured_qa',
          systemPromptType: 'generic',
          responseType: containsStructuredData ? 'structured' : 'freeform'
        } : undefined
      }
    });

  } catch (error) {
    if (DEBUG_TRACE) {
      logger.error(`[${requestId}] DIAGNOSTIC: Error occurred`, {
        requestId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    
    logger.error('Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message: ' + (error.message || 'Unknown error'),
      requestId
    });
  }
});

// Debug endpoint to toggle trace logging
router.post('/debug/trace', (req, res) => {
  const { enabled } = req.body;
  process.env.DEBUG_TRACE = enabled ? '1' : '0';
  res.json({
    success: true,
    traceEnabled: process.env.DEBUG_TRACE === '1',
    message: `Debug tracing ${enabled ? 'enabled' : 'disabled'}`
  });
});

// Health check endpoint with diagnostic info
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Assistant service is running',
    diagnostics: {
      debugTraceEnabled: DEBUG_TRACE,
      currentRouter: 'unifiedAIService',
      expectedRouter: 'api_gateway_qa_endpoint',
      issue: 'using_wrong_service'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;