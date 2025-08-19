/**
 * Enhanced Academic Advisor Service
 * Fixes query looping with proactive course recommendations and anti-looping logic
 */

import { comprehensiveDegreeRequirements } from '@/data/comprehensive_degree_requirements.js';
import { openaiChatService } from './openaiChatService';
import { geminiChatService } from './geminiChatService';
import { logger } from '@/utils/logger';

interface StudentProfile {
  userId: string;
  name?: string;
  major?: string;
  track?: string;
  academicLevel?: string;
  gradYear?: string;
  completedCourses?: string[];
  currentCourses?: string[];
  gpa?: number;
  careerGoals?: string[];
  interests?: string[];
  graduationTimeline?: 'standard' | 'accelerated' | 'extended';
  concerns?: string[];
  lastUpdated?: string;
}

interface SessionState {
  questionsAsked: number;
  transcriptPrompted: boolean;
  conversationTurn: number;
  lastRecommendationType?: string;
  hasProvidedGeneralAdvice: boolean;
}

interface QueryContext {
  userIntent: string;
  emotionalTone: 'neutral' | 'concerned' | 'confused' | 'excited' | 'frustrated';
  mentionedCourses: string[];
  mentionedPrograms: string[];
  requestsGeneralAdvice: boolean;
  refusesTranscript: boolean;
  timelineContext: string;
  confidenceLevel: number;
}

interface CourseRecommendation {
  code: string;
  title: string;
  credits: number;
  rationale: string;
  prerequisites?: string[];
  alternatives?: string[];
}

interface AdvisorResponse {
  responseText: string;
  courseRecommendations: CourseRecommendation[];
  progressEstimate?: string;
  nextSteps: string[];
  followUpQuestions?: string[];
  antiLoopingTriggered?: boolean;
}

class EnhancedAcademicAdvisor {
  private studentProfiles: Map<string, StudentProfile> = new Map();
  private sessionStates: Map<string, SessionState> = new Map();
  private conversationHistory: Map<string, Array<{query: string, response: string, timestamp: Date}>> = new Map();
  private maxQuestionsPerResponse = 1;
  private maxSessionQuestions = 2;

  constructor() {
    logger.info('Enhanced Academic Advisor initialized with anti-looping logic', 'ADVISOR');
  }

  /**
   * Main entry point for academic guidance with anti-looping
   */
  public async provideGuidance(
    query: string,
    userId: string = 'anonymous',
    studentContext?: Partial<StudentProfile>
  ): Promise<AdvisorResponse> {
    try {
      // Update student profile and session state
      const studentProfile = this.updateStudentProfile(userId, studentContext);
      const sessionState = this.getOrCreateSessionState(userId);
      sessionState.conversationTurn++;

      // Extract query context
      const queryContext = this.extractQueryContext(query, studentProfile);
      
      // Check for anti-looping triggers
      const shouldForceAdvice = this.shouldForceAdvice(sessionState, queryContext);
      
      // Update conversation history
      this.updateConversationHistory(userId, query);

      // Generate response with anti-looping logic
      const response = await this.generateResponse(
        query,
        queryContext,
        studentProfile,
        sessionState,
        shouldForceAdvice
      );

      // Update session state after response
      this.updateSessionState(sessionState, queryContext, response);
      
      return response;

    } catch (error) {
      logger.error('Error in enhanced academic guidance:', error, 'ADVISOR');
      return this.generateFallbackResponse();
    }
  }

