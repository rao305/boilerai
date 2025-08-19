const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { secretManager } = require('../config/secrets');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ⚠️ API key routes removed for security and FERPA compliance
// API keys are handled client-side only - no backend storage of sensitive user data

// API Key validation endpoint (does not store keys, only validates them)
router.post('/validate-openai-key', async (req, res) => {
  console.log('🔍 API validation request received');
  try {
    const { apiKey } = req.body;
    console.log('📝 API key received:', { hasKey: !!apiKey, keyLength: apiKey?.length, keyPrefix: apiKey?.substring(0, 5) + '...' });
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        valid: false,
        reason: 'API key is required' 
      });
    }
    
    // Basic format validation
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      return res.status(400).json({ 
        success: false, 
        valid: false,
        reason: 'Invalid API key format. OpenAI keys must start with "sk-" and be at least 20 characters long.' 
      });
    }
    
    // DEVELOPMENT: Skip OpenAI validation to avoid rate limits during testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Development mode: Skipping OpenAI validation to avoid rate limits');
      return res.json({ 
        success: true, 
        valid: true, 
        status: 200,
        reason: 'Development mode: Validation skipped to prevent rate limits' 
      });
    }

    // Validate with OpenAI API (server-side to avoid CORS)
    const axios = require('axios');
    
    try {
      console.log('🔍 Validating API key with OpenAI...');
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'BoilerFn/1.0'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ OpenAI API response:', response.status);
      
      // Axios considers 2xx as success
      if (response.status >= 200 && response.status < 300) {
        console.log('🎉 API key is valid! Returning success response.');
        return res.json({ 
          success: true, 
          valid: true, 
          status: response.status,
          reason: 'API key is valid and authenticated with OpenAI.' 
        });
      }
      
    } catch (axiosError) {
      // Handle axios errors (which include HTTP error responses)
      if (axiosError.response) {
        // The request was made and the server responded with an error status code
        const status = axiosError.response.status;
        let reason = 'API key validation failed';
        
        if (status === 401) {
          reason = 'Invalid API key. Please check your OpenAI API key.';
          return res.json({ 
            success: true, 
            valid: false, 
            status: status,
            reason 
          });
        } else if (status === 429) {
          reason = 'Rate limit exceeded. Your API key is valid but temporarily rate limited.';
          // Treat rate limit as valid key
          return res.json({ 
            success: true, 
            valid: true, 
            status: status,
            reason 
          });
        } else if (status === 403) {
          reason = 'API key valid but access restricted. Check your OpenAI account permissions.';
          // Treat as valid key
          return res.json({ 
            success: true, 
            valid: true, 
            status: status,
            reason 
          });
        }
        
        return res.json({ 
          success: true, 
          valid: false, 
          status: status,
          reason 
        });
      } else {
        // Network error (no response received)
        console.error('❌ OpenAI API validation network error:', axiosError.message);
        return res.status(500).json({ 
          success: false, 
          valid: false,
          reason: 'Network error during validation. Please check your internet connection and try again.',
          networkError: true
        });
      }
    }
    
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({ 
      success: false, 
      valid: false,
      reason: 'Server error during validation. Please try again.' 
    });
  }
});

// Gemini API Key validation endpoint (does not store keys, only validates them)
router.post('/validate-gemini-key', async (req, res) => {
  console.log('🔍 Gemini API validation request received');
  try {
    const { apiKey } = req.body;
    console.log('📝 Gemini API key received:', { hasKey: !!apiKey, keyLength: apiKey?.length, keyPrefix: apiKey?.substring(0, 8) + '...' });
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        valid: false,
        reason: 'API key is required' 
      });
    }
    
    // Basic format validation for Gemini API keys
    if (apiKey.length < 30) {
      return res.status(400).json({ 
        success: false, 
        valid: false,
        reason: 'Invalid Gemini API key format. Gemini keys should be at least 30 characters long.' 
      });
    }
    
    // DEVELOPMENT: Skip Gemini validation to avoid rate limits during testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Development mode: Skipping Gemini validation to avoid rate limits');
      return res.json({ 
        success: true, 
        valid: true, 
        status: 200,
        reason: 'Development mode: Validation skipped to prevent rate limits' 
      });
    }

    // Validate with Gemini API (server-side to avoid CORS)
    const axios = require('axios');
    
    try {
      console.log('🔍 Validating API key with Gemini...');
      // Use a simple generative request to validate the key
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        contents: [{
          parts: [{
            text: "Hello"
          }]
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'BoilerFn/1.0'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('✅ Gemini API response:', response.status);
      
      // Axios considers 2xx as success
      if (response.status >= 200 && response.status < 300) {
        console.log('🎉 Gemini API key is valid! Returning success response.');
        return res.json({ 
          success: true, 
          valid: true, 
          status: response.status,
          reason: 'API key is valid and authenticated with Gemini.' 
        });
      }
      
    } catch (axiosError) {
      // Handle axios errors (which include HTTP error responses)
      if (axiosError.response) {
        // The request was made and the server responded with an error status code
        const status = axiosError.response.status;
        let reason = 'Gemini API key validation failed';
        
        if (status === 400) {
          const errorData = axiosError.response.data;
          if (errorData?.error?.message?.includes('API_KEY_INVALID')) {
            reason = 'Invalid Gemini API key. Please check your API key.';
            return res.json({ 
              success: true, 
              valid: false, 
              status: status,
              reason 
            });
          }
        } else if (status === 429) {
          reason = 'Rate limit exceeded. Your Gemini API key is valid but temporarily rate limited.';
          // Treat rate limit as valid key
          return res.json({ 
            success: true, 
            valid: true, 
            status: status,
            reason 
          });
        } else if (status === 403) {
          reason = 'Gemini API key valid but access restricted. Check your Google Cloud permissions.';
          // Treat as valid key
          return res.json({ 
            success: true, 
            valid: true, 
            status: status,
            reason 
          });
        }
        
        return res.json({ 
          success: true, 
          valid: false, 
          status: status,
          reason 
        });
      } else {
        // Network error (no response received)
        console.error('❌ Gemini API validation network error:', axiosError.message);
        return res.status(500).json({ 
          success: false, 
          valid: false,
          reason: 'Network error during validation. Please check your internet connection and try again.',
          networkError: true
        });
      }
    }
    
  } catch (error) {
    console.error('Gemini API key validation error:', error);
    return res.status(500).json({ 
      success: false, 
      valid: false,
      reason: 'Server error during validation. Please try again.' 
    });
  }
});

module.exports = router;