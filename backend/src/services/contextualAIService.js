/**
 * Contextual AI Service
 * Integrates structured academic advising with the UnifiedAIService
 * Implements behavior matching BoilerAI examples
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const { DegreeRequirementsService } = require('../data/degree_requirements_migrated');

class ContextualAIService {
  constructor() {
    this.conversations = new Map(); // userId_sessionId -> ConversationContext
    this.courseCache = new Map();
    this.degreeService = new DegreeRequirementsService();
    this.initializeCourseCache();
  }

  initializeCourseCache() {
    // Load courses from migrated data
    const allPrograms = this.degreeService.getAllPrograms();
    this.departmentCodes = new Set(['CS', 'STAT', 'MA', 'ILS', 'PHIL', 'PSY']); // Common department codes
    
    // Cache courses from all programs
    allPrograms.forEach(programKey => {
      const courses = this.degreeService.getAllCourses(programKey);
      Object.entries(courses).forEach(([courseCode, course]) => {
        // Add multiple mapping formats for flexible lookup
        this.courseCache.set(courseCode, course);
        this.courseCache.set(courseCode.replace(' ', ''), course);
        
        // Add common variations (e.g., CS180 vs CS 18000)
        if (courseCode.includes(' ')) {
          const [dept, number] = courseCode.split(' ');
          if (number && number.length >= 5) {
            const shortCode = dept + number.slice(0, 3);
            const shortCodeSpaced = dept + ' ' + number.slice(0, 3);
            this.courseCache.set(shortCode, course);
            this.courseCache.set(shortCodeSpaced, course);
          }
        }
        
        // Add lowercase variations for case-insensitive matching
        this.courseCache.set(courseCode.toLowerCase(), course);
        this.courseCache.set(courseCode.replace(' ', '').toLowerCase(), course);
      });
    });
    
    logger.info(`Initialized course cache with ${this.courseCache.size} entries from migrated data`);
    console.log(`Found ${this.departmentCodes.size} departments: ${Array.from(this.departmentCodes).join(', ')}`);
  }

  /**
   * Get or create conversation context
   */
  getOrCreateContext(userId, sessionId) {
    const key = `${userId}_${sessionId || 'default'}`;
    if (!this.conversations.has(key)) {
      this.conversations.set(key, {
        userId,
        sessionId: sessionId || 'default',
        conversationHistory: [],
        studentProfile: {
          userId,
          lastUpdated: new Date().toISOString()
        },
        questionsAsked: 0,
        transcriptPrompted: false,
        hasProvidedGeneralAdvice: false
      });
    }
    return this.conversations.get(key);
  }

  /**
   * Extract student information from conversation history
   */
  extractStudentInfoFromHistory(context) {
    const allText = context.conversationHistory
      .map(entry => entry.query)
      .join(' ')
      .toLowerCase();

    // Debug: console.log(`Extracting student info from conversation history (${context.conversationHistory.length} entries)`);

    // Extract basic academic information
    if (!context.studentProfile.major && (allText.includes('cs') || allText.includes('computer science'))) {
      context.studentProfile.major = 'Computer Science';
    }

    if (!context.studentProfile.track) {
      if (allText.includes('machine intelligence')) {
        context.studentProfile.track = 'Machine Intelligence';
      } else if (allText.includes('software engineering')) {
        context.studentProfile.track = 'Software Engineering';
      }
    }

    if (!context.studentProfile.academicLevel) {
      const levelMatch = allText.match(/\b(freshman|sophomore|junior|senior)\b/);
      if (levelMatch) {
        context.studentProfile.academicLevel = levelMatch[1];
      }
    }

    if (!context.studentProfile.gradYear) {
      const yearMatch = allText.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        context.studentProfile.gradYear = yearMatch[1];
      }
    }

    // Extract completed courses - handle ALL departments dynamically
    const extractedCourses = this.extractAllCourses(allText);
    
    if (extractedCourses.length > 0) {
      // Always update completed courses to capture new mentions
      context.studentProfile.completedCourses = extractedCourses;
      // Debug: console.log(`Updated student profile with ${extractedCourses.length} courses:`, extractedCourses);
    }

    // Extract GPA
    const gpaMatch = allText.match(/gpa[:\s]*(\d+\.?\d*)/i);
    if (gpaMatch && !context.studentProfile.gpa) {
      context.studentProfile.gpa = parseFloat(gpaMatch[1]);
    }

    // Extract interests and goals
    if (allText.includes('nvidia') || allText.includes('ai') || allText.includes('machine learning')) {
      context.studentProfile.interests = ['AI', 'NVIDIA', 'Machine Learning'];
      context.studentProfile.careerGoals = ['AI/ML Engineer'];
    }
  }

  /**
   * Generate contextual academic advice with structured response
   */
  async generateContextualAdvice(query, userId, sessionId = 'default', explicitContext = {}) {
    try {
      const context = this.getOrCreateContext(userId, sessionId);
      
      // Update with explicit context
      Object.assign(context.studentProfile, explicitContext);

      // Add query to history FIRST so it's available for extraction
      context.conversationHistory.push({
        query,
        response: '', // Will be filled later
        timestamp: new Date(),
        intent: this.extractIntent(query)
      });

      // Extract info from history (including current query)
      this.extractStudentInfoFromHistory(context);

      // Generate structured response
      const structuredResponse = this.generateStructuredResponse(query, context);

      // Format response text
      const responseText = this.formatResponseText(structuredResponse);

      // Update conversation history with response
      const lastEntry = context.conversationHistory[context.conversationHistory.length - 1];
      lastEntry.response = responseText;

      return responseText;

    } catch (error) {
      logger.error('Error generating contextual advice:', error);
      return this.generateFallbackResponse();
    }
  }

  /**
   * Generate structured response components
   */
  generateStructuredResponse(query, context) {
    const recap = this.generateRecap(context);
    const courseRecommendations = this.generateCourseRecommendations(context);
    const rationale = this.generateRationale(courseRecommendations, context);
    const progressEstimate = this.generateProgressEstimate(context);
    const nextSteps = this.generateNextSteps(context);
    const closeEngagement = this.generateCloseEngagement(context);
    const transcriptPrompt = this.shouldPromptTranscript(context) ? 
      this.generateTranscriptPrompt(context) : null;

    return {
      recap,
      courseRecommendations,
      rationale,
      progressEstimate,
      nextSteps,
      closeEngagement,
      transcriptPrompt
    };
  }

  /**
   * Generate recap acknowledging student context
   */
  generateRecap(context) {
    const profile = context.studentProfile;
    let recap = '';

    // Build academic context
    if (profile.academicLevel && profile.major) {
      recap += `As a ${profile.academicLevel} ${profile.major} major`;
      if (profile.track) {
        recap += ` in the ${profile.track} track`;
      }
      if (profile.gradYear) {
        recap += `, aiming for ${profile.gradYear} graduation`;
      }
    }

    // Add course completion context
    if (profile.completedCourses && profile.completedCourses.length > 0) {
      const csCount = profile.completedCourses.filter(c => c.includes('CS')).length;
      const mathCount = profile.completedCourses.filter(c => c.includes('MA')).length;
      
      if (recap) recap += ', ';
      if (csCount > 0) recap += `with ${csCount} CS courses completed`;
      if (mathCount > 0) {
        recap += csCount > 0 ? ` and ${mathCount} math courses` : `with ${mathCount} math courses completed`;
      }
    }

    if (recap) {
      recap += ', here\'s what I recommend:';
    } else {
      recap = 'Based on your academic planning needs, here are my recommendations:';
    }

    return recap;
  }

  /**
   * Generate course recommendations based on student profile
   */
  generateCourseRecommendations(context) {
    const profile = context.studentProfile;
    const recommendations = [];
    const completed = profile.completedCourses || [];

    // Helper function to get course info from cache or use fallback
    const getCourseInfo = (courseCode, fallbackTitle, fallbackCredits, rationale) => {
      const course = this.courseCache.get(courseCode) || this.courseCache.get(courseCode.replace(/\s+/g, ''));
      return {
        code: courseCode,
        title: course ? course.course_title : fallbackTitle,
        credits: course ? parseFloat(course.credit_hours) : fallbackCredits,
        rationale: rationale
      };
    };

    // Core CS requirements based on typical sophomore progression
    if (!this.isCourseCompleted('CS 25000', completed) && !this.isCourseCompleted('CS250', completed)) {
      recommendations.push(getCourseInfo(
        'CS 25000', 
        'Computer Architecture', 
        4,
        'Core requirement for CS majors - builds foundation for systems programming'
      ));
    }

    if (!this.isCourseCompleted('CS 25100', completed) && !this.isCourseCompleted('CS251', completed)) {
      recommendations.push(getCourseInfo(
        'CS 25100',
        'Data Structures and Algorithms', 
        3,
        'Essential for advanced CS courses and technical interviews'
      ));
    }

    // Track-specific courses
    if (profile.track === 'Machine Intelligence') {
      if (!this.isCourseCompleted('CS 38100', completed)) {
        recommendations.push(getCourseInfo(
          'CS 38100',
          'Introduction to Analysis of Algorithms',
          3,
          'Great introduction to AI concepts for your Machine Intelligence track'
        ));
      }
      
      // Add more AI-focused courses
      if (!this.isCourseCompleted('CS 47300', completed)) {
        recommendations.push(getCourseInfo(
          'CS 47300',
          'Web Information Search and Management',
          3,
          'Builds machine learning skills for your AI career goals'
        ));
      }
    }

    // Math requirements
    if (!this.isCourseCompleted('MA 26100', completed) && !this.isCourseCompleted('MA261', completed)) {
      recommendations.push(getCourseInfo(
        'MA 26100',
        'Multivariate Calculus',
        4,
        'Required mathematics foundation for advanced CS coursework'
      ));
    }

    // General education
    if (!this.isCourseCompleted('ENGL 10800', completed)) {
      recommendations.push(getCourseInfo(
        'ENGL 10800',
        'Accelerated Composition',
        3,
        'University Core requirement for strong communication skills'
      ));
    }

    // Science elective
    if (!this.hasScienceElective(completed)) {
      recommendations.push(getCourseInfo(
        'PHYS 17200',
        'Modern Mechanics',
        4,
        'Science elective requirement - good foundation for engineering applications'
      ));
    }

    return recommendations.slice(0, 4);
  }

  /**
   * Generate rationale for recommendations
   */
  generateRationale(recommendations, context) {
    if (recommendations.length === 0) return '';

    const profile = context.studentProfile;
    const totalCredits = recommendations.reduce((sum, course) => sum + course.credits, 0);
    
    let rationale = `This ${totalCredits}-credit schedule keeps you on track for graduation`;
    
    if (profile.track) {
      rationale += ` and aligns with your ${profile.track} track requirements`;
    }

    if (profile.careerGoals?.includes('AI/ML Engineer') || profile.interests?.includes('NVIDIA')) {
      const csCourse = recommendations.find(r => r.code.startsWith('CS'));
      if (csCourse) {
        rationale += `. ${csCourse.code} builds AI skills relevant for NVIDIA roles`;
      }
    }

    return rationale + '.';
  }

  /**
   * Generate progress estimate
   */
  generateProgressEstimate(context) {
    const profile = context.studentProfile;
    if (!profile.completedCourses) return null;

    const completedCredits = this.calculateCompletedCredits(profile.completedCourses);
    const progressPercentage = Math.round((completedCredits / 120) * 100);

    return `You've completed approximately ${completedCredits} credits (~${progressPercentage}% of the 120 required for your CS degree).`;
  }

  /**
   * Generate next steps
   */
  generateNextSteps(context) {
    const steps = [
      'Check course availability and prerequisites in MyPurdue',
      'Register during your enrollment window',  
      'Meet with your academic advisor to confirm this plan'
    ];

    const profile = context.studentProfile;
    if (!profile.track && profile.major === 'Computer Science') {
      steps.unshift('Consider which CS track (Machine Intelligence or Software Engineering) aligns with your career goals');
    }

    return steps;
  }

  /**
   * Generate engagement closing
   */
  generateCloseEngagement(context) {
    const profile = context.studentProfile;
    
    if (profile.track === 'Machine Intelligence') {
      return 'Interested in specific AI areas like deep learning or computer vision?';
    }
    
    if (profile.interests?.includes('NVIDIA')) {
      return 'Want to explore CUDA programming or GPU computing courses?';
    }

    if (!profile.track) {
      return 'Want to discuss which CS track might be the best fit for your goals?';
    }

    return 'Need help with anything else for your academic planning?';
  }

  /**
   * Check if should prompt transcript upload
   */
  shouldPromptTranscript(context) {
    return !context.transcriptPrompted && 
           context.questionsAsked === 0 && 
           !this.queryRefusesTranscript(context.conversationHistory[context.conversationHistory.length - 1]?.query);
  }

  /**
   * Generate transcript prompt
   */
  generateTranscriptPrompt(context) {
    context.transcriptPrompted = true;
    return 'For even more precise recommendations tailored to your exact progress, consider uploading your transcript—it\'s secure and quick!';
  }

  /**
   * Format complete response text
   */
  formatResponseText(structured) {
    let response = structured.recap + '\n\n';

    if (structured.courseRecommendations.length > 0) {
      response += '**Recommended Courses:**\n';
      structured.courseRecommendations.forEach(course => {
        response += `• **${course.code}** (${course.credits} cr): ${course.title}\n`;
        if (course.rationale) {
          response += `  *${course.rationale}*\n`;
        }
      });
      response += '\n';
    }

    if (structured.rationale) {
      response += structured.rationale + '\n\n';
    }

    if (structured.progressEstimate) {
      response += '**Progress:** ' + structured.progressEstimate + '\n\n';
    }

    if (structured.nextSteps.length > 0) {
      response += '**Next Steps:**\n';
      structured.nextSteps.forEach((step, index) => {
        response += `${index + 1}. ${step}\n`;
      });
      response += '\n';
    }

    if (structured.transcriptPrompt) {
      response += '💡 *' + structured.transcriptPrompt + '*\n\n';
    }

    response += structured.closeEngagement;

    return response.trim();
  }

  // Helper methods
  isCourseCompleted(courseCode, completedCourses) {
    const normalizedTarget = courseCode.replace(/\s+/g, '').toUpperCase();
    return completedCourses.some(completed => {
      const normalized = completed.replace(/\s+/g, '').toUpperCase();
      return normalized === normalizedTarget || normalized.includes(normalizedTarget);
    });
  }

  hasScienceElective(completedCourses) {
    const sciencePatterns = ['PHYS', 'CHEM', 'BIOL'];
    return completedCourses.some(course =>
      sciencePatterns.some(pattern => course.toUpperCase().includes(pattern))
    );
  }

  calculateCompletedCredits(completedCourses) {
    let credits = 0;
    completedCourses.forEach(courseCode => {
      const course = this.courseCache.get(courseCode.replace(/\s+/g, ' '));
      if (course) {
        credits += parseFloat(course.credit_hours) || 3;
      } else {
        // Estimate credits
        if (courseCode.includes('MA') && courseCode.includes('16')) credits += 5;
        else if (courseCode.includes('MA') && courseCode.includes('26')) credits += 4;
        else credits += 3;
      }
    });
    return credits;
  }

  queryRefusesTranscript(query) {
    if (!query) return false;
    const refusalPatterns = [
      "don't want to upload", "won't upload", "can't upload",
      "no transcript", "prefer not to", "rather not"
    ];
    const queryLower = query.toLowerCase();
    return refusalPatterns.some(pattern => queryLower.includes(pattern));
  }

  extractIntent(query) {
    const queryLower = query.toLowerCase();
    if (queryLower.includes('course') || queryLower.includes('take')) return 'course_planning';
    if (queryLower.includes('track') || queryLower.includes('machine intelligence')) return 'track_selection';
    if (queryLower.includes('graduate') || queryLower.includes('graduation')) return 'graduation_timeline';
    return 'general_inquiry';
  }

  generateFallbackResponse() {
    return "I'm here to help with your academic planning! As your AI advisor, I can provide course recommendations, track guidance, and graduation planning. Could you tell me about your current major, academic level, and any courses you've completed?";
  }

  /**
   * Extract ALL courses mentioned in text using dynamic department codes
   */
  extractAllCourses(text) {
    const extractedCourses = [];
    
    if (!this.departmentCodes || this.departmentCodes.size === 0) {
      console.warn('Department codes not initialized, using fallback extraction');
      return this.extractCoursesBasic(text);
    }
    
    // Create dynamic pattern for all department codes
    const deptCodes = Array.from(this.departmentCodes).join('|');
    
    // Pattern 1: Standard format "DEPT ##### or DEPT###"
    const standardPattern = new RegExp(`\\b(${deptCodes})\\s*\\d{3,5}\\b`, 'gi');
    const standardMatches = text.match(standardPattern) || [];
    
    // Pattern 2: Course codes with spaces "CS 180, CS 182"
    const spacedPattern = new RegExp(`\\b(${deptCodes})\\s+\\d{3,5}\\b`, 'gi');
    const spacedMatches = text.match(spacedPattern) || [];
    
    // Pattern 3: Short format "CS180, MA161"  
    const shortPattern = new RegExp(`\\b(${deptCodes})\\d{3}\\b`, 'gi');
    const shortMatches = text.match(shortPattern) || [];
    
    // Combine all matches
    const allMatches = [...standardMatches, ...spacedMatches, ...shortMatches];
    
    // Process and normalize matches
    allMatches.forEach(match => {
      let normalized = match.replace(/\s+/g, ' ').trim().toUpperCase();
      
      // Verify this course exists in our cache
      const course = this.courseCache.get(normalized) || 
                    this.courseCache.get(normalized.replace(/\s+/g, '')) ||
                    this.courseCache.get(normalized.toLowerCase());
      
      if (course) {
        extractedCourses.push(course.full_course_code);
      } else {
        // Keep the normalized format even if not found in cache
        extractedCourses.push(normalized);
      }
    });
    
    // Handle special cases like "Calc 1, Calc 2, Calc 3"
    const specialCourses = this.extractSpecialCourses(text);
    extractedCourses.push(...specialCourses);
    
    // Remove duplicates and return
    return [...new Set(extractedCourses)];
  }
  
  /**
   * Extract special course references (Calc, Calculus, etc.)
   */
  extractSpecialCourses(text) {
    const special = [];
    const lowerText = text.toLowerCase();
    
    // Math course variations
    if (lowerText.includes('calc 1') || lowerText.includes('calculus 1')) special.push('MA 16100');
    if (lowerText.includes('calc 2') || lowerText.includes('calculus 2')) special.push('MA 16200');
    if (lowerText.includes('calc 3') || lowerText.includes('calculus 3') || lowerText.includes('multivariate calculus')) special.push('MA 26100');
    
    // Physics variations
    if (lowerText.includes('physics 1')) special.push('PHYS 17200');
    if (lowerText.includes('physics 2')) special.push('PHYS 27200');
    
    // Chemistry variations  
    if (lowerText.includes('gen chem') || lowerText.includes('general chemistry')) special.push('CHM 11500');
    
    // English variations
    if (lowerText.includes('english comp') || lowerText.includes('composition')) special.push('ENGL 10800');
    
    return special;
  }
  
  /**
   * Fallback basic course extraction (if department codes not loaded)
   */
  extractCoursesBasic(text) {
    const basicPattern = /\b([A-Z]{2,5})\s*\d{3,5}\b/gi;
    const matches = text.match(basicPattern) || [];
    return matches.map(match => match.replace(/\s+/g, ' ').trim().toUpperCase());
  }

  // Public API methods
  resetSession(userId, sessionId = 'default') {
    const key = `${userId}_${sessionId}`;
    this.conversations.delete(key);
    logger.info(`Reset conversation context for ${key}`);
  }

  getStudentProfile(userId, sessionId = 'default') {
    const context = this.conversations.get(`${userId}_${sessionId}`);
    return context ? context.studentProfile : null;
  }

  updateStudentProfile(userId, sessionId = 'default', updates) {
    const context = this.getOrCreateContext(userId, sessionId);
    Object.assign(context.studentProfile, updates);
  }
}

module.exports = new ContextualAIService();