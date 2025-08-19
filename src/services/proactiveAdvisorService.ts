/**
 * Proactive Advisor Service - AI-Powered Integration
 * Combines enhanced academic advisor logic with dynamic AI prompt generation
 */

import { enhancedAcademicAdvisor, type StudentProfile, type AdvisorResponse } from './enhancedAcademicAdvisor';
import { openaiChatService } from './openaiChatService';
import { geminiChatService } from './geminiChatService';
import { logger } from '@/utils/logger';

interface ProactiveAdvisorConfig {
  maxTokens: number;
  temperature: number;
  enableReasoningMode: boolean;
  preferredProvider: 'openai' | 'gemini' | 'auto';
}

class ProactiveAdvisorService {
  private config: ProactiveAdvisorConfig = {
    maxTokens: 1000,
    temperature: 0.3,
    enableReasoningMode: false,
    preferredProvider: 'auto'
  };

  private systemPrompt = `You are BoilerAI, a professional academic advisor exclusively for undergraduate students at Purdue University. Your expertise covers Computer Science, Data Science, and Artificial Intelligence majors.

CORE BEHAVIOR:
- Provide direct, actionable course recommendations based on available student data
- Use conversation history to avoid re-asking known information  
- Limit clarification questions to 1 per response maximum
- Respect user requests for "general advice" or "no transcript" immediately
- Maintain warm, encouraging advisor persona without repetitive greetings

ANTI-LOOPING PROTOCOL:
- If asked same type of question 2+ times, provide comprehensive answer without new questions
- When user says "no transcript" or "general advice", give standard recommendations immediately
- Never ask for transcripts more than once per session
- Focus on giving helpful advice over gathering more information

RESPONSE STRUCTURE:
1. Brief acknowledgment using known student details (major, year, completed courses from chat)
2. 4-5 specific course recommendations with credits and rationale  
3. Progress estimate toward 120-credit degree
4. Clear next steps
5. Single follow-up question only if essential (max 1 per response)

KNOWLEDGE BASE: Use Purdue's official degree requirements, course catalog, and prerequisite chains. For Computer Science:
- Foundation: CS 18000, 18200, 24000, 25000, 25100, 25200, 30700
- Core: CS 35200, 38100, plus track-specific courses
- Tracks: Machine Intelligence (AI/ML focus) vs Software Engineering (development focus)
- Mathematics: MA 16100, 26100, 26500, plus statistics
- General Education: 33 credits including ENGL 10800, science electives

SCOPE: Undergraduate only. Redirect graduate queries to Purdue Graduate School.

Be proactive, helpful, and efficient. Deliver value immediately rather than asking for more information.`;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const validationStatus = JSON.parse(
      localStorage.getItem('api_key_validation_status') || '{"openai": false, "gemini": false}'
    );

    if (this.config.preferredProvider === 'auto') {
      if (validationStatus.gemini && geminiChatService.isAvailable()) {
        this.config.preferredProvider = 'gemini';
      } else if (validationStatus.openai && openaiChatService.isAvailable()) {
        this.config.preferredProvider = 'openai';
      }
    }

