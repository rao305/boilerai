const DegreeRequirements = require('./degreeRequirementsAPI');

class EvaluationService {
  /**
   * Evaluate how well AI recommendations align with degree requirements
   * NOTE:
   * - This uses your ACTUAL knowledge base to verify recommendations
   * - NO hardcoded course validation - uses real program data
   */
  static async evaluateRecommendation(aiResponse, transcript, programName) {
    // Extract recommended courses from AI response
    const recommendedCourses = this.extractCourseCodes(aiResponse);
    
    // NOTE:
    // - GET ACTUAL program requirements from your knowledge base
    // - Do NOT use hardcoded program data
    const programRequirements = await DegreeRequirements.getRequirementsForProgram(programName);
    
    // Check which recommendations are actual requirements
    const planMatches = [];
    const personalMatches = [];
    
    // Check against ACTUAL program requirements
    if (programRequirements) {
      for (const courseCode of recommendedCourses) {
        const isRequirement = this.isCourseRequirement(courseCode, programRequirements);
        // NOTE: Check prerequisites using REAL data
        const meetsPrerequisites = await this.checkPrerequisites(courseCode, transcript, programName);
        
        if (isRequirement) planMatches.push(courseCode);
        if (meetsPrerequisites) personalMatches.push(courseCode);
      }
    }
    
    return {
      planScore: planMatches.length / (recommendedCourses.length || 1),
      personalScore: personalMatches.length / (recommendedCourses.length || 1),
      lift: (personalMatches.length - planMatches.length) / (recommendedCourses.length || 1),
      recall: this.calculateRecall(recommendedCourses, programRequirements),
      recommendedCourses,
      planMatches,
      personalMatches
    };
  }
  
