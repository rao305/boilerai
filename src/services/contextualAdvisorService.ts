/**
 * Contextual Academic Advisor Service
 * Implements structured response patterns matching expected BoilerAI behavior
 * Based on provided examples - maintains conversation context, avoids redundant questions
 */

import { enhancedAcademicAdvisor, type StudentProfile } from './enhancedAcademicAdvisor';
import { unifiedChatService } from './unifiedChatService';
import { logger } from '@/utils/logger';
import coursesData from '@/data/purdue_courses_complete.json';

interface ConversationContext {
  userId: string;
  sessionId: string;
  conversationHistory: ConversationEntry[];
  studentProfile: StudentProfile;
  lastResponse?: string;
  questionsAsked: number;
  transcriptPrompted: boolean;
  hasProvidedGeneralAdvice: boolean;
}

interface ConversationEntry {
  query: string;
  response: string;
  timestamp: Date;
  intent?: string;
  coursesMentioned?: string[];
}

interface StructuredResponse {
  recap: string;
  courseRecommendations: CourseRecommendation[];
  rationale: string;
  progressEstimate?: string;
  nextSteps: string[];
  closeEngagement: string;
  transcriptPrompt?: string;
}

interface CourseRecommendation {
  code: string;
  title: string;
  credits: number;
  rationale: string;
  prerequisites?: string[];
}

class ContextualAdvisorService {
  private conversations: Map<string, ConversationContext> = new Map();
  private courseCache: Map<string, any> = new Map();
  
  constructor() {
    this.initializeCourseCache();
  }

  private initializeCourseCache(): void {
    // Index courses by code for fast lookup
    coursesData.forEach(course => {
      this.courseCache.set(course.full_course_code, course);
      this.courseCache.set(course.department_code + course.course_number, course);
    });
    logger.info(`Initialized course cache with ${this.courseCache.size} entries`, 'CONTEXTUAL_ADVISOR');
  }

