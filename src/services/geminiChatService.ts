// Enhanced Gemini-based chat service with reasoning capabilities
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TranscriptData } from '@/types';
import { AIReasoningResponse, ThinkingStep } from '@/types/thinking';
import { pureAIFallback } from './pureAIFallback';
import { rlhfService } from './rlhfService';
import { aiConfig } from './aiConfig';
import { knowledgeBaseService } from './knowledgeBaseService';
import { codoEvaluationService } from './codoevaluationService';
import { contextualMemoryService } from './contextualMemoryService';
import { logger } from '@/utils/logger';
import { smartCourseService, SmartCourseContext } from './smartCourseService';
import { rateLimitManager } from './rateLimitManager';
import { errorMessageHelper } from './errorMessageHelper';
import type { 
  StudentProfile, 
  DataContainer, 
  ApiResponse,
  UserContext 
} from '@/types/common';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface EnhancedContext {
  studentProfile: StudentProfile | null;
  contextPrompt: string;
  transcriptData: TranscriptData | null;
}

class GeminiChatService {
  private geminiClient: GoogleGenerativeAI | null = null;
  private transcriptContext: string = '';
  private enhancedContext: EnhancedContext | null = null;
  private reasoningMode: boolean = false; // Disable reasoning by default for performance and rate limit management
  private primaryModel: string = 'gemini-2.0-flash-exp'; // Primary model for most conversations  
  private complexModel: string = 'gemini-2.0-flash-exp'; // Use Gemini 2.0 Flash for better rate limits (1M tokens/min)

  constructor() {
    this.initializeGemini();
  }

  private getUserApiKey(): string {
    console.log('🔍 [DEBUG] getUserApiKey called for Gemini');
    
    // First check session storage (for non-remembered keys)
    let apiKey = sessionStorage.getItem('current_session_gemini_key') || '';
    console.log('🔍 [DEBUG] Session storage key:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Not found');
    
    // If not in session, check user-specific stored keys
    if (!apiKey) {
      // Try to get current user ID from either auth context
      const userIds = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
      console.log('🔍 [DEBUG] User-specific keys found:', userIds);
      
      if (userIds.length > 0) {
        // Get the most recent user's API key
        const latestUserKey = userIds[userIds.length - 1];
        const userKeyData = localStorage.getItem(latestUserKey);
        console.log('🔍 [DEBUG] Latest user key data:', userKeyData ? 'Found' : 'Not found');
        
        if (userKeyData) {
          try {
            const parsed = JSON.parse(userKeyData);
            apiKey = parsed.gemini || '';
            console.log('🔍 [DEBUG] Parsed Gemini API key:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Not found');
          } catch (e) {
            console.log('🔍 [DEBUG] Parse error:', e);
          }
        }
      }
    }
    
    // Fallback to legacy storage only (no shared env key)
    if (!apiKey) {
      const legacyKey = localStorage.getItem('gemini_api_key');
      console.log('🔍 [DEBUG] Legacy key:', legacyKey ? `Found (${legacyKey.substring(0, 8)}...)` : 'Not found');
      console.log('🔍 [DEBUG] Env key fallback removed to prevent quota sharing');
      apiKey = legacyKey || '';
    }
    
    console.log('🔍 [DEBUG] Final Gemini API key result:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Not found');
    return apiKey;
  }

