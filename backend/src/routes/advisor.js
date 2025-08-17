const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

// Mock advisor responses for testing
const mockAdvisorData = {
  chat: {
    response: "Based on your transcript, I recommend taking CS 25000 (Computer Architecture) next semester as it builds on your CS 18000 foundation.",
    confidence: 0.85,
    recommendations: [
      { course: "CS 25000", reason: "Core requirement for CS major" },
      { course: "MA 26100", reason: "Prerequisites: MA 16200 completed" }
    ]
  },
  plan: {
    semesters: [
      {
        term: "Fall 2024",
        courses: ["CS 25000", "MA 26100", "COM 11400"],
        credits: 11
      },
      {
        term: "Spring 2025", 
        courses: ["CS 24000", "CS 25100", "STAT 35000"],
        credits: 9
      }
    ],
    graduationDate: "May 2026",
    totalCredits: 128
  },
  audit: {
    completed: {
      core: ["CS 18000", "CS 18200", "MA 16100", "MA 16200"],
      electives: ["ENGL 10600"],
      totalCredits: 20
    },
    remaining: {
      core: ["CS 24000", "CS 25000", "CS 25100"],
      electives: ["Science Elective", "Humanities Elective"],
      totalCredits: 108
    },
    onTrack: true
  }
};

// POST /api/advisor/chat - AI-powered academic chat
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Advisor chat request', {
      userId: req.user.id,
      messageLength: message.length,
      hasContext: !!context
    });

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    res.json({
      success: true,
      data: {
        ...mockAdvisorData.chat,
        originalMessage: message,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Advisor chat error', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to process advisor chat request'
    });
  }
});

// POST /api/advisor/plan - Generate academic plan
router.post('/plan', authenticateToken, async (req, res) => {
  try {
    const { preferences, constraints } = req.body;

    logger.info('Academic plan request', {
      userId: req.user.id,
      hasPreferences: !!preferences,
      hasConstraints: !!constraints
    });

    // Simulate plan generation
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      data: {
        ...mockAdvisorData.plan,
        generated: new Date().toISOString(),
        preferences: preferences || {},
        constraints: constraints || {}
      }
    });

  } catch (error) {
    logger.error('Academic plan error', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to generate academic plan'
    });
  }
});

// GET /api/advisor/audit - Degree audit
router.get('/audit', authenticateToken, async (req, res) => {
  try {
    logger.info('Degree audit request', { userId: req.user.id });

    // Simulate audit processing
    await new Promise(resolve => setTimeout(resolve, 300));

    res.json({
      success: true,
      data: {
        ...mockAdvisorData.audit,
        generated: new Date().toISOString(),
        studentId: req.user.id
      }
    });

  } catch (error) {
    logger.error('Degree audit error', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to generate degree audit'
    });
  }
});

module.exports = router;