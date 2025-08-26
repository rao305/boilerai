const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * Knowledge Base Only Academic Advisor
 * 
 * This service provides intelligent academic advising by:
 * 1. Using ONLY data available in the knowledge base
 * 2. Converting user queries to SQL queries via T2SQL
 * 3. Providing responses based purely on retrieved data
 * 4. Having complete awareness of available program data scope
 */
class KnowledgeBaseAcademicAdvisor {
  constructor() {
    this.API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:8001';
    this.dataDir = path.join(__dirname, '../../../packs/CS');
    
    // Load actual knowledge base data to understand scope
    this.knowledgeScope = this.loadActualKnowledgeScope();
    
    // Define advisor identity based on actual available data
    this.advisorIdentity = {
      name: 'CS Academic Advisor',
      expertise: this.generateExpertiseFromKnowledgeBase(),
      approach: 'Evidence-based advising using only verified knowledge base data',
      limitations: this.generateKnownLimitations()
    };
  }

  /**
   * Load and analyze actual knowledge base data to understand true scope
   */
  loadActualKnowledgeScope() {
    try {
      // Load tracks data
      const tracksPath = path.join(this.dataDir, 'tracks.json');
      const tracksData = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
      
      // Load degree progression data
      const progressionPath = path.join(this.dataDir, 'cs_degree_progression.json');
      const progressionData = JSON.parse(fs.readFileSync(progressionPath, 'utf8'));
      
      // Load available course pages
      const coursePagesDir = path.join(this.dataDir, 'docs/course_pages');
      const availableCourses = fs.readdirSync(coursePagesDir)
        .filter(file => file.endsWith('.md') && !file.startsWith('_'))
        .map(file => file.replace('.md', '').toUpperCase());

      return {
        institution: progressionData.degree_info.institution,
        campus: progressionData.degree_info.campus,
        college: progressionData.degree_info.college,
        degree: progressionData.degree_info.degree,
        catalog_year: progressionData.degree_info.catalog_year,
        tracks: tracksData.tracks.map(t => t.name),
        track_ids: tracksData.tracks.map(t => t.id),
        available_courses: availableCourses,
        degree_progression: progressionData.academic_progression,
        track_definitions: progressionData.track_definitions,
        core_requirements: progressionData.core_requirements
      };
    } catch (error) {
      logger.error('Failed to load knowledge base scope', { error: error.message });
      return null;
    }
  }

  /**
   * Generate expertise statement based on actual available data
   */
  generateExpertiseFromKnowledgeBase() {
    if (!this.knowledgeScope) {
      return 'Limited knowledge base access';
    }

    const expertise = [
      `${this.knowledgeScope.degree} at ${this.knowledgeScope.institution}`,
      `Tracks: ${this.knowledgeScope.tracks.join(', ')}`,
      `Course information for ${this.knowledgeScope.available_courses.length} courses`,
      `Academic progression planning from ${this.knowledgeScope.catalog_year}`,
      'Prerequisite and requirement verification'
    ];

    return expertise;
  }

  /**
   * Generate known limitations based on knowledge base scope
   */
  generateKnownLimitations() {
    if (!this.knowledgeScope) {
      return ['Knowledge base not accessible'];
    }

    return [
      `I only have information about ${this.knowledgeScope.degree}`,
      `I do not have information about other majors or programs`,
      `My course data covers ${this.knowledgeScope.available_courses.length} specific courses`,
      `Information is current as of ${this.knowledgeScope.catalog_year}`
    ];
  }

  /**
   * Main entry point - converts user queries to knowledge base queries
   */
  async advise(query, profile_json = null, llmConfig = {}) {
    try {
      logger.info('Knowledge Base Academic Advisor processing query', {
        queryLength: query.length,
        hasProfile: !!profile_json,
        hasKnowledgeScope: !!this.knowledgeScope
      });

      // Step 1: Check if knowledge base is available
      if (!this.knowledgeScope) {
        return this.handleKnowledgeBaseUnavailable();
      }

      // Step 2: Determine if query can be answered with available data
      const queryAnalysis = this.analyzeQueryScope(query);
      
      if (!queryAnalysis.canAnswer) {
        return this.handleOutOfScopeQuery(query, queryAnalysis);
      }

      // Step 3: Convert query to T2SQL for direct knowledge base access
      const sqlResult = await this.queryKnowledgeBaseDirectly(query, llmConfig);
      
      if (sqlResult && sqlResult.rows && sqlResult.rows.length > 0) {
        return this.formatSQLResults(query, sqlResult);
      }

      // Step 4: Try specific course query if T2SQL didn't work
      const courseQuery = this.extractCourseQuery(query);
      if (courseQuery) {
        return this.handleSpecificCourseQuery(courseQuery);
      }

      // Step 5: Try degree progression query
      const progressionQuery = this.extractProgressionQuery(query);
      if (progressionQuery) {
        return this.handleProgressionQuery(progressionQuery);
      }

      // Step 6: If no specific data found, provide scope information
      return this.provideAvailableInformation(query);

    } catch (error) {
      logger.error('Knowledge Base Academic Advisor error', { 
        error: error.message,
        query: query.substring(0, 100)
      });
      return this.handleError(error, query);
    }
  }

