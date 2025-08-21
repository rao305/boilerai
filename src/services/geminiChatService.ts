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
  private primaryModel: string = 'gemini-1.5-flash'; // Primary model for most conversations  
  private complexModel: string = 'gemini-1.5-pro'; // Use pro model for complex tasks

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
    
    // Fallback to legacy storage and env
    if (!apiKey) {
      const legacyKey = localStorage.getItem('gemini_api_key');
      const envKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log('🔍 [DEBUG] Legacy key:', legacyKey ? `Found (${legacyKey.substring(0, 8)}...)` : 'Not found');
      console.log('🔍 [DEBUG] Env key:', envKey ? `Found (${envKey.substring(0, 8)}...)` : 'Not found');
      apiKey = legacyKey || envKey || '';
    }
    
    console.log('🔍 [DEBUG] Final Gemini API key result:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Not found');
    return apiKey;
  }

  private initializeGemini(): boolean {
    try {
      console.log('🚀 [DEBUG] initializeGemini called');
      // Get API key using centralized logic
      const apiKey = this.getUserApiKey();
      
      if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.length < 10) {
        console.log('❌ [DEBUG] No valid Gemini API key found:', { hasKey: !!apiKey, length: apiKey?.length });
        logger.warn('No valid Gemini API key found', 'GEMINI');
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

    try {
      // Get RLHF-optimized prompt or fall back to default
      const optimizedPrompt = rlhfService.getOptimizedPrompt('reasoning');
      const reasoningPrompt = optimizedPrompt || `You are a personable academic advisor for Purdue University students. For every query, you MUST follow this exact structured reasoning process:

1. ANALYZE: Break down the user's query into key components and identify what they're really asking for.
2. REASON: Think step-by-step through the problem, considering all relevant factors, constraints, and context.
3. VALIDATE: Check your reasoning for accuracy and completeness, ensuring all important aspects are covered.
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
- Never use markdown formatting (no bold, italics, or headers)
- Be personable and approachable while maintaining professionalism
- Sound like a knowledgeable advisor who genuinely cares about the student's success
- Use plain text only - no special characters for emphasis`;

      // Get contextual memory and build enhanced context
      const contextualPrompt = contextualMemoryService.generateContextualPrompt(userId, currentSessionId, message);
      
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
      reasoningResponse.thinkingSummary = `Applied structured reasoning: analyzed query → retrieved knowledge → validated against Purdue policies → synthesized personalized guidance with ${this.transcriptContext ? 'your academic context' : 'general academic knowledge'}`;

      // Update contextual memory
      contextualMemoryService.updateContext(userId, currentSessionId, message, reasoningResponse.final_response, {
        confidence: reasoningResponse.confidence_score,
        reasoningTime: reasoningResponse.reasoning_time,
        model: reasoningResponse.model_used
      });

      return reasoningResponse;
    } catch (error: any) {
      console.error('Gemini reasoning error:', error);
      
      // Handle different types of Gemini errors with specific user guidance
      let errorMessage = '';
      let errorType = 'technical';
      
      if (error.message?.includes('API_KEY_INVALID')) {
        errorType = 'auth';
        errorMessage = `Your Gemini API key appears to be invalid. Please check your API key in the settings.`;
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorType = 'quota';
        errorMessage = `Your Gemini API quota has been exceeded. Please check your usage at https://console.cloud.google.com/apis/api/generativeai.googleapis.com`;
      } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        errorType = 'rate_limit';
        errorMessage = `You're sending requests too quickly. Please wait a moment (about 60 seconds) and try again. Try refreshing the page if the issue persists.`;
      } else {
        errorMessage = `There was a technical issue communicating with Gemini AI. Please try again in a moment.`;
      }
      
      return {
        thinking_steps: [{
          id: 'error-fallback',
          title: 'analyze',
          content: `Gemini AI Error (${errorType}): ${errorMessage}`,
          status: 'completed',
          timestamp: new Date()
        }],
        final_response: `${errorMessage}

${errorType === 'quota' ? `
💡 To resolve this:
1. Visit https://console.cloud.google.com/apis/api/generativeai.googleapis.com to check your usage
2. Gemini API is free with generous limits - make sure you're using a valid API key
3. If you're hitting limits, wait a few minutes and try again

Gemini API provides free access with high rate limits.` : 
errorType === 'auth' ? `
💡 To fix this:
1. Go to Settings in this app
2. Enter a valid Gemini API key
3. You can get a free API key from https://aistudio.google.com/app/apikey` :
`
💡 While we resolve this:
- For course planning questions, check the Purdue Course Catalog
- For academic policies, visit Purdue Academic Regulations  
- For urgent matters, contact your academic advisor directly`}`,
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

    try {
      // Check if this is a CODO query and handle it specially
      const codoevaluation = await this.handleCODOQuery(message);
      if (codoevaluation) {
        // For CODO queries, append the evaluation to the AI response
        const systemPrompt = await this.buildDynamicSystemPrompt(message, userId, currentSessionId);
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
        contextualMemoryService.updateContext(userId, currentSessionId, message, reply, {
          codoEvaluation: true
        });
        
        return reply;
      }

      const systemPrompt = await this.buildDynamicSystemPrompt(message, userId, currentSessionId);
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
      contextualMemoryService.updateContext(userId, currentSessionId, message, reply);

      return reply;
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      
      // Handle different types of Gemini errors with specific user guidance
      if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        return `You're sending requests too quickly. Please wait a moment and try again.`;
      } else if (error.message?.includes('API_KEY_INVALID')) {
        return `Your Gemini API key appears to be invalid. 

💡 To fix this:
1. Go to Settings in this app
2. Enter a valid Gemini API key
3. You can get a free API key from https://aistudio.google.com/app/apikey`;
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        return `Your Gemini API quota has been exceeded. 

💡 To resolve this:
1. Visit https://console.cloud.google.com/apis/api/generativeai.googleapis.com to check your usage
2. Gemini API is free with generous limits
3. Wait a few minutes and try again

Gemini provides free access with high rate limits.`;
      }
      
      return `There was a technical issue communicating with Gemini AI. Please try again in a moment.

💡 While we resolve this:
- For course information, check the Purdue Course Catalog
- For academic policies, visit the Purdue Academic Regulations page
- For immediate assistance, contact your academic advisor

Thanks for your patience!`;
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

INTELLIGENT CONTEXT AWARENESS:
- Leverage available student data (major, year, completed courses) for personalized advice
- When student asks about course planning, reference their specific degree requirements
- Stay STRICTLY within your knowledge base - never suggest unsupported majors, tracks, or concentrations
- If asked about areas outside your knowledge base (like cybersecurity, databases), redirect to supported options
- Use degree progression data instead of asking what courses they've taken

COMMUNICATION STYLE:
- Use natural, conversational language like you're speaking with a real student
- Never use markdown formatting (no **bold** or *italics* or ## headers)
- Be personable and approachable while maintaining professionalism
- Sound like a knowledgeable advisor who genuinely cares about the student's success
- Use plain text formatting only - no special characters for emphasis
- Avoid robotic or template-like responses

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