  static extractCourseCodes(text) {
    // NOTE:
    // - This regex matches ANY course code format (CS 180, MA 16500, etc.)
    // - Works with Purdue's format but is flexible for any university
    const courseRegex = /([A-Z]{2,4})\s*(\d{3,5})/g;
    const matches = [];
    let match;
    
    while ((match = courseRegex.exec(text)) !== null) {
      matches.push(`${match[1].toUpperCase()} ${match[2]}`);
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }
  
  static isCourseRequirement(courseCode, programRequirements) {
    if (!programRequirements) return false;
    
    // NOTE:
    // - Check against ALL requirement categories in the ACTUAL program
    const allRequirements = [
      ...(programRequirements.requirements?.core || []),
      ...(programRequirements.requirements?.math || []),
      ...(programRequirements.requirements?.science || []),
      ...(programRequirements.requirements?.electives?.csElectives || []),
      ...(programRequirements.requirements?.electives?.freeElectives || [])
    ];
    
    return allRequirements.some(req => 
      req.code && req.code.toUpperCase() === courseCode.toUpperCase()
    );
  }
  
  /**
   * Check prerequisites using ACTUAL prerequisite data from knowledge base
   * NOTE:
   * - This is CRITICAL - uses your existing prerequisite data
   * - Do NOT hardcode prerequisite relationships
   */
  static async checkPrerequisites(courseCode, transcript, programName) {
    try {
      // NOTE:
      // - GET ACTUAL prerequisites from your knowledge base
      // - Your knowledge base already has this information
      const knowledgeService = require('./knowledgeRetrievalService');
      const courseInfo = await knowledgeService.getCourseInformation([courseCode]);
      
      if (!courseInfo || !courseInfo.prerequisites || courseInfo.prerequisites.length === 0) {
        return true; // No prerequisites = automatically meets
      }
      
      // Check if student has completed ALL prerequisites with required grades
      return courseInfo.prerequisites.every(prereq => {
        const completedCourse = transcript.completedCourses.find(c => 
          c.courseCode.toUpperCase() === prereq.code.toUpperCase()
        );
        
        if (!completedCourse) return false;
        
        // Use grade requirements from ACTUAL course data
        const requiredGrade = prereq.minGrade || 'D'; // Default to D if not specified
        return this.gradeMeetsRequirement(completedCourse.grade, requiredGrade);
      });
    } catch (error) {
      console.error(`Error checking prerequisites for ${courseCode}:`, error);
      return false;
    }
  }
  
  static gradeToNumeric(grade) {
    if (!grade) return null;
    
    const gradeMap = {
      'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0,
      'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    
    return gradeMap[grade] || null;
  }
  
  static gradeMeetsRequirement(studentGrade, requiredMinGrade) {
    const studentValue = this.gradeToNumeric(studentGrade);
    const requiredValue = this.gradeToNumeric(requiredMinGrade);
    
    if (studentValue === null || requiredValue === null) return false;
    return studentValue >= requiredValue;
  }
  
  static calculateRecall(recommendedCourses, programRequirements) {
    if (!programRequirements) return 0;
    
    // How many of the student's pending requirements are in the recommendations?
    const pendingRequirements = this.getPendingRequirements(programRequirements);
    const matchedPending = recommendedCourses.filter(courseCode => 
      pendingRequirements.some(req => 
        req.code && req.code.toUpperCase() === courseCode.toUpperCase()
      )
    );
    
    return matchedPending.length / (pendingRequirements.length || 1);
  }
  
  static getPendingRequirements(programRequirements) {
    if (!programRequirements) return [];
    
    return [
      ...(programRequirements.requirements?.core || []).filter(c => c.status !== 'completed'),
      ...(programRequirements.requirements?.math || []).filter(c => c.status !== 'completed'),
      ...(programRequirements.requirements?.science || []).filter(c => c.status !== 'completed'),
      ...(programRequirements.requirements?.electives?.csElectives || []).filter(c => c.status !== 'completed'),
      ...(programRequirements.requirements?.electives?.freeElectives || []).filter(c => c.status !== 'completed')
    ];
  }

  /**
   * Comprehensive SmartCourse evaluation with detailed metrics
   * NOTE: This evaluates the effectiveness of context fusion vs. standard recommendations
   */
  static async evaluateSmartCourseEffectiveness(aiResponse, transcript, programName, userQuery) {
    try {
      // Get basic recommendation evaluation
      const basicEval = await this.evaluateRecommendation(aiResponse, transcript, programName);
      
      // Extract additional metrics for SmartCourse effectiveness
      const queryContext = this.analyzeQueryContext(userQuery);
      const responseRelevance = this.measureResponseRelevance(aiResponse, userQuery);
      const prerequisiteAccuracy = await this.evaluatePrerequisiteAccuracy(
        basicEval.recommendedCourses, 
        transcript
      );
      
      return {
        ...basicEval,
        smartCourseMetrics: {
          queryContext,
          responseRelevance,
          prerequisiteAccuracy,
          contextUtilization: this.measureContextUtilization(aiResponse, transcript),
          recommendationQuality: this.assessRecommendationQuality(basicEval)
        },
        timestamp: new Date().toISOString(),
        evaluationVersion: '1.0'
      };
    } catch (error) {
      console.error('SmartCourse evaluation error:', error);
      return {
        error: true,
        message: 'Failed to evaluate SmartCourse effectiveness',
        timestamp: new Date().toISOString()
      };
    }
  }

  static analyzeQueryContext(userQuery) {
    const query = userQuery.toLowerCase();
    
    const contextTypes = {
      courseSelection: /course|class|select|choose|take|recommend/,
      graduation: /graduat|degree|finish|complete|timeline/,
      prerequisites: /prereq|require|need|before|first/,
      planning: /plan|schedule|semester|next|when/,
      specific: /cs \d|ma \d|stat \d|math \d|science/
    };

    const detectedContexts = [];
    for (const [type, pattern] of Object.entries(contextTypes)) {
      if (pattern.test(query)) {
        detectedContexts.push(type);
      }
    }

    return {
      types: detectedContexts,
      complexity: detectedContexts.length > 1 ? 'high' : detectedContexts.length === 1 ? 'medium' : 'low',
      specificity: contextTypes.specific.test(query) ? 'high' : 'medium'
    };
  }

  static measureResponseRelevance(aiResponse, userQuery) {
    const queryWords = userQuery.toLowerCase().split(' ').filter(word => word.length > 3);
    const responseWords = aiResponse.toLowerCase().split(' ');
    
    const matchedWords = queryWords.filter(word => 
      responseWords.some(respWord => respWord.includes(word) || word.includes(respWord))
    );

    return {
      score: matchedWords.length / (queryWords.length || 1),
      matchedConcepts: matchedWords,
      totalConcepts: queryWords.length
    };
  }

  static async evaluatePrerequisiteAccuracy(recommendedCourses, transcript) {
    let correctPrerequisites = 0;
    let totalChecked = 0;

    for (const courseCode of recommendedCourses) {
      try {
        const meetsPrereqs = await this.checkPrerequisites(courseCode, transcript);
        totalChecked++;
        if (meetsPrereqs) correctPrerequisites++;
      } catch (error) {
        console.warn(`Could not check prerequisites for ${courseCode}:`, error.message);
      }
    }

    return {
      accuracy: totalChecked > 0 ? correctPrerequisites / totalChecked : 0,
      correctCount: correctPrerequisites,
      totalCount: totalChecked
    };
  }

  static measureContextUtilization(aiResponse, transcript) {
    const response = aiResponse.toLowerCase();
    
    // Check if AI referenced specific student data
    const referencedElements = {
      studentName: transcript.studentInfo?.name && response.includes(transcript.studentInfo.name.toLowerCase()),
      gpa: transcript.gpaSummary?.cumulativeGPA && response.includes(transcript.gpaSummary.cumulativeGPA.toString()),
      completedCourses: transcript.courses?.some(course => 
        response.includes(course.courseCode.toLowerCase())
      ),
      program: transcript.studentInfo?.program && response.includes(transcript.studentInfo.program.toLowerCase())
    };

    const utilizationScore = Object.values(referencedElements).filter(Boolean).length / 4;

    return {
      score: utilizationScore,
      referencedElements,
      utilizesTranscriptData: utilizationScore > 0
    };
  }

  static assessRecommendationQuality(evaluationResults) {
    const { planScore, personalScore, lift, recall } = evaluationResults;
    
    // Calculate composite quality score
    const qualityScore = (planScore * 0.3) + (personalScore * 0.4) + (recall * 0.3);
    
    return {
      overallScore: qualityScore,
      rating: qualityScore >= 0.8 ? 'excellent' : 
              qualityScore >= 0.6 ? 'good' : 
              qualityScore >= 0.4 ? 'fair' : 'poor',
      strengths: this.identifyStrengths(evaluationResults),
      improvements: this.identifyImprovements(evaluationResults)
    };
  }

  static identifyStrengths(results) {
    const strengths = [];
    
    if (results.planScore >= 0.8) strengths.push('High alignment with degree plan');
    if (results.personalScore >= 0.8) strengths.push('Excellent prerequisite compliance');
    if (results.lift > 0.2) strengths.push('Strong personalization benefit');
    if (results.recall >= 0.6) strengths.push('Good coverage of pending requirements');

    return strengths;
  }

  static identifyImprovements(results) {
    const improvements = [];
    
    if (results.planScore < 0.5) improvements.push('Better degree requirement alignment needed');
    if (results.personalScore < 0.5) improvements.push('Prerequisite checking needs improvement');
    if (results.lift < 0) improvements.push('Personalization not providing value');
    if (results.recall < 0.4) improvements.push('Missing key pending requirements');

    return improvements;
  }
}

module.exports = EvaluationService;