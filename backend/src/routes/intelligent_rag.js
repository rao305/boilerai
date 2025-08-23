const express = require('express');
const router = express.Router();
const axios = require('axios');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

// RAG Server Configuration
const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:8000';

/**
 * Enhanced RAG System with SmartCourse & Echelon Intelligence
 * ==========================================================
 * 
 * Provides advanced AI academic advising with:
 * - Multi-level reasoning (Surface, Analytical, Strategic, Contextual)
 * - Self-reasoning and contextual awareness
 * - Intelligent course recommendations
 * - Personalized learning paths
 * - CS-MI and CS-SE track expertise
 */

// POST /api/intelligent-rag/ask - Advanced RAG query with multi-level reasoning
router.post('/ask', async (req, res) => {
  try {
    const { 
      query, 
      student_context = {}, 
      reasoning_level = 'auto',
      include_recommendations = true,
      format = 'detailed' 
    } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    logger.info('Intelligent RAG query', {
      userId: req.user?.id || 'anonymous',
      queryLength: query.length,
      hasContext: Object.keys(student_context).length > 0,
      reasoningLevel: reasoning_level
    });

    try {
      // Call Python RAG server
      const ragResponse = await axios.post(`${RAG_SERVER_URL}/ask`, {
        query,
        student_context,
        reasoning_level,
        include_recommendations,
        format
      }, {
        timeout: 10000, // 10 second timeout
        headers: { 'Content-Type': 'application/json' }
      });

      if (ragResponse.data.success) {
        res.json(ragResponse.data);
      } else {
        throw new Error(ragResponse.data.error || 'RAG server returned error');
      }

    } catch (ragError) {
      logger.error('RAG server call failed', { 
        error: ragError.message,
        url: `${RAG_SERVER_URL}/ask`
      });
      
      // Fallback to basic response if RAG server is down
      const fallbackResponse = await generateBasicFallbackResponse(query, student_context);
      
      res.json({
        success: true,
        data: fallbackResponse,
        warning: 'Using fallback response - RAG server unavailable'
      });
    }

  } catch (error) {
    logger.error('Intelligent RAG error', { 
      error: error.message, 
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process intelligent RAG query'
    });
  }
});

// POST /api/intelligent-rag/learning-path - Generate personalized learning path
router.post('/learning-path', authenticateToken, async (req, res) => {
  try {
    const { 
      track, 
      completed_courses = [], 
      target_graduation,
      preferences = {},
      current_semester = 'fall'
    } = req.body;

    if (!track || !['machine_intelligence', 'software_engineering'].includes(track)) {
      return res.status(400).json({
        success: false,
        error: 'Valid track is required (machine_intelligence or software_engineering)'
      });
    }

    logger.info('Learning path generation', {
      userId: req.user.id,
      track,
      completedCourses: completed_courses.length,
      targetGraduation: target_graduation
    });

    // Generate adaptive learning path
    const learningPath = await generateAdaptiveLearningPath({
      user_id: req.user.id,
      track,
      completed_courses,
      target_graduation,
      preferences,
      current_semester
    });

    res.json({
      success: true,
      data: learningPath
    });

  } catch (error) {
    logger.error('Learning path generation error', { 
      error: error.message, 
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate learning path'
    });
  }
});

// GET /api/intelligent-rag/demo - Demo endpoint for advanced RAG capabilities (no auth)
router.get('/demo', async (req, res) => {
  try {
    const { query = "What are the CS core requirements?" } = req.query;

    try {
      // Try to call Python RAG server
      const ragResponse = await axios.get(`${RAG_SERVER_URL}/demo`, {
        params: { query },
        timeout: 5000
      });

      if (ragResponse.data.success) {
        res.json(ragResponse.data);
        return;
      }
    } catch (ragError) {
      logger.warn('RAG server demo call failed, using fallback', { 
        error: ragError.message 
      });
    }

    // Fallback demo response
    const demoResponse = {
      query: query,
      system_info: {
        name: "BoilerAI Advanced RAG System",
        version: "2.0.0",
        status: "RAG server starting up",
        capabilities: [
          "Multi-level reasoning (Surface → Analytical → Strategic → Contextual)",
          "Self-reasoning with transparent decision chains",
          "SmartCourse-inspired adaptive learning",
          "Echelon-style strategic planning",
          "CS-MI and CS-SE track expertise",
          "Contextual awareness and personalization"
        ],
        reasoning_levels: 4,
        knowledge_base: "Complete CS curriculum with 73 courses, 2 tracks",
        intelligence_type: "Advanced Academic Advisory AI"
      },
      sample_response: await generateContextualAnswer(query, {}),
      note: "This is a fallback response. RAG server is initializing."
    };

    res.json({
      success: true,
      message: "BoilerAI Advanced RAG System - SmartCourse & Echelon Intelligence",
      data: demoResponse
    });

  } catch (error) {
    logger.error('Demo endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Demo endpoint failed'
    });
  }
});

