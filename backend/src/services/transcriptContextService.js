const UserTranscript = require('../models/UserTranscript');
const NodeCache = require('node-cache');

// Cache for user transcript contexts (TTL: 1 hour)
const contextCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

class TranscriptContextService {
  constructor() {
    this.cachePrefix = 'transcript_ctx_';
  }

  /**
   * Save transcript data for a user and process it for AI context
   */
  async saveTranscriptContext(userId, transcriptData) {
    try {
      // Transform frontend transcript data to database format
      const processedData = this.transformTranscriptData(transcriptData, userId);
      
      // Save or update in database
      const userTranscript = await UserTranscript.findOneAndUpdate(
        { userId },
        processedData,
        { upsert: true, new: true, runValidators: true }
      );

      // Calculate insights
      await this.calculateInsights(userTranscript);

      // Cache the context for quick access
      const aiContext = this.generateAIContext(userTranscript);
      this.cacheContext(userId, aiContext);

      return {
        success: true,
        context: aiContext,
        transcriptId: userTranscript._id
      };
    } catch (error) {
      console.error('Error saving transcript context:', error);
      throw new Error(`Failed to save transcript context: ${error.message}`);
    }
  }

  /**
   * Get transcript context for AI conversations
   */
  async getTranscriptContext(userId) {
    try {
      // Try cache first
      const cachedContext = this.getCachedContext(userId);
      if (cachedContext) {
        return cachedContext;
      }

      // Fallback to database
      const userTranscript = await UserTranscript.findByUserId(userId);
      if (!userTranscript) {
        return null;
      }

      // Generate and cache context
      const aiContext = this.generateAIContext(userTranscript);
      this.cacheContext(userId, aiContext);

      return aiContext;
    } catch (error) {
      console.error('Error getting transcript context:', error);
      return null;
    }
  }

  /**
   * Get user's transcript status for UI
   */
  async getTranscriptStatus(userId) {
    try {
      const userTranscript = await UserTranscript.findByUserId(userId);
      
      if (!userTranscript) {
        return {
          hasTranscript: false,
          lastUpdated: null,
          studentName: null,
          gpa: null,
          completedCourses: 0,
          eligibleTracks: []
        };
      }

      return {
        hasTranscript: true,
        lastUpdated: userTranscript.processingInfo.lastUpdated,
        studentName: userTranscript.studentInfo.name,
        gpa: userTranscript.academicSummary.cumulativeGPA,
        completedCourses: userTranscript.allCourses.length,
        eligibleTracks: userTranscript.insights.eligibleTracks || [],
        major: userTranscript.studentInfo.major,
        totalCredits: userTranscript.academicSummary.totalCreditsEarned
      };
    } catch (error) {
      console.error('Error getting transcript status:', error);
      return { hasTranscript: false };
    }
  }

  /**
   * Get personalized suggestions based on transcript
   */
  async getPersonalizedSuggestions(userId) {
    try {
      const userTranscript = await UserTranscript.findByUserId(userId);
      if (!userTranscript) {
        return [];
      }

      const suggestions = [];
      const eligibility = userTranscript.insights.trackEligibility || {};
      const nextCourses = userTranscript.insights.suggestedNextCourses || [];

      // CODO eligibility suggestion
      if (eligibility.codo) {
        suggestions.push({
          type: 'codo_eligibility',
          title: 'CS CODO Eligible! 🎉',
          description: 'You meet the requirements to change of degree objective to Computer Science',
          priority: 'high'
        });
      }

      // Course recommendations
      nextCourses.forEach(course => {
        suggestions.push({
          type: 'course_recommendation',
          title: `Consider taking ${course.course}`,
          description: `${course.name} - ${course.reason}`,
          priority: course.priority || 'medium'
        });
      });

      // Track suggestions
      Object.entries(eligibility).forEach(([track, eligible]) => {
        if (eligible && track !== 'codo') {
          suggestions.push({
            type: 'track_eligibility',
            title: `${this.formatTrackName(track)} Track Available`,
            description: `You're eligible for the ${this.formatTrackName(track)} specialization`,
            priority: 'medium'
          });
        }
      });

      return suggestions.slice(0, 5); // Limit to top 5 suggestions
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      return [];
    }
  }

  /**
   * Generate AI context prompt from transcript data
   */
  generateAIContext(userTranscript) {
    const summary = userTranscript.getAcademicSummary();
    const eligibility = userTranscript.insights.trackEligibility || {};
    const completedCourses = userTranscript.allCourses.map(c => 
      `${c.courseCode} (${c.grade})`
    ).join(', ');

    const context = {
      studentName: summary.name,
      academicSummary: {
        gpa: summary.gpa,
        totalCredits: summary.totalCredits,
        major: summary.major,
        program: summary.program,
        expectedGraduation: summary.expectedGraduation
      },
      completedCourses: userTranscript.allCourses,
      eligibleTracks: summary.eligibleTracks,
      trackEligibility: eligibility,
      nextCourseRecommendations: summary.nextCourses,
      aiPromptContext: this.generatePromptContext(userTranscript)
    };

    return context;
  }

