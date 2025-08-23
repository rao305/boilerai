const express = require('express');
const router = express.Router();
const transcriptContextService = require('../services/transcriptContextService');
const { authenticateToken } = require('../middleware/auth');
const {
  transcriptRateLimit,
  transcriptChatRateLimit,
  transcriptDataValidation,
  chatMessageValidation,
  handleValidationErrors,
  privacyProtection,
  sanitizeTranscriptData,
  auditLogger,
  ferpaCompliance
} = require('../middleware/transcriptValidation');

// All routes require authentication and privacy protection
router.use(authenticateToken);
router.use(privacyProtection);
router.use(ferpaCompliance);

/**
 * POST /api/transcript-context/save
 * Save transcript data to AI context
 */
router.post('/save', 
  transcriptRateLimit,
  auditLogger('TRANSCRIPT_SAVE'),
  transcriptDataValidation,
  handleValidationErrors,
  sanitizeTranscriptData,
  async (req, res) => {
  try {
    const userId = req.user.id;
    const { transcriptData } = req.body;

    if (!transcriptData) {
      return res.status(400).json({
        success: false,
        error: 'Transcript data is required'
      });
    }

    console.log(`Saving transcript context for user ${userId}`);
    
    const result = await transcriptContextService.saveTranscriptContext(userId, transcriptData);
    
    res.json({
      success: true,
      message: 'Transcript saved to AI context successfully',
      context: {
        studentName: result.context.studentName,
        hasTranscript: true,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error saving transcript context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save transcript to AI context',
      details: error.message
    });
  }
});

/**
 * GET /api/transcript-context/status
 * Get user's transcript status
 */
router.get('/status', auditLogger('TRANSCRIPT_STATUS'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    const status = await transcriptContextService.getTranscriptStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting transcript status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transcript status',
      data: { hasTranscript: false }
    });
  }
});

/**
 * GET /api/transcript-context/suggestions
 * Get personalized suggestions based on transcript
 */
router.get('/suggestions', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const suggestions = await transcriptContextService.getPersonalizedSuggestions(userId);
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error getting personalized suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      data: []
    });
  }
});

/**
 * POST /api/transcript-context/chat
 * Send chat message with transcript context
 */
router.post('/chat',
  transcriptChatRateLimit,
  auditLogger('TRANSCRIPT_CHAT'),
  chatMessageValidation,
  handleValidationErrors,
  async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, provider = 'gemini', includeContext = true } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Get transcript context if requested
    let transcriptContext = null;
    if (includeContext) {
      transcriptContext = await transcriptContextService.getTranscriptContext(userId);
    }

    // Prepare enhanced message with context
    let enhancedMessage = message;
    if (transcriptContext && transcriptContext.aiPromptContext) {
      enhancedMessage = `${transcriptContext.aiPromptContext}\n\n## User Question:\n${message}`;
    }

    // Forward to appropriate AI service based on provider
    let aiResponse;
    try {
      // Import AI services dynamically to avoid circular dependencies
      if (provider === 'gemini') {
        const { geminiChatService } = require('../services/geminiChatService');
        aiResponse = await geminiChatService.sendMessage(enhancedMessage);
      } else if (provider === 'openai') {
        const { openaiChatService } = require('../services/openaiChatService');
        aiResponse = await openaiChatService.sendMessage(enhancedMessage);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Add context indicators to response
      const responseWithContext = {
        ...aiResponse,
        isPersonalized: !!transcriptContext,
        studentName: transcriptContext?.studentName || null,
        contextUsed: !!transcriptContext,
        provider
      };

      res.json({
        success: true,
        data: responseWithContext
      });

    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Fallback response
      const fallbackMessage = transcriptContext 
        ? `Hello ${transcriptContext.studentName}! I'm having trouble connecting to the AI service right now, but I can see you have transcript data loaded. Please try again in a moment.`
        : "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
        
      res.json({
        success: true,
        data: {
          content: fallbackMessage,
          isPersonalized: !!transcriptContext,
          error: 'AI service temporarily unavailable',
          provider
        }
      });
    }

  } catch (error) {
    console.error('Error in transcript chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

/**
 * GET /api/transcript-context/summary
 * Get academic summary for display
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const context = await transcriptContextService.getTranscriptContext(userId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'No transcript data found'
      });
    }

    res.json({
      success: true,
      data: {
        studentName: context.studentName,
        academicSummary: context.academicSummary,
        eligibleTracks: context.eligibleTracks,
        nextCourseRecommendations: context.nextCourseRecommendations,
        totalCourses: context.completedCourses?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting academic summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get academic summary'
    });
  }
});

/**
 * DELETE /api/transcript-context/clear
 * Clear user's transcript context (for privacy/logout)
 */
router.delete('/clear', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Clear from cache
    transcriptContextService.clearUserContext(userId);
    
    // Note: We don't delete from database for audit/recovery purposes
    // but we could add a "deleted" flag if needed
    
    res.json({
      success: true,
      message: 'Transcript context cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing transcript context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear transcript context'
    });
  }
});

/**
 * GET /api/transcript-context/greeting
 * Get personalized greeting
 */
router.get('/greeting', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const status = await transcriptContextService.getTranscriptStatus(userId);
    
    let greeting;
    if (status.hasTranscript && status.studentName) {
      const greetings = [
        `Welcome back, ${status.studentName}! Ready for some personalized academic planning?`,
        `Hi ${status.studentName}! I have your transcript loaded and ready to help.`,
        `Hello ${status.studentName}! Let's continue planning your academic journey.`,
        `Good to see you again, ${status.studentName}! How can I help with your coursework today?`
      ];
      greeting = greetings[Math.floor(Math.random() * greetings.length)];
    } else {
      greeting = "Hi there! I see you haven't uploaded your transcript yet. Would you like to do that for personalized academic advice?";
    }

    res.json({
      success: true,
      data: {
        greeting,
        hasTranscript: status.hasTranscript,
        studentName: status.studentName
      }
    });
  } catch (error) {
    console.error('Error getting personalized greeting:', error);
    res.json({
      success: true,
      data: {
        greeting: "Hello! How can I help you with your academic planning today?",
        hasTranscript: false
      }
    });
  }
});

module.exports = router;