// GET /api/intelligent-rag/track-analysis - Analyze CS-MI vs CS-SE tracks
router.get('/track-analysis', authenticateToken, async (req, res) => {
  try {
    const { 
      completed_courses = [],
      interests = [],
      career_goals = []
    } = req.query;

    logger.info('Track analysis request', {
      userId: req.user.id,
      completedCourses: Array.isArray(completed_courses) ? completed_courses.length : 0
    });

    const trackAnalysis = await analyzeTrackFit({
      completed_courses: Array.isArray(completed_courses) 
        ? completed_courses 
        : completed_courses ? completed_courses.split(',') : [],
      interests: Array.isArray(interests)
        ? interests
        : interests ? interests.split(',') : [],
      career_goals: Array.isArray(career_goals)
        ? career_goals
        : career_goals ? career_goals.split(',') : []
    });

    res.json({
      success: true,
      data: trackAnalysis
    });

  } catch (error) {
    logger.error('Track analysis error', { 
      error: error.message, 
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze track fit'
    });
  }
});

// POST /api/intelligent-rag/course-recommendations - Get smart course recommendations
router.post('/course-recommendations', authenticateToken, async (req, res) => {
  try {
    const {
      track,
      completed_courses = [],
      current_semester = 'fall',
      max_credits = 15,
      difficulty_preference = 'intermediate',
      interests = []
    } = req.body;

    if (!track) {
      return res.status(400).json({
        success: false,
        error: 'Track is required'
      });
    }

    logger.info('Course recommendations request', {
      userId: req.user.id,
      track,
      completedCourses: completed_courses.length,
      maxCredits: max_credits
    });

    const recommendations = await generateSmartCourseRecommendations({
      user_id: req.user.id,
      track,
      completed_courses,
      current_semester,
      max_credits,
      difficulty_preference,
      interests
    });

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    logger.error('Course recommendations error', { 
      error: error.message, 
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate course recommendations'
    });
  }
});

// Helper functions (in production these would call Python services)

async function generateIntelligentResponse(query, studentContext, reasoningLevel, userId) {
  // This would call the Python intelligent advisor service
  // For now, providing a sophisticated mock response
  
  const mockResponse = {
    answer: await generateContextualAnswer(query, studentContext),
    reasoning_level: determineReasoningLevel(query, studentContext, reasoningLevel),
    confidence: calculateConfidence(query, studentContext),
    sources: await findRelevantSources(query),
    reasoning_chain: generateReasoningChain(query, studentContext),
    contextual_factors: extractContextualFactors(studentContext),
    recommendations: generateRecommendations(query, studentContext),
    follow_up_questions: generateFollowUpQuestions(query, studentContext)
  };

  return mockResponse;
}

