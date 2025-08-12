const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Encrypt API key for storage
const encryptApiKey = (apiKey) => {
  return bcrypt.hashSync(apiKey, 10);
};

// Store/Update API key
router.post('/api-key', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.body;
    const userId = req.user.id;

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid API key format. Must start with sk-'
      });
    }

    // Validate API key by making a test request
    try {
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!testResponse.ok) {
        return res.status(400).json({
          success: false,
          message: 'Invalid API key. Please check your OpenAI API key.'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Unable to validate API key. Please check your connection and key.'
      });
    }

    // Store encrypted API key in user record
    const encryptedKey = encryptApiKey(apiKey);
    
    await User.findByIdAndUpdate(userId, {
      openaiApiKey: encryptedKey,
      hasApiKey: true,
      apiKeyUpdatedAt: new Date()
    });

    // Trigger AI service to use the new API key
    try {
      // Send to bridge service if available
      await fetch('http://localhost:5003/api-key/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          apiKey: apiKey // Send actual key to bridge service
        })
      });
    } catch (bridgeError) {
      console.log('Bridge service not available, API key stored locally');
    }

    res.json({
      success: true,
      message: 'API key saved and validated successfully'
    });

  } catch (error) {
    console.error('API key storage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save API key'
    });
  }
});

// Get API key status
router.get('/api-key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Handle dev user - use in-memory storage
    if (userId === 'dev-user-123' && process.env.NODE_ENV === 'development') {
      return res.json({
        success: true,
        hasApiKey: !!global.testApiKey,
        updatedAt: new Date()
      });
    }
    
    const user = await User.findById(userId).select('hasApiKey apiKeyUpdatedAt');
    
    res.json({
      success: true,
      hasApiKey: user?.hasApiKey || false,
      updatedAt: user?.apiKeyUpdatedAt || null
    });

  } catch (error) {
    console.error('API key status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API key status'
    });
  }
});

// Delete API key
router.delete('/api-key', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await User.findByIdAndUpdate(userId, {
      $unset: { openaiApiKey: 1 },
      hasApiKey: false,
      apiKeyUpdatedAt: new Date()
    });

    // Notify bridge service
    try {
      await fetch('http://localhost:5003/api-key/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: userId })
      });
    } catch (bridgeError) {
      console.log('Bridge service not available for key deletion');
    }

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error) {
    console.error('API key deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key'
    });
  }
});

// Development route for testing API key status without authentication
router.get('/api-key/test', async (req, res) => {
  try {
    // Check if we have a stored API key in development
    const hasApiKey = !!global.testApiKey;
    res.json({
      success: true,
      hasApiKey,
      message: hasApiKey ? 'API key found in development storage' : 'No API key stored in development'
    });
  } catch (error) {
    console.error('API key test status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get API key test status'
    });
  }
});

// Development route for testing API key validation without authentication
router.post('/api-key/test', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid API key format. Must start with sk-'
      });
    }

    // Validate API key by making a test request
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.log('OpenAI API validation failed:', testResponse.status, errorText);
        
        if (testResponse.status === 401) {
          return res.status(400).json({
            success: false,
            message: 'Invalid API key. Please check your OpenAI API key.'
          });
        } else if (testResponse.status === 429) {
          return res.status(400).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `API validation failed: ${testResponse.status}`
          });
        }
      }

      const models = await testResponse.json();
      console.log('✅ API key validation successful, models available:', models.data?.length || 0);

      // Store in a simple in-memory store for development
      global.testApiKey = apiKey;

      // Notify bridge service about API key update
      try {
        await fetch('http://localhost:5003/api-key/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            userId: 'development_user',
            apiKey: apiKey 
          })
        });
        console.log('✅ Bridge service notified of API key update');
      } catch (bridgeError) {
        console.log('⚠️ Bridge service not available for key update notification');
      }

      res.json({
        success: true,
        message: 'API key validated successfully (development mode)',
        modelsCount: models.data?.length || 0
      });

    } catch (error) {
      console.error('API key validation error:', error);
      
      if (error.name === 'AbortError') {
        return res.status(400).json({
          success: false,
          message: 'API validation timed out. Please try again.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Unable to validate API key. Please check your connection and key.'
      });
    }

  } catch (error) {
    console.error('API key test error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test API key'
    });
  }
});

// Development route to get API key status without authentication
router.get('/api-key/test', async (req, res) => {
  res.json({
    success: true,
    hasApiKey: !!global.testApiKey,
    message: 'Development mode - using in-memory storage'
  });
});

module.exports = router;