    logger.info(`Proactive advisor initialized with ${this.config.preferredProvider} provider`, 'PROACTIVE_ADVISOR');
  }

  /**
   * Main entry point that combines enhanced logic with AI generation
   */
  public async provideProactiveGuidance(
    query: string,
    userId: string = 'anonymous',
    studentContext?: Partial<StudentProfile>
  ): Promise<{
    response: string;
    recommendations: any[];
    metadata: {
      antiLoopingTriggered: boolean;
      questionsAsked: number;
      provider: string;
      tokensUsed?: number;
    };
  }> {
    try {
      // First, get structured response from enhanced advisor
      const advisorResponse = await enhancedAcademicAdvisor.provideGuidance(
        query,
        userId,
        studentContext
      );

      // Get current student profile and session state for context
      const studentProfile = enhancedAcademicAdvisor.getStudentProfile(userId);
      const sessionState = enhancedAcademicAdvisor.getSessionState(userId);

      // Build dynamic prompt with current context
      const dynamicPrompt = this.buildDynamicPrompt(
        query,
        advisorResponse,
        studentProfile,
        sessionState
      );

      // Generate natural language response using AI
      const aiResponse = await this.generateAIResponse(dynamicPrompt, userId);

      return {
        response: aiResponse.response,
        recommendations: advisorResponse.courseRecommendations,
        metadata: {
          antiLoopingTriggered: advisorResponse.antiLoopingTriggered || false,
          questionsAsked: sessionState?.questionsAsked || 0,
          provider: this.config.preferredProvider,
          tokensUsed: aiResponse.tokensUsed
        }
      };

    } catch (error) {
      logger.error('Error in proactive guidance:', error, 'PROACTIVE_ADVISOR');
      return this.generateFallbackResponse();
    }
  }

  /**
   * Build dynamic prompt based on current conversation context
   */
  private buildDynamicPrompt(
    query: string,
    advisorResponse: AdvisorResponse,
    studentProfile?: StudentProfile,
    sessionState?: any
  ): string {
    let prompt = this.systemPrompt + '\n\nCURRENT CONTEXT:\n';

    // Add student context
    if (studentProfile) {
      prompt += `Student: ${studentProfile.academicLevel || 'undergraduate'} ${studentProfile.major || 'Computer Science'} major`;
      if (studentProfile.track) {
        prompt += ` (${studentProfile.track} track)`;
      }
      if (studentProfile.gradYear) {
        prompt += `, graduating ${studentProfile.gradYear}`;
      }
      prompt += '\n';

      if (studentProfile.completedCourses?.length) {
        prompt += `Completed courses mentioned: ${studentProfile.completedCourses.join(', ')}\n`;
      }
    }

    // Add session context for anti-looping
    if (sessionState) {
      prompt += `Questions asked this session: ${sessionState.questionsAsked}/2\n`;
      if (sessionState.transcriptPrompted) {
        prompt += 'Transcript already offered this session\n';
      }
      if (sessionState.hasProvidedGeneralAdvice) {
        prompt += 'General advice already provided\n';
      }
    }

    // Add anti-looping instructions
    if (advisorResponse.antiLoopingTriggered) {
      prompt += '\nANTI-LOOPING ACTIVE: Provide direct recommendations without asking questions.\n';
    }

    // Add structured recommendations to transform into natural language
    if (advisorResponse.courseRecommendations.length > 0) {
      prompt += '\nRECOMMENDED COURSES TO MENTION:\n';
      advisorResponse.courseRecommendations.forEach(course => {
        prompt += `- ${course.code} (${course.credits} cr): ${course.title} - ${course.rationale}\n`;
      });
    }

    if (advisorResponse.nextSteps.length > 0) {
      prompt += '\nNEXT STEPS TO SUGGEST:\n';
      advisorResponse.nextSteps.forEach(step => {
        prompt += `- ${step}\n`;
      });
    }

    prompt += `\nUSER QUERY: "${query}"\n\n`;
    prompt += 'INSTRUCTIONS: Respond naturally as BoilerAI. Use the recommended courses and context above. ';
    prompt += 'Be encouraging and specific. Include course codes, credits, and clear rationale. ';
    
    if (advisorResponse.antiLoopingTriggered) {
      prompt += 'Do NOT ask questions - provide comprehensive guidance directly. ';
    } else if (advisorResponse.followUpQuestions?.length) {
      prompt += `You may ask this ONE follow-up question: "${advisorResponse.followUpQuestions[0]}" `;
    }
    
    prompt += 'Keep response under 300 words but thorough.';

    return prompt;
  }

  /**
   * Generate AI response using available provider
   */
  private async generateAIResponse(prompt: string, userId: string): Promise<{
    response: string;
    tokensUsed?: number;
  }> {
    try {
      if (this.config.preferredProvider === 'openai' && openaiChatService.isAvailable()) {
        const response = await openaiChatService.sendMessage(
          prompt,
          [],
          {
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature
          }
        );
        return {
          response: response.content,
          tokensUsed: response.usage?.total_tokens
        };
      } else if (this.config.preferredProvider === 'gemini' && geminiChatService.isAvailable()) {
        const response = await geminiChatService.sendMessage(
          prompt,
          [],
          {
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature
          }
        );
        return {
          response: response.content,
          tokensUsed: response.usage?.totalTokens
        };
      } else {
        throw new Error('No AI provider available');
      }
    } catch (error) {
      logger.error('Error generating AI response:', error, 'PROACTIVE_ADVISOR');
      throw error;
    }
  }

  /**
   * Generate fallback response when AI is unavailable
   */
  private generateFallbackResponse(): {
    response: string;
    recommendations: any[];
    metadata: any;
  } {
    return {
      response: "I'm here to help with your academic planning! As a Computer Science student, I can recommend courses based on your track and current progress. Could you tell me your current year and any CS courses you've completed?",
      recommendations: [],
      metadata: {
        antiLoopingTriggered: false,
        questionsAsked: 1,
        provider: 'fallback',
        tokensUsed: 0
      }
    };
  }

  /**
   * Reset session for a user
   */
  public resetUserSession(userId: string): void {
    enhancedAcademicAdvisor.resetSession(userId);
    logger.info(`Session reset for user ${userId}`, 'PROACTIVE_ADVISOR');
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ProactiveAdvisorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Proactive advisor configuration updated', 'PROACTIVE_ADVISOR');
  }

  /**
   * Get current session statistics
   */
  public getSessionStats(userId: string): {
    questionsAsked: number;
    transcriptPrompted: boolean;
    hasProvidedAdvice: boolean;
    conversationTurn: number;
  } {
    const sessionState = enhancedAcademicAdvisor.getSessionState(userId);
    const studentProfile = enhancedAcademicAdvisor.getStudentProfile(userId);

    return {
      questionsAsked: sessionState?.questionsAsked || 0,
      transcriptPrompted: sessionState?.transcriptPrompted || false,
      hasProvidedAdvice: sessionState?.hasProvidedGeneralAdvice || false,
      conversationTurn: sessionState?.conversationTurn || 0
    };
  }

  /**
   * Test the anti-looping mechanism
   */
  public async testAntiLooping(userId: string): Promise<boolean> {
    const testQuery = "What courses should I take? I'm a sophomore CS major, Machine Intelligence track, completed CS 180, CS 182, CS 250, CS 251, no transcript.";
    
    try {
      const response = await this.provideProactiveGuidance(testQuery, userId, {
        major: 'Computer Science',
        track: 'Machine Intelligence',
        academicLevel: 'sophomore',
        completedCourses: ['CS 180', 'CS 182', 'CS 250', 'CS 251']
      });

      // Check if response contains course recommendations
      const hasRecommendations = response.recommendations.length > 0;
      const responseLength = response.response.length;
      const containsCourses = /CS \d{5}/.test(response.response);

      logger.info(`Anti-looping test - Recommendations: ${hasRecommendations}, Length: ${responseLength}, Contains courses: ${containsCourses}`, 'PROACTIVE_ADVISOR');

      return hasRecommendations && responseLength > 100 && containsCourses;
    } catch (error) {
      logger.error('Anti-looping test failed:', error, 'PROACTIVE_ADVISOR');
      return false;
    }
  }
}

// Export singleton instance
export const proactiveAdvisorService = new ProactiveAdvisorService();
export type { ProactiveAdvisorConfig };