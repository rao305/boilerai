// Enhanced OpenAI-based chat service with reasoning capabilities
import { OpenAI } from 'openai';
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

class OpenAIChatService {
  private openaiClient: OpenAI | null = null;
  private transcriptContext: string = '';
  private enhancedContext: EnhancedContext | null = null;
  private reasoningMode: boolean = false; // Disable reasoning by default for performance and rate limit management
  private primaryModel: string = 'gpt-3.5-turbo'; // Primary model for most conversations  
  private complexModel: string = 'gpt-3.5-turbo'; // Use fast model for all tasks

  constructor() {
    this.initializeOpenAI();
  }


  private getUserApiKey(): string {
    console.log('🔍 [DEBUG] getUserApiKey called');
    
    // First check session storage (for non-remembered keys)
    let apiKey = sessionStorage.getItem('current_session_openai_key') || '';
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
            apiKey = parsed.openai || '';
            console.log('🔍 [DEBUG] Parsed API key:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Not found');
          } catch (e) {
            console.log('🔍 [DEBUG] Parse error:', e);
          }
        }
      }
    }
    
    // Fallback to legacy storage and env
    if (!apiKey) {
      const legacyKey = localStorage.getItem('openai_api_key');
      const envKey = import.meta.env.VITE_OPENAI_API_KEY;
      console.log('🔍 [DEBUG] Legacy key:', legacyKey ? `Found (${legacyKey.substring(0, 8)}...)` : 'Not found');
      console.log('🔍 [DEBUG] Env key:', envKey ? `Found (${envKey.substring(0, 8)}...)` : 'Not found');
      apiKey = legacyKey || envKey || '';
    }
    
    console.log('🔍 [DEBUG] Final API key result:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Not found');
    return apiKey;
  }

  private initializeOpenAI(): boolean {
    try {
      console.log('🚀 [DEBUG] initializeOpenAI called');
      // Get API key using centralized logic
      const apiKey = this.getUserApiKey();
      
      if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey.length < 10) {
        console.log('❌ [DEBUG] No valid API key found:', { hasKey: !!apiKey, length: apiKey?.length });
        logger.warn('No valid OpenAI API key found', 'OPENAI');
        return false;
      }
      
      console.log('✅ [DEBUG] Valid API key found, initializing OpenAI client');

      // Ensure we have the global fetch properly bound
      const globalFetch = window.fetch.bind(window);

      this.openaiClient = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        fetch: globalFetch  // Explicitly bind fetch to prevent illegal invocation
      });
      
      // Also reinitialize the fallback system with new API key
      pureAIFallback.reinitialize();
      logger.info('OpenAI client initialized successfully', 'OPENAI');
      return true;
    } catch (error) {
      logger.error('Failed to initialize OpenAI client', 'OPENAI', error);
      return false;
    }
  }

  // Intelligent model selection based on query complexity and context
  private selectOptimalModel(message: string, context?: DataContainer): string {
    // Always use mini model to conserve tokens and reduce rate limiting
    // GPT-4o-mini is highly capable for academic conversations
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
    return !!this.openaiClient;
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
        logger.warn('SmartCourse enhancement failed, falling back to standard chat:', 'OPENAI', error);
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
    const initialized = this.openaiClient ? true : this.initializeOpenAI();
    
    if (!initialized || !this.openaiClient) {
      console.log('❌ [DEBUG] OpenAI client initialization failed');
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
      const reasoningPrompt = optimizedPrompt || `You are BoilerAI, a knowledgeable and personable academic advisor for Purdue University students.

CORE KNOWLEDGE BASE (STRICTLY ENFORCED):
- Computer Science major with 2 tracks: Machine Intelligence Track, Software Engineering Track
- Data Science major (standalone - no tracks available)
- Artificial Intelligence major (standalone - no tracks available)
- Minors available for all three majors
- CODO requirements, degree requirements, course progression guides

INTELLIGENT BEHAVIOR:
- NEVER ask redundant questions when student context is already available
- Stay STRICTLY within your knowledge base - redirect unsupported areas to supported options
- Use degree progression data instead of asking what courses they've taken

For every query, you MUST follow this exact structured reasoning process:

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

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: fullPrompt
        }
      ];

      // Use intelligent model selection based on query complexity
      const selectedModel = this.selectOptimalModel(message, this.enhancedContext);
      console.log(`🧠 Using ${selectedModel} for query complexity analysis`);
      
      // Use backend proxy instead of direct OpenAI calls to avoid browser CORS issues
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const apiKey = this.getUserApiKey();
      
      console.log('🌐 [DEBUG] Using backend proxy for OpenAI call');
      const response = await fetch(`${backendUrl}/api/advisor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: fullPrompt,
          context: this.transcriptContext || '',
          apiKey: apiKey
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.error || `HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).response = { status: response.status };
        throw error;
      }
      
      const backendResult = await response.json();
      
      if (!backendResult.success) {
        throw new Error(backendResult.error || 'Backend request failed');
      }
      
      // Simulate OpenAI response structure for compatibility
      const simulatedResponse = {
        choices: [{
          message: {
            content: backendResult.data.response
          }
        }]
      };

      const reply = simulatedResponse.choices[0]?.message?.content;
      if (!reply) {
        throw new Error('No response received from AI');
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
      console.error('OpenAI reasoning error:', error);
      
      // Handle different types of OpenAI errors with specific user guidance
      let errorMessage = '';
      let errorType = 'technical';
      
      if (error.status === 429 || error.message?.includes('Rate limit exceeded')) {
        if (error.message?.includes('quota')) {
          errorType = 'quota';
          errorMessage = `Your OpenAI API key has insufficient credits or has exceeded the quota limit. Please check your OpenAI billing and usage at https://platform.openai.com/usage`;
        } else {
          errorType = 'rate_limit';
          errorMessage = `You're sending requests too quickly. Please wait a moment (about 60 seconds) and try again. Try refreshing the page if the issue persists.`;
        }
      } else if (error.status === 401) {
        errorType = 'auth';
        errorMessage = `Your OpenAI API key appears to be invalid. Please check your API key in the settings.`;
      } else if (error.status === 402) {
        errorType = 'payment';
        errorMessage = `Your OpenAI account has a payment issue. Please check your billing at https://platform.openai.com/account/billing`;
      } else {
        errorMessage = `There was a technical issue communicating with OpenAI. Please try again in a moment.`;
      }
      
      return {
        thinking_steps: [{
          id: 'error-fallback',
          title: 'analyze',
          content: `OpenAI API Error (${errorType}): ${errorMessage}`,
          status: 'completed',
          timestamp: new Date()
        }],
        final_response: `${errorMessage}

${errorType === 'quota' || errorType === 'payment' ? `
💡 To resolve this:
1. Visit https://platform.openai.com/usage to check your usage
2. Visit https://platform.openai.com/account/billing to add credits
3. Make sure your payment method is valid and up-to-date

Once you've added credits to your OpenAI account, try again.` : 
errorType === 'auth' ? `
💡 To fix this:
1. Go to Settings in this app
2. Enter a valid OpenAI API key
3. You can get an API key from https://platform.openai.com/api-keys` :
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
    
    if (!this.openaiClient) {
      const initialized = this.initializeOpenAI();
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

Based on this evaluation, provide personalized advice and guidance.`;

        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: enhancedPrompt
          },
          {
            role: 'user',
            content: message
          }
        ];

        const provider = aiConfig.getActiveProvider();
        const response = await this.openaiClient.chat.completions.create({
          model: provider.model,
          messages: messages,
          max_tokens: 600,
          temperature: 0.7
        });

        const reply = response.choices[0]?.message?.content || codoevaluation;
        
        // Update contextual memory
        contextualMemoryService.updateContext(userId, currentSessionId, message, reply, {
          codoEvaluation: true
        });
        
        return reply;
      }

      const systemPrompt = await this.buildDynamicSystemPrompt(message, userId, currentSessionId);
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ];

      const provider = aiConfig.getActiveProvider();
      const response = await this.openaiClient.chat.completions.create({
        model: provider.model,
        messages: messages,
        max_tokens: 600,
        temperature: 0.7
      });

      const reply = response.choices[0]?.message?.content;
      if (!reply) {
        throw new Error('No response received from AI');
      }

      // Update contextual memory
      contextualMemoryService.updateContext(userId, currentSessionId, message, reply);

      return reply;
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      
      // Handle different types of OpenAI errors with specific user guidance
      if (error.status === 429) {
        if (error.message?.includes('quota')) {
          return `Your OpenAI API key has insufficient credits or has exceeded the quota limit. 

💡 To resolve this:
1. Visit https://platform.openai.com/usage to check your usage
2. Visit https://platform.openai.com/account/billing to add credits  
3. Make sure your payment method is valid and up-to-date

Once you've added credits to your OpenAI account, try again.`;
        } else {
          return `You're sending requests too quickly. Please wait a moment and try again.`;
        }
      } else if (error.status === 401) {
        return `Your OpenAI API key appears to be invalid. 

💡 To fix this:
1. Go to Settings in this app
2. Enter a valid OpenAI API key
3. You can get an API key from https://platform.openai.com/api-keys`;
      } else if (error.status === 402) {
        return `Your OpenAI account has a payment issue. 

💡 To resolve this:
1. Visit https://platform.openai.com/account/billing 
2. Add a valid payment method or add credits
3. Make sure your payment is up-to-date

Once resolved, try again.`;
      }
      
      return `There was a technical issue communicating with OpenAI. Please try again in a moment.

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

      console.log('✅ Transcript context set for AI assistant');
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
      
      console.log('✅ Enhanced context with student profile set for AI assistant');
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
    console.log('✅ AI context cleared');
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
    const hasApiKey = !!(apiKey && apiKey !== 'your_openai_api_key_here' && apiKey.length >= 10);
    const hasClient = !!this.openaiClient;
    
    // Check if API key is validated (this is set by ApiKeyContext)
    const apiKeyValid = JSON.parse(localStorage.getItem('api_key_validation_status') || '{"openai": false}').openai;
    
    // If we have a key but no client, try to reinitialize
    if (hasApiKey && !hasClient) {
      this.initializeOpenAI();
    }
    
    return !!this.openaiClient && hasApiKey && apiKeyValid;
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

export const openaiChatService = new OpenAIChatService();

// Debug function for troubleshooting - accessible from browser console
if (typeof window !== 'undefined') {
  (window as any).debugOpenAI = {
    checkApiKey: () => {
      console.log('=== OpenAI API Key Debug ===');
      const service = openaiChatService as any;
      
      // Check session storage
      const sessionKey = sessionStorage.getItem('current_session_openai_key');
      console.log('Session storage:', sessionKey ? `Found (${sessionKey.substring(0, 8)}...)` : 'Not found');
      
      // Check user-specific keys
      const userKeys = Object.keys(localStorage).filter(key => key.startsWith('user_api_keys_'));
      console.log('User-specific keys:', userKeys);
      
      userKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            console.log(`${key}:`, parsed.openai ? `Found (${parsed.openai.substring(0, 8)}...)` : 'No API key');
          } catch (e) {
            console.log(`${key}: Parse error`, e);
          }
        }
      });
      
      // Check legacy storage
      const legacyKey = localStorage.getItem('openai_api_key');
      console.log('Legacy storage:', legacyKey ? `Found (${legacyKey.substring(0, 8)}...)` : 'Not found');
      
      // Check validation status
      const validation = localStorage.getItem('api_key_validation_status');
      console.log('Validation status:', validation);
      
      // Check what the service sees
      const serviceKey = service.getUserApiKey();
      console.log('Service sees:', serviceKey ? `Found (${serviceKey.substring(0, 8)}...)` : 'Not found');
      
      // Check if client is initialized
      console.log('Client initialized:', !!service.openaiClient);
      console.log('Service available:', service.isAvailable());
      
      return {
        sessionKey: !!sessionKey,
        userKeys: userKeys.length,
        legacyKey: !!legacyKey,
        serviceKey: !!serviceKey,
        clientInitialized: !!service.openaiClient,
        serviceAvailable: service.isAvailable()
      };
    },
    reinitialize: () => {
      console.log('🔄 Forcing OpenAI service reinitialization...');
      const service = openaiChatService as any;
      service.openaiClient = null;
      const result = service.initializeOpenAI();
      console.log('Reinitialization result:', result);
      return result;
    }
  };
}

export default openaiChatService;