  /**
   * Generate AI prompt context string
   */
  generatePromptContext(userTranscript) {
    const summary = userTranscript.getAcademicSummary();
    const eligibility = userTranscript.insights.trackEligibility || {};
    
    let promptContext = `
## Student Academic Context
**Name:** ${summary.name}
**Program:** ${summary.program || 'Computer Science'}
**GPA:** ${summary.gpa || 'N/A'}
**Credits Completed:** ${summary.totalCredits || 0}

## Completed Courses:
${userTranscript.allCourses.map(course => 
  `- ${course.courseCode}: ${course.courseName} (${course.grade}, ${course.credits} credits)`
).join('\n')}

## Track Eligibility:
${Object.entries(eligibility).map(([track, eligible]) => 
  `- ${this.formatTrackName(track)}: ${eligible ? '✅ Eligible' : '❌ Not eligible'}`
).join('\n')}

## Recommended Next Steps:
${summary.nextCourses.map(course => 
  `- **${course.course}**: ${course.name} (${course.reason})`
).join('\n')}

## Instructions for AI:
- Use this student's specific academic history for personalized advice
- Reference their completed courses when making recommendations
- Be encouraging about their eligible tracks and CODO status
- Suggest logical next courses based on their progression
- Maintain a supportive, academic advisor tone
- Always consider their GPA and prerequisites when advising
`;

    return promptContext;
  }

  /**
   * Transform frontend transcript data to database format
   */
  transformTranscriptData(transcriptData, userId) {
    const allCourses = [];
    const semesterHistory = [];

    // Extract courses from semester data
    if (transcriptData.completedCourses) {
      Object.entries(transcriptData.completedCourses).forEach(([semKey, semesterData]) => {
        const semesterCourses = semesterData.courses.map(course => ({
          courseCode: course.course_code || course.courseCode || 'UNKNOWN',
          courseName: course.course_name || course.courseName || 'Unknown Course',
          credits: parseFloat(course.credits) || 0,
          grade: course.grade || 'P',
          gradePoints: this.calculateGradePoints(course.grade, parseFloat(course.credits) || 0),
          semester: semesterData.semester || 'Unknown',
          year: parseInt(semesterData.year) || new Date().getFullYear(),
          isTransferCredit: course.isTransferCredit || false,
          department: this.extractDepartment(course.course_code || course.courseCode),
          level: 'undergraduate'
        }));

        allCourses.push(...semesterCourses);
        
        semesterHistory.push({
          semester: semesterData.semester || 'Unknown',
          year: parseInt(semesterData.year) || new Date().getFullYear(),
          courses: semesterCourses,
          semesterGPA: parseFloat(semesterData.semesterGPA) || null,
          semesterCredits: semesterCourses.reduce((sum, c) => sum + c.credits, 0),
          totalCreditsToDate: null, // Will be calculated
          cumulativeGPA: null // Will be calculated
        });
      });
    }

    return {
      userId,
      studentInfo: {
        name: transcriptData.studentInfo?.name || 'Unknown Student',
        studentId: transcriptData.studentInfo?.studentId || null,
        program: transcriptData.studentInfo?.program || 'Computer Science',
        college: transcriptData.studentInfo?.college || 'College of Science',
        major: transcriptData.studentInfo?.major || 'Computer Science',
        minor: transcriptData.studentInfo?.minor || null,
        expectedGraduation: transcriptData.studentInfo?.expectedGraduation || null
      },
      academicSummary: {
        cumulativeGPA: parseFloat(transcriptData.gpaSummary?.cumulativeGPA) || null,
        majorGPA: parseFloat(transcriptData.gpaSummary?.majorGPA) || null,
        totalCreditsEarned: parseInt(transcriptData.gpaSummary?.totalCreditsEarned) || 0,
        totalCreditsAttempted: parseInt(transcriptData.gpaSummary?.totalCreditsAttempted) || 0,
        academicStanding: transcriptData.gpaSummary?.academicStanding || 'Good Standing'
      },
      semesterHistory,
      allCourses,
      insights: {
        eligibleTracks: [],
        suggestedNextCourses: []
      },
      processingInfo: {
        uploadDate: new Date(),
        lastUpdated: new Date(),
        aiProcessed: true,
        validationStatus: 'validated',
        confidenceScore: 0.9
      }
    };
  }

  /**
   * Calculate insights for a user transcript
   */
  async calculateInsights(userTranscript) {
    try {
      // Calculate track eligibility
      const eligibility = userTranscript.calculateTrackEligibility();
      
      // Get next course recommendations
      const nextCourses = userTranscript.getNextCourseRecommendations();
      
      // Update eligible tracks array
      const eligibleTracks = Object.entries(eligibility)
        .filter(([track, eligible]) => eligible)
        .map(([track]) => this.formatTrackName(track));
      
      userTranscript.insights.eligibleTracks = eligibleTracks;
      userTranscript.insights.suggestedNextCourses = nextCourses;
      
      // Save updates
      await userTranscript.save();
      
      return userTranscript;
    } catch (error) {
      console.error('Error calculating insights:', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  calculateGradePoints(grade, credits) {
    const gradeMap = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'D-': 0.7,
      'F': 0.0, 'P': 0.0, 'S': 0.0
    };
    
    const gradeValue = gradeMap[grade] || 0;
    return gradeValue * credits;
  }

  extractDepartment(courseCode) {
    if (!courseCode) return 'UNKNOWN';
    const match = courseCode.match(/^([A-Z]+)/);
    return match ? match[1] : 'UNKNOWN';
  }

  formatTrackName(track) {
    const trackNames = {
      codo: 'CS CODO',
      systemsProgramming: 'Systems Programming',
      softwareEngineering: 'Software Engineering',
      machineLearning: 'Machine Learning',
      cybersecurity: 'Cybersecurity',
      computationalScience: 'Computational Science'
    };
    return trackNames[track] || track;
  }

  cacheContext(userId, context) {
    const cacheKey = this.cachePrefix + userId;
    contextCache.set(cacheKey, context);
  }

  getCachedContext(userId) {
    const cacheKey = this.cachePrefix + userId;
    return contextCache.get(cacheKey);
  }

  clearUserContext(userId) {
    const cacheKey = this.cachePrefix + userId;
    contextCache.del(cacheKey);
  }
}

module.exports = new TranscriptContextService();