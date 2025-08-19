const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const unifiedAIService = require('../services/unifiedAIService');
const contextualAIService = require('../services/contextualAIService');
const ContextFusionService = require('../services/contextFusionService');
const EvaluationService = require('../services/evaluationService');
const degreeRequirementsRepo = require('../services/degreeRequirementsRepository');

// AI-powered helper functions to replace hardcoded responses

/**
 * EDGE CASE HANDLER: Detect user state and available data for appropriate context fusion
 * Returns strategy for handling different user scenarios
 */
function detectUserState(transcript, userProfile, program) {
  // VALIDATION: Sanitize and validate inputs before processing
  const validatedTranscript = validateTranscriptInput(transcript);
  const validatedProfile = validateUserProfileInput(userProfile);
  const validatedProgram = validateProgramInput(program);
  
  const state = {
    hasTranscript: !!(validatedTranscript && validatedTranscript.courses && validatedTranscript.courses.length > 0),
    hasProfile: !!(validatedProfile && (validatedProfile.major || validatedProfile.currentYear)),
    hasProgram: !!(validatedProgram && validatedProgram !== 'Unknown Program'),
    transcriptComplete: false,
    profileComplete: false,
    validationWarnings: []
  };

  // Check transcript completeness
  if (state.hasTranscript) {
    state.transcriptComplete = !!(
      validatedTranscript.studentInfo?.name && 
      validatedTranscript.gpaSummary?.cumulativeGPA !== undefined &&
      validatedTranscript.courses.length > 0
    );
  }

  // Check profile completeness
  if (state.hasProfile) {
    state.profileComplete = !!(
      validatedProfile.name && 
      validatedProfile.major && 
      validatedProfile.currentYear
    );
  }

  // Add validation warnings if original data was modified
  if (transcript && !validatedTranscript) {
    state.validationWarnings.push('transcript_invalid');
  }
  if (userProfile && !validatedProfile) {
    state.validationWarnings.push('profile_invalid');
  }
  if (program && !validatedProgram) {
    state.validationWarnings.push('program_invalid');
  }

  // Determine user state type for context fusion strategy
  if (state.hasTranscript && state.hasProgram && state.transcriptComplete) {
    state.type = 'full_smartcourse'; // Full SmartCourse with transcript + program
  } else if (state.hasTranscript && !state.hasProgram) {
    state.type = 'transcript_no_program'; // Has transcript but program unclear
  } else if (state.hasTranscript && !state.transcriptComplete) {
    state.type = 'partial_transcript'; // Transcript uploaded but incomplete data
  } else if (state.hasProfile && state.hasProgram) {
    state.type = 'profile_with_program'; // Profile-based guidance
  } else if (state.hasProfile && !state.hasProgram) {
    state.type = 'profile_no_program'; // Profile but no clear program
  } else {
    state.type = 'anonymous'; // No significant user data
  }

  return state;
}

/**
 * Generate contextual fallback response when main AI is unavailable
 */
async function generateFallbackResponse(message, userProfile, apiKey) {
  try {
    return await unifiedAIService.generateFallbackResponse(message, userProfile, apiKey);
  } catch (error) {
    logger.error('Fallback response generation failed', { error: error.message });
    return unifiedAIService.getStaticFallback(message, userProfile);
  }
}

/**
 * Generate personalized transcript upload prompt
 */
async function generateTranscriptPrompt(userProfile, message, apiKey) {
  try {
    if (apiKey) {
      return await unifiedAIService.generateTranscriptPrompt(userProfile, message, apiKey);
    }
    
    // Fallback to static logic when no API key
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'there';
    const major = userProfile?.major || 'your major';
    const messageClean = message.toLowerCase();
    
    // Context-aware transcript prompts
    if (messageClean.includes('graduate') || messageClean.includes('graduation')) {
      return `Hey ${firstName}! For precise graduation planning in ${major}, uploading your transcript would help me give you exact credit counts and timeline recommendations. It's secure and takes just a moment!`;
    }
    
    if (messageClean.includes('course') || messageClean.includes('next semester')) {
      return `Hi ${firstName}! To recommend the perfect courses for your ${major} journey, I'd love to see your transcript. It helps me understand exactly where you are and what's next. Upload is quick and secure!`;
    }
    
    
    if (messageClean.includes('requirement') || messageClean.includes('credit')) {
      return `${firstName}, for detailed requirement checking in ${major}, your transcript would let me give you precise answers about what you've completed and what's left. Secure upload available in the app!`;
    }
    
    // Default personalized prompt
    return `For more personalized ${major} advice tailored to your exact progress, consider uploading your transcript - it\'s secure, quick, and helps me give you spot-on recommendations!`;
    
  } catch (error) {
    logger.error('Transcript prompt generation failed', { error: error.message });
    return 'For more personalized advice, consider uploading your transcript in the app - it\'s secure and quick!';
  }
}

