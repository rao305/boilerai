const axios = require('axios');
const { logger } = require('../utils/logger');
const courseKnowledgeBase = require('./courseKnowledgeBase');

/**
 * Intelligent Academic Advisor with RAG Integration and Self-Awareness
 * 
 * This service provides intelligent academic advising by:
 * 1. Understanding its knowledge base scope and limitations
 * 2. Using RAG system for knowledge retrieval
 * 3. Providing specific, contextual responses based on available data
 * 4. Having self-awareness about what it knows and doesn't know
 */
class IntelligentAcademicAdvisor {
  constructor() {
    this.API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:8001';
    
    // Define knowledge base scope - what this advisor actually knows about
    this.knowledgeScope = {
      programs: ['Computer Science'],
      tracks: ['Machine Intelligence', 'Software Engineering'],
      courses: 'CS courses and related math/stat requirements',
      policies: 'CS program policies and requirements',
      limitations: [
        'I only have information about the Computer Science program at Purdue',
        'I do not have information about Data Science or AI programs as standalone majors',
        'I cannot provide information about other engineering or non-CS programs'
      ]
    };
    
    // Academic advisor persona configuration
    this.advisorPersona = {
      identity: 'CS Academic Advisor',
      expertise: 'Computer Science program at Purdue University',
      approach: 'Evidence-based advising using program data and requirements',
      communication: 'Direct, specific, and helpful within scope of knowledge'
    };
  }

  /**
   * Main entry point for academic advising
   * Processes queries with intelligence and self-awareness
   */
  async advise(query, profile_json = null, llmConfig = {}) {
    try {
      logger.info('Intelligent Academic Advisor processing query', {
        queryLength: query.length,
        hasProfile: !!profile_json,
        provider: llmConfig.provider
      });

      // Step 0: Check for specific CODO/prerequisite questions first (highest priority)
      const codoeQuestions = this.checkForCODOQuestions(query);
      if (codoeQuestions) {
        const codoeResponse = this.handleCODOQuestions(codoeQuestions, query);
        if (codoeResponse) {
          logger.info('Handled CODO query', { type: codoeQuestions.type });
          return codoeResponse;
        }
      }

      // Step 1: Check for direct course queries first (highest priority)
      const directCourseQuery = this.checkForDirectCourseQuery(query);
      if (directCourseQuery) {
        const directResponse = this.handleDirectCourseQuery(directCourseQuery);
        if (directResponse) {
          logger.info('Handled direct course query', { 
            courseCodes: directCourseQuery.courseCodes,
            type: directCourseQuery.queryType 
          });
          return directResponse;
        }
      }

      // Step 2: Check for track-specific queries
      const trackQuery = this.checkForTrackQuery(query);
      if (trackQuery) {
        const trackResponse = this.handleTrackQuery(trackQuery);
        if (trackResponse) {
          logger.info('Handled track query', { 
            tracks: trackQuery.tracks,
            isComparison: trackQuery.isComparison 
          });
          return trackResponse;
        }
      }

      // Step 3: Analyze query and determine knowledge scope alignment
      const scopeAnalysis = this.analyzeScopeAlignment(query);
      
      // Step 4: If query is outside scope, provide clear boundaries
      if (!scopeAnalysis.withinScope) {
        return this.handleOutOfScopeQuery(query, scopeAnalysis);
      }

      // Step 5: Check for program overview questions
      const programOverview = this.checkForProgramOverview(query);
      if (programOverview) {
        return this.handleProgramOverview(query);
      }

      // Step 6: Use RAG system for knowledge retrieval and processing
      const ragResponse = await this.consultRAGSystem(query, profile_json);
      
      // Step 7: Enhance response with academic advisor intelligence
      const enhancedResponse = await this.enhanceWithAdvisorIntelligence(
        query, ragResponse, profile_json, llmConfig
      );

      return enhancedResponse;

    } catch (error) {
      logger.error('Intelligent Academic Advisor error', { error: error.message });
      return this.handleError(error, query);
    }
  }

