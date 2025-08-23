import { AIReasoningResponse, ThinkingStep, DEEPTHINK_CONFIG } from '@/types/thinking';
import { unifiedChatService } from './unifiedChatService';
import { logger } from '@/utils/logger';

interface DeepThinkingConfig {
  mode: 'quick' | 'standard' | 'deep' | 'critical';
  enableContextualAnalysis: boolean;
  enableAlternativeExploration: boolean;
  enableConfidenceTracking: boolean;
  maxThinkingTime: number; // milliseconds
}

interface ContextualFactors {
  studentProfile?: any;
  transcriptData?: any;
  academicRules?: string[];
  courseData?: any;
  prerequisiteChains?: any;
}

class DeepThinkingService {
  private config: DeepThinkingConfig = {
    mode: 'standard',
    enableContextualAnalysis: true,
    enableAlternativeExploration: true,
    enableConfidenceTracking: true,
    maxThinkingTime: 15000
  };

  setThinkingMode(mode: string = 'contextual'): void {
    this.config.mode = mode;
    const modeConfig = DEEPTHINK_CONFIG;
    
    // Auto-configure based on DeepThink config
    this.config.enableContextualAnalysis = modeConfig.context_analysis;
    this.config.enableAlternativeExploration = modeConfig.alternative_exploration;
    this.config.enableConfidenceTracking = modeConfig.confidence_tracking;
    
    logger.info(`Deep thinking mode set to: ${mode}`, 'DEEP_THINKING');
  }

  async processWithDeepThinking(
    message: string, 
    userId: string, 
    contextualFactors: ContextualFactors = {},
    sessionId?: string
  ): Promise<AIReasoningResponse> {
    const startTime = Date.now();
    const modeConfig = DEEPTHINK_CONFIG;
    
    logger.info(`Starting ${modeConfig.name} analysis`, 'DEEP_THINKING');

    try {
      // Enhanced reasoning with contextual awareness
      const enhancedPrompt = this.buildEnhancedPrompt(message, contextualFactors);
      
      // Get AI response with reasoning
      const response = await unifiedChatService.sendMessageWithReasoning(
        enhancedPrompt, 
        userId, 
        sessionId
      );

      // Enhance the response with deep thinking analysis
      const enhancedResponse = await this.enhanceReasoningResponse(
        response, 
        contextualFactors,
        startTime
      );

      logger.info(`${modeConfig.name} analysis complete`, 'DEEP_THINKING', {
        reasoning_time: enhancedResponse.reasoning_time,
        steps: enhancedResponse.thinking_steps.length,
        confidence: enhancedResponse.confidence_score
      });

      return enhancedResponse;

    } catch (error) {
      logger.error('Deep thinking analysis failed:', 'DEEP_THINKING', error);
      
      // Return fallback response with error thinking step
      return {
        thinking_steps: [{
          id: 'error-step',
          title: 'analyze',
          content: 'Deep thinking analysis encountered an error. Falling back to standard reasoning.',
          status: 'completed',
          timestamp: new Date(),
          reasoning_depth: 'surface',
          confidence_level: 0.3,
          context_used: ['error_fallback']
        }],
        final_response: 'I encountered an issue with deep analysis. Let me try to help with standard reasoning instead.',
        reasoning_time: Date.now() - startTime,
        model_used: 'fallback',
        reasoning_depth: this.config.mode,
        context_awareness: {
          student_profile_used: false,
          transcript_data_used: false,
          academic_rules_applied: false,
          prerequisites_checked: false,
          track_alignment_verified: false
        },
        decision_factors: {
          primary_factors: ['error_recovery'],
          secondary_factors: [],
          ignored_factors: []
        },
        alternatives_explored: []
      };
    }
  }