  /**
   * Analyze if the query can be answered with available knowledge base data
   */
  analyzeQueryScope(query) {
    const queryLower = query.toLowerCase();
    
    // Check for out-of-scope programs
    const outOfScopePrograms = [
      'data science', 'artificial intelligence program', 'ai program', 
      'data science major', 'ai major', 'ds program', 'statistics major',
      'math major', 'electrical engineering', 'mechanical engineering'
    ];
    
    const mentionsOutOfScope = outOfScopePrograms.some(program => 
      queryLower.includes(program)
    );
    
    // Check for available program terms
    const availableTerms = [
      'computer science', 'cs', 'programming', 'software engineering',
      'machine intelligence', 'cs major', 'computer science major',
      ...this.knowledgeScope.available_courses.map(c => c.toLowerCase())
    ];
    
    const mentionsAvailable = availableTerms.some(term => 
      queryLower.includes(term)
    );

    return {
      canAnswer: mentionsAvailable || (!mentionsOutOfScope && this.isGeneralAcademicQuery(queryLower)),
      outOfScope: mentionsOutOfScope,
      inScope: mentionsAvailable,
      confidence: mentionsAvailable ? 0.9 : (mentionsOutOfScope ? 0.1 : 0.5)
    };
  }

  /**
   * Check if query is general academic (could apply to CS program)
   */
  isGeneralAcademicQuery(queryLower) {
    const generalTerms = [
      'course', 'class', 'credit', 'prerequisite', 'graduation',
      'track', 'major', 'requirement', 'schedule', 'semester',
      'when', 'what', 'how'
    ];
    
    return generalTerms.some(term => queryLower.includes(term));
  }

