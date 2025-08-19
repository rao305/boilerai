const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { verifyToken } = require('./auth');
const router = express.Router();
const unifiedAIService = require('../services/unifiedAIService');

/**
 * Generate AI-powered course data
 */
async function generateCourseData(filters = {}, apiKey) {
  try {
    return await unifiedAIService.generateCourseData(filters, apiKey);
  } catch (error) {
    console.error('Course data generation failed', { error: error.message });
    return unifiedAIService.getStaticCourseData();
  }
}

/**
 * Search courses using AI
 */
async function searchCoursesWithAI(searchTerm, apiKey) {
  try {
    return await unifiedAIService.searchCoursesWithAI(searchTerm, apiKey);
  } catch (error) {
    console.error('Course search failed', { error: error.message });
    return [];
  }
}

// Get all courses (protected route with AI generation)
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('subject').optional().isAlpha().isLength({ min: 2, max: 10 }),
  query('apiKey').optional().isString()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20, subject, apiKey } = req.query;
    
    // Generate AI-powered course data
    const filters = { subject };
    const allCourses = await generateCourseData(filters, apiKey);
    
    // Filter by subject if provided and not already filtered by AI
    let filteredCourses = allCourses;
    if (subject && !apiKey) {
      filteredCourses = allCourses.filter(course => 
        course.subject.toLowerCase() === subject.toLowerCase()
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedCourses = filteredCourses.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedCourses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredCourses.length,
        hasNext: endIndex < filteredCourses.length,
        hasPrev: page > 1
      },
      generatedBy: apiKey ? 'AI-Enhanced' : 'Basic'
    });
  } catch (error) {
    console.error('Courses fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch courses',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Search courses (protected route)
router.get('/search', verifyToken, [
  query('q').isString().isLength({ min: 1, max: 100 }).withMessage('Search query must be 1-100 characters'),
  query('subject').optional().isAlpha().isLength({ min: 2, max: 10 }),
  query('level').optional().isIn(['UG', 'GR']),
  query('credits').optional().isInt({ min: 1, max: 10 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('apiKey').optional().isString()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: errors.array()
      });
    }

    const { q, subject, level, credits, page = 1, limit = 20, apiKey } = req.query;
    
    // Sanitize search query
    const searchQuery = q.toLowerCase().trim();
    
    // Use AI-powered search if API key is provided
    let results;
    if (apiKey) {
      results = await searchCoursesWithAI(searchQuery, apiKey);
      
      // Apply additional filters to AI results
      if (subject || level || credits) {
        results = results.filter(course => {
          const matchesSubject = !subject || course.subject.toLowerCase() === subject.toLowerCase();
          const matchesLevel = !level || course.level === level;
          const matchesCredits = !credits || course.credits === parseInt(credits);
          return matchesSubject && matchesLevel && matchesCredits;
        });
      }
    } else {
      // Fallback to basic course generation and filtering
      const basicCourses = await generateCourseData({}, null);
      results = basicCourses.filter(course => {
        const matchesQuery = course.title.toLowerCase().includes(searchQuery) ||
                            course.subject.toLowerCase().includes(searchQuery) ||
                            course.courseNumber.includes(searchQuery) ||
                            course.description.toLowerCase().includes(searchQuery);
        
        const matchesSubject = !subject || course.subject.toLowerCase() === subject.toLowerCase();
        const matchesLevel = !level || course.level === level;
        const matchesCredits = !credits || course.credits === parseInt(credits);
        
        return matchesQuery && matchesSubject && matchesLevel && matchesCredits;
      });
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = results.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedResults,
      search: {
        query: searchQuery,
        filters: { subject, level, credits },
        resultCount: results.length,
        searchMethod: apiKey ? 'AI-Powered' : 'Basic'
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: results.length,
        hasNext: endIndex < results.length,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Course search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search courses',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get specific course by ID (protected route with AI enhancement)
router.get('/:courseId', verifyToken, [
  param('courseId').isAlphanumeric().isLength({ min: 1, max: 20 }),
  query('apiKey').optional().isString()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID',
        errors: errors.array()
      });
    }

    const { courseId } = req.params;
    const { apiKey } = req.query;
    
    // Generate course data (AI will include more realistic courses)
    const courses = await generateCourseData({}, apiKey);
    const course = courses.find(c => c.id.toLowerCase() === courseId.toLowerCase());
    
    if (!course && apiKey) {
      // Try AI search for the specific course
      const searchResults = await searchCoursesWithAI(courseId, apiKey);
      const foundCourse = searchResults.find(c => 
        c.id.toLowerCase() === courseId.toLowerCase() ||
        c.courseNumber === courseId.toUpperCase() ||
        (c.subject + c.courseNumber).toLowerCase() === courseId.toLowerCase()
      );
      
      if (foundCourse) {
        return res.json({
          success: true,
          data: foundCourse,
          source: 'AI-Search'
        });
      }
    }
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      data: course,
      source: apiKey ? 'AI-Generated' : 'Basic'
    });
  } catch (error) {
    console.error('Course fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch course',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 