const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const unifiedAIService = require('../services/unifiedAIService');

/**
 * Generate AI-powered RAG response
 */
async function generateRAGResponse(query, context, filters, apiKey) {
  try {
    return await unifiedAIService.generateRAGResponse(query, context, filters, apiKey);
  } catch (error) {
    logger.error('RAG response generation failed', { error: error.message });
    throw error;
  }
}

/**
 * Generate dynamic knowledge sources
 */
async function generateKnowledgeSources(apiKey) {
  try {
    return await unifiedAIService.generateKnowledgeSources(apiKey);
  } catch (error) {
    logger.error('Knowledge sources generation failed', { error: error.message });
    return unifiedAIService.getStaticKnowledgeSources();
  }
}

// POST /api/rag/query - AI-powered RAG query processing
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { query, context, filters, apiKey } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    logger.info('RAG query request', {
      userId: req.user.id,
      queryLength: query.length,
      hasContext: !!context,
      hasFilters: !!filters
    });

    // Generate AI-powered RAG response
    const ragResponse = await generateRAGResponse(query, context, filters, apiKey);

    res.json({
      success: true,
      data: {
        ...ragResponse,
        query: query,
        processedAt: new Date().toISOString(),
        context: context || null,
        filters: filters || {}
      }
    });

  } catch (error) {
    logger.error('RAG query error', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to process RAG query'
    });
  }
});

// GET /api/rag/sources - Get AI-generated knowledge sources
router.get('/sources', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.query;
    
    logger.info('RAG sources request', { userId: req.user.id });

    // Generate dynamic knowledge sources
    const sources = await generateKnowledgeSources(apiKey);

    res.json({
      success: true,
      data: {
        sources,
        totalSources: sources.length,
        lastIndexed: new Date().toISOString(),
        generatedBy: apiKey ? 'AI-Enhanced' : 'Basic'
      }
    });

  } catch (error) {
    logger.error('RAG sources error', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve knowledge sources'
    });
  }
});

module.exports = router;