const fs = require('fs');
const path = require('path');

class SecurityLogger {
  constructor() {
    this.logFile = path.join(__dirname, '../../security.log');
    this.ensureLogFile();
  }

  ensureLogFile() {
    try {
      if (!fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '');
      }
    } catch (error) {
      console.error('Failed to create security log file:', error);
    }
  }

  log(event, details, req = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      ip: req?.ip || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown',
      url: req?.originalUrl || 'unknown',
      method: req?.method || 'unknown'
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔒 Security Event:', logEntry);
    }

    // Append to security log file
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to security log:', error);
    }
  }

  // Specific event loggers
  loginAttempt(email, success, req) {
    this.log('LOGIN_ATTEMPT', {
      email,
      success,
      reason: success ? 'valid_credentials' : 'invalid_credentials'
    }, req);
  }

  registrationAttempt(email, success, reason, req) {
    this.log('REGISTRATION_ATTEMPT', {
      email,
      success,
      reason
    }, req);
  }

  fileUpload(filename, filesize, mimetype, success, req) {
    this.log('FILE_UPLOAD', {
      filename,
      filesize,
      mimetype,
      success
    }, req);
  }

  suspiciousActivity(activity, details, req) {
    this.log('SUSPICIOUS_ACTIVITY', {
      activity,
      details
    }, req);
  }

  authenticationFailure(reason, details, req) {
    this.log('AUTH_FAILURE', {
      reason,
      details
    }, req);
  }

  rateLimitExceeded(endpoint, limit, req) {
    this.log('RATE_LIMIT_EXCEEDED', {
      endpoint,
      limit,
      consecutiveAttempts: req.rateLimit?.current || 'unknown'
    }, req);
  }

  emailVerification(email, success, req) {
    this.log('EMAIL_VERIFICATION', {
      email,
      success
    }, req);
  }
}

module.exports = new SecurityLogger();