  /**
   * Extract context with improved pattern recognition
   */
  private extractQueryContext(query: string, studentProfile: StudentProfile): QueryContext {
    const queryLower = query.toLowerCase();
    
    // Check for explicit general advice requests
    const generalAdvicePatterns = [
      'no transcript', 'without transcript', 'general advice', 'general details',
      'general plan', 'typical plan', 'standard plan', 'without uploading'
    ];
    const requestsGeneralAdvice = generalAdvicePatterns.some(pattern => 
      queryLower.includes(pattern)
    );

    // Check for transcript refusal
    const refusalPatterns = [
      "don't want to upload", "won't upload", "can't upload", "no transcript",
      "prefer not to", "rather not", "instead of transcript"
    ];
    const refusesTranscript = refusalPatterns.some(pattern => 
      queryLower.includes(pattern)
    );

    // Intent analysis with course planning prioritized
    const intentKeywords = {
      course_planning: ['course', 'class', 'take', 'schedule', 'semester', 'plan', 'next', 'recommendation', 'suggest'],
      track_selection: ['track', 'specialization', 'concentration', 'focus', 'choose', 'machine intelligence', 'software engineering'],
      graduation_timeline: ['graduate', 'graduation', 'timeline', 'when', 'early', 'time', 'finish'],
      general_inquiry: ['help', 'advice', 'guidance', 'what should', 'tell me about'],
      program_comparison: ['difference', 'compare', 'versus', 'vs', 'between', 'which'],
      prerequisite_help: ['prerequisite', 'prereq', 'before', 'need', 'required']
    };

    let userIntent = 'general_inquiry';
    let maxMatches = 0;

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      const matches = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        userIntent = intent;
      }
    }

    // Extract mentioned courses and programs
    const mentionedCourses = this.extractMentionedCourses(query);
    const mentionedPrograms = this.extractMentionedPrograms(query);

    // Detect emotional tone
    const emotionalTone = this.detectEmotionalTone(queryLower);

    // Calculate confidence based on available context
    const confidenceLevel = Math.min(
      0.3 + (maxMatches * 0.15) + 
      (mentionedCourses.length * 0.1) + 
      (studentProfile.completedCourses?.length || 0) * 0.02 +
      (studentProfile.major ? 0.2 : 0) +
      (studentProfile.track ? 0.1 : 0),
      1.0
    );

    return {
      userIntent,
      emotionalTone,
      mentionedCourses,
      mentionedPrograms,
      requestsGeneralAdvice,
      refusesTranscript,
      timelineContext: this.extractTimelineContext(query),
      confidenceLevel
    };
  }

  /**
   * Check if we should force advice without asking questions
   */
  private shouldForceAdvice(sessionState: SessionState, queryContext: QueryContext): boolean {
    return (
      sessionState.questionsAsked >= this.maxSessionQuestions ||
      queryContext.requestsGeneralAdvice ||
      queryContext.refusesTranscript ||
      sessionState.conversationTurn >= 3
    );
  }

  /**
   * Generate response with proactive recommendations
   */
  private async generateResponse(
    query: string,
    queryContext: QueryContext,
    studentProfile: StudentProfile,
    sessionState: SessionState,
    shouldForceAdvice: boolean
  ): Promise<AdvisorResponse> {
    
    let responseText = '';
    const courseRecommendations: CourseRecommendation[] = [];
    const nextSteps: string[] = [];
    let followUpQuestions: string[] = [];

    // Start with context acknowledgment
    responseText += this.generateContextAcknowledgment(studentProfile, queryContext);

    // Provide course recommendations based on available data
    if (queryContext.userIntent === 'course_planning' || shouldForceAdvice) {
      const recommendations = this.generateCourseRecommendations(studentProfile, queryContext);
      courseRecommendations.push(...recommendations);
      
      if (recommendations.length > 0) {
        responseText += '\n\n**Recommended Courses:**\n';
        recommendations.forEach(course => {
          responseText += `• **${course.code}** (${course.credits} cr): ${course.title}\n  ${course.rationale}\n`;
        });
      }
    }

    // Add track-specific guidance
    if (queryContext.userIntent === 'track_selection' || 
        (studentProfile.major === 'Computer Science' && !studentProfile.track)) {
      responseText += '\n\n' + this.generateTrackGuidance(studentProfile, queryContext);
    }

    // Generate progress estimate
    const progressEstimate = this.generateProgressEstimate(studentProfile, courseRecommendations);
    if (progressEstimate) {
      responseText += '\n\n' + progressEstimate;
    }

    // Add next steps
    nextSteps.push(...this.generateNextSteps(queryContext, studentProfile, sessionState));

    // Handle questions carefully with anti-looping
    if (!shouldForceAdvice && sessionState.questionsAsked < this.maxQuestionsPerResponse) {
      const questions = this.generateStrategicQuestions(queryContext, studentProfile, sessionState);
      followUpQuestions = questions.slice(0, 1); // Max 1 question
      if (followUpQuestions.length > 0) {
        sessionState.questionsAsked++;
      }
    }

    // Add transcript prompt only once if beneficial
    if (!sessionState.transcriptPrompted && !queryContext.refusesTranscript && 
        courseRecommendations.length > 0) {
      responseText += '\n\n💡 *For even more precise recommendations, you can upload your transcript in the app—it\'s secure and quick!*';
      sessionState.transcriptPrompted = true;
    }

    // Add emotional support if needed
    if (queryContext.emotionalTone !== 'neutral') {
      responseText += '\n\n' + this.generateEmotionalSupport(queryContext.emotionalTone);
    }

    return {
      responseText: responseText.trim(),
      courseRecommendations,
      progressEstimate,
      nextSteps,
      followUpQuestions,
      antiLoopingTriggered: shouldForceAdvice
    };
  }

  /**
   * Generate proactive course recommendations based on available data
   */
  private generateCourseRecommendations(
    studentProfile: StudentProfile,
    queryContext: QueryContext
  ): CourseRecommendation[] {
    const recommendations: CourseRecommendation[] = [];
    const completedCourses = studentProfile.completedCourses || [];
    const major = studentProfile.major || 'Computer Science';
    const track = studentProfile.track;
    const academicLevel = studentProfile.academicLevel || 'sophomore';

    // Get degree requirements
    const degreeReqs = comprehensiveDegreeRequirements.computer_science;
    
    if (!degreeReqs) {
      return this.generateFallbackRecommendations(academicLevel, track);
    }

    // Check foundation courses first
    const foundationCourses = degreeReqs.foundation_courses?.courses || [];
    const uncompletedFoundation = foundationCourses.filter(course => 
      !this.isCourseCompleted(course.code, completedCourses)
    );

    if (uncompletedFoundation.length > 0) {
      uncompletedFoundation.slice(0, 2).forEach(course => {
        recommendations.push({
          code: course.code,
          title: course.title,
          credits: course.credits,
          rationale: `Foundation requirement for ${major}. ${course.prerequisites ? 'Prerequisites: ' + course.prerequisites.join(', ') : 'No prerequisites listed.'}`,
          prerequisites: course.prerequisites
        });
      });
    }

    // Add core courses if foundation is mostly complete
    if (uncompletedFoundation.length <= 2) {
      const coreCourses = degreeReqs.core_courses?.courses || [];
      const uncompletedCore = coreCourses.filter(course => 
        !this.isCourseCompleted(course.code, completedCourses)
      );

      uncompletedCore.slice(0, 2).forEach(course => {
        recommendations.push({
          code: course.code,
          title: course.title,
          credits: course.credits,
          rationale: `Core requirement for ${major}. Builds advanced skills in computer science.`,
          prerequisites: course.prerequisites
        });
      });
    }

    // Add track-specific recommendations
    if (track === 'Machine Intelligence' || track === 'machine_intelligence') {
      recommendations.push(...this.getMachineIntelligenceRecommendations(completedCourses));
    } else if (track === 'Software Engineering' || track === 'software_engineering') {
      recommendations.push(...this.getSoftwareEngineeringRecommendations(completedCourses));
    }

    // Add math requirements
    recommendations.push(...this.getMathRecommendations(completedCourses, academicLevel));

    // Add general education if needed
    if (recommendations.length < 4) {
      recommendations.push(...this.getGeneralEducationRecommendations());
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Generate context acknowledgment based on student profile
   */
  private generateContextAcknowledgment(studentProfile: StudentProfile, queryContext: QueryContext): string {
    let ack = '';
    
    if (studentProfile.academicLevel && studentProfile.major) {
      ack += `As a ${studentProfile.academicLevel} ${studentProfile.major} major`;
      if (studentProfile.track) {
        ack += ` in the ${studentProfile.track} track`;
      }
      if (studentProfile.gradYear) {
        ack += ` aiming for ${studentProfile.gradYear} graduation`;
      }
      ack += ', ';
    }

    if (studentProfile.completedCourses && studentProfile.completedCourses.length > 0) {
      const csCoursesCount = studentProfile.completedCourses.filter(course => 
        course.toUpperCase().includes('CS')
      ).length;
      if (csCoursesCount > 0) {
        ack += `with ${csCoursesCount} CS courses completed, `;
      }
    }

    if (queryContext.requestsGeneralAdvice) {
      ack += `here's a recommended course plan based on typical program progression:`;
    } else {
      ack += `here's what I recommend for your next semester:`;
    }

    return ack;
  }

  /**
   * Generate track-specific guidance
   */
  private generateTrackGuidance(studentProfile: StudentProfile, queryContext: QueryContext): string {
    let guidance = '**Track Selection Guidance:**\n\n';
    
    guidance += 'Computer Science offers two tracks:\n\n';
    guidance += '• **Machine Intelligence Track**: Focuses on AI, machine learning, and data analysis. ';
    guidance += 'Great for careers in AI research, data science, and intelligent systems.\n\n';
    guidance += '• **Software Engineering Track**: Emphasizes software development practices, ';
    guidance += 'testing, and large-scale systems. Perfect for software development and engineering roles.\n\n';

    // Personalized recommendation based on interests
    if (studentProfile.careerGoals || studentProfile.interests) {
      const goals = (studentProfile.careerGoals || []).concat(studentProfile.interests || []);
      const hasAIInterest = goals.some(goal => 
        goal.toLowerCase().includes('ai') || 
        goal.toLowerCase().includes('machine learning') || 
        goal.toLowerCase().includes('data')
      );

      if (hasAIInterest) {
        guidance += 'Based on your interests, the **Machine Intelligence track** might be a great fit!';
      } else {
        guidance += 'Consider which type of work excites you more—building intelligent systems or developing robust software applications.';
      }
    } else {
      guidance += 'Think about whether you\'re more interested in artificial intelligence and data analysis, or in software development and engineering practices.';
    }

    return guidance;
  }

  /**
   * Generate progress estimate
   */
  private generateProgressEstimate(studentProfile: StudentProfile, recommendations: CourseRecommendation[]): string | undefined {
    if (!studentProfile.completedCourses) return undefined;

    const estimatedCompletedCredits = studentProfile.completedCourses.length * 3; // Rough estimate
    const recommendedCredits = recommendations.reduce((sum, course) => sum + course.credits, 0);
    const totalCredits = estimatedCompletedCredits + recommendedCredits;

    let estimate = `**Progress Estimate:** You've completed approximately ${estimatedCompletedCredits} credits. `;
    estimate += `With these ${recommendations.length} courses (${recommendedCredits} credits), you'll have ~${totalCredits} credits.`;
    
    if (totalCredits >= 60) {
      estimate += ' You\'re making excellent progress toward the 120-credit requirement!';
    } else {
      estimate += ` Stay on track for your ${studentProfile.gradYear || '2028'} graduation goal.`;
    }

    return estimate;
  }

  /**
   * Generate strategic questions (limited to prevent looping)
   */
  private generateStrategicQuestions(
    queryContext: QueryContext,
    studentProfile: StudentProfile,
    sessionState: SessionState
  ): string[] {
    const questions: string[] = [];

    // Only ask essential questions
    if (!studentProfile.track && studentProfile.major === 'Computer Science') {
      questions.push('Are you leaning toward the Machine Intelligence or Software Engineering track?');
    } else if (!studentProfile.academicLevel && studentProfile.completedCourses?.length === 0) {
      questions.push('What year are you currently in (freshman, sophomore, etc.)?');
    }

    return questions;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(
    queryContext: QueryContext,
    studentProfile: StudentProfile,
    sessionState: SessionState
  ): string[] {
    const steps: string[] = [];
    
    steps.push('Check course prerequisites and availability in MyPurdue');
    steps.push('Meet with your academic advisor to discuss this plan');
    
    if (!studentProfile.track && studentProfile.major === 'Computer Science') {
      steps.push('Research CS track requirements to make an informed decision');
    }

    if (queryContext.userIntent === 'course_planning') {
      steps.push('Register for courses during your enrollment window');
    }

    return steps;
  }

  // Helper methods for course recommendations
  private getMachineIntelligenceRecommendations(completedCourses: string[]): CourseRecommendation[] {
    const recommendations: CourseRecommendation[] = [];
    
    if (!this.isCourseCompleted('CS 38100', completedCourses)) {
      recommendations.push({
        code: 'CS 38100',
        title: 'Introduction to Analysis of Algorithms',
        credits: 3,
        rationale: 'Essential for Machine Intelligence track - provides algorithmic foundation for AI'
      });
    }

    if (!this.isCourseCompleted('CS 37300', completedCourses)) {
      recommendations.push({
        code: 'CS 37300',
        title: 'Data Mining and Machine Learning',
        credits: 3,
        rationale: 'Core Machine Intelligence course - introduces ML concepts and applications'
      });
    }

    return recommendations;
  }

  private getSoftwareEngineeringRecommendations(completedCourses: string[]): CourseRecommendation[] {
    const recommendations: CourseRecommendation[] = [];
    
    if (!this.isCourseCompleted('CS 40800', completedCourses)) {
      recommendations.push({
        code: 'CS 40800',
        title: 'Software Testing',
        credits: 3,
        rationale: 'Essential for Software Engineering track - covers testing methodologies and quality assurance'
      });
    }

    return recommendations;
  }

  private getMathRecommendations(completedCourses: string[], academicLevel: string): CourseRecommendation[] {
    const recommendations: CourseRecommendation[] = [];
    
    if (!this.isCourseCompleted('MA 26100', completedCourses)) {
      recommendations.push({
        code: 'MA 26100',
        title: 'Multivariate Calculus',
        credits: 4,
        rationale: 'Required mathematics for CS - needed for advanced CS courses and algorithms'
      });
    }

    return recommendations;
  }

  private getGeneralEducationRecommendations(): CourseRecommendation[] {
    return [
      {
        code: 'ENGL 10800',
        title: 'Accelerated Composition',
        credits: 3,
        rationale: 'University Core requirement - develops essential writing skills'
      }
    ];
  }

  private generateFallbackRecommendations(academicLevel: string, track?: string): CourseRecommendation[] {
    // Fallback recommendations when degree requirements aren't available
    const fallback: CourseRecommendation[] = [];
    
    if (academicLevel === 'sophomore') {
      fallback.push(
        {
          code: 'CS 35200',
          title: 'Compilers',
          credits: 3,
          rationale: 'Core CS course typically taken in sophomore year'
        },
        {
          code: 'MA 26100',
          title: 'Multivariate Calculus',
          credits: 4,
          rationale: 'Required mathematics for CS majors'
        }
      );
    }

    return fallback;
  }

  // Utility methods
  private isCourseCompleted(courseCode: string, completedCourses: string[]): boolean {
    return completedCourses.some(completed => 
      completed.toUpperCase().includes(courseCode.replace(/\s+/g, '').toUpperCase()) ||
      completed.toUpperCase().includes(courseCode.replace(/\s+/g, ' ').toUpperCase())
    );
  }

  private extractMentionedCourses(query: string): string[] {
    const coursePattern = /\b[A-Z]{2,4}\s*\d{3,5}\b/g;
    const matches = query.match(coursePattern) || [];
    return [...new Set(matches.map(match => match.replace(/\s+/g, ' ').trim()))];
  }

  private extractMentionedPrograms(query: string): string[] {
    const programs = ['Computer Science', 'Data Science', 'Artificial Intelligence', 
                     'Machine Intelligence', 'Software Engineering'];
    const queryLower = query.toLowerCase();
    return programs.filter(program => queryLower.includes(program.toLowerCase()));
  }

  private extractTimelineContext(query: string): string {
    const timelineKeywords = ['early', 'late', 'fast', 'quick', 'slow', 'standard', 'normal', 'accelerated'];
    const queryLower = query.toLowerCase();
    const foundKeywords = timelineKeywords.filter(keyword => queryLower.includes(keyword));
    return foundKeywords.join(' ') || 'standard';
  }

  private detectEmotionalTone(queryLower: string): QueryContext['emotionalTone'] {
    const toneIndicators = {
      concerned: ['worried', 'concerned', 'anxious', 'scared', 'uncertain'],
      confused: ['confused', 'lost', 'unclear', 'understand', "don't know"],
      frustrated: ['frustrated', 'annoyed', 'difficult', 'impossible', 'hard'],
      excited: ['excited', 'interested', 'looking forward', 'eager', 'passionate']
    };

    for (const [tone, indicators] of Object.entries(toneIndicators)) {
      if (indicators.some(indicator => queryLower.includes(indicator))) {
        return tone as QueryContext['emotionalTone'];
      }
    }
    
    return 'neutral';
  }

  private generateEmotionalSupport(emotionalTone: QueryContext['emotionalTone']): string {
    switch (emotionalTone) {
      case 'concerned':
        return "🤗 I understand your concerns - academic planning can feel overwhelming, but you're taking the right steps by seeking guidance!";
      case 'confused':
        return "🧭 It's completely normal to feel confused about course planning - let's break this down step by step.";
      case 'frustrated':
        return "💪 I hear your frustration. Academic planning has many moving parts, but we can work through this together!";
      case 'excited':
        return "🎉 I love your enthusiasm! This energy will serve you well in your academic journey.";
      default:
        return "📚 Remember, I'm here to support you throughout your academic journey. Feel free to ask follow-up questions!";
    }
  }

  private updateStudentProfile(userId: string, context?: Partial<StudentProfile>): StudentProfile {
    let profile = this.studentProfiles.get(userId) || {
      userId,
      lastUpdated: new Date().toISOString()
    };

    if (context) {
      // Extract completed courses from conversation if mentioned
      const conversationHistory = this.conversationHistory.get(userId) || [];
      const allText = conversationHistory.map(h => h.query).join(' ').toLowerCase();
      const mentionedCourses = this.extractMentionedCourses(allText);
      
      if (mentionedCourses.length > 0 && !profile.completedCourses?.length) {
        profile.completedCourses = mentionedCourses;
      }

      profile = { ...profile, ...context, lastUpdated: new Date().toISOString() };
      this.studentProfiles.set(userId, profile);
    }

    return profile;
  }

  private getOrCreateSessionState(userId: string): SessionState {
    if (!this.sessionStates.has(userId)) {
      this.sessionStates.set(userId, {
        questionsAsked: 0,
        transcriptPrompted: false,
        conversationTurn: 0,
        hasProvidedGeneralAdvice: false
      });
    }
    return this.sessionStates.get(userId)!;
  }

  private updateSessionState(sessionState: SessionState, queryContext: QueryContext, response: AdvisorResponse): void {
    if (response.courseRecommendations.length > 0) {
      sessionState.hasProvidedGeneralAdvice = true;
    }
    
    if (queryContext.userIntent) {
      sessionState.lastRecommendationType = queryContext.userIntent;
    }
  }

  private updateConversationHistory(userId: string, query: string, response?: string): void {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    
    const history = this.conversationHistory.get(userId)!;
    history.push({ query, response: response || '', timestamp: new Date() });
    
    // Keep only last 15 interactions
    if (history.length > 15) {
      history.splice(0, history.length - 15);
    }
  }

  private generateFallbackResponse(): AdvisorResponse {
    return {
      responseText: "I'm here to help with your academic planning! As your AI advisor, I can provide course recommendations, track guidance, and graduation planning. What specific aspect of your academic journey would you like to discuss?",
      courseRecommendations: [],
      nextSteps: ["Tell me about your current major and academic level", "Share any courses you've completed", "Let me know your graduation timeline"],
      followUpQuestions: ["What's your current major and year?"]
    };
  }

  // Public methods for external access
  public getStudentProfile(userId: string): StudentProfile | undefined {
    return this.studentProfiles.get(userId);
  }

  public getSessionState(userId: string): SessionState | undefined {
    return this.sessionStates.get(userId);
  }

  public resetSession(userId: string): void {
    this.sessionStates.delete(userId);
    logger.info(`Session reset for user ${userId}`, 'ADVISOR');
  }
}

// Export singleton instance
export const enhancedAcademicAdvisor = new EnhancedAcademicAdvisor();
export type { StudentProfile, SessionState, QueryContext, AdvisorResponse, CourseRecommendation };