async function generateContextualAnswer(query, studentContext) {
  const queryLower = query.toLowerCase();
  
  // CS Core Requirements
  if (queryLower.includes('core requirements') || queryLower.includes('cs core')) {
    let answer = `**CS Core Requirements (6 courses):**

1. **CS 18000** - Problem Solving and Object-Oriented Programming (4 credits)
2. **CS 18200** - Foundations of Computer Science (3 credits) 
3. **CS 24000** - Programming in C (3 credits)
4. **CS 25000** - Computer Architecture (4 credits)
5. **CS 25100** - Data Structures and Algorithms (3 credits)
6. **CS 25200** - Systems Programming (4 credits)

**Plus:** CS 19300 - Tools (1 credit, first semester)

**Key Policy:** Students must declare a track (MI or SE) by the term they take CS 25200.`;

    // Add personalized context
    if (studentContext.completed_courses) {
      const coreCompleted = studentContext.completed_courses.filter(c => 
        ['CS18000', 'CS18200', 'CS24000', 'CS25000', 'CS25100', 'CS25200'].includes(c)
      );
      answer += `\n\n**Your Progress:** You have completed ${coreCompleted.length}/6 core courses: ${coreCompleted.join(', ') || 'None yet'}.`;
    }

    return answer;
  }
  
  // Track Information  
  if (queryLower.includes('machine intelligence') || queryLower.includes('mi track')) {
    return `**Machine Intelligence (MI) Track:**

**Required Courses:**
- CS 37300 - Data Mining and Machine Learning (ML/DM requirement)
- CS 38100 - Introduction to Analysis of Algorithms (Required)
- CS 47100 - Artificial Intelligence OR CS 47300 - Information Retrieval
- STAT 41600, MA 41600, OR STAT 51200 - Probability (Math requirement)

**Track Electives (Choose 2):**
CS 31100, CS 41100, CS 31400, CS 34800, CS 35200, CS 44800, CS 45600, CS 45800, CS 48300, CS 43900, CS 44000, CS 47500, CS 57700, CS 57800

**Focus Areas:** Artificial Intelligence, Machine Learning, Data Science, Pattern Recognition, Neural Networks

**Career Paths:** AI Engineer, Data Scientist, ML Engineer, Research Scientist, AI Product Manager`;
  }

  if (queryLower.includes('software engineering') || queryLower.includes('se track')) {
    return `**Software Engineering (SE) Track:**

**Required Courses:**
- CS 30700 - Software Engineering I (Required)
- CS 35200 - Compilers OR CS 35400 - Operating Systems
- CS 38100 - Introduction to Analysis of Algorithms (Required)
- CS 40800 - Software Testing (Required)
- CS 40700 - Software Engineering Senior Capstone

**Track Electives (Choose 1):**
CS 34800, CS 35100, CS 35200, CS 35300, CS 35400, CS 37300, CS 42200, CS 42600, CS 44800, CS 45600, CS 47100, CS 47300, CS 48900, CS 51000

**Special Notes:**
- EPCS 41100 + EPCS 41200 may replace CS 40700 with approval
- CS 31100 + CS 41100 pair counts as one elective

**Career Paths:** Software Developer, DevOps Engineer, Systems Architect, Technical Lead, Product Manager`;
  }

  // Prerequisites
  if (queryLower.includes('prerequisite') && queryLower.includes('cs')) {
    const courseMatch = query.match(/CS\s*(\d+)/i);
    if (courseMatch) {
      const courseNum = courseMatch[1];
      return getPrerequisiteInfo(`CS${courseNum}`);
    }
  }

  // Default intelligent response
  return `I understand you're asking about "${query}". Based on our CS academic knowledge base, I can provide detailed information about:

• CS Core Requirements and track declaration
• Machine Intelligence (MI) vs Software Engineering (SE) track details
• Course prerequisites and planning
• Graduation timelines and course sequencing
• Academic policies and requirements

Could you please specify what aspect you'd like me to focus on?`;
}

function getPrerequisiteInfo(courseId) {
  const prereqs = {
    'CS18000': 'MA 16100 OR MA 16300 OR MA 16500 OR MA 16700 (Calculus I)',
    'CS18200': 'CS 17600 OR CS 18000, AND Calculus I',
    'CS24000': 'CS 18000 with grade C or better',
    'CS25000': 'CS 18200 AND CS 24000 with grade C or better',
    'CS25100': 'CS 18200 with grade C or better',
    'CS25200': 'CS 24000 AND CS 25100 with grade C or better',
    'CS30700': 'CS 25200 with grade C or better',
    'CS37300': 'CS 25100 with grade C or better',
    'CS38100': 'CS 25100 with grade C or better',
    'CS40700': 'Senior standing and CS 30700',
    'CS40800': 'CS 25200 with grade C or better',
    'CS47100': 'CS 25100 with grade C or better'
  };

  return prereqs[courseId] || `Prerequisites for ${courseId}: Please check with academic advisor for specific requirements.`;
}

function determineReasoningLevel(query, studentContext, requestedLevel) {
  if (requestedLevel !== 'auto') return requestedLevel;
  
  // Strategic for planning queries
  if (query.toLowerCase().includes('plan') || query.toLowerCase().includes('graduation')) {
    return 'strategic';
  }
  
  // Contextual when student data available
  if (studentContext.completed_courses && studentContext.completed_courses.length > 0) {
    return 'contextual';
  }
  
  // Analytical for comparisons
  if (query.toLowerCase().includes('vs') || query.toLowerCase().includes('compare')) {
    return 'analytical';
  }
  
  return 'surface';
}