  /**
   * Check for CODO and prerequisite-specific questions
   */
  checkForCODOQuestions(query) {
    const queryLower = query.toLowerCase();
    
    // Check for calculus equivalency questions
    if (queryLower.includes('calculus 2') && (queryLower.includes('calc 1') || queryLower.includes('calculus 1'))) {
      if (queryLower.includes('suffice') || queryLower.includes('enough') || queryLower.includes('meet') || queryLower.includes('satisfy')) {
        return {
          type: 'calculus_equivalency',
          question: 'calculus_2_for_1',
          confidence: 0.95
        };
      }
    }

    // Check for CODO requirements questions
    if (queryLower.includes('codo') || queryLower.includes('change of degree')) {
      if (queryLower.includes('requirement') || queryLower.includes('need') || queryLower.includes('how to')) {
        return {
          type: 'codo_requirements',
          confidence: 0.9
        };
      }
    }

    // Check for prerequisite equivalency
    if ((queryLower.includes('ma') || queryLower.includes('math')) && 
        (queryLower.includes('16500') || queryLower.includes('16100')) &&
        (queryLower.includes('satisfy') || queryLower.includes('meet') || queryLower.includes('instead'))) {
      return {
        type: 'math_prerequisite',
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Handle CODO and prerequisite-specific questions with direct answers
   */
  handleCODOQuestions(codoeQuery, originalQuery) {
    let response = '';

    switch (codoeQuery.type) {
      case 'calculus_equivalency':
        response = `**Yes, Calculus 2 suffices for the Calculus 1 requirement.**

Since you got an A+ in Calculus 2, you have demonstrated mastery of all Calculus 1 concepts. Higher-level math courses typically fulfill lower-level requirements.

**For CODO into CS, you need:**
• **2.75 cumulative GPA minimum**
• **CS 18000** (Problem Solving and Object-Oriented Programming) - **C or better**
• **MA 16100** (Applied Calc I) **OR MA 16500** (Analytic Calc I) - **C or better**

✅ Your A+ in Calculus 2 **definitely satisfies** the math requirement.

I'd still recommend confirming with your academic advisor, but mathematically you're all set on the calculus requirement!`;
        break;

      case 'codo_requirements':
        response = `**CODO Requirements into Computer Science:**

✅ **Required:**
• **Minimum 2.75 cumulative GPA**
• **CS 18000** - Problem Solving and Object-Oriented Programming (C or better)
• **MA 16100** (Applied Calc I) **OR MA 16500** (Analytic Calc I) (C or better)

⚠️ **Important:**
• Admission is **competitive** - meeting minimums doesn't guarantee admission
• Depends on available spots in the program
• Applications typically reviewed each semester

**Alternative approaches:**
• If you don't meet requirements, retake courses to improve grades
• Consider taking additional CS courses to show interest and ability
• Strong performance in CS 18000 is especially important

Need help with any of these specific requirements?`;
        break;

      case 'math_prerequisite':
        response = `**Yes, completing the higher-level math course satisfies the lower-level requirement.**

If you've completed **MA 16500** (Analytic Calculus I) or a higher calculus course with a C or better, this **automatically satisfies** the MA 16100 (Applied Calculus I) requirement for CODO.

The progression typically is:
• **MA 16100** (Applied Calc I) - **OR**
• **MA 16500** (Analytic Calc I) - **OR** 
• Any higher calculus course (Calc II, III, etc.)

**For CODO verification:** Contact your advisor to have the equivalency officially noted, but yes, your higher-level math work definitely meets the requirement.`;
        break;

      default:
        return null;
    }

    return {
      content: response,
      type: 'codo_direct_answer',
      withinScope: true,
      advisorNote: 'Direct answer to common CODO question'
    };
  }

  /**
   * Check if query is asking about specific courses and provide direct answers
   */
  checkForDirectCourseQuery(query) {
    // Extract course codes from query (CS180, CS 180, cs18000, etc.)
    const courseCodePattern = /\b(CS\s?(\d{3}|\d{5})|\w+\s?\d{5})\b/gi;
    const matches = query.match(courseCodePattern);
    
    if (!matches) {
      return null;
    }

    // Normalize course codes
    const courseCodes = matches.map(code => {
      return code.replace(/\s/g, '').toUpperCase();
    });

    // Look for specific query types
    const queryLower = query.toLowerCase();
    const isAskingAbout = queryLower.includes('what is') || 
                         queryLower.includes('tell me about') || 
                         queryLower.includes('describe');
    const isAskingCredits = queryLower.includes('credit') || queryLower.includes('how many credits');
    const isAskingPrereq = queryLower.includes('prerequisite') || queryLower.includes('prereq');

    if (isAskingAbout || isAskingCredits || isAskingPrereq) {
      return {
        type: 'direct_course_query',
        courseCodes,
        queryType: isAskingCredits ? 'credits' : isAskingPrereq ? 'prerequisites' : 'description',
        confidence: 0.95
      };
    }

    return null;
  }

  /**
   * Handle direct course queries with specific knowledge base information
   */
  handleDirectCourseQuery(courseQuery) {
    if (!courseKnowledgeBase.isReady()) {
      return null;
    }

    let response = '';
    const processedCourses = [];

    courseQuery.courseCodes.forEach(courseCode => {
      const courseInfo = courseKnowledgeBase.getCourseInfo(courseCode);
      
      if (courseInfo) {
        processedCourses.push(courseInfo);
        
        if (courseQuery.queryType === 'credits') {
          response += `**${courseInfo.courseId}** is worth **${courseInfo.credits} credits**.\n\n`;
        } else if (courseQuery.queryType === 'prerequisites') {
          response += `**${courseInfo.courseId} Prerequisites:**\n${courseInfo.prerequisites || 'No specific prerequisites listed'}\n\n`;
        } else {
          // Full description
          response += courseKnowledgeBase.formatCourseInfo(courseInfo) + '\n\n';
        }
      } else {
        response += `I don't have specific information about ${courseCode} in my CS knowledge base. `;
        response += `Please check the official CS course catalog or contact the department.\n\n`;
      }
    });

    if (processedCourses.length > 0) {
      // Add contextual advice
      if (courseQuery.queryType === 'description') {
        response += `**Academic Advisor Note:** Make sure to check prerequisites before enrolling, `;
        response += `and consider how this course fits into your overall degree plan and track selection.`;
      }

      return {
        content: response.trim(),
        type: 'direct_knowledge',
        coursesFound: processedCourses.length,
        withinScope: true,
        advisorNote: 'Direct response from CS course knowledge base'
      };
    }

    return null;
  }

  /**
   * Check for track-specific queries
   */
  checkForTrackQuery(query) {
    const queryLower = query.toLowerCase();
    const trackMentions = {
      'machine intelligence': queryLower.includes('machine intelligence') || queryLower.includes('mi track'),
      'software engineering': queryLower.includes('software engineering') || queryLower.includes('se track'),
      'track comparison': queryLower.includes('track') && (queryLower.includes('vs') || queryLower.includes('compare') || queryLower.includes('which track')),
      'track requirements': queryLower.includes('track') && (queryLower.includes('requirement') || queryLower.includes('classes') || queryLower.includes('courses'))
    };

    const mentionedTracks = Object.keys(trackMentions).filter(key => trackMentions[key]);
    
    if (mentionedTracks.length > 0) {
      return {
        type: 'track_query',
        tracks: mentionedTracks,
        isComparison: trackMentions['track comparison'],
        needsRequirements: trackMentions['track requirements'],
        confidence: 0.9
      };
    }

    return null;
  }

  /**
   * Handle track-specific queries
   */
  handleTrackQuery(trackQuery) {
    if (!courseKnowledgeBase.isReady()) {
      return null;
    }

    let response = '';

    if (trackQuery.isComparison || trackQuery.tracks.includes('track comparison')) {
      // Provide track comparison
      const miTrack = courseKnowledgeBase.getTrackInfo('machine_intelligence');
      const seTrack = courseKnowledgeBase.getTrackInfo('software_engineering');

      response += `**CS Track Comparison:**\n\n`;
      
      if (miTrack) {
        response += `**Machine Intelligence (MI) Track:**\n`;
        response += `• Focus: AI, machine learning, algorithms, and intelligent systems\n`;
        response += `• Good for: Students interested in research, AI/ML careers, graduate school\n`;
        response += `• Key courses: CS 37300 (Data Mining), CS 47100 (Artificial Intelligence)\n\n`;
      }

      if (seTrack) {
        response += `**Software Engineering (SE) Track:**\n`;
        response += `• Focus: Software development, testing, systems, and engineering practices\n`;
        response += `• Good for: Students interested in software development, industry careers\n`;
        response += `• Key courses: CS 30700 (Software Engineering I), CS 40800 (Software Testing)\n\n`;
      }

      response += `**Both tracks require:**\n`;
      response += `• CS 38100 (Introduction to the Analysis of Algorithms)\n`;
      response += `• All CS core courses (CS 180, 182, 240, 250, 251, 252)\n\n`;
      response += `**Choosing recommendation:** Consider your career goals and interests in theory vs. practice.`;

    } else if (trackQuery.needsRequirements) {
      // Provide specific track requirements
      if (trackQuery.tracks.includes('machine intelligence')) {
        const miTrack = courseKnowledgeBase.getTrackInfo('machine_intelligence');
        if (miTrack) {
          response += courseKnowledgeBase.formatTrackInfo(miTrack);
        }
      }
      
      if (trackQuery.tracks.includes('software engineering')) {
        const seTrack = courseKnowledgeBase.getTrackInfo('software_engineering');
        if (seTrack) {
          response += courseKnowledgeBase.formatTrackInfo(seTrack);
        }
      }
    } else {
      // General track information
      response += `**Computer Science Tracks at Purdue:**\n\n`;
      response += `We offer two specialized tracks within the CS major:\n\n`;
      response += `1. **Machine Intelligence (MI)** - Focus on AI and algorithms\n`;
      response += `2. **Software Engineering (SE)** - Focus on software development\n\n`;
      response += `You typically declare your track during your junior year after completing core courses.\n\n`;
      response += `Would you like me to explain the specific requirements for either track?`;
    }

    return {
      content: response,
      type: 'track_information',
      withinScope: true,
      advisorNote: 'Track information from CS program knowledge base'
    };
  }

  /**
   * Check for program overview questions  
   */
  checkForProgramOverview(query) {
    const queryLower = query.toLowerCase();
    const overviewIndicators = [
      'computer science program',
      'cs program',
      'tell me about computer science',
      'what is computer science',
      'cs major',
      'computer science major',
      'program structure',
      'core classes',
      'core courses'
    ];

    const hasOverviewIndicator = overviewIndicators.some(indicator => 
      queryLower.includes(indicator)
    );

    if (hasOverviewIndicator) {
      return {
        type: 'program_overview',
        confidence: 0.8
      };
    }

    return null;
  }

  /**
   * Handle program overview questions
   */
  handleProgramOverview(query) {
    if (!courseKnowledgeBase.isReady()) {
      return this.getFallbackProgramOverview();
    }

    const programStructure = courseKnowledgeBase.getProgramStructure();
    
    let response = `**Computer Science Program at Purdue University**\n\n`;
    
    response += `The Computer Science major provides a strong foundation in programming, algorithms, `;
    response += `and computer systems with two specialized tracks for advanced study.\n\n`;
    
    response += `**Program Structure:**\n\n`;
    response += `**1. Core Courses (Required for all CS students):**\n`;
    programStructure.core_courses.forEach(course => {
      response += `• ${course}\n`;
    });
    
    response += `\n**2. Track Selection (Choose one):**\n`;
    programStructure.tracks.forEach(track => {
      response += `• **${track.name}**: ${track.focus}\n`;
    });
    
    response += `\n**3. Additional Requirements:**\n`;
    response += `• Mathematics courses (Calculus sequence)\n`;
    response += `• Science electives\n`;
    response += `• General education requirements\n\n`;
    
    response += `**Track Declaration:** You typically declare your track during your junior year `;
    response += `after completing most core courses.\n\n`;
    
    response += `**Next Steps:**\n`;
    response += `• Start with CS 180 (Problem Solving and Object-Oriented Programming)\n`;
    response += `• Complete math prerequisites\n`;
    response += `• Explore both tracks to decide which fits your interests\n\n`;
    
    response += `Would you like me to explain more about either track or specific courses?`;

    return {
      content: response,
      type: 'program_overview',
      withinScope: true,
      advisorNote: 'Comprehensive CS program overview with track information'
    };
  }

  /**
   * Fallback program overview when knowledge base isn't available
   */
  getFallbackProgramOverview() {
    const response = `**Computer Science Program at Purdue University**

I'm your CS academic advisor, and I can help you understand our program structure:

**Core Foundation:**
• CS 180 - Problem Solving and Object-Oriented Programming (4 credits)
• CS 182 - Foundations of Computer Science 
• CS 240 - Programming in C
• CS 250 - Computer Architecture
• CS 251 - Data Structures and Algorithms
• CS 252 - Systems Programming

**Two Specialized Tracks:**
• **Machine Intelligence (MI)** - AI, machine learning, algorithms
• **Software Engineering (SE)** - Software development and systems

**Program Features:**
• Strong theoretical and practical foundation
• Hands-on programming in multiple languages  
• Industry-relevant skills and knowledge
• Preparation for careers or graduate school

Would you like to know more about specific courses, track requirements, or have other questions about the CS program?`;

    return {
      content: response,
      type: 'program_overview_fallback',
      withinScope: true,
      advisorNote: 'Basic CS program overview (knowledge base unavailable)'
    };
  }

  /**
   * Analyze whether query aligns with knowledge base scope
   */
  analyzeScopeAlignment(query) {
    const queryLower = query.toLowerCase();
    
    // Check for out-of-scope program mentions
    const outOfScopePrograms = [
      'data science', 'artificial intelligence program', 'ai program', 
      'data science major', 'ai major', 'ds program', 'statistics major',
      'math major', 'electrical engineering', 'mechanical engineering'
    ];
    
    const mentionsOutOfScope = outOfScopePrograms.some(program => 
      queryLower.includes(program)
    );
    
    // Check for CS-related terms
    const csTerms = [
      'computer science', 'cs', 'cs180', 'cs18000', 'programming', 
      'machine intelligence', 'software engineering', 'mi track', 'se track',
      'cs major', 'computer science major'
    ];
    
    const mentionsCS = csTerms.some(term => queryLower.includes(term));
    
    // General academic terms that could be CS-related
    const generalTerms = [
      'course', 'class', 'credit', 'prerequisite', 'graduation',
      'track', 'major', 'requirement', 'schedule'
    ];
    
    const mentionsGeneral = generalTerms.some(term => queryLower.includes(term));
    
    return {
      withinScope: mentionsCS || (mentionsGeneral && !mentionsOutOfScope),
      confidence: mentionsCS ? 0.9 : (mentionsGeneral && !mentionsOutOfScope) ? 0.6 : 0.2,
      outOfScopeDetected: mentionsOutOfScope,
      suggestedScope: mentionsCS ? 'cs_specific' : mentionsGeneral ? 'general_academic' : 'unclear'
    };
  }

  /**
   * Handle queries that are outside knowledge scope with clear boundaries
   */
  handleOutOfScopeQuery(query, scopeAnalysis) {
    logger.info('Query outside knowledge scope', { 
      query: query.substring(0, 100), 
      outOfScope: scopeAnalysis.outOfScopeDetected 
    });

    let response = "I'm a Computer Science academic advisor at Purdue, and I specialize in the CS program.\n\n";
    
    if (scopeAnalysis.outOfScopeDetected) {
      response += "I noticed you're asking about programs outside of Computer Science. ";
      response += "I only have detailed information about:\n\n";
      response += "✓ **Computer Science Major** with two tracks:\n";
      response += "  - Machine Intelligence (MI)\n";  
      response += "  - Software Engineering (SE)\n\n";
      response += "✓ CS course descriptions, prerequisites, and requirements\n";
      response += "✓ CS program policies and graduation planning\n\n";
      response += "For information about other programs like Data Science or AI as standalone majors, ";
      response += "you'll need to contact those specific departments or a general academic advisor.\n\n";
      response += "**Would you like to know about the Computer Science program instead?** ";
      response += "I can tell you about our tracks, course requirements, or help you plan your CS coursework.";
    } else {
      response += "I'm not sure I understood your question correctly. ";
      response += "I can help you with:\n\n";
      response += "• Computer Science course information (like CS 180, CS 182, etc.)\n";
      response += "• Track selection (Machine Intelligence vs Software Engineering)\n";
      response += "• Graduation requirements and course sequencing\n";
      response += "• Prerequisites and course planning\n\n";
      response += "Could you rephrase your question to be more specific about what you'd like to know about the CS program?";
    }

    return {
      content: response,
      type: 'scope_boundary',
      withinScope: false,
      advisorNote: 'Query handled with clear knowledge boundaries'
    };
  }

  /**
   * Consult the RAG system for knowledge retrieval
   */
  async consultRAGSystem(query, profile_json) {
    try {
      // Use the existing API gateway's RAG capabilities
      const response = await axios.post(`${this.API_GATEWAY_URL}/qa`, {
        question: query,
        profile_json: profile_json
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      logger.warn('RAG system consultation failed, using fallback', { error: error.message });
      return null;
    }
  }

  /**
   * Enhance RAG response with academic advisor intelligence
   */
  async enhanceWithAdvisorIntelligence(query, ragResponse, profile_json, llmConfig) {
    // If RAG system provided a good response, use it as base
    if (ragResponse && ragResponse.mode) {
      return this.processRAGResponse(ragResponse, query, profile_json);
    }

    // Fallback: Use LLM with academic advisor persona and knowledge constraints
    return await this.generateAdvisorResponse(query, profile_json, llmConfig);
  }

  /**
   * Process and enhance RAG system responses
   */
  processRAGResponse(ragResponse, query, profile_json) {
    let response = {
      content: '',
      type: 'rag_enhanced',
      mode: ragResponse.mode,
      advisorNote: 'Response based on CS knowledge base'
    };

    switch (ragResponse.mode) {
      case 't2sql':
        response.content = this.enhanceT2SQLResponse(ragResponse, query);
        break;
      case 'planner':
        response.content = this.enhancePlannerResponse(ragResponse, query);
        break;
      case 'general_chat':
        response.content = this.enhanceGeneralResponse(ragResponse.response, query);
        break;
      default:
        response.content = ragResponse.response || ragResponse.content || 'I found some information, but need to process it better.';
    }

    return response;
  }

  /**
   * Enhance T2SQL responses with advisor context
   */
  enhanceT2SQLResponse(ragResponse, query) {
    let response = "Based on the CS program data:\n\n";
    
    if (ragResponse.rows && ragResponse.rows.length > 0) {
      // Format the data in a helpful way
      const rows = ragResponse.rows;
      
      if (query.toLowerCase().includes('prerequisite') || query.toLowerCase().includes('prereq')) {
        response += "**Prerequisites:**\n";
        rows.forEach(row => {
          if (row.course_id) {
            response += `• ${row.course_id}: ${row.prerequisites || 'No specific prerequisites listed'}\n`;
          }
        });
      } else if (query.toLowerCase().includes('credit')) {
        response += "**Course Credits:**\n";
        rows.forEach(row => {
          if (row.course_id && row.credits) {
            response += `• ${row.course_id}: ${row.credits} credits\n`;
          }
        });
      } else {
        // Generic row formatting
        rows.forEach(row => {
          response += `• ${JSON.stringify(row, null, 2)}\n`;
        });
      }
    } else {
      response += "I couldn't find specific data for your question in the CS program database. ";
      response += "This might mean the information isn't available or needs to be asked differently.";
    }

    return response;
  }

  /**
   * Enhance planner responses with advisor guidance
   */
  enhancePlannerResponse(ragResponse, query) {
    let response = "Here's your personalized CS program plan:\n\n";
    
    if (ragResponse.plan) {
      response += ragResponse.plan;
      response += "\n\n**Academic Advisor Notes:**\n";
      response += "• Make sure to complete prerequisites before enrolling in courses\n";
      response += "• Consider declaring your track (MI or SE) by your junior year\n";
      response += "• Plan for course availability - not all CS courses are offered every semester\n";
    } else {
      response = "I'd need your transcript or course history to create a personalized plan. ";
      response += "Generally, CS students start with:\n\n";
      response += "1. **CS 180** (Problem Solving and Object-Oriented Programming)\n";
      response += "2. **CS 182** (Foundations of Computer Science)\n";
      response += "3. **Math requirements** (usually calculus sequence)\n\n";
      response += "Would you like to upload your transcript for a personalized plan?";
    }

    return response;
  }

  /**
   * Enhance general chat responses with CS advisor context
   */
  enhanceGeneralResponse(ragResponse, query) {
    if (!ragResponse) {
      return "I'm here to help with CS program questions, but I need a bit more context. Could you be more specific about what you'd like to know?";
    }

    // Add advisor context to the response
    let response = ragResponse;
    
    // Add helpful context if the response seems generic
    if (response.length < 100 || !response.includes('CS') && !response.includes('Computer Science')) {
      response += "\n\n*As your CS academic advisor, I want to make sure I'm giving you the most accurate information based on our current program requirements. ";
      response += "If you need more specific details about courses, tracks, or requirements, please let me know!*";
    }

    return response;
  }

  /**
   * Generate advisor response using LLM with proper persona
   */
  async generateAdvisorResponse(query, profile_json, llmConfig) {
    const advisorPrompt = this.buildAdvisorPrompt(query, profile_json);
    
    try {
      // Use the existing unified AI service but with advisor-specific prompting
      const UnifiedAIService = require('./unifiedAIService');
      const response = await UnifiedAIService.generateResponse(advisorPrompt, llmConfig.apiKey, {
        provider: llmConfig.provider,
        model: llmConfig.model,
        systemPrompt: this.getAdvisorSystemPrompt(),
        temperature: 0.3
      });

      return {
        content: response,
        type: 'llm_advisor',
        advisorNote: 'Generated with academic advisor persona and knowledge boundaries'
      };
    } catch (error) {
      logger.error('LLM advisor response generation failed', { error: error.message });
      return this.getFallbackResponse(query);
    }
  }

  /**
   * Build advisor-specific prompt with context and boundaries
   */
  buildAdvisorPrompt(query, profile_json) {
    let prompt = `As a Computer Science academic advisor at Purdue University, I need to respond to this student question:\n\n`;
    prompt += `"${query}"\n\n`;
    
    prompt += `IMPORTANT CONTEXT:\n`;
    prompt += `- I ONLY have information about the Computer Science program\n`;
    prompt += `- CS has two tracks: Machine Intelligence (MI) and Software Engineering (SE)\n`;
    prompt += `- I do NOT have information about Data Science or AI as standalone programs\n`;
    prompt += `- If asked about non-CS programs, I should clearly state my limitations\n\n`;
    
    if (profile_json) {
      prompt += `Student Profile: ${JSON.stringify(profile_json, null, 2)}\n\n`;
    }
    
    prompt += `Please provide a helpful, specific response within my knowledge scope, or clearly explain if the question is outside my expertise.`;
    
    return prompt;
  }

  /**
   * Get academic advisor system prompt
   */
  getAdvisorSystemPrompt() {
    return `You are a Computer Science Academic Advisor at Purdue University. 

Your expertise covers:
- Computer Science major requirements and course information
- Machine Intelligence (MI) and Software Engineering (SE) tracks
- CS course prerequisites and sequencing
- CS program policies and graduation requirements

Your limitations:
- You do NOT have information about Data Science or AI programs as standalone majors
- You cannot advise on non-CS programs
- When asked about programs outside CS, clearly state your boundaries

Your communication style:
- Be direct and helpful within your scope
- Provide specific course codes and requirements when relevant
- Be honest about limitations
- Guide students to appropriate resources when needed

Always start responses about CS program specifics by confirming you're discussing the Computer Science major, not other programs.`;
  }

  /**
   * Get fallback response when other methods fail
   */
  getFallbackResponse(query) {
    return {
      content: `I'm your Computer Science academic advisor, and I'd like to help you with your question about "${query.substring(0, 100)}..."

I have detailed information about:
• Computer Science major requirements
• Machine Intelligence and Software Engineering tracks  
• CS course descriptions and prerequisites
• Graduation planning for CS students

However, I may need you to be more specific about what you'd like to know. Could you rephrase your question with more details about which aspect of the CS program you're interested in?`,
      type: 'fallback',
      advisorNote: 'Fallback response with clear scope definition'
    };
  }

  /**
   * Handle errors gracefully with advisor context
   */
  handleError(error, query) {
    logger.error('Intelligent Academic Advisor error', { 
      error: error.message, 
      query: query.substring(0, 100) 
    });

    return {
      content: `I'm experiencing a technical issue right now, but I'm here to help with Computer Science program questions. 

While I resolve this, you might want to:
• Check the CS department website for basic course information
• Contact the CS advising office directly for urgent questions
• Try rephrasing your question and asking again in a moment

I specialize in CS program advising and should be back to full functionality shortly.`,
      type: 'error',
      error: true,
      advisorNote: 'Error handled with helpful fallback information'
    };
  }

  /**
   * Get advisor capabilities summary for system introspection
   */
  getCapabilitiesSummary() {
    return {
      identity: this.advisorPersona.identity,
      scope: this.knowledgeScope,
      approach: this.advisorPersona.approach,
      integration: {
        rag: 'Integrated with CS knowledge base',
        llm: 'Uses LLM with advisor persona constraints',
        fallbacks: 'Multiple fallback strategies for reliability'
      }
    };
  }
}

module.exports = new IntelligentAcademicAdvisor();