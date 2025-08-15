const crypto = require('crypto');

// Middleware to add unique request ID to each request
const requestId = (req, res, next) => {
  // Generate unique request ID
  const id = crypto.randomBytes(16).toString('hex');
  
  // Add to request object
  req.requestId = id;
  
  // Add to response headers for debugging
  res.setHeader('X-Request-ID', id);
  
  // Override console methods to include request ID
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  req.log = (...args) => originalConsoleLog(`[${id}]`, ...args);
  req.error = (...args) => originalConsoleError(`[${id}]`, ...args);
  req.warn = (...args) => originalConsoleWarn(`[${id}]`, ...args);
  
  next();
};

module.exports = requestId;