  private initializeGemini(): boolean {
    try {
      console.log('🚀 [DEBUG] initializeGemini called');
      // Get API key using centralized logic
      const apiKey = this.getUserApiKey();
      
      if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'test_key_for_testing' || apiKey.length < 10) {
        console.log('❌ [DEBUG] No valid user Gemini API key found:', { hasKey: !!apiKey, length: apiKey?.length, isTestKey: apiKey === 'test_key_for_testing' });
        logger.warn('No valid user Gemini API key found - users must provide their own keys to avoid quota conflicts', 'GEMINI');
        return false;
      }
      
      console.log('✅ [DEBUG] Valid Gemini API key found, initializing Gemini client');

      this.geminiClient = new GoogleGenerativeAI(apiKey);
      
      // Also reinitialize the fallback system with new API key
      pureAIFallback.reinitialize();
      logger.info('Gemini client initialized successfully', 'GEMINI');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Gemini client', 'GEMINI', error);
      return false;
    }
  }

  // Intelligent model selection based on query complexity and context
  private selectOptimalModel(message: string, context?: DataContainer): string {
    // Use flash model for most queries, pro for complex analysis
    if (this.isComplexQuery(message, context)) {
      return this.complexModel;
    }
    return this.primaryModel;
  }

  private isComplexQuery(message: string, context?: DataContainer): boolean {
    const complexityIndicators = [
      // Academic complexity
      /complex.*analysis|deep.*thinking|comprehensive.*review/i,
      /architectural.*decision|system.*design|algorithm.*optimization/i,
      /research.*paper|literature.*review|thesis.*analysis/i,
      
      // Multi-step reasoning
      /step.*by.*step|break.*down|analyze.*and.*compare/i,
      /pros.*and.*cons|advantages.*disadvantages|trade.*off/i,
      /explain.*why.*and.*how|reasoning.*behind/i,
      
      // Advanced academic topics
      /calculus|differential.*equation|linear.*algebra/i,
      /machine.*learning|artificial.*intelligence|neural.*network/i,
      /quantum.*mechanic|thermodynamic|biochemistry/i,
      
      // Planning and strategy
      /plan.*for.*semester|graduation.*timeline|career.*path/i,
      /course.*sequence|prerequisite.*analysis|degree.*audit/i
    ];

    return complexityIndicators.some(pattern => pattern.test(message)) ||
           (context?.transcriptData && message.includes('degree') && message.length > 200);
  }

  // Check if API is available
  async isApiAvailable(): Promise<boolean> {
    return !!this.geminiClient;
  }

  // Estimate token usage for rate limiting
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    // Add some buffer for prompt engineering and model overhead
    const baseTokens = Math.ceil(text.length / 4);
    const promptOverhead = 500; // System prompt and formatting overhead
    const responseBuffer = 1000; // Expected response tokens
    return baseTokens + promptOverhead + responseBuffer;
  }

  async sendMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    // Check if this is a course recommendation query that would benefit from SmartCourse enhancement
    if (this.isSmartCourseQuery(message) && this.enhancedContext?.transcriptData) {
      try {
        const smartCourseContext = await smartCourseService.createSmartCourseContext(
          this.enhancedContext.transcriptData,
          'full_context'
        );
        
        const smartResponse = await smartCourseService.getSmartCourseAdvice(
          message,
          userId,
          smartCourseContext,
          sessionId
        );
        
        // Log SmartCourse metrics for quality monitoring
        logger.info(`SmartCourse metrics - PlanScore: ${smartResponse.metrics.planScore}, PersonalScore: ${smartResponse.metrics.personalScore}, Lift: ${smartResponse.metrics.lift}, Recall: ${smartResponse.metrics.recall}`, 'SMARTCOURSE');
        
        return smartResponse.explanation;
      } catch (error) {
        logger.warn('SmartCourse enhancement failed, falling back to standard chat:', 'GEMINI', error);
        // Fall through to standard processing
      }
    }

    if (this.reasoningMode) {
      const reasoningResponse = await this.sendMessageWithReasoning(message, userId, sessionId);
      return reasoningResponse.final_response;
    }
    
    return this.sendDirectMessage(message, userId, sessionId);
  }

  async sendMessageWithReasoning(message: string, userId: string, sessionId?: string): Promise<AIReasoningResponse> {
    const currentSessionId = sessionId || 'default';
    
    // Check if client is already initialized
    const initialized = this.geminiClient ? true : this.initializeGemini();
    
    if (!initialized || !this.geminiClient) {
      console.log('❌ [DEBUG] Gemini client initialization failed');
      // Use AI to generate error response
      const aiErrorResponse = await pureAIFallback.generateErrorResponse(message, 'api_key');
      return {
        thinking_steps: [{
          id: 'api-key-error',
          title: 'analyze',
          content: 'API key configuration needed for full functionality',
          status: 'completed',
          timestamp: new Date()
        }],
        final_response: aiErrorResponse,
        reasoning_time: 100,
        model_used: 'fallback-ai'
      };
    }

    const startTime = Date.now();

    // Estimate tokens for rate limiting
    const estimatedTokens = this.estimateTokens(message);
    
    return await rateLimitManager.executeWithRetry(
      'gemini',
      async () => {
        return await this.executeReasoningRequest(message, userId, currentSessionId, startTime);
      },
      estimatedTokens
    );
  }

  private async executeReasoningRequest(message: string, userId: string, sessionId: string, startTime: number): Promise<AIReasoningResponse> {
    try {
      // Get RLHF-optimized prompt or fall back to default
      const optimizedPrompt = rlhfService.getOptimizedPrompt('reasoning');
      const reasoningPrompt = optimizedPrompt || `You are a personable academic advisor for Purdue University students. 

KNOWLEDGE BASE BOUNDARIES (STRICTLY ENFORCED):
You can ONLY help with: Computer Science (2 tracks: Machine Intelligence, Software Engineering), Data Science (standalone), Artificial Intelligence (standalone), related minors, and CODO requirements for these three majors. 

If asked about other majors, tracks, or programs, politely redirect to the closest supported option and explain why it's relevant.

For every query, you MUST follow this exact structured reasoning process:

1. ANALYZE: Break down the user's query and check if it falls within your knowledge boundaries.
2. REASON: Think step-by-step through the problem using only your supported knowledge areas.
3. VALIDATE: Ensure your response stays within knowledge boundaries and is accurate.
4. SYNTHESIZE: Combine your analysis into a coherent, actionable response.

Format your response EXACTLY like this:
ANALYZE
[Your analysis of what the user is asking]

REASON
[Your step-by-step reasoning process]

VALIDATE
[Your validation of the reasoning and accuracy check]

SYNTHESIZE
[Your final response to the user - use natural, conversational language with no markdown formatting]

COMMUNICATION RULES FOR FINAL RESPONSE:
- Use natural, conversational language like you're speaking with a student face-to-face
- Never use markdown formatting (no ** bold **, no * italics *, no ## headers)
- Be personable and approachable while maintaining professionalism
- Sound like a knowledgeable advisor who genuinely cares about the student's success
- Use plain text only - no special characters for emphasis
- Keep responses concise and accurate without unnecessary technical details
- Don't mention confidence levels, reasoning processes, or analysis steps to the user`;

      // Get contextual memory and build enhanced context
      const contextualPrompt = contextualMemoryService.generateContextualPrompt(userId, sessionId, message);
      
      // Build enhanced context if available, otherwise fall back to basic transcript context
      let contextString = '';
      if (this.enhancedContext) {
        contextString = `\n\nENHANCED STUDENT CONTEXT:\n${this.enhancedContext.contextPrompt}\n\nCONTEXTUAL AWARENESS:
- Use this student's academic history for personalized advice
- Reference specific courses and performance when relevant
- Evaluate CODO requests against actual transcript data
- Maintain context awareness across conversation
- Continuously improve responses based on student profile

${contextualPrompt}`;
      } else if (this.transcriptContext) {
        contextString = `\n\nStudent Academic Context:\n${this.transcriptContext}

${contextualPrompt}`;
      } else {
        contextString = `\n\n${contextualPrompt}`;
      }

      const fullPrompt = `${reasoningPrompt}${contextString}

User Query: ${message}`;

      // Use intelligent model selection based on query complexity
      const selectedModel = this.selectOptimalModel(message, this.enhancedContext);
      console.log(`🧠 Using ${selectedModel} for query complexity analysis`);
      
      const model = this.geminiClient.getGenerativeModel({ model: selectedModel });
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const reply = response.text();

      if (!reply) {
        throw new Error('No response received from Gemini AI');
      }

      // Parse the structured response
      const reasoningResponse = this.parseReasoningResponse(reply);
      reasoningResponse.reasoning_time = Date.now() - startTime;
      reasoningResponse.model_used = selectedModel;
      // Remove verbose technical summary for cleaner user experience
      // reasoningResponse.thinkingSummary = `Applied structured reasoning: analyzed query → retrieved knowledge → validated against Purdue policies → synthesized personalized guidance with ${this.transcriptContext ? 'your academic context' : 'general academic knowledge'}`;

      // Update contextual memory
      contextualMemoryService.updateContext(userId, sessionId, message, reasoningResponse.final_response, {
        confidence: reasoningResponse.confidence_score,
        reasoningTime: reasoningResponse.reasoning_time,
        model: reasoningResponse.model_used
      });

      return reasoningResponse;
    } catch (error: any) {
      console.error('Gemini reasoning error:', error);
      
      // Use enhanced error analysis
      const errorAnalysis = errorMessageHelper.analyzeError(error, 'gemini');
      const errorResponse = errorMessageHelper.generateErrorResponse(error, 'gemini');
      
      return {
        thinking_steps: [{
          id: 'error-fallback',
          title: 'analyze',
          content: `Gemini AI Error (${errorAnalysis.type}): ${errorAnalysis.userMessage}`,
          status: 'completed',
          timestamp: new Date()
        }],
        final_response: errorResponse,
        reasoning_time: Date.now() - startTime,
        model_used: 'error-fallback'
      };
    }
  }

  private async sendDirectMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    const currentSessionId = sessionId || 'default';
    
    if (!this.geminiClient) {
      const initialized = this.initializeGemini();
      if (!initialized) {
        // Use AI to generate error response instead of hardcoded message
        return await pureAIFallback.generateErrorResponse(message, 'api_key');
      }
    }

    // Estimate tokens for rate limiting
    const estimatedTokens = this.estimateTokens(message);
    
    return await rateLimitManager.executeWithRetry(
      'gemini',
      async () => {
        return await this.executeDirectRequest(message, userId, currentSessionId);
      },
      estimatedTokens
    );
  }

  private async executeDirectRequest(message: string, userId: string, sessionId: string): Promise<string> {
    try {
      // Check if this is a CODO query and handle it specially
      const codoevaluation = await this.handleCODOQuery(message);
      if (codoevaluation) {
        // For CODO queries, append the evaluation to the AI response
        const systemPrompt = await this.buildDynamicSystemPrompt(message, userId, sessionId);
        const enhancedPrompt = `${systemPrompt}

SPECIAL INSTRUCTIONS: The user is asking about CODO (Change of Degree Objective). I have performed a detailed evaluation of their transcript against the target major requirements. Use this evaluation data to provide comprehensive guidance and answer their question thoroughly.

CODO EVALUATION RESULTS:
${codoevaluation}

Based on this evaluation, provide personalized advice and guidance.

User Query: ${message}`;

        const selectedModel = this.selectOptimalModel(message, this.enhancedContext);
        const model = this.geminiClient.getGenerativeModel({ model: selectedModel });
        
        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;
        const reply = response.text() || codoevaluation;
        
        // Update contextual memory
        contextualMemoryService.updateContext(userId, sessionId, message, reply, {
          codoEvaluation: true
        });
        
        return reply;
      }

      const systemPrompt = await this.buildDynamicSystemPrompt(message, userId, sessionId);
      const fullPrompt = `${systemPrompt}

User Query: ${message}`;

      const selectedModel = this.selectOptimalModel(message, this.enhancedContext);
      const model = this.geminiClient.getGenerativeModel({ model: selectedModel });
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const reply = response.text();

      if (!reply) {
        throw new Error('No response received from Gemini AI');
      }

      // Update contextual memory
      contextualMemoryService.updateContext(userId, sessionId, message, reply);

      return reply;
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      
      // Use enhanced error analysis for direct messages
      return errorMessageHelper.generateErrorResponse(error, 'gemini');
    }
  }

  private parseReasoningResponse(response: string): AIReasoningResponse {
    const sections = {
      analyze: '',
      reason: '',
      validate: '',
      synthesize: ''
    };

    // Parse sections using regex (updated for plain text headers)
    const analyzeMatch = response.match(/(?:^|\n)ANALYZE\s*([\s\S]*?)(?=\nREASON|$)/i);
    const reasonMatch = response.match(/(?:^|\n)REASON\s*([\s\S]*?)(?=\nVALIDATE|$)/i);
    const validateMatch = response.match(/(?:^|\n)VALIDATE\s*([\s\S]*?)(?=\nSYNTHESIZE|$)/i);
    const synthesizeMatch = response.match(/(?:^|\n)SYNTHESIZE\s*([\s\S]*?)$/i);

    if (analyzeMatch) sections.analyze = analyzeMatch[1].trim();
    if (reasonMatch) sections.reason = reasonMatch[1].trim();
    if (validateMatch) sections.validate = validateMatch[1].trim();
    if (synthesizeMatch) sections.synthesize = synthesizeMatch[1].trim();

    // Create thinking steps
    const thinkingSteps: ThinkingStep[] = [
      {
        id: 'step-analyze',
        title: 'analyze',
        content: sections.analyze,
        status: 'completed',
        timestamp: new Date()
      },
      {
        id: 'step-reason',
        title: 'reason',
        content: sections.reason,
        status: 'completed',
        timestamp: new Date()
      },
      {
        id: 'step-validate',
        title: 'validate',
        content: sections.validate,
        status: 'completed',
        timestamp: new Date()
      },
      {
        id: 'step-synthesize',
        title: 'synthesize',
        content: 'Preparing final response...',
        status: 'completed',
        timestamp: new Date()
      }
    ].filter(step => step.content.length > 0);

    return {
      thinking_steps: thinkingSteps,
      final_response: sections.synthesize || response,
      confidence_score: 0.85 + Math.random() * 0.1 // Simulated confidence
    };
  }

  setTranscriptContext(transcriptData: TranscriptData): void {
    try {
      const studentInfo = transcriptData.studentInfo;
      const completedCourses = Object.values(transcriptData.completedCourses || {});
      const totalCourses = completedCourses.reduce((sum, semester) => sum + (semester.courses?.length || 0), 0);
      
      this.transcriptContext = `Student: ${studentInfo.name}
Program: ${studentInfo.program}
College: ${studentInfo.college}
Current GPA: ${transcriptData.gpaSummary.cumulativeGPA}
Total Credits: ${transcriptData.gpaSummary.totalCreditsEarned}
Completed Courses: ${totalCourses}

Recent Courses Completed:
${completedCourses.slice(-2).map(semester => 
  `${semester.semester} ${semester.year}: ${semester.courses?.map(c => c.courseCode).join(', ') || 'None'}`
).join('\n')}`;

      console.log('✅ Transcript context set for Gemini AI assistant');
    } catch (error) {
      console.error('Failed to set transcript context:', error);
    }
  }

  setEnhancedContext(context: EnhancedContext): void {
    try {
      this.enhancedContext = context;
      
      // Also update the basic transcript context for backward compatibility
      if (context.transcriptData) {
        this.setTranscriptContext(context.transcriptData);
      }
      
      console.log('✅ Enhanced context with student profile set for Gemini AI assistant');
    } catch (error) {
      console.error('Failed to set enhanced context:', error);
    }
  }

  // Update contextual memory with student profile
  setContextualMemory(userId: string, sessionId: string): void {
    if (this.enhancedContext) {
      contextualMemoryService.setStudentProfile(userId, sessionId, this.enhancedContext.studentProfile);
    }
  }

  getEnhancedContext(): EnhancedContext | null {
    return this.enhancedContext;
  }

  clearEnhancedContext(): void {
    this.enhancedContext = null;
    this.transcriptContext = '';
    console.log('✅ Gemini AI context cleared');
  }

  // Helper method to detect and handle CODO queries
  private async handleCODOQuery(message: string): Promise<string | null> {
    const codokeywords = [
      'codo', 'change of degree objective', 'change major', 'switch major',
      'transfer to', 'move to', 'requirements for', 'eligible for',
      'computer science codo', 'engineering codo', 'business codo'
    ];

    const isCODOQuery = codokeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (!isCODOQuery || !this.enhancedContext) {
      return null;
    }

    try {
      // Extract target major from the message
      const targetMajor = this.extractTargetMajor(message);
      if (!targetMajor) {
        return null;
      }

      // Perform CODO evaluation
      const evaluation = await codoEvaluationService.evaluateEligibility();

      // Format the evaluation results
      return this.formatCODOEvaluation(evaluation);
    } catch (error) {
      console.error('CODO evaluation failed:', error);
      return null;
    }
  }

  private extractTargetMajor(message: string): string | null {
    const majorPatterns = [
      /(?:codo|change|switch|transfer|move).{0,20}(?:to|into)\s+([^.!?]+)/i,
      /([a-zA-Z\s]+)(?:\s+codo|\s+change|\s+requirements)/i,
      /(?:major.{0,10}in|study)\s+([^.!?]+)/i
    ];

    for (const pattern of majorPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private formatCODOEvaluation(evaluation: any): string {
    const statusIcon = evaluation.eligible ? '✅' : '⚠️';
    const eligibilityStatus = evaluation.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';

    let result = `## 🎯 CODO Evaluation: ${evaluation.targetMajor}

**${statusIcon} Status: ${eligibilityStatus}** (${evaluation.overallScore}% requirements met)

### 📋 Requirements Analysis:
`;

    evaluation.requirements.forEach((req: any, index: number) => {
      const icon = req.met ? '✅' : '❌';
      result += `${index + 1}. ${icon} **${req.name}**: ${req.details}\n`;
    });

    if (evaluation.recommendations.length > 0) {
      result += `\n### 💡 Recommendations:
`;
      evaluation.recommendations.forEach((rec: string, index: number) => {
        result += `${index + 1}. ${rec}\n`;
      });
    }

    result += `\n### ⏰ Timeline: ${evaluation.timeline}

### 🎯 Next Steps:
`;
    evaluation.nextSteps.forEach((step: string, index: number) => {
      result += `${index + 1}. ${step}\n`;
    });

    if (evaluation.alternativeOptions && evaluation.alternativeOptions.length > 0) {
      result += `\n### 🔄 Alternative Options:
Consider these related majors: ${evaluation.alternativeOptions.join(', ')}`;
    }

    return result;
  }

  isAvailable(): boolean {
    // Check if we have a validated API key and client using centralized logic
    const apiKey = this.getUserApiKey();
    const hasApiKey = !!(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length >= 10);
    const hasClient = !!this.geminiClient;
    
    // Check if API key is validated (this is set by ApiKeyContext)
    const apiKeyValid = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"gemini": false}').gemini;
    
    // If we have a key but no client, try to reinitialize
    if (hasApiKey && !hasClient) {
      this.initializeGemini();
    }
    
    return !!this.geminiClient && hasApiKey && apiKeyValid;
  }

  // Reasoning mode controls
  setReasoningMode(enabled: boolean): void {
    this.reasoningMode = enabled;
  }

  getReasoningMode(): boolean {
    return this.reasoningMode;
  }

  // Detect if query would benefit from SmartCourse enhancement
  private isSmartCourseQuery(message: string): boolean {
    const smartCourseIndicators = [
      // Course recommendation keywords
      /course.*recommend|recommend.*course|what.*course.*take|should.*take.*course/i,
      /next.*semester|course.*planning|schedule.*course|course.*schedule/i,
      /electives?|prerequisite|requirement|degree.*plan/i,
      
      // Academic planning keywords
      /graduation.*plan|academic.*plan|plan.*graduation|semester.*plan/i,
      /course.*sequence|course.*progression|major.*requirement/i,
      /track.*requirement|concentration.*requirement|minor.*requirement/i,
      
      // CODO and major-specific planning
      /codo|change.*major|switch.*major|major.*switch/i,
      /computer.*science.*course|cs.*course|data.*science.*course/i,
      /artificial.*intelligence.*course|ai.*course|machine.*learning.*course/i,
      
      // Specific course inquiries
      /cs\s+\d{5}|ma\s+\d{5}|stat\s+\d{5}|ece\s+\d{5}/i,
      /foundation.*course|core.*course|math.*requirement|science.*requirement/i
    ];

    return smartCourseIndicators.some(pattern => pattern.test(message));
  }

  private async buildDynamicSystemPrompt(userMessage: string, userId: string, sessionId?: string): Promise<string> {
    const currentSessionId = sessionId || 'default';
    // Base system prompt that defines the AI's role and capabilities
    let systemPrompt = `You are BoilerAI, a knowledgeable and personable academic advisor for Purdue University students.

CORE KNOWLEDGE BASE (STRICTLY ENFORCED):
- Computer Science major with 2 tracks: Machine Intelligence Track, Software Engineering Track
- Data Science major (standalone - no tracks available)
- Artificial Intelligence major (standalone - no tracks available)
- Minors available for all three majors
- CODO (Change of Degree Objective) requirements for each major
- Degree requirements, School of Science requirements, course progression guides

COMMUNICATION GUIDELINES:
- Use natural, conversational language like talking to a student in person
- Be personable and supportive while maintaining professionalism
- NEVER ask redundant questions when student context is already available
- Focus on actionable guidance based on the student's specific academic situation
- Avoid robotic or template-like responses

INTELLIGENT CONTEXT AWARENESS & KNOWLEDGE BOUNDARIES:
- Leverage available student data (major, year, completed courses) for personalized advice
- When student asks about course planning, reference their specific degree requirements
- Stay STRICTLY within your knowledge base - never suggest unsupported majors, tracks, or concentrations

WHAT YOU CAN HELP WITH:
✅ Computer Science major (Machine Intelligence Track, Software Engineering Track only)
✅ Data Science major (standalone - no tracks, no concentrations)
✅ Artificial Intelligence major (standalone - no tracks, no concentrations)
✅ Minors in CS, Data Science, or AI
✅ CODO requirements and evaluation for these three majors only
✅ Core courses, prerequisites, and graduation planning for supported majors
✅ General academic planning, study strategies, and Purdue policies

WHAT YOU CANNOT HELP WITH (redirect intelligently):
❌ Cybersecurity major/track (say: "Computer Science has no cybersecurity track, but the Software Engineering track covers security principles")
❌ Database major/track (say: "Database topics are covered in CS core courses and electives within both CS tracks")
❌ Engineering majors outside of CS (redirect to appropriate advisors)
❌ Business, Liberal Arts, or other non-Science school majors
❌ Graduate programs (MS/PhD) - focus on undergraduate only
❌ Specific professor recommendations or course scheduling
❌ Non-academic advice (housing, financial aid, etc.)

INTELLIGENT REDIRECTION STRATEGY:
- When asked about unsupported areas, acknowledge the question and redirect to closest supported option
- Always explain why the alternative you're suggesting is relevant to their interests
- Be honest about knowledge limitations while staying helpful

EXAMPLE REDIRECTIONS:
• "Cybersecurity isn't a separate major, but if you're interested in security, the Computer Science Software Engineering track covers cybersecurity principles, secure coding, and system security."
• "There's no database major, but database concepts are core to both CS tracks. You'll take database courses like CS 34800 and can choose database-focused electives."
• "I specialize in CS, Data Science, and AI programs. For engineering majors outside of Computer Science, I'd recommend contacting the engineering advising office."
• "For graduate programs, you'd want to speak with graduate advisors. I focus on undergraduate planning for CS, Data Science, and AI majors."

COMMUNICATION STYLE:
- Use natural, conversational language like you're speaking with a real student
- Never use markdown formatting (no ** bold ** or * italics * or ## headers)
- Be personable and approachable while maintaining professionalism
- Sound like a knowledgeable advisor who genuinely cares about the student's success
- Use plain text formatting only - no special characters for emphasis
- Avoid robotic or template-like responses
- Keep responses concise and precise without unnecessary technical details
- Don't mention confidence levels, analysis processes, or reasoning steps to the user

REASONING METHODOLOGY:
You must analyze each query through a structured reasoning process:
1. UNDERSTAND the student's specific situation, goals, and constraints
2. ANALYZE the academic implications and requirements
3. EVALUATE options against Purdue policies and best practices
4. SYNTHESIZE personalized, actionable guidance

`;

    // Add contextual memory and conversation awareness
    const contextualPrompt = contextualMemoryService.generateContextualPrompt(userId, currentSessionId, userMessage);
    
    // Add student context from multiple sources
    let studentContextAdded = false;
    
    if (this.enhancedContext) {
      systemPrompt += `ENHANCED STUDENT CONTEXT:\n${this.enhancedContext.contextPrompt}\n\nCONTEXTUAL INTELLIGENCE:
- Leverage detailed academic profile for personalized guidance
- Reference specific courses, grades, and performance patterns
- Evaluate major change requests (CODO) against actual transcript
- Maintain conversation context with memory of previous interactions
- Continuously learn and adapt responses for better student outcomes
- Switch context smoothly between academic and general topics

${contextualPrompt}

`;
      studentContextAdded = true;
    } else if (this.transcriptContext) {
      systemPrompt += `CURRENT STUDENT CONTEXT:\n${this.transcriptContext}\n\n${contextualPrompt}

`;
      studentContextAdded = true;
    }
    
    // Add onboarding context if available
    try {
      const onboardingContext = localStorage.getItem('student_onboarding_context');
      if (onboardingContext && !studentContextAdded) {
        const contextData = JSON.parse(onboardingContext);
        systemPrompt += `STUDENT PROFILE (From Onboarding):
- Name: ${contextData.firstName || 'Student'}
- Major: ${contextData.major}
- Current Year: ${contextData.currentYear}
- Expected Graduation: ${contextData.expectedGraduation}
- Academic Interests: ${contextData.academicInterests?.join(', ') || 'Not specified'}
- Academic Goals: ${contextData.academicGoals?.join(', ') || 'Not specified'}
- Has Transcript: ${contextData.hasUploadedTranscript ? 'Yes' : 'No'}

Use this information to provide personalized academic guidance without asking redundant questions about their major, year, or goals.

${contextualPrompt}

`;
        studentContextAdded = true;
      }
    } catch (error) {
      console.log('Could not load onboarding context:', error);
    }
    
    if (!studentContextAdded) {
      systemPrompt += `${contextualPrompt}

`;
    }

    // Skip AI-powered query analysis to reduce API calls and prevent rate limiting
    // Use simple keyword-based topic detection instead
    const isUrgent = /urgent|asap|immediate|deadline|due|emergency/i.test(userMessage);
    if (isUrgent) {
      systemPrompt += `URGENT REQUEST: This query requires immediate, actionable guidance. Prioritize concrete next steps.\n\n`;
    }

    systemPrompt += `RESPONSE REQUIREMENTS:
- Provide personalized guidance based on the student's actual academic situation
- Use your knowledge of Purdue University to give specific, accurate information
- Be encouraging while maintaining academic integrity and accuracy
- Ask clarifying questions when you need more information
- Provide clear next steps and actionable recommendations
- Reference specific courses, policies, or resources when relevant
- Adapt your communication style to match the student's needs and emotional state

Generate your response through careful reasoning, drawing on your knowledge base to provide the most helpful guidance for this specific student's academic journey.`;

    return systemPrompt;
  }
}