  private buildEnhancedPrompt(message: string, context: ContextualFactors): string {
    const modeConfig = DEEPTHINK_CONFIG;
    
    let prompt = `You are a knowledgeable and personable academic advisor for Purdue University students.

KNOWLEDGE BASE BOUNDARIES (STRICTLY ENFORCED):
You can ONLY help with: Computer Science (2 tracks: Machine Intelligence, Software Engineering), Data Science (standalone), Artificial Intelligence (standalone), related minors, and CODO requirements for these three majors.

If asked about other majors, tracks, or programs outside your expertise, politely redirect to the closest supported option.

COMMUNICATION RULES:
- Use natural, conversational language like you're speaking with a student face-to-face
- Never use markdown formatting (no ** bold **, no * italics *, no ## headers)
- Be personable and approachable while maintaining professionalism
- Sound like a knowledgeable advisor who genuinely cares about the student's success
- Use plain text only - no special characters for emphasis
- Keep responses concise and accurate without unnecessary technical details
- Don't mention confidence levels, reasoning processes, or analysis steps to the user

Student Query: "${message}"

`;

    if (this.config.enableContextualAnalysis && context.studentProfile) {
      prompt += `\nSTUDENT CONTEXT:
${JSON.stringify(context.studentProfile, null, 2)}
`;
    }

    if (context.transcriptData) {
      prompt += `\nTRANSCRIPT DATA:
Available for analysis and course planning
`;
    }

    if (context.academicRules?.length) {
      prompt += `\nACACEMIC RULES TO CONSIDER:
${context.academicRules.join('\n')}
`;
    }

    if (this.config.enableAlternativeExploration) {
      prompt += `\nREQUIRED: Explore alternative approaches and explain why the recommended approach is optimal.`;
    }

    // Confidence tracking disabled for cleaner user experience
    // if (this.config.enableConfidenceTracking) {
    //   prompt += `\nREQUIRED: Include confidence scores for each reasoning step and overall recommendation.`;
    // }

    prompt += `\nPlease think through this systematically and show your reasoning process step by step.`;

    return prompt;
  }

  private async enhanceReasoningResponse(
    response: AIReasoningResponse, 
    context: ContextualFactors,
    startTime: number
  ): Promise<AIReasoningResponse> {
    
    // Enhance thinking steps with additional metadata
    const enhancedSteps: ThinkingStep[] = response.thinking_steps.map((step, index) => ({
      ...step,
      reasoning_depth: this.inferReasoningDepth(step.content),
      confidence_level: this.calculateStepConfidence(step, context),
      context_used: this.identifyContextUsed(step.content, context),
      alternatives_considered: this.extractAlternatives(step.content)
    }));

    // Analyze context awareness
    const contextAwareness = {
      student_profile_used: Boolean(context.studentProfile && 
        response.final_response.includes('your') || 
        enhancedSteps.some(s => s.context_used.includes('student_profile'))),
      transcript_data_used: Boolean(context.transcriptData &&
        enhancedSteps.some(s => s.context_used.includes('transcript'))),
      academic_rules_applied: enhancedSteps.some(s => 
        s.content.toLowerCase().includes('policy') || 
        s.content.toLowerCase().includes('requirement')),
      prerequisites_checked: enhancedSteps.some(s => 
        s.content.toLowerCase().includes('prerequisite') ||
        s.content.toLowerCase().includes('prereq')),
      track_alignment_verified: enhancedSteps.some(s =>
        s.content.toLowerCase().includes('track') ||
        s.content.toLowerCase().includes('major'))
    };

    // Extract decision factors
    const decisionFactors = this.extractDecisionFactors(response.final_response, enhancedSteps);

    // Explore alternatives mentioned in reasoning
    const alternativesExplored = this.extractAlternativesFromResponse(response);

    return {
      ...response,
      thinking_steps: enhancedSteps,
      reasoning_time: Date.now() - startTime,
      reasoning_depth: this.config.mode,
      context_awareness: contextAwareness,
      decision_factors: decisionFactors,
      alternatives_explored: alternativesExplored,
      confidence_score: this.calculateOverallConfidence(enhancedSteps)
    };
  }

