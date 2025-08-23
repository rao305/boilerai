/**
 * Tripwire middleware to block non-structured responses in development
 * Prevents generic LLM responses from reaching the frontend
 */
const { logger } = require('../utils/logger');

const FORCE_STRUCTURED_QA = String(process.env.FORCE_STRUCTURED_QA || '1') === '1';

module.exports = function antiChattyMiddleware(req, res, next) {
  if (!FORCE_STRUCTURED_QA) {
    return next();
  }

  // Intercept the res.json method to validate responses
  const originalJson = res.json.bind(res);
  
  res.json = function(payload) {
    // Only check successful responses for structure
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Check if response looks like structured data
      const isStructured = payload && 
        typeof payload === 'object' && 
        (
          // Valid structured response patterns
          payload.mode ||                           // Direct mode field
          (payload.success && payload.data?.mode) || // Wrapped with success
          payload.error ||                          // Error responses are acceptable
          req.path.includes('/health') ||           // Health checks are acceptable
          req.path.includes('/plan') ||             // Planning endpoints are acceptable
          payload.success === false                 // Explicit failures are acceptable
        );

      if (!isStructured) {
        // Check if it looks like a generic LLM response
        const isGenericLLM = payload && 
          (typeof payload === 'string' && payload.includes('I am a large language model')) ||
          (payload.response && typeof payload.response === 'string' && 
           payload.response.toLowerCase().includes('i am') &&
           payload.response.toLowerCase().includes('language model'));

        if (isGenericLLM) {
          logger.error('Blocked generic LLM response', {
            path: req.path,
            method: req.method,
            userId: req.body?.userId || 'anonymous',
            responseType: typeof payload,
            hasMode: !!payload.mode,
            payload: JSON.stringify(payload).substring(0, 200) + '...'
          });
          
          return originalJson({
            success: false,
            error: 'Blocked non-structured response',
            detail: 'Generic LLM responses are not allowed - use structured /qa endpoint',
            routing_hint: 'Check that request is properly routed through FastAPI gateway',
            payload_preview: JSON.stringify(payload).substring(0, 100)
          });
        }

        // Log warning for other non-structured responses but allow them through
        logger.warn('Non-structured response detected', {
          path: req.path,
          method: req.method,
          responseType: typeof payload,
          hasMode: !!payload.mode,
          hasSuccess: 'success' in payload
        });
      }
    }

    return originalJson(payload);
  };

  next();
};