export const geminiChatService = new GeminiChatService();

// Debug function for troubleshooting - accessible from browser console
if (typeof window !== 'undefined') {
  (window as any).debugGemini = {
    checkApiKey: () => {
      console.log('=== Gemini API Key Debug ===');
      const service = geminiChatService as any;
      
      // Check session storage
      const sessionKey = sessionStorage.getItem('current_session_gemini_key');
      console.log('Session storage:', sessionKey ? `Found (${sessionKey.substring(0, 8)}...)` : 'Not found');
      
      // Check user-specific keys
      const userKeys = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
      console.log('User-specific keys:', userKeys);
      
      userKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            console.log(`${key}:`, parsed.gemini ? `Found (${parsed.gemini.substring(0, 8)}...)` : 'No Gemini API key');
          } catch (e) {
            console.log(`${key}: Parse error`, e);
          }
        }
      });
      
      // Check legacy storage
      const legacyKey = localStorage.getItem('gemini_api_key');
      console.log('Legacy storage:', legacyKey ? `Found (${legacyKey.substring(0, 8)}...)` : 'Not found');
      
      // Check validation status
      const validation = localStorage.getItem('api_key_validation_status');
      console.log('Validation status:', validation);
      
      // Check what the service sees
      const serviceKey = service.getUserApiKey();
      console.log('Service sees:', serviceKey ? `Found (${serviceKey.substring(0, 8)}...)` : 'Not found');
      
      // Check if client is initialized
      console.log('Client initialized:', !!service.geminiClient);
      console.log('Service available:', service.isAvailable());
      
      return {
        sessionKey: !!sessionKey,
        userKeys: userKeys.length,
        legacyKey: !!legacyKey,
        serviceKey: !!serviceKey,
        clientInitialized: !!service.geminiClient,
        serviceAvailable: service.isAvailable()
      };
    },
    reinitialize: () => {
      console.log('🔄 Forcing Gemini service reinitialization...');
      const service = geminiChatService as any;
      service.geminiClient = null;
      const result = service.initializeGemini();
      console.log('Reinitialization result:', result);
      return result;
    }
  };
}

export default geminiChatService;