/**
 * Generate AI-powered academic plan
 */
async function generateAcademicPlan(user, preferences, constraints, apiKey) {
  try {
    return await unifiedAIService.generateAcademicPlan(user, preferences, constraints, apiKey);
  } catch (error) {
    logger.error('Academic plan generation failed', { error: error.message });
    throw error;
  }
}

/**
 * Generate AI-powered degree audit
 */
async function generateDegreeAudit(user, apiKey) {
  try {
    return await unifiedAIService.generateDegreeAudit(user, apiKey);
  } catch (error) {
    logger.error('Degree audit generation failed', { error: error.message });
    throw error;
  }
}

// POST /api/advisor/chat - Enhanced BoilerAI academic advisor with dynamic persona
router.post('/chat', async (req, res) => {
  try {
    const { message, context, apiKey, onboardingContext, sessionId, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Valid API key is required (OpenAI or Gemini)'
      });
    }
    
    // Detect API key type
    const apiKeyType = unifiedAIService.detectApiKeyType(apiKey);
    if (!apiKeyType) {
      return res.status(400).json({
        success: false,
        error: 'Invalid API key format. Please provide either an OpenAI key (sk-*) or a Gemini key (AI*)'
      });
    }

    logger.info('Enhanced BoilerAI chat request', {
      messageLength: message.length,
      hasContext: !!context,
      hasApiKey: !!apiKey,
      hasUserId: !!userId,
      sessionId: sessionId
    });

    // Get user profile if userId is provided
    let userProfile = null;
    let transcriptPromptNeeded = false;
    
    if (userId) {
      try {
        const User = require('../models/User');
        const user = await User.findById(userId).select(
          'name email major currentYear expectedGraduationYear interests academicGoals transcriptUploadPrompted lastTranscriptPromptSession sessionCount'
        );
        
        if (user) {
          userProfile = {
            name: user.name,
            email: user.email,
            major: user.major,
            currentYear: user.currentYear,
            expectedGraduationYear: user.expectedGraduationYear,
            interests: user.interests,
            academicGoals: user.academicGoals
          };
          
          // Check if transcript upload prompt is needed for this session
          if (!user.transcriptUploadPrompted && user.lastTranscriptPromptSession !== sessionId) {
            transcriptPromptNeeded = true;
            
            // Update user to mark as prompted for this session
            user.transcriptUploadPrompted = true;
            user.lastTranscriptPromptSession = sessionId;
            await user.save();
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch user profile', { userId, error: error.message });
      }
    }

    // Generate dynamic context-aware greeting and response
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : '';

    // Build dynamic system prompt
    let systemPrompt = `You are BoilerAI, an AI-powered academic advisor exclusively for undergraduate students at Purdue University. Your role is to provide accurate, empathetic, and personalized academic guidance.

CORE PERSONA GUIDELINES:
- Embody a warm, professional, and encouraging academic advisor persona
- Use empathetic, inclusive language to build user confidence
- Avoid robotic or overly formal tones; responses should feel conversational yet authoritative
- DO NOT use hardcoded greetings like "Hi there!" or "Welcome to BoilerAI!"
- Adapt tone based on user input: serious for academic concerns, enthusiastic for milestone celebrations
- End responses with clear next steps or an offer for further assistance

UNDERGRADUATE-ONLY SCOPE:
- Provide guidance ONLY for Purdue University undergraduate programs
- NEVER mention or suggest graduate-level programs, courses, or advice
- If asked about graduate programs, politely redirect to Purdue's Graduate School resources

CORE KNOWLEDGE BASE:
- Computer Science major (2 tracks): Machine Intelligence Track, Software Engineering Track
- Data Science major (standalone - no tracks)  
- Artificial Intelligence major (standalone - no tracks)
- Minors available for all three majors
- CODO (Change of Degree Objective) requirements for each major
- Degree requirements, School of Science requirements, course progression guides

COURSE KNOWLEDGE:
- CS 18000: Problem Solving and Object-Oriented Programming (4 credits) - Introduction
- CS 18200: Foundations of Computer Science (3 credits) - Theory foundations
- CS 24000: Programming in C (3 credits) - Systems programming
- CS 25000: Computer Architecture (4 credits) - Hardware foundations
- CS 25100: Data Structures and Algorithms (3 credits) - Core algorithm knowledge
- MA 26500: Linear Algebra (3 credits) - Required for Machine Intelligence track
- MA 26100: Multivariate Calculus (4 credits) - Advanced calculus

ACADEMIC PROGRESSION GUIDELINES:
For Machine Intelligence Track sophomores who have completed CS 180, 182, 240 and Calc 1,2,3:
- PRIORITY: CS 250 (Computer Architecture) and CS 251 (Data Structures) - core foundation
- REQUIRED: MA 265 (Linear Algebra) - essential for ML/AI mathematics
- RECOMMENDED: Complete lab science requirements early
- PLAN AHEAD: Math requirements are crucial for advanced ML courses

PERSONALIZATION RULES:`;

    if (userProfile) {
      systemPrompt += `

STUDENT PROFILE DATA:
- Name: ${userProfile.name}
- Major: ${userProfile.major || 'Not specified'}
- Year: ${userProfile.currentYear || 'Not specified'}
- Expected Graduation: ${userProfile.expectedGraduationYear || 'Not specified'}
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
- Goals: ${userProfile.academicGoals?.join(', ') || 'Not specified'}

DYNAMIC RESPONSE PERSONALIZATION:
- Reference student data naturally (e.g., "As a ${userProfile.currentYear || 'Purdue'} ${userProfile.major || 'student'} graduating in ${userProfile.expectedGraduationYear || 'your target year'}, here's what I recommend...")
- If transcript data is missing, provide general but accurate advice
- Provide specific course recommendations when possible based on major and year`;
    } else {
      systemPrompt += `

STUDENT PROFILE: No profile data available - use general guidance approach`;
    }

    systemPrompt += `

${onboardingContext ? `\n\nONBOARDING CONTEXT: ${JSON.stringify(onboardingContext)}` : ''}
${context ? `\n\nADDITIONAL CONTEXT: ${context}` : ''}

RESPONSE STRUCTURE:
1. Acknowledge: Start with brief acknowledgment incorporating profile data if available
2. Advise: Provide clear, step-by-step guidance based on knowledge base
3. Close: Offer next steps or further assistance

ERROR HANDLING:
- If query is unclear, ask for clarification politely
- If outside scope, redirect appropriately
- Never invent information outside knowledge base

RESPONSE APPROACH:
- ALWAYS provide immediate, actionable course recommendations based on stated progress
- Use available course knowledge to give specific suggestions
- Focus on helping the student with their current question first
- Only suggest transcript upload as an OPTIONAL enhancement, not a requirement
- Never make transcript upload seem necessary for basic academic advice

Provide specific, actionable guidance that helps this undergraduate student succeed at Purdue.`;

    // NEW: Enhanced SmartCourse Context Fusion with Comprehensive Edge Case Handling
    let reply;
    let contextType = 'unknown';
    let smartCourseEnabled = false;
    let userState = null; // Declare outside try block to ensure availability throughout function
    let transcript = null; // Declare outside try block to ensure availability throughout function
    let program = null; // Declare outside try block to ensure availability throughout function
    
    try {
      // STEP 1: Detect user state and available data
      transcript = req.session?.transcript;
      program = transcript?.studentInfo?.program || userProfile?.major;
      
      // STEP 2: Determine context fusion strategy based on available data
      userState = detectUserState(transcript, userProfile, program);
      logger.info('User state detected', { 
        state: userState.type,
        hasTranscript: userState.hasTranscript,
        hasProfile: userState.hasProfile,
        hasProgram: userState.hasProgram,
        userId: userId 
      });

      // STEP 3: Apply appropriate context fusion strategy based on user state
      switch (userState.type) {
        case 'full_smartcourse':
          // User has transcript and valid program - full SmartCourse experience
          contextType = 'smartcourse_full';
          smartCourseEnabled = true;
          
          try {
            // Verify the program exists in your ACTUAL knowledge base
            const allPrograms = await degreeRequirementsRepo.getAllPrograms();
            const validProgram = allPrograms.find(p => 
              p.name.toLowerCase() === program.toLowerCase()
            );
            
            if (!validProgram) {
              logger.warn('Program not found in knowledge base, using fallback', { program });
              // Use SmartCourse with fallback program data
              const { systemPrompt: fusedSystemPrompt, userPrompt: fusedUserPrompt } = 
                await ContextFusionService.fuseContext(transcript, program, message, userProfile);
              reply = await unifiedAIService.generate(fusedSystemPrompt, fusedUserPrompt, apiKey);
            } else {
              // Full SmartCourse with validated program
              const { systemPrompt: fusedSystemPrompt, userPrompt: fusedUserPrompt } = 
                await ContextFusionService.fuseContext(transcript, program, message, userProfile);
              reply = await unifiedAIService.generate(fusedSystemPrompt, fusedUserPrompt, apiKey);
            }
          } catch (error) {
            logger.error('SmartCourse full mode failed', { error: error.message });
            throw error; // Will be caught by outer try-catch
          }
          break;

        case 'transcript_no_program':
          // Has transcript but program is unclear
          contextType = 'smartcourse_partial';
          smartCourseEnabled = true;
          const { systemPrompt: partialSystemPrompt, userPrompt: partialUserPrompt } = 
            await ContextFusionService.fuseContext(transcript, null, message, userProfile);
          reply = await unifiedAIService.generate(partialSystemPrompt, partialUserPrompt, apiKey);
          break;

        case 'partial_transcript':
          // Transcript uploaded but data extraction failed
          contextType = 'smartcourse_incomplete';
          smartCourseEnabled = true;
          const { systemPrompt: incompleteSystemPrompt, userPrompt: incompleteUserPrompt } = 
            await ContextFusionService.fuseContext(transcript, program, message, userProfile);
          reply = await unifiedAIService.generate(incompleteSystemPrompt, incompleteUserPrompt, apiKey);
          break;

        case 'profile_with_program':
          // Profile-based guidance with known program
          contextType = 'profile_enhanced';
          const { systemPrompt: profileSystemPrompt, userPrompt: profileUserPrompt } = 
            await ContextFusionService.fuseContext(null, program, message, userProfile);
          reply = await unifiedAIService.generate(profileSystemPrompt, profileUserPrompt, apiKey);
          break;

        case 'profile_no_program':
        case 'anonymous':
        default:
          // Fallback to existing contextual advisor logic
          contextType = 'standard';
          logger.info('Using standard contextual advisor', { userState: userState.type });
          
          const studentContext = userProfile ? {
            name: userProfile.name,
            major: userProfile.major,
            academicLevel: userProfile.currentYear,
            gradYear: userProfile.expectedGraduationYear,
            interests: userProfile.interests,
            careerGoals: userProfile.academicGoals
          } : {};

          reply = await unifiedAIService.generateContextualResponse(message, apiKey, {
            userId: userId || 'anonymous',
            sessionId: sessionId || 'default',
            studentContext: studentContext,
            systemPrompt: systemPrompt,
            maxTokens: 400,
            temperature: 0.6
          });
          break;
      }
    } catch (error) {
      logger.warn('Enhanced context fusion failed, using fallback', { 
        error: error.message, 
        contextType,
        userState: userState?.type 
      });
      
      // COMPREHENSIVE FALLBACK: If all context fusion fails, use basic AI
      contextType = 'fallback';
      reply = await unifiedAIService.generateResponse(message, apiKey, {
        systemPrompt: systemPrompt,
        maxTokens: 350,
        temperature: 0.7
      });
    }
    
    if (!reply) {
      throw new Error('No response received from AI service');
    }

    // STEP 4: Enhanced evaluation with user state awareness
    let evaluation = null;
    if (smartCourseEnabled && transcript && program) {
      try {
        // Enhanced evaluation that considers user state
        evaluation = await EvaluationService.evaluateSmartCourseEffectiveness(
          reply, 
          transcript, 
          program,
          message
        );
        
        // Add user state context to evaluation
        evaluation.userState = userState.type;
        evaluation.contextType = contextType;
        
        logger.info('Enhanced SmartCourse evaluation', {
          userState: userState.type,
          contextType,
          program,
          planScore: evaluation.planScore,
          personalScore: evaluation.personalScore,
          lift: evaluation.lift,
          recall: evaluation.recall,
          recommendedCourses: evaluation.recommendedCourses,
          queryContext: evaluation.smartCourseMetrics?.queryContext?.types,
          recommendationQuality: evaluation.smartCourseMetrics?.recommendationQuality?.rating
        });
      } catch (evalError) {
        logger.warn('Enhanced evaluation failed', { 
          error: evalError.message,
          userState: userState?.type,
          contextType
        });
      }
    } else if (userState?.type && contextType) {
      // Log context usage even without full evaluation
      logger.info('Context strategy applied', {
        userState: userState.type,
        contextType,
        smartCourseEnabled,
        hasTranscript: !!transcript,
        hasProgram: !!program
      });
    }

    // Only generate transcript prompts for specific degree audit requests
    let transcriptPrompt = null;
    if (transcriptPromptNeeded && userProfile && !context && (message.toLowerCase().includes('degree audit') || message.toLowerCase().includes('graduation progress'))) {
      transcriptPrompt = await generateTranscriptPrompt(userProfile, message, apiKey);
    }

    res.json({
      success: true,
      data: {
        response: reply,
        originalMessage: message,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o-mini',
        transcriptPrompt: transcriptPrompt,
        userProfile: userProfile ? {
          firstName: firstName,
          major: userProfile.major,
          currentYear: userProfile.currentYear,
          expectedGraduationYear: userProfile.expectedGraduationYear
        } : null,
        // Include evaluation metrics in development mode only
        evaluation: process.env.NODE_ENV === 'development' ? evaluation : undefined,
        // Enhanced SmartCourse status with user state information
        smartCourseEnabled: smartCourseEnabled,
        contextType: contextType,
        userState: userState?.type,
        enhancedContextUsed: smartCourseEnabled,
        contextFusionUsed: smartCourseEnabled, // For backward compatibility
        // Edge case handling status
        edgeCaseHandling: {
          hasTranscript: userState?.hasTranscript || false,
          hasProfile: userState?.hasProfile || false,
          hasProgram: userState?.hasProgram || false,
          transcriptComplete: userState?.transcriptComplete || false,
          profileComplete: userState?.profileComplete || false
        }
      }
    });

  } catch (error) {
    logger.error('Advisor chat error', { 
      error: error.message, 
      status: error.response?.status,
      statusText: error.response?.statusText 
    });
    
    // Handle specific OpenAI errors with AI-generated fallback
    if (error.response?.status === 429) {
      logger.warn('OpenAI rate limit hit', { retryAfter: error.response.headers['retry-after'] });
      
      // Generate contextual fallback response using simpler AI or local logic
      const fallbackResponse = await generateFallbackResponse(req.body.message, userProfile, apiKey);
      
      return res.status(200).json({
        success: true,
        data: {
          response: fallbackResponse,
          originalMessage: req.body.message,
          timestamp: new Date().toISOString(),
          model: 'ai-fallback-response'
        }
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process chat request'
    });
  }
});

// POST /api/advisor/plan - Generate AI-powered academic plan
router.post('/plan', authenticateToken, async (req, res) => {
  try {
    const { preferences, constraints, apiKey } = req.body;

    logger.info('Academic plan request', {
      userId: req.user.id,
      hasPreferences: !!preferences,
      hasConstraints: !!constraints
    });

    // Generate AI-powered academic plan
    const academicPlan = await generateAcademicPlan(req.user, preferences, constraints, apiKey);

    res.json({
      success: true,
      data: {
        ...academicPlan,
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

// GET /api/advisor/audit - AI-powered degree audit
router.get('/audit', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.query;
    
    logger.info('Degree audit request', { userId: req.user.id });

    // Generate AI-powered degree audit
    const degreeAudit = await generateDegreeAudit(req.user, apiKey);

    res.json({
      success: true,
      data: {
        ...degreeAudit,
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

/**
 * VALIDATION: Validate transcript input for security and data integrity
 */
function validateTranscriptInput(transcript) {
  if (!transcript || typeof transcript !== 'object') {
    return null;
  }

  try {
    // Basic structure validation
    if (!transcript.courses && !transcript.studentInfo && !transcript.gpaSummary) {
      return null; // Empty or invalid transcript
    }

    const validated = {};

    // Validate student info
    if (transcript.studentInfo && typeof transcript.studentInfo === 'object') {
      validated.studentInfo = {};
      
      if (transcript.studentInfo.name && typeof transcript.studentInfo.name === 'string') {
        validated.studentInfo.name = transcript.studentInfo.name.substring(0, 100).trim();
      }
      
      if (transcript.studentInfo.program && typeof transcript.studentInfo.program === 'string') {
        validated.studentInfo.program = transcript.studentInfo.program.substring(0, 100).trim();
      }
    }

    // Validate courses array
    if (transcript.courses && Array.isArray(transcript.courses)) {
      validated.courses = transcript.courses
        .filter(course => course && typeof course === 'object' && course.courseCode)
        .map(course => ({
          courseCode: String(course.courseCode).substring(0, 20).trim(),
          title: course.title ? String(course.title).substring(0, 200).trim() : 'Unknown Course',
          credits: parseFloat(course.credits) || 0,
          grade: course.grade ? String(course.grade).substring(0, 5).trim() : null,
          status: course.status === 'completed' || course.status === 'in-progress' ? course.status : 'completed'
        }))
        .slice(0, 200); // Limit to prevent abuse
    }

    // Validate GPA summary
    if (transcript.gpaSummary && typeof transcript.gpaSummary === 'object') {
      validated.gpaSummary = {};
      
      if (typeof transcript.gpaSummary.cumulativeGPA === 'number') {
        const gpa = Math.max(0, Math.min(4.3, transcript.gpaSummary.cumulativeGPA));
        validated.gpaSummary.cumulativeGPA = Math.round(gpa * 100) / 100;
      }
      
      if (typeof transcript.gpaSummary.totalCreditsEarned === 'number') {
        validated.gpaSummary.totalCreditsEarned = Math.max(0, Math.min(300, transcript.gpaSummary.totalCreditsEarned));
      }
    }

    return Object.keys(validated).length > 0 ? validated : null;
    
  } catch (error) {
    logger.warn('Error validating transcript input', { error: error.message });
    return null;
  }
}

/**
 * VALIDATION: Validate user profile input for security and data integrity
 */
function validateUserProfileInput(userProfile) {
  if (!userProfile || typeof userProfile !== 'object') {
    return null;
  }

  try {
    const validated = {};

    // Validate name
    if (userProfile.name && typeof userProfile.name === 'string') {
      const sanitizedName = userProfile.name.replace(/[<>]/g, '').trim().substring(0, 50);
      if (sanitizedName.length > 0) {
        validated.name = sanitizedName;
      }
    }

    // Validate major
    if (userProfile.major && typeof userProfile.major === 'string') {
      const sanitizedMajor = userProfile.major.replace(/[<>]/g, '').trim().substring(0, 100);
      if (sanitizedMajor.length > 0) {
        validated.major = sanitizedMajor;
      }
    }

    // Validate current year
    if (userProfile.currentYear && typeof userProfile.currentYear === 'string') {
      const year = userProfile.currentYear.toLowerCase().trim();
      const validYears = ['freshman', 'sophomore', 'junior', 'senior', '1st year', '2nd year', '3rd year', '4th year'];
      if (validYears.includes(year)) {
        validated.currentYear = year;
      }
    }

    // Validate expected graduation year
    if (userProfile.expectedGraduationYear) {
      const gradYear = parseInt(userProfile.expectedGraduationYear);
      const currentYear = new Date().getFullYear();
      if (!isNaN(gradYear) && gradYear >= currentYear && gradYear <= currentYear + 10) {
        validated.expectedGraduationYear = gradYear;
      }
    }

    // Validate interests array
    if (Array.isArray(userProfile.interests)) {
      validated.interests = userProfile.interests
        .filter(interest => interest && typeof interest === 'string')
        .map(interest => interest.replace(/[<>]/g, '').trim().substring(0, 50))
        .filter(interest => interest.length > 0)
        .slice(0, 10); // Limit to 10 interests
    }

    // Validate academic goals array
    if (Array.isArray(userProfile.academicGoals)) {
      validated.academicGoals = userProfile.academicGoals
        .filter(goal => goal && typeof goal === 'string')
        .map(goal => goal.replace(/[<>]/g, '').trim().substring(0, 100))
        .filter(goal => goal.length > 0)
        .slice(0, 10); // Limit to 10 goals
    }

    return Object.keys(validated).length > 0 ? validated : null;
    
  } catch (error) {
    logger.warn('Error validating user profile input', { error: error.message });
    return null;
  }
}

/**
 * VALIDATION: Validate program name input for security and data integrity
 */
function validateProgramInput(program) {
  if (!program || typeof program !== 'string') {
    return null;
  }

  try {
    // Sanitize program name
    const sanitized = program
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, 100); // Limit length

    if (sanitized.length === 0) {
      return null;
    }

    // Check for suspicious content
    if (/javascript:|<script|on\w+=/i.test(sanitized)) {
      logger.warn('Suspicious program name detected', { program: sanitized });
      return null;
    }

    return sanitized;
    
  } catch (error) {
    logger.warn('Error validating program input', { error: error.message });
    return null;
  }
}

module.exports = router;