function calculateConfidence(query, studentContext) {
  let confidence = 0.7; // Base confidence
  
  // Higher confidence for specific course queries
  if (query.match(/CS\s*\d+/)) confidence += 0.1;
  
  // Higher confidence with student context
  if (studentContext.completed_courses) confidence += 0.1;
  
  // Higher confidence for track-related queries
  if (query.toLowerCase().includes('track')) confidence += 0.1;
  
  return Math.min(confidence, 0.98);
}

async function findRelevantSources(query) {
  // Mock sources - in production would query RAG system
  return [
    {
      type: 'document',
      title: 'CS Core Requirements',
      relevance_score: 0.95,
      snippet: 'The CS core builds foundations in programming, discrete math, hardware...'
    },
    {
      type: 'structured_data',
      title: 'Track Requirements Database',
      relevance_score: 0.88,
      snippet: 'Machine Intelligence and Software Engineering track specifications...'
    }
  ];
}

function generateReasoningChain(query, studentContext) {
  const chain = ['Analyzing query intent and context'];
  
  if (studentContext.completed_courses) {
    chain.push(`Evaluating progress: ${studentContext.completed_courses.length} courses completed`);
  }
  
  if (studentContext.track) {
    chain.push(`Applying ${studentContext.track.replace('_', ' ')} track knowledge`);
  }
  
  chain.push('Synthesizing personalized response with recommendations');
  return chain;
}

function extractContextualFactors(studentContext) {
  const factors = [];
  
  if (studentContext.completed_courses) {
    factors.push(`Academic progress: ${studentContext.completed_courses.length} courses completed`);
  }
  
  if (studentContext.track) {
    factors.push(`Selected track: ${studentContext.track.replace('_', ' ')}`);
  }
  
  if (studentContext.target_graduation) {
    factors.push(`Target graduation: ${studentContext.target_graduation}`);
  }
  
  return factors;
}

function generateRecommendations(query, studentContext) {
  const recommendations = [];
  
  if (query.toLowerCase().includes('track') && !studentContext.track) {
    recommendations.push('Consider scheduling a meeting with your academic advisor to discuss track selection');
    recommendations.push('Review both MI and SE track requirements to understand the differences');
  }
  
  if (studentContext.completed_courses && studentContext.completed_courses.length < 6) {
    recommendations.push('Focus on completing CS core requirements first');
    recommendations.push('Ensure prerequisite chains are satisfied for future courses');
  }
  
  return recommendations;
}

function generateFollowUpQuestions(query, studentContext) {
  const questions = [];
  
  if (query.toLowerCase().includes('track')) {
    questions.push('Which track aligns better with your career goals?');
    questions.push('Would you like me to compare the course requirements?');
  }
  
  if (!studentContext.completed_courses) {
    questions.push('What courses have you already completed?');
    questions.push('When are you planning to graduate?');
  }
  
  questions.push('Would you like personalized course recommendations?');
  return questions;
}

async function generateCourseRecommendations(studentContext, userId) {
  // Mock course recommendations based on context
  const recommendations = [];
  
  const completed = studentContext.completed_courses || [];
  const track = studentContext.track;
  
  // Core course recommendations
  const coreSequence = ['CS18000', 'CS18200', 'CS24000', 'CS25000', 'CS25100', 'CS25200'];
  const nextCore = coreSequence.find(course => !completed.includes(course));
  
  if (nextCore) {
    recommendations.push({
      course_id: nextCore,
      type: 'core_requirement',
      priority: 'high',
      reasoning: 'Next required course in CS core sequence'
    });
  }
  
  // Track-specific recommendations
  if (track === 'machine_intelligence' && completed.includes('CS25100')) {
    if (!completed.includes('CS37300')) {
      recommendations.push({
        course_id: 'CS37300',
        type: 'track_requirement',
        priority: 'high',
        reasoning: 'Required for MI track - foundational ML course'
      });
    }
  }
  
  if (track === 'software_engineering' && completed.includes('CS25200')) {
    if (!completed.includes('CS30700')) {
      recommendations.push({
        course_id: 'CS30700',
        type: 'track_requirement', 
        priority: 'high',
        reasoning: 'Required for SE track - introduces software engineering principles'
      });
    }
  }
  
  return recommendations;
}

async function generateAdaptiveLearningPath(params) {
  // Mock adaptive learning path generation
  const { track, completed_courses, target_graduation, current_semester } = params;
  
  return {
    track: track,
    total_courses_needed: estimateCoursesNeeded(track, completed_courses),
    graduation_timeline: generateGraduationTimeline(completed_courses, target_graduation),
    semester_plans: generateSemesterPlans(track, completed_courses, current_semester),
    difficulty_progression: 'gradual', // Could be 'accelerated' or 'conservative'
    estimated_workload: calculateEstimatedWorkload(track, completed_courses)
  };
}