  private getOrCreateContext(userId: string, sessionId: string): ConversationContext {
    const key = `${userId}_${sessionId}`;
    if (!this.conversations.has(key)) {
      this.conversations.set(key, {
        userId,
        sessionId,
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
    return this.conversations.get(key)!;
  }

  private extractStudentInfoFromHistory(context: ConversationContext): void {
    const allText = context.conversationHistory
      .map(entry => entry.query)
      .join(' ')
      .toLowerCase();

    // Extract basic info mentioned in conversation
    if (!context.studentProfile.major && allText.includes('cs') || allText.includes('computer science')) {
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
      if (allText.includes('sophomore')) {
        context.studentProfile.academicLevel = 'sophomore';
      } else if (allText.includes('junior')) {
        context.studentProfile.academicLevel = 'junior';
      } else if (allText.includes('freshman')) {
        context.studentProfile.academicLevel = 'freshman';
      }
    }

    if (!context.studentProfile.gradYear) {
      const yearMatch = allText.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        context.studentProfile.gradYear = yearMatch[1];
      }
    }

    // Extract completed courses mentioned
    const coursePattern = /\b(cs|ma|engl)\s*\d{3,5}\b/gi;
    const mentionedCourses = allText.match(coursePattern) || [];
    if (mentionedCourses.length > 0 && !context.studentProfile.completedCourses?.length) {
      context.studentProfile.completedCourses = mentionedCourses
        .map(course => course.replace(/\s+/g, ' ').trim().toUpperCase());
    }

    // Extract GPA if mentioned
    const gpaMatch = allText.match(/gpa[:\s]*(\d+\.?\d*)/i);
    if (gpaMatch && !context.studentProfile.gpa) {
      context.studentProfile.gpa = parseFloat(gpaMatch[1]);
    }

    // Extract interests
    if (allText.includes('nvidia') || allText.includes('ai') || allText.includes('machine learning')) {
      context.studentProfile.interests = ['AI', 'NVIDIA', 'Machine Learning'];
      context.studentProfile.careerGoals = ['AI/ML Engineer'];
    }
  }

  /**
   * Main entry point - generates structured responses matching examples
   */
  public async provideStructuredAdvice(
    query: string,
    userId: string,
    sessionId: string,
    explicitContext?: Partial<StudentProfile>
  ): Promise<string> {
    try {
      const context = this.getOrCreateContext(userId, sessionId);
      
      // Update context with explicit info if provided
      if (explicitContext) {
        context.studentProfile = { ...context.studentProfile, ...explicitContext };
      }

      // Extract info from conversation history
      this.extractStudentInfoFromHistory(context);

      // Add current query to history
      context.conversationHistory.push({
        query,
        response: '', // Will be filled after response generation
        timestamp: new Date()
      });

      // Generate structured response
      const structuredResponse = await this.generateStructuredResponse(query, context);

      // Format final response text
      const responseText = this.formatResponseText(structuredResponse);

      // Update conversation history with response
      const lastEntry = context.conversationHistory[context.conversationHistory.length - 1];
      lastEntry.response = responseText;
      context.lastResponse = responseText;

      return responseText;

    } catch (error) {
      logger.error('Error in structured advice generation:', error, 'CONTEXTUAL_ADVISOR');
      return this.generateFallbackResponse();
    }
  }

  private async generateStructuredResponse(
    query: string,
    context: ConversationContext
  ): Promise<StructuredResponse> {
    
    const recap = this.generateRecap(context);
    const courseRecommendations = this.generateCourseRecommendations(context);
    const rationale = this.generateRationale(courseRecommendations, context);
    const progressEstimate = this.generateProgressEstimate(context);
    const nextSteps = this.generateNextSteps(context);
    const closeEngagement = this.generateCloseEngagement(context);
    const transcriptPrompt = this.shouldPromptTranscript(context) ? 
      this.generateTranscriptPrompt(context) : undefined;

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

  private generateRecap(context: ConversationContext): string {
    const profile = context.studentProfile;
    let recap = '';

    // Start with academic context
    if (profile.academicLevel && profile.major) {
      recap += `As a ${profile.academicLevel} ${profile.major} major`;
      if (profile.track) {
        recap += ` in the ${profile.track} track`;
      }
      if (profile.gradYear) {
        recap += `, aiming for ${profile.gradYear} graduation`;
      }
    }

    // Add completed courses context
    if (profile.completedCourses && profile.completedCourses.length > 0) {
      const csCount = profile.completedCourses.filter(c => c.includes('CS')).length;
      const mathCount = profile.completedCourses.filter(c => c.includes('MA')).length;
      
      if (recap) recap += ', ';
      if (csCount > 0) recap += `with ${csCount} CS courses completed`;
      if (mathCount > 0) {
        recap += csCount > 0 ? ` and ${mathCount} math courses` : `with ${mathCount} math courses completed`;
      }
    }

    // Add current registration if mentioned
    if (this.hasCurrentRegistration(context)) {
      if (recap) recap += ' and ';
      recap += 'CS 250, 251 registered for Fall';
    }

    if (recap) {
      recap += ', here\'s what I recommend:';
    } else {
      recap = 'Based on your academic planning needs, here are my recommendations:';
    }

    return recap;
  }

  private generateCourseRecommendations(context: ConversationContext): CourseRecommendation[] {
    const profile = context.studentProfile;
    const recommendations: CourseRecommendation[] = [];

    // Use the enhanced academic advisor for course logic
    const completed = profile.completedCourses || [];
    
    // Core CS courses based on progression
    if (!this.isCourseCompleted('CS 25000', completed)) {
      recommendations.push({
        code: 'CS 25000',
        title: 'Computer Architecture',
        credits: 4,
        rationale: 'Core requirement for CS majors - builds foundation for systems programming'
      });
    }

    if (!this.isCourseCompleted('CS 25100', completed)) {
      recommendations.push({
        code: 'CS 25100', 
        title: 'Data Structures and Algorithms',
        credits: 3,
        rationale: 'Essential for advanced CS courses and technical interviews'
      });
    }

    // Track-specific recommendations
    if (profile.track === 'Machine Intelligence') {
      if (!this.isCourseCompleted('CS 38100', completed)) {
        recommendations.push({
          code: 'CS 38100',
          title: 'Introduction to Analysis of Algorithms',
          credits: 3,
          rationale: 'Great introduction to AI concepts for your Machine Intelligence track'
        });
      }
    }

    // Math requirements
    if (!this.isCourseCompleted('MA 26100', completed)) {
      recommendations.push({
        code: 'MA 26100',
        title: 'Multivariate Calculus', 
        credits: 4,
        rationale: 'Required mathematics foundation for advanced CS coursework'
      });
    }

    // General education
    if (!this.isCourseCompleted('ENGL 10800', completed)) {
      recommendations.push({
        code: 'ENGL 10800',
        title: 'Accelerated Composition',
        credits: 3,
        rationale: 'University Core requirement for strong communication skills'
      });
    }

    // Add science elective if needed
    if (!this.hasScienceElective(completed)) {
      recommendations.push({
        code: 'PHYS 17200',
        title: 'Modern Mechanics',
        credits: 4,
        rationale: 'Science elective requirement - good foundation for engineering applications'
      });
    }

    return recommendations.slice(0, 4); // Limit to 4 recommendations
  }

  private generateRationale(recommendations: CourseRecommendation[], context: ConversationContext): string {
    if (recommendations.length === 0) return '';

    const profile = context.studentProfile;
    let rationale = '';

    // Calculate total credits
    const totalCredits = recommendations.reduce((sum, course) => sum + course.credits, 0);
    
    rationale += `This ${totalCredits}-credit schedule keeps you on track for graduation`;
    
    if (profile.track) {
      rationale += ` and aligns with your ${profile.track} track requirements`;
    }

    if (profile.careerGoals?.includes('NVIDIA') || profile.interests?.includes('NVIDIA')) {
      rationale += `. CS courses like ${recommendations.find(r => r.code.startsWith('CS'))?.code || 'CS 38100'} build AI skills relevant for NVIDIA roles`;
    }

    return rationale + '.';
  }

  private generateProgressEstimate(context: ConversationContext): string {
    const profile = context.studentProfile;
    if (!profile.completedCourses) return '';

    // Rough credit calculation
    const completedCredits = this.calculateCompletedCredits(profile.completedCourses);
    const progressPercentage = Math.round((completedCredits / 120) * 100);

    return `You've completed approximately ${completedCredits} credits (~${progressPercentage}% of the 120 required for your CS degree).`;
  }

  private generateNextSteps(context: ConversationContext): string[] {
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

  private generateCloseEngagement(context: ConversationContext): string {
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

  private shouldPromptTranscript(context: ConversationContext): boolean {
    return !context.transcriptPrompted && 
           context.questionsAsked === 0 && 
           !this.queryRefusesTranscript(context.conversationHistory[context.conversationHistory.length - 1]?.query);
  }

  private generateTranscriptPrompt(context: ConversationContext): string {
    context.transcriptPrompted = true;
    return 'For even more precise recommendations tailored to your exact progress, consider uploading your transcript—it\'s secure and quick!';
  }

  private formatResponseText(structured: StructuredResponse): string {
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
  private isCourseCompleted(courseCode: string, completedCourses: string[]): boolean {
    const normalizedTarget = courseCode.replace(/\s+/g, '').toUpperCase();
    return completedCourses.some(completed => {
      const normalized = completed.replace(/\s+/g, '').toUpperCase();
      return normalized === normalizedTarget || normalized.includes(normalizedTarget);
    });
  }

  private hasScienceElective(completedCourses: string[]): boolean {
    const sciencePatterns = ['PHYS', 'CHEM', 'BIOL'];
    return completedCourses.some(course =>
      sciencePatterns.some(pattern => course.toUpperCase().includes(pattern))
    );
  }

  private hasCurrentRegistration(context: ConversationContext): boolean {
    const lastQuery = context.conversationHistory[context.conversationHistory.length - 1]?.query.toLowerCase();
    return lastQuery?.includes('registered for') || lastQuery?.includes('cs 250') && lastQuery?.includes('cs 251');
  }

  private calculateCompletedCredits(completedCourses: string[]): number {
    let credits = 0;
    completedCourses.forEach(courseCode => {
      const course = this.courseCache.get(courseCode.replace(/\s+/g, ' '));
      if (course) {
        credits += parseFloat(course.credit_hours) || 3; // Default to 3 if not found
      } else {
        // Estimate based on course code
        if (courseCode.includes('MA') && courseCode.includes('16')) credits += 5; // Calc courses are typically 5 credits
        else if (courseCode.includes('MA') && courseCode.includes('26')) credits += 4; // Other math typically 4
        else credits += 3; // Default CS courses
      }
    });
    return credits;
  }

  private queryRefusesTranscript(query: string): boolean {
    if (!query) return false;
    const refusalPatterns = [
      "don't want to upload", "won't upload", "can't upload", 
      "no transcript", "prefer not to", "rather not"
    ];
    const queryLower = query.toLowerCase();
    return refusalPatterns.some(pattern => queryLower.includes(pattern));
  }

  private generateFallbackResponse(): string {
    return `I'm here to help with your academic planning! As your AI advisor, I can provide course recommendations, track guidance, and graduation planning. Could you tell me about your current major, academic level, and any courses you've completed?`;
  }

  // Public utility methods
  public getConversationContext(userId: string, sessionId: string): ConversationContext | undefined {
    return this.conversations.get(`${userId}_${sessionId}`);
  }

  public resetSession(userId: string, sessionId: string): void {
    const key = `${userId}_${sessionId}`;
    this.conversations.delete(key);
    logger.info(`Reset conversation context for ${key}`, 'CONTEXTUAL_ADVISOR');
  }

  public updateStudentProfile(
    userId: string, 
    sessionId: string, 
    updates: Partial<StudentProfile>
  ): void {
    const context = this.getOrCreateContext(userId, sessionId);
    context.studentProfile = { ...context.studentProfile, ...updates };
  }
}

// Export singleton instance
export const contextualAdvisorService = new ContextualAdvisorService();
export type { ConversationContext, StructuredResponse, CourseRecommendation };