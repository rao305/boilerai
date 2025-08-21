/**
 * Header and data redaction utilities for logging security
 * NEVER log API keys or sensitive information
 */

/**
 * Redact sensitive headers for safe logging
 * @param {Object} headers - Request headers
 * @returns {Object} - Safe headers for logging
 */
function redactHeaders(headers) {
  const safe = { ...headers };
  
  // Redact API keys
  if (safe['x-llm-api-key']) {
    const key = safe['x-llm-api-key'];
    safe['x-llm-api-key'] = key.length > 10 ? `${key.substring(0, 8)}...***REDACTED***` : '***REDACTED***';
  }
  
  // Redact other sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'x-api-key', 
    'x-auth-token',
    'cookie',
    'set-cookie'
  ];
  
  sensitiveHeaders.forEach(header => {
    if (safe[header]) {
      safe[header] = '***REDACTED***';
    }
  });
  
  return safe;
}

/**
 * Redact sensitive request data for logging
 * @param {Object} req - Express request object  
 * @returns {Object} - Safe request data for logging
 */
function redactRequest(req) {
  return {
    method: req.method,
    path: req.path,
    headers: redactHeaders(req.headers),
    body: redactBody(req.body),
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
}

/**
 * Redact sensitive body data
 * @param {Object} body - Request body
 * @returns {Object} - Safe body for logging
 */
function redactBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const safe = { ...body };
  
  // Redact sensitive fields
  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'key'
  ];
  
  sensitiveFields.forEach(field => {
    if (safe[field]) {
      safe[field] = '***REDACTED***';
    }
  });
  
  // Truncate long messages for logging
  if (safe.message && safe.message.length > 200) {
    safe.message = safe.message.substring(0, 200) + '...(truncated)';
  }
  
  if (safe.question && safe.question.length > 200) {
    safe.question = safe.question.substring(0, 200) + '...(truncated)';
  }
  
  return safe;
}

module.exports = {
  redactHeaders,
  redactRequest,
  redactBody
};