async function analyzeTrackFit(params) {
  const { completed_courses, interests, career_goals } = params;
  
  return {
    mi_track_score: calculateTrackScore('machine_intelligence', params),
    se_track_score: calculateTrackScore('software_engineering', params),
    recommendations: [
      'MI track is ideal for students interested in AI/ML and data science',
      'SE track is perfect for students focused on software development and systems'
    ],
    factor_analysis: {
      math_readiness: assessMathReadiness(completed_courses),
      programming_experience: assessProgrammingExperience(completed_courses),
      career_alignment: assessCareerAlignment(career_goals)
    }
  };
}

async function generateSmartCourseRecommendations(params) {
  const { track, completed_courses, max_credits, difficulty_preference } = params;
  
  return {
    next_semester: generateNextSemesterPlan(params),
    alternative_options: generateAlternativeOptions(params),
    prerequisite_chains: analyzePrerequisiteChains(track, completed_courses),
    workload_balance: assessWorkloadBalance(params)
  };
}

// Utility functions
function estimateCoursesNeeded(track, completed) {
  const totalRequired = track === 'machine_intelligence' ? 28 : 28; // Approximate
  return Math.max(0, totalRequired - completed.length);
}

function generateGraduationTimeline(completed, targetDate) {
  const remaining = Math.max(20 - completed.length, 0);
  const semestersNeeded = Math.ceil(remaining / 4);
  return {
    semesters_remaining: semestersNeeded,
    estimated_graduation: targetDate || 'Not specified',
    on_track: semestersNeeded <= 4 // Assuming 2 years remaining is typical
  };
}

function generateSemesterPlans(track, completed, currentSem) {
  return {
    current_semester: currentSem,
    recommended_courses: 4,
    focus_areas: track === 'machine_intelligence' 
      ? ['algorithms', 'machine_learning', 'mathematics']
      : ['software_engineering', 'systems', 'testing']
  };
}

function calculateEstimatedWorkload(track, completed) {
  return {
    hours_per_week: 45, // 15 credits × 3 hours per credit
    difficulty_level: completed.length > 10 ? 'advanced' : 'intermediate',
    study_recommendations: [
      'Form study groups for challenging courses',
      'Utilize office hours and tutoring resources',
      'Balance theoretical and practical coursework'
    ]
  };
}

function calculateTrackScore(track, params) {
  let score = 0.5; // Base score
  
  const interests = params.interests || [];
  const careers = params.career_goals || [];
  
  if (track === 'machine_intelligence') {
    if (interests.some(i => ['ai', 'ml', 'data', 'research'].includes(i.toLowerCase()))) {
      score += 0.3;
    }
    if (careers.some(c => ['data scientist', 'ai engineer', 'researcher'].includes(c.toLowerCase()))) {
      score += 0.2;
    }
  } else if (track === 'software_engineering') {
    if (interests.some(i => ['development', 'programming', 'systems'].includes(i.toLowerCase()))) {
      score += 0.3;
    }
    if (careers.some(c => ['developer', 'engineer', 'architect'].includes(c.toLowerCase()))) {
      score += 0.2;
    }
  }
  
  return Math.min(score, 1.0);
}

function assessMathReadiness(completed) {
  const mathCourses = completed.filter(c => c.startsWith('MA') || c.includes('STAT'));
  return mathCourses.length >= 2 ? 'strong' : 'needs_development';
}

function assessProgrammingExperience(completed) {
  const progCourses = completed.filter(c => 
    ['CS18000', 'CS18200', 'CS24000', 'CS25100'].includes(c)
  );
  return progCourses.length >= 3 ? 'experienced' : 'developing';
}

function assessCareerAlignment(goals) {
  return goals.length > 0 ? 'defined' : 'exploring';
}

function generateNextSemesterPlan(params) {
  return {
    recommended_courses: ['CS38100', 'CS37300'], // Example
    total_credits: 14,
    rationale: 'Balanced load focusing on algorithmic foundations'
  };
}

function generateAlternativeOptions(params) {
  return [
    { course_id: 'CS31400', reason: 'Good for MI track students' },
    { course_id: 'CS35200', reason: 'Systems focus for SE track' }
  ];
}

function analyzePrerequisiteChains(track, completed) {
  return {
    ready_courses: ['CS38100', 'CS37300'], // Example
    blocked_courses: ['CS40700'], // Need more prerequisites
    future_unlocks: ['CS47100'] // Will be available after completing ready courses
  };
}

