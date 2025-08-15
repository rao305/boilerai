const express = require('express');
const { query, param, validationResult } = require('express-validator');
const { verifyToken } = require('./auth');
const router = express.Router();

// Mock course data (replace with database in production)
const mockCourses = [
  {
    id: 'cs18000',
    subject: 'CS',
    courseNumber: '18000',
    title: 'Problem Solving and Object-Oriented Programming',
    credits: 4,
    description: 'Problem solving and algorithms, implementation of algorithms in a high level programming language, introduction to object-oriented programming, data types, control structures, functions, arrays, file I/O, and classes.',
    prerequisites: [],
    level: 'UG'
  },
  {
    id: 'ma16500',
    subject: 'MA',
    courseNumber: '16500',
    title: 'Analytic Geometry and Calculus I',
    credits: 4,
    description: 'Introduction to differential and integral calculus of one variable, with applications.',
    prerequisites: [],
    level: 'UG'
  }
];

// Get all courses (protected route)
router.get('/', verifyToken, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('subject').optional().isAlpha().isLength({ min: 2, max: 10 })
], (req, res) => {
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

    const { page = 1, limit = 20, subject } = req.query;
    
    let filteredCourses = [...mockCourses];
    
    // Filter by subject if provided
    if (subject) {
      filteredCourses = filteredCourses.filter(course => 
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
      }
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
  query('limit').optional().isInt({ min: 1, max: 50 })
], (req, res) => {
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

    const { q, subject, level, credits, page = 1, limit = 20 } = req.query;
    
    // Sanitize search query
    const searchQuery = q.toLowerCase().trim();
    
    let results = mockCourses.filter(course => {
      const matchesQuery = course.title.toLowerCase().includes(searchQuery) ||
                          course.subject.toLowerCase().includes(searchQuery) ||
                          course.courseNumber.includes(searchQuery) ||
                          course.description.toLowerCase().includes(searchQuery);
      
      const matchesSubject = !subject || course.subject.toLowerCase() === subject.toLowerCase();
      const matchesLevel = !level || course.level === level;
      const matchesCredits = !credits || course.credits === parseInt(credits);
      
      return matchesQuery && matchesSubject && matchesLevel && matchesCredits;
    });
    
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
        resultCount: results.length
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

// Get specific course by ID (protected route)
router.get('/:courseId', verifyToken, [
  param('courseId').isAlphanumeric().isLength({ min: 1, max: 20 })
], (req, res) => {
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
    const course = mockCourses.find(c => c.id.toLowerCase() === courseId.toLowerCase());
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }
    
    res.json({
      success: true,
      data: course
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