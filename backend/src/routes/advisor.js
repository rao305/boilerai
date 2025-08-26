const express = require('express');
const router = express.Router();
const axios = require('axios');
const { logger } = require('../utils/logger');
const { redactHeaders } = require('../utils/redact');
const { authenticateToken } = require('../middleware/auth');
const { requireLLMConfig, getLLMOptions } = require('../middleware/llmConfig');
const unifiedAIService = require('../services/unifiedAIService');
const knowledgeBaseAcademicAdvisor = require('../services/knowledgeBaseAcademicAdvisor');

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:8001';
const DISABLE_UNIFIED_AI_SERVICE = String(process.env.DISABLE_UNIFIED_AI_SERVICE || '0') === '1';
const FORCE_STRUCTURED_QA = String(process.env.FORCE_STRUCTURED_QA || '1') === '1';

function pickLLMHeaders(req) {
  // Pass-through BYO key/model; NEVER log these.
  const h = {};
  const p = req.get('X-LLM-Provider');
  const k = req.get('X-LLM-Api-Key');
  const m = req.get('X-LLM-Model');
  if (p) h['X-LLM-Provider'] = p;
  if (k) h['X-LLM-Api-Key'] = k;
  if (m) h['X-LLM-Model'] = m;
  return h;
}

// Enhanced chat endpoint - ALWAYS proxies to structured FastAPI gateway
router.post('/chat', requireLLMConfig, async (req, res) => {
  try {
    const question = 
      (typeof req.body?.question === 'string' && req.body.question.trim()) ||
      (Array.isArray(req.body?.messages) && req.body.messages.at(-1)?.content?.trim()) ||
      (typeof req.body?.message === 'string' && req.body.message.trim()) || '';
    
    const { userId, sessionId, profile_json } = req.body;

    // Validate required fields
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Missing question'
      });
    }

    // Use intelligent academic advisor if enabled, otherwise proxy to structured gateway
    if (!DISABLE_UNIFIED_AI_SERVICE) {
      // Use knowledge-base-only academic advisor with pure RAG integration
      logger.info('Using Knowledge Base Academic Advisor', {
        questionLength: question.length,
        userId: userId || 'anonymous',
        hasProfile: !!profile_json
      });

      const llmConfig = getLLMOptions(req);
      const advisorResponse = await knowledgeBaseAcademicAdvisor.advise(
        question,
        profile_json,
        llmConfig
      );

      return res.json({
        success: true,
        data: {
          content: advisorResponse.content,
          type: advisorResponse.type,
          mode: advisorResponse.mode || 'intelligent_advisor',
          withinScope: advisorResponse.withinScope !== false,
          advisorNote: advisorResponse.advisorNote,
          timestamp: new Date().toISOString(),
          routing: {
            service: 'intelligent_advisor',
            mode: advisorResponse.type || 'rag_enhanced'
          }
        }
      });
    } else {
      // Proxy to structured gateway
      try {
        logger.info('Proxying to API Gateway', {
          gatewayUrl: API_GATEWAY_URL,
          questionLength: question.length,
          userId: userId || 'anonymous',
          hasProfile: !!profile_json,
          headers: redactHeaders(req.headers)
        });

        const response = await axios.post(`${API_GATEWAY_URL}/qa`, {
          question,
          profile_json
        }, {
          headers: {
            'Content-Type': 'application/json',
            ...pickLLMHeaders(req)
          },
          timeout: 30000
        });
        
        const structuredData = response.data;
      
      // Guard: reject freeform responses lacking `mode`
      if (!structuredData || !structuredData.mode) {
        return res.status(502).json({ 
          success: false,
          error: 'Upstream returned non-structured payload', 
          data: structuredData 
        });
      }
      
      // Validate mode is one of our expected types
      const validModes = ['t2sql', 'planner', 'general_chat'];
      if (!validModes.includes(structuredData.mode)) {
        return res.status(502).json({
          success: false,
          error: 'Upstream returned invalid mode',
          mode: structuredData.mode,
          expected: validModes
        });
      }
      
      // Log successful structured response
      logger.info('Structured response received', {
        mode: structuredData.mode,
        hasRows: !!(structuredData.rows && structuredData.rows.length > 0),
        hasPlan: !!structuredData.plan,
        userId: userId || 'anonymous'
      });
      
      return res.json({
        success: true,
        data: {
          ...structuredData,
          provider: req.llmConfig?.provider,
          model: req.llmConfig?.model,
          timestamp: new Date().toISOString(),
          routing: { 
            service: 'api_gateway', 
            mode: structuredData.mode,
            endpoint: '/qa'
          }
        }
      });
    } catch (apiError) {
      logger.error('API Gateway proxy error', {
        error: apiError.message,
        status: apiError.response?.status,
        gatewayUrl: API_GATEWAY_URL,
        userId: userId || 'anonymous'
      });
      
      const status = apiError.response?.status || 502;
      const errorData = apiError.response?.data;
      
      return res.status(status).json({
        success: false,
        error: errorData?.error || 'Academic advisor service temporarily unavailable',
        service: 'api_gateway',
        fallback: false,  // No freeform fallback allowed
        retry: status >= 500
      });
    }
    } // End of else block for DISABLE_UNIFIED_AI_SERVICE

  } catch (error) {
    logger.error('Chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message: ' + (error.message || 'Unknown error')
    });
  }
});

// Legacy chat endpoint (backwards compatibility)
router.post('/chat-legacy', async (req, res) => {
  try {
    const { message, apiKey, userId, sessionId } = req.body;

    // Validate required fields
    if (!message || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Message and API key are required'
      });
    }

    // Legacy AI chat - auto-detect provider from API key
    const response = await unifiedAIService.sendMessage({
      message: message,
      apiKey: apiKey,
      userId: userId || 'anonymous',
      sessionId: sessionId || 'default'
    });

    logger.info(`Legacy chat message processed for user: ${userId}`);

    res.json({
      success: true,
      data: {
        response: response,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Legacy chat endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message: ' + (error.message || 'Unknown error')
    });
  }
});

// Optional planner proxy endpoint
router.post('/plan', async (req, res) => {
  try {
    const response = await axios.post(`${API_GATEWAY_URL}/plan/compute`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    logger.info('Planner request processed', {
      userId: req.body?.profile_json?.student_id || 'anonymous',
      hasPlan: !!response.data
    });
    
    return res.json({
      success: true,
      data: {
        ...response.data,
        service: 'planner',
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    logger.error('Planner proxy error', { error: e.message });
    return res.status(502).json({ 
      success: false,
      error: 'Planner service temporarily unavailable', 
      detail: e.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Assistant service is running',
    config: {
      apiGatewayUrl: API_GATEWAY_URL,
      unifiedAIDisabled: DISABLE_UNIFIED_AI_SERVICE,
      mode: DISABLE_UNIFIED_AI_SERVICE ? 'structured_proxy' : 'legacy_chat'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;