  private inferReasoningDepth(content: string): 'surface' | 'deep' | 'critical' {
    const indicators = {
      critical: ['comprehensive', 'systematic', 'analyze', 'evaluate', 'complex'],
      deep: ['consider', 'examine', 'review', 'assess', 'factor'],
      surface: ['check', 'look', 'simple', 'basic']
    };

    const contentLower = content.toLowerCase();
    
    if (indicators.critical.some(term => contentLower.includes(term))) return 'critical';
    if (indicators.deep.some(term => contentLower.includes(term))) return 'deep';
    return 'surface';
  }

  private calculateStepConfidence(step: ThinkingStep, context: ContextualFactors): number {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on context usage
    if (step.content.includes('based on') || step.content.includes('according to')) {
      confidence += 0.15;
    }
    
    // Increase confidence if specific data is referenced
    if (context.studentProfile && step.content.includes('student') || step.content.includes('your')) {
      confidence += 0.1;
    }
    
    // Decrease confidence for speculative language
    if (step.content.includes('might') || step.content.includes('could') || step.content.includes('possibly')) {
      confidence -= 0.2;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private identifyContextUsed(content: string, context: ContextualFactors): string[] {
    const contextUsed: string[] = [];
    const contentLower = content.toLowerCase();
    
    if (context.studentProfile && (contentLower.includes('student') || contentLower.includes('your'))) {
      contextUsed.push('student_profile');
    }
    
    if (context.transcriptData && contentLower.includes('transcript')) {
      contextUsed.push('transcript');
    }
    
    if (context.academicRules && (contentLower.includes('policy') || contentLower.includes('rule'))) {
      contextUsed.push('academic_rules');
    }
    
    if (context.courseData && (contentLower.includes('course') || contentLower.includes('class'))) {
      contextUsed.push('course_catalog');
    }
    
    if (contentLower.includes('prerequisite') || contentLower.includes('prereq')) {
      contextUsed.push('prerequisites');
    }
    
    return contextUsed;
  }

  private extractAlternatives(content: string): string[] {
    const alternatives: string[] = [];
    const contentLower = content.toLowerCase();
    
    // Look for alternative language patterns
    const patterns = [
      /alternatively[,:]?\s*([^.]+)/gi,
      /another option[,:]?\s*([^.]+)/gi,
      /could also[,:]?\s*([^.]+)/gi,
      /instead[,:]?\s*([^.]+)/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = contentLower.match(pattern);
      if (matches) {
        alternatives.push(...matches.slice(0, 2)); // Limit to 2 alternatives
      }
    });
    
    return alternatives;
  }

  private extractDecisionFactors(finalResponse: string, steps: ThinkingStep[]) {
    const allContent = finalResponse + ' ' + steps.map(s => s.content).join(' ');
    const contentLower = allContent.toLowerCase();
    
    const primaryFactors: string[] = [];
    const secondaryFactors: string[] = [];
    const ignoredFactors: string[] = [];
    
    // Primary factors (high importance indicators)
    if (contentLower.includes('prerequisite')) primaryFactors.push('Prerequisites');
    if (contentLower.includes('gpa') || contentLower.includes('grade')) primaryFactors.push('Academic standing');
    if (contentLower.includes('credit') || contentLower.includes('hour')) primaryFactors.push('Credit requirements');
    if (contentLower.includes('track') || contentLower.includes('major')) primaryFactors.push('Track alignment');
    
    // Secondary factors
    if (contentLower.includes('schedule') || contentLower.includes('time')) secondaryFactors.push('Schedule compatibility');
    if (contentLower.includes('difficulty') || contentLower.includes('workload')) secondaryFactors.push('Course difficulty');
    if (contentLower.includes('professor') || contentLower.includes('instructor')) secondaryFactors.push('Instructor preferences');
    
    // Ignored factors (mentioned but dismissed)
    if (contentLower.includes('not relevant') || contentLower.includes('doesn\'t matter')) {
      ignoredFactors.push('Non-critical factors');
    }
    
    return {
      primary_factors: primaryFactors,
      secondary_factors: secondaryFactors,
      ignored_factors: ignoredFactors
    };
  }

  private extractAlternativesFromResponse(response: AIReasoningResponse) {
    const allContent = response.final_response + ' ' + response.thinking_steps.map(s => s.content).join(' ');
    
    const alternatives: Array<{
      option: string;
      reasoning: string;
      confidence: number;
      rejected_because: string;
    }> = [];
    
    // Simple extraction - in a real implementation, you'd use more sophisticated NLP
    const alternativePatterns = [
      'alternatively',
      'another option',
      'could also',
      'instead of'
    ];
    
    alternativePatterns.forEach((pattern, index) => {
      if (allContent.toLowerCase().includes(pattern)) {
        alternatives.push({
          option: `Alternative approach ${index + 1}`,
          reasoning: 'Extracted from reasoning analysis',
          confidence: 0.6 + (Math.random() * 0.3),
          rejected_because: 'Lower confidence or contextual mismatch'
        });
      }
    });
    
    return alternatives.slice(0, 3); // Limit to 3 alternatives
  }

  private calculateOverallConfidence(steps: ThinkingStep[]): number {
    if (steps.length === 0) return 0.5;
    
    const stepConfidences = steps
      .filter(s => s.confidence_level !== undefined)
      .map(s => s.confidence_level!);
    
    if (stepConfidences.length === 0) return 0.7;
    
    // Weighted average with higher weight on later steps
    const weights = stepConfidences.map((_, i) => Math.pow(1.2, i));
    const weightedSum = stepConfidences.reduce((sum, conf, i) => sum + conf * weights[i], 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  // Enhanced prompting for different thinking depths
  private buildContextualPrompt(message: string, context: ContextualFactors): string {
    const modeConfig = DEEPTHINK_CONFIG;
    
    let systemPrompt = `You are BoilerAI, an advanced academic assistant with deep contextual reasoning.

THINKING MODE: ${modeConfig.name}
ANALYSIS DEPTH: ${modeConfig.depth_level}
EXPECTED REASONING STEPS: ${modeConfig.step_count}

Your reasoning should demonstrate:
- Contextual awareness of student situation
- Evaluation of multiple factors and alternatives
- Academic policy and requirement analysis  
- Confidence assessment for recommendations
- Clear decision-making rationale

Please think step by step and show your reasoning process clearly.

User Question: "${message}"
`;

    if (context.studentProfile) {
      systemPrompt += `\n\nSTUDENT CONTEXT: Consider the student's academic profile, completed courses, and goals.`;
    }

    if (context.transcriptData) {
      systemPrompt += `\nTRANSCRIPT CONTEXT: Analyze based on completed coursework and academic history.`;
    }

    if (context.academicRules?.length) {
      systemPrompt += `\nACACEMIC POLICIES: Apply relevant academic rules and requirements.`;
    }

    return systemPrompt;
  }

  // Get current thinking configuration
  getConfig(): DeepThinkingConfig {
    return { ...this.config };
  }

  // Update specific config options
  updateConfig(updates: Partial<DeepThinkingConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Deep thinking config updated', 'DEEP_THINKING', updates);
  }

  // Get available thinking modes
  getAvailableModes() {
    return [{
      id: 'contextual',
      ...DEEPTHINK_CONFIG
    }];
  }
}

export const deepThinkingService = new DeepThinkingService();

// Debug function for browser console
if (typeof window !== 'undefined') {
  (window as any).debugDeepThinking = {
    getConfig: () => deepThinkingService.getConfig(),
    setMode: (mode: string) => deepThinkingService.setThinkingMode(mode as any),
    getModes: () => deepThinkingService.getAvailableModes(),
    testThinking: async (message: string) => {
      try {
        const response = await deepThinkingService.processWithDeepThinking(
          message, 
          'debug-user',
          {}
        );
        console.log('Deep thinking response:', response);
        return response;
      } catch (error) {
        console.error('Deep thinking test failed:', error);
        return error;
      }
    }
  };
}

export default deepThinkingService;