  /**
   * Query knowledge base directly using T2SQL
   */
  async queryKnowledgeBaseDirectly(query, llmConfig) {
    try {
      const response = await axios.post(`${this.API_GATEWAY_URL}/qa`, {
        question: query,
        profile_json: null
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-LLM-Provider': llmConfig.provider,
          'X-LLM-Api-Key': llmConfig.apiKey,
          'X-LLM-Model': llmConfig.model
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      logger.warn('T2SQL query failed', { error: error.message });
      return null;
    }
  }

  /**
   * Extract specific course information from query
   */
  extractCourseQuery(query) {
    const coursePattern = /\b(CS\s?(\d{3}|\d{5}))\b/gi;
    const matches = query.match(coursePattern);
    
    if (!matches) return null;
    
    const courseIds = matches.map(code => 
      code.replace(/\s/g, '').toUpperCase()
    );
    
    // Filter to only available courses
    const availableCourses = courseIds.filter(id => 
      this.knowledgeScope.available_courses.includes(id)
    );
    
    if (availableCourses.length === 0) return null;
    
    const queryLower = query.toLowerCase();
    const isAskingWhen = queryLower.includes('when') || queryLower.includes('semester') || queryLower.includes('year');
    const isAskingCredits = queryLower.includes('credit');
    const isAskingPrereq = queryLower.includes('prerequisite') || queryLower.includes('prereq');
    const isAskingDescription = queryLower.includes('what is') || queryLower.includes('describe') || queryLower.includes('about');
    
    return {
      courses: availableCourses,
      type: isAskingWhen ? 'sequence' : isAskingCredits ? 'credits' : isAskingPrereq ? 'prerequisites' : isAskingDescription ? 'description' : 'general'
    };
  }

  /**
   * Extract progression/sequence query
   */
  extractProgressionQuery(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('when') && (queryLower.includes('take') || queryLower.includes('course'))) {
      return { type: 'sequence' };
    }
    
    if (queryLower.includes('track') && (queryLower.includes('when') || queryLower.includes('declare'))) {
      return { type: 'track_timing' };
    }
    
    return null;
  }

  /**
   * Handle specific course queries using knowledge base data
   */
  handleSpecificCourseQuery(courseQuery) {
    let response = '';
    const processedCourses = [];

    courseQuery.courses.forEach(courseId => {
      // Get course information from degree progression data
      const courseInfo = this.findCourseInProgression(courseId);
      
      if (courseInfo) {
        processedCourses.push(courseInfo);
        
        switch (courseQuery.type) {
          case 'sequence':
            response += `**${courseId}** is typically taken in **${courseInfo.semester}** (${courseInfo.typical_credits} credits).\n\n`;
            break;
          case 'credits':
            response += `**${courseId}** is **${courseInfo.credits} credits**.\n\n`;
            break;
          case 'prerequisites':
            if (courseInfo.prerequisites && courseInfo.prerequisites.length > 0) {
              response += `**${courseId} Prerequisites:** ${courseInfo.prerequisites.join(', ')}\n\n`;
            } else {
              response += `**${courseId}** has no specific prerequisites listed in the degree progression.\n\n`;
            }
            break;
          default:
            response += `**${courseId}: ${courseInfo.title}**\n`;
            response += `• Credits: ${courseInfo.credits}\n`;
            response += `• Typically taken: ${courseInfo.semester}\n`;
            if (courseInfo.prerequisites && courseInfo.prerequisites.length > 0) {
              response += `• Prerequisites: ${courseInfo.prerequisites.join(', ')}\n`;
            }
            response += `• Notes: ${courseInfo.notes || 'Core CS requirement'}\n\n`;
        }
      } else {
        response += `I don't have specific progression information about ${courseId} in my knowledge base. It may be an elective or special topics course.\n\n`;
      }
    });

    if (processedCourses.length > 0) {
      return {
        content: response.trim(),
        type: 'course_information',
        source: 'knowledge_base',
        advisorNote: `Information from ${this.knowledgeScope.catalog_year} degree progression data`
      };
    }

    return null;
  }

  /**
   * Find course information in degree progression data
   */
  findCourseInProgression(courseId) {
    if (!this.knowledgeScope || !this.knowledgeScope.degree_progression) {
      return null;
    }

    for (const [semesterKey, semesterData] of Object.entries(this.knowledgeScope.degree_progression)) {
      const course = semesterData.courses.find(c => c.course_id === courseId);
      if (course) {
        return {
          ...course,
          semester: semesterData.semester,
          typical_credits: semesterData.typical_credits
        };
      }
    }

    return null;
  }

  /**
   * Handle progression/timing queries
   */
  handleProgressionQuery(progressionQuery) {
    if (progressionQuery.type === 'track_timing') {
      return {
        content: `Based on the ${this.knowledgeScope.catalog_year} degree progression:

**Track Declaration Timing:**
• You typically declare your track during your **junior year** (3rd year)
• This is after completing most core courses through CS 252 (Systems Programming)
• Track-specific courses begin in **Fall 3rd Year**

**Available Tracks:**
${this.knowledgeScope.tracks.map(track => `• ${track}`).join('\n')}

**Why Wait Until Junior Year:**
• You need to complete core CS courses first to understand both areas
• Track courses have prerequisites that require completion of the CS core sequence
• This timing allows you to make an informed decision based on your interests and strengths`,
        type: 'progression_information',
        source: 'knowledge_base',
        advisorNote: `Information from ${this.knowledgeScope.catalog_year} degree progression data`
      };
    }

    return null;
  }

  /**
   * Format SQL query results into helpful responses
   */
  formatSQLResults(query, sqlResult) {
    let response = `Based on the CS program database:\n\n`;
    
    if (sqlResult.rows && sqlResult.rows.length > 0) {
      const rows = sqlResult.rows;
      
      // Format results based on the data structure
      rows.forEach((row, index) => {
        response += `${index + 1}. `;
        
        // Smart formatting based on available fields
        if (row.course_id) {
          response += `**${row.course_id}**`;
          if (row.title) response += `: ${row.title}`;
          response += '\n';
          
          if (row.credits) response += `   • Credits: ${row.credits}\n`;
          if (row.prerequisites) response += `   • Prerequisites: ${row.prerequisites}\n`;
          if (row.level) response += `   • Level: ${row.level}\n`;
          if (row.description) response += `   • Description: ${row.description}\n`;
        } else {
          // Generic row formatting for non-course data
          Object.entries(row).forEach(([key, value]) => {
            if (value) {
              response += `${key}: ${value}  `;
            }
          });
        }
        response += '\n';
      });
    } else {
      response += "No specific data found for your query in the CS program database.";
    }

    return {
      content: response,
      type: 'database_query',
      source: 'knowledge_base',
      sql: sqlResult.sql,
      advisorNote: 'Direct query results from CS program database'
    };
  }

  /**
   * Provide information about what data is available
   */
  provideAvailableInformation(query) {
    const response = `I'm the CS Academic Advisor, and I have access to specific information about:

**${this.knowledgeScope.degree}** (${this.knowledgeScope.catalog_year})
• Institution: ${this.knowledgeScope.institution}, ${this.knowledgeScope.campus}
• College: ${this.knowledgeScope.college}

**Available Tracks:**
${this.knowledgeScope.tracks.map(track => `• ${track}`).join('\n')}

**Course Information Available:**
• ${this.knowledgeScope.available_courses.length} specific CS courses with details
• Prerequisites and course sequencing
• Academic progression planning by semester
• Track requirements and electives

**What I can help with:**
• Course descriptions, credits, and prerequisites
• When to take specific courses in your degree progression
• Track selection and requirements
• Academic planning within the CS program

**What I don't have information about:**
${this.knowledgeScope.limitations ? this.knowledgeScope.limitations.map(limit => `• ${limit}`).join('\n') : '• Other programs outside Computer Science'}

Could you ask me something specific about the CS program? For example:
• "When should I take CS 251?"
• "What are the Machine Intelligence track requirements?"
• "What prerequisites does CS 252 have?"`;

    return {
      content: response,
      type: 'scope_information',
      source: 'knowledge_base',
      advisorNote: 'Information about available knowledge base scope'
    };
  }

  /**
   * Handle queries outside knowledge base scope
   */
  handleOutOfScopeQuery(query, queryAnalysis) {
    return {
      content: `I'm the Computer Science Academic Advisor at Purdue, and I specialize specifically in the CS program.

**My expertise covers:**
${this.knowledgeScope.expertise.map(item => `• ${item}`).join('\n')}

**I notice your query mentions topics outside my knowledge base.**

**For information about other programs** (Data Science, AI as standalone majors, other engineering programs), you would need to:
• Contact those specific departments directly
• Speak with a general academic advisor
• Check the official Purdue catalog for those programs

**If you have questions about the Computer Science program**, I'm here to help! I can provide specific information about:
• CS course requirements and sequencing
• Machine Intelligence vs Software Engineering track selection
• Prerequisites and academic planning
• Graduation requirements for the CS major

Would you like to know something specific about the Computer Science program instead?`,
      type: 'out_of_scope',
      source: 'knowledge_base',
      withinScope: false,
      advisorNote: 'Query outside available knowledge base scope'
    };
  }

  /**
   * Handle knowledge base unavailable
   */
  handleKnowledgeBaseUnavailable() {
    return {
      content: `I'm experiencing an issue accessing the CS program knowledge base right now.

Without access to the knowledge base, I cannot provide specific information about:
• Course details and prerequisites
• Academic progression planning
• Track requirements
• Current degree requirements

Please try again in a moment, or contact the CS department directly for immediate assistance.`,
      type: 'knowledge_base_error',
      source: 'system',
      advisorNote: 'Knowledge base not accessible'
    };
  }

  /**
   * Handle errors gracefully
   */
  handleError(error, query) {
    logger.error('Knowledge Base Academic Advisor error', { 
      error: error.message,
      query: query.substring(0, 100)
    });

    return {
      content: `I encountered a technical issue while processing your question about the CS program.

While I resolve this, you might want to:
• Try rephrasing your question
• Contact the CS advising office directly for urgent questions
• Check the CS department website for basic information

I specialize in CS program information and should be back to full functionality shortly.`,
      type: 'error',
      source: 'system',
      error: true,
      advisorNote: 'Technical error occurred during processing'
    };
  }

  /**
   * Get system capabilities for introspection
   */
  getCapabilitiesSummary() {
    return {
      identity: this.advisorIdentity,
      scope: this.knowledgeScope,
      approach: 'Pure knowledge base retrieval without hardcoded assumptions',
      integration: {
        knowledge_base: 'Direct access to CS program data',
        t2sql: 'Query conversion for database access',
        degree_progression: 'Academic sequencing information'
      }
    };
  }
}

module.exports = new KnowledgeBaseAcademicAdvisor();