function assessWorkloadBalance(params) {
  return {
    difficulty_balance: 'appropriate',
    credit_distribution: 'even',
    recommendations: ['Mix theoretical and practical courses']
  };
}

function formatConciseResponse(response) {
  return {
    answer: response.answer.substring(0, 500) + '...',
    confidence: response.confidence,
    key_recommendations: response.recommendations.slice(0, 2)
  };
}

function formatDetailedResponse(response) {
  return {
    ...response,
    metadata: {
      processing_time: '1.2s',
      knowledge_base_version: '2024.1',
      reasoning_engine: 'SmartCourse-Echelon-v2'
    }
  };
}

// Fallback function when RAG server is unavailable
async function generateBasicFallbackResponse(query, studentContext) {
  const queryLower = query.toLowerCase();
  
  let answer = "⚠️ **RAG Server Unavailable** - Using basic fallback response.\n\n";
  
  // Basic pattern matching for common queries
  if (queryLower.includes('cs180') || queryLower.includes('18000')) {
    answer += "**CS 18000 - Problem Solving and Object-Oriented Programming**\n";
    answer += "- 4 credits\n";
    answer += "- Introduction to programming using Java\n";
    answer += "- Prerequisites: MA 16100 or equivalent (Calculus I)\n";
    answer += "- Core requirement for CS major";
  } else if (queryLower.includes('core requirements') || queryLower.includes('cs core')) {
    answer += "**CS Core Requirements (6 courses):**\n";
    answer += "1. CS 18000 - Problem Solving and Object-Oriented Programming (4 credits)\n";
    answer += "2. CS 18200 - Foundations of Computer Science (3 credits)\n";
    answer += "3. CS 24000 - Programming in C (3 credits)\n";
    answer += "4. CS 25000 - Computer Architecture (4 credits)\n";
    answer += "5. CS 25100 - Data Structures and Algorithms (3 credits)\n";
    answer += "6. CS 25200 - Systems Programming (4 credits)\n";
    answer += "\n**Note:** Students must declare a track (MI or SE) by CS 25200.";
  } else if (queryLower.includes('machine intelligence') || queryLower.includes('mi track')) {
    answer += "**Machine Intelligence (MI) Track:**\n";
    answer += "- Focus: AI, Machine Learning, Data Science\n";
    answer += "- Required: CS 37300, CS 38100, CS 47100/47300, STAT 41600\n";
    answer += "- 2 track electives required\n";
    answer += "- Career paths: AI Engineer, Data Scientist, ML Engineer";
  } else if (queryLower.includes('software engineering') || queryLower.includes('se track')) {
    answer += "**Software Engineering (SE) Track:**\n";
    answer += "- Focus: Software Development, Systems, Testing\n";
    answer += "- Required: CS 30700, CS 35200/35400, CS 38100, CS 40800, CS 40700\n";
    answer += "- 1 track elective required\n";
    answer += "- Career paths: Software Developer, DevOps Engineer, Systems Architect";
  } else {
    answer += "I understand you're asking about \"" + query + "\". While the advanced RAG system is unavailable, I can provide basic information about:\n\n";
    answer += "• CS Core Requirements and track declaration\n";
    answer += "• Machine Intelligence (MI) vs Software Engineering (SE) track details\n";
    answer += "• Course prerequisites and planning\n";
    answer += "• Graduation timelines and course sequencing\n\n";
    answer += "Please try your query again once the intelligent RAG system comes online for detailed, personalized responses.";
  }
  
  return {
    answer,
    reasoning_level: 'surface',
    confidence: 0.6,
    sources: [{
      type: 'fallback',
      title: 'Basic Knowledge Base',
      relevance_score: 0.5,
      snippet: 'Fallback response while RAG server is unavailable'
    }],
    reasoning_chain: [
      'RAG server unavailable - using fallback',
      'Basic pattern matching on query',
      'Returning cached knowledge'
    ],
    contextual_factors: ['RAG server offline', 'Limited functionality'],
    recommendations: [
      'Try again in a moment when RAG server is online',
      'For complex queries, please wait for full system availability'
    ],
    follow_up_questions: [
      'Would you like me to try again?',
      'Do you need basic information about CS requirements?'
    ],
    metadata: {
      processing_time: '0.1s',
      knowledge_base_version: 'fallback',
      reasoning_engine: 'basic-fallback'
    }
  };
}

module.exports = router;