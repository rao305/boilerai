const axios = require('axios');
const { logger } = require('../utils/logger');
const contextualAIService = require('./contextualAIService');

/**
 * Unified AI Service that detects API key type and routes to appropriate provider
 * Supports both OpenAI (sk-*) and Gemini (AI*) API keys
 */

class UnifiedAIService {
  constructor() {
    this.providers = {
      openai: {
        baseURL: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        formatRequest: this.formatOpenAIRequest.bind(this),
        formatResponse: this.formatOpenAIResponse.bind(this)
      },
      gemini: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
        formatRequest: this.formatGeminiRequest.bind(this),
        formatResponse: this.formatGeminiResponse.bind(this)
      }
    };
  }

  /**
   * Detect API key type based on prefix
   * @param {string} apiKey - The API key to analyze
   * @returns {string|null} - 'openai', 'gemini', or null if unknown
   */
  detectApiKeyType(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return null;
    }

    // OpenAI keys start with 'sk-'
    if (apiKey.startsWith('sk-')) {
      return 'openai';
    }

    // Gemini keys start with 'AI' followed by alphanumeric characters
    if (apiKey.match(/^AI[a-zA-Z0-9_-]+$/)) {
      return 'gemini';
    }

    // Could be other patterns for Gemini keys
    if (apiKey.length > 30 && apiKey.includes('AI')) {
      return 'gemini';
    }

    return null;
  }

  /**
   * Generate structured academic advice response
   * @param {string} prompt - The prompt to send
   * @param {string} apiKey - The API key
   * @param {Object} options - Additional options (userId, sessionId, studentContext)
   * @returns {Promise<string>} - The structured AI response
   */
  async generateContextualResponse(prompt, apiKey, options = {}) {
    // PRIORITY 1: Try knowledge base first for academic queries
    if (this.isAcademicQuery(prompt)) {
      try {
        logger.info('Academic query detected, trying knowledge base first', { prompt: prompt.substring(0, 100) });
        const knowledgeResponse = await this.generateRAGResponse(prompt, null, {}, apiKey);
        
        // If knowledge base has high confidence, use it
        if (knowledgeResponse.confidence >= 0.7) {
          logger.info('Knowledge base response with high confidence', { confidence: knowledgeResponse.confidence });
          return knowledgeResponse.answer;
        }
        
        // If medium confidence, enhance with contextual advisor
        if (knowledgeResponse.confidence >= 0.5 && (options.userId || options.studentContext)) {
          logger.info('Medium confidence knowledge base, enhancing with contextual advisor', { confidence: knowledgeResponse.confidence });
          try {
            const contextualResponse = await contextualAIService.generateContextualAdvice(
              prompt,
              options.userId || 'anonymous',
              options.sessionId,
              options.studentContext || {}
            );
            
            // Combine knowledge base facts with contextual formatting
            return this.combineKnowledgeWithContext(knowledgeResponse, contextualResponse);
          } catch (contextError) {
            logger.warn('Contextual advisor failed, using knowledge base response', { error: contextError.message });
            return knowledgeResponse.answer;
          }
        }
        
        logger.info('Knowledge base response with lower confidence, falling back to AI', { confidence: knowledgeResponse.confidence });
        
      } catch (knowledgeError) {
        logger.warn('Knowledge base failed, trying contextual advisor', { error: knowledgeError.message });
      }
    }

    // PRIORITY 2: Use contextual advisor for academic queries
    if (this.isAcademicQuery(prompt) && (options.userId || options.studentContext)) {
      try {
        const contextualResponse = await contextualAIService.generateContextualAdvice(
          prompt,
          options.userId || 'anonymous',
          options.sessionId,
          options.studentContext || {}
        );
        
        // Enhance with AI if available and confidence is low
        if (apiKey && options.enhanceWithAI !== false) {
          return await this.enhanceContextualResponse(contextualResponse, prompt, apiKey);
        }
        
        return contextualResponse;
      } catch (error) {
        logger.warn('Contextual advisor failed, falling back to standard AI', { error: error.message });
        // Fallback to standard AI generation
      }
    }

    // PRIORITY 3: Fallback to standard AI generation
    return this.generateResponse(prompt, apiKey, options);
  }

  /**
   * Check if query is academic advising related
   */
  isAcademicQuery(prompt) {
    const academicKeywords = [
      'course', 'class', 'semester', 'graduation', 'major', 'track', 'cs', 
      'computer science', 'degree', 'credit', 'prerequisite', 'schedule',
      'advisor', 'academic', 'plan', 'requirement', 'transcript', 'data science',
      'artificial intelligence', 'ai', 'elective', 'codo', 'change major'
    ];
    const promptLower = prompt.toLowerCase();
    return academicKeywords.some(keyword => promptLower.includes(keyword));
  }

  /**
   * Combine knowledge base facts with contextual advisor formatting
   */
  combineKnowledgeWithContext(knowledgeResponse, contextualResponse) {
    // Use the knowledge base facts as the primary content
    let combinedResponse = knowledgeResponse.answer;
    
    // Add contextual insights if available and different
    if (contextualResponse && contextualResponse !== knowledgeResponse.answer) {
      combinedResponse += '\n\n**Additional Context:**\n';
      combinedResponse += contextualResponse.replace(/^.*?here('s what I|are my) recommend.*?\n\n/i, '');
    }
    
    return combinedResponse;
  }

  /**
   * Enhance contextual response with AI if needed
   */
  async enhanceContextualResponse(contextualResponse, originalPrompt, apiKey) {
    const provider = this.detectApiKeyType(apiKey);
    if (!provider) return contextualResponse;

    const systemPrompt = `You are enhancing an academic advisor response. Keep the structured format but add personality, warmth, and contextual details. The response should sound natural and helpful while maintaining all factual information.

Original query: "${originalPrompt}"`;

    const prompt = `Please enhance this academic advisor response to be more natural and engaging while keeping all course recommendations, credits, and factual details exactly the same:

${contextualResponse}

Make it sound more conversational and personable while maintaining the structure and accuracy.`;

    try {
      const options = {
        systemPrompt,
        maxTokens: 600,
        temperature: 0.4
      };

      return await this.generateResponse(prompt, apiKey, options);
    } catch (error) {
      logger.warn('AI enhancement failed, returning original contextual response', { error: error.message });
      return contextualResponse;
    }
  }

  /**
   * Generate AI response using the appropriate provider
   * @param {string} prompt - The prompt to send
   * @param {string} apiKey - The API key
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - The AI response
   */
  async generateResponse(prompt, apiKey, options = {}) {
    const provider = this.detectApiKeyType(apiKey);
    
    if (!provider) {
      throw new Error('Invalid or unsupported API key format. Please provide either an OpenAI key (sk-*) or a Gemini key (AI*).');
    }

    const providerConfig = this.providers[provider];
    
    try {
      logger.info(`Using ${provider} provider for AI generation`, { provider, promptLength: prompt.length });
      
      const requestData = providerConfig.formatRequest(prompt, options);
      const response = await this.makeRequest(provider, apiKey, requestData, options);
      
      return providerConfig.formatResponse(response);
    } catch (error) {
      logger.error(`${provider} API error`, { 
        provider, 
        error: error.message, 
        status: error.response?.status 
      });
      
      throw this.formatError(provider, error);
    }
  }

  /**
   * Format OpenAI request
   */
  formatOpenAIRequest(prompt, options = {}) {
    return {
      model: options.model || this.providers.openai.model,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a helpful AI assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature || 0.3
    };
  }

  /**
   * Format Gemini request
   */
  formatGeminiRequest(prompt, options = {}) {
    const systemPrompt = options.systemPrompt || 'You are a helpful AI assistant.';
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
    
    return {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.3,
        maxOutputTokens: options.maxTokens || 800,
        topP: 0.8,
        topK: 10
      }
    };
  }

  /**
   * Format OpenAI response
   */
  formatOpenAIResponse(response) {
    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * Format Gemini response
   */
  formatGeminiResponse(response) {
    return response.data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * Make HTTP request to the appropriate provider
   */
  async makeRequest(provider, apiKey, requestData, options = {}) {
    const providerConfig = this.providers[provider];
    let url = providerConfig.baseURL;
    let headers = {
      'Content-Type': 'application/json'
    };

    // Provider-specific configurations
    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['User-Agent'] = 'BoilerAI/2.0';
    } else if (provider === 'gemini') {
      url = `${url}?key=${apiKey}`;
    }

    return await axios.post(url, requestData, {
      headers,
      timeout: options.timeout || 15000
    });
  }

  /**
   * Format error messages for different providers
   */
  formatError(provider, error) {
    const status = error.response?.status;
    const message = error.response?.data?.error?.message || error.message;

    if (provider === 'openai') {
      if (status === 401) {
        return new Error('Invalid OpenAI API key. Please check your API key in settings.');
      } else if (status === 429) {
        return new Error('OpenAI rate limit exceeded. Please wait a moment and try again.');
      } else if (status === 403) {
        return new Error('OpenAI API access denied. Please check your API key permissions.');
      }
    } else if (provider === 'gemini') {
      if (status === 400 && message?.includes('API_KEY_INVALID')) {
        return new Error('Invalid Gemini API key. Please check your API key in settings.');
      } else if (status === 429) {
        return new Error('Gemini rate limit exceeded. Please wait a moment and try again.');
      } else if (message?.includes('QUOTA_EXCEEDED')) {
        return new Error('Gemini API quota exceeded. Please check your usage limits.');
      }
    }

    return new Error(`${provider} API error: ${message}`);
  }

  /**
   * Generate contextual fallback response for rate limiting
   */
  async generateFallbackResponse(message, userProfile, apiKey) {
    try {
      const provider = this.detectApiKeyType(apiKey);
      if (!provider) {
        return this.getStaticFallback(message, userProfile);
      }

      const systemPrompt = `You are experiencing high demand. Generate a brief, contextual response based on the user's message type and profile. Be helpful and personable while explaining the temporary limitation.`;
      
      const prompt = `User message: "${message}"
User profile: ${JSON.stringify(userProfile || {})}

Generate a brief, helpful response acknowledging the high demand and providing immediate guidance.`;

      const options = {
        systemPrompt,
        maxTokens: 200,
        temperature: 0.5,
        timeout: 5000 // Shorter timeout for fallback
      };

      return await this.generateResponse(prompt, apiKey, options);
    } catch (error) {
      logger.warn('Fallback response generation failed', { error: error.message });
      return this.getStaticFallback(message, userProfile);
    }
  }

  /**
   * Static fallback when AI is completely unavailable
   */
  getStaticFallback(message, userProfile) {
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'there';
    const messageClean = message.toLowerCase();
    
    if (messageClean.includes('course') || messageClean.includes('class')) {
      return `Hi ${firstName}! I'm experiencing high demand right now, but I can help! For course information, you can check the Purdue Course Catalog or ask me again in a moment.`;
    }
    
    if (messageClean.includes('major') || messageClean.includes('degree')) {
      return `Hi ${firstName}! I'm currently at capacity, but for degree-related questions, you can visit academic advising or try asking me again shortly.`;
    }
    
    if (messageClean.includes('graduation') || messageClean.includes('graduate')) {
      return `Hi ${firstName}! While I'm experiencing high demand, for graduation planning, I recommend checking with your academic advisor. Try me again in a few moments!`;
    }
    
    return `Hi ${firstName}! I'm experiencing high demand right now. For immediate help, check Purdue academic resources. Please try your question again in a moment!`;
  }

  /**
   * Generate AI-powered academic plan
   */
  async generateAcademicPlan(user, preferences, constraints, apiKey) {
    const provider = this.detectApiKeyType(apiKey);
    if (!provider) {
      throw new Error('Valid API key required for AI-powered planning');
    }

    const systemPrompt = `You are an expert Purdue University academic advisor. Generate practical, realistic academic plans in valid JSON format.`;
    
    const prompt = `Generate a detailed academic plan for a Purdue University ${user.major || 'Computer Science'} student.

Student Context:
- Current Year: ${user.currentYear || 'Not specified'}
- Expected Graduation: ${user.expectedGraduationYear || 'Not specified'}
- Preferences: ${JSON.stringify(preferences)}
- Constraints: ${JSON.stringify(constraints)}

Generate a realistic semester-by-semester plan with:
1. Appropriate course sequences
2. Prerequisites respect
3. Credit hour balance (12-18 per semester)
4. Core requirements coverage
5. Graduation timeline

Return as JSON with: { semesters: [...], graduationDate: "...", totalCredits: number, notes: "..." }`;

    const options = {
      systemPrompt,
      maxTokens: 800,
      temperature: 0.3
    };

    const response = await this.generateResponse(prompt, apiKey, options);
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      return {
        semesters: [{
          term: `Fall ${new Date().getFullYear()}`,
          courses: ['AI-Generated Course Plan'],
          credits: 15,
          notes: 'AI-generated plan - please review with advisor'
        }],
        graduationDate: user.expectedGraduationYear || 'TBD',
        totalCredits: 128,
        notes: 'Plan generated by AI - please review with academic advisor'
      };
    }
  }

  /**
   * Generate AI-powered degree audit
   */
  async generateDegreeAudit(user, apiKey) {
    const provider = this.detectApiKeyType(apiKey);
    if (!provider) {
      throw new Error('Valid API key required for AI-powered audit');
    }

    const systemPrompt = `You are a Purdue University registrar system. Generate realistic degree audits in valid JSON format.`;
    
    const prompt = `Generate a degree audit analysis for a Purdue University ${user.major || 'Computer Science'} student.

Student Info:
- Major: ${user.major || 'Computer Science'}
- Current Year: ${user.currentYear || 'Not specified'}
- Expected Graduation: ${user.expectedGraduationYear || 'Not specified'}

Provide realistic audit with:
1. Completed requirements estimation
2. Remaining requirements 
3. Credit progress
4. On-track status assessment
5. Recommendations

Return as JSON: { completed: {...}, remaining: {...}, onTrack: boolean, recommendations: [...] }`;

    const options = {
      systemPrompt,
      maxTokens: 600,
      temperature: 0.2
    };

    const response = await this.generateResponse(prompt, apiKey, options);
    
    try {
      return JSON.parse(response);
    } catch (parseError) {
      return {
        completed: {
          core: ['AI analysis pending'],
          electives: ['Review in progress'],
          totalCredits: 0
        },
        remaining: {
          core: ['AI analysis in progress'],
          electives: ['Under review'],
          totalCredits: 128
        },
        onTrack: true,
        recommendations: ['Upload transcript for detailed analysis']
      };
    }
  }

  /**
   * Generate personalized transcript upload prompt
   */
  async generateTranscriptPrompt(userProfile, message, apiKey) {
    try {
      const provider = this.detectApiKeyType(apiKey);
      if (!provider) {
        return this.getStaticTranscriptPrompt(userProfile, message);
      }

      const systemPrompt = `Generate a personalized, encouraging prompt to upload a transcript based on the user's profile and question. Be brief and compelling.`;
      
      const prompt = `User profile: ${JSON.stringify(userProfile)}
User message: "${message}"

Generate a brief, personalized prompt encouraging transcript upload for better academic advice.`;

      const options = {
        systemPrompt,
        maxTokens: 150,
        temperature: 0.4
      };

      return await this.generateResponse(prompt, apiKey, options);
    } catch (error) {
      logger.warn('Transcript prompt generation failed', { error: error.message });
      return this.getStaticTranscriptPrompt(userProfile, message);
    }
  }

  /**
   * Static transcript prompt fallback
   */
  getStaticTranscriptPrompt(userProfile, message) {
    const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'there';
    const major = userProfile?.major || 'your major';
    const messageClean = message.toLowerCase();
    
    if (messageClean.includes('graduate') || messageClean.includes('graduation')) {
      return `Hey ${firstName}! For precise graduation planning in ${major}, uploading your transcript would help me give you exact credit counts and timeline recommendations. It's secure and takes just a moment!`;
    }
    
    if (messageClean.includes('course') || messageClean.includes('next semester')) {
      return `Hi ${firstName}! To recommend the perfect courses for your ${major} journey, I'd love to see your transcript. It helps me understand exactly where you are and what's next. Upload is quick and secure!`;
    }
    
    if (messageClean.includes('requirement') || messageClean.includes('credit')) {
      return `${firstName}, for detailed requirement checking in ${major}, your transcript would let me give you precise answers about what you've completed and what's left. Secure upload available in the app!`;
    }
    
    return `For more personalized ${major} advice tailored to your exact progress, consider uploading your transcript - it's secure, quick, and helps me give you spot-on recommendations!`;
  }

  /**
   * Generate RAG response using real knowledge base data
   */
  async generateRAGResponse(query, context, filters, apiKey) {
    const knowledgeService = require('./knowledgeRetrievalService');
    
    try {
      // First, try to get information from real knowledge base
      const knowledgeResult = await knowledgeService.processRAGQuery(query, context, filters);
      
      // If we have high confidence in the knowledge base result, return it
      if (knowledgeResult.confidence >= 0.7) {
        return knowledgeResult;
      }
      
      // For low confidence results, enhance with AI if API key is available
      const provider = this.detectApiKeyType(apiKey);
      if (provider && knowledgeResult.confidence < 0.7) {
        return await this.enhanceWithAI(knowledgeResult, query, apiKey);
      }
      
      // Return knowledge base result even if confidence is lower
      return knowledgeResult;
      
    } catch (error) {
      logger.error('Knowledge base RAG failed, falling back to AI generation', { error: error.message });
      
      // Fallback to AI generation only if knowledge base completely fails
      const provider = this.detectApiKeyType(apiKey);
      if (!provider) {
        throw new Error('Knowledge base unavailable and no valid API key provided for fallback');
      }
      
      return await this.generateAIFallbackResponse(query, context, filters, apiKey);
    }
  }

  /**
   * Enhance knowledge base results with AI context and formatting
   */
  async enhanceWithAI(knowledgeResult, originalQuery, apiKey) {
    const provider = this.detectApiKeyType(apiKey);
    if (!provider) {
      return knowledgeResult;
    }

    const systemPrompt = `You are enhancing academic information with additional context and clarity. The user asked: "${originalQuery}"

You have access to official information, but it may need clarification or additional context. Enhance the response while staying factual.`;
    
    const prompt = `Based on this official information about Purdue University:

${knowledgeResult.answer}

User's original question: "${originalQuery}"

Please enhance this response by:
1. Adding helpful context or clarification
2. Organizing information more clearly if needed  
3. Addressing any specific aspects of the user's question that weren't fully covered
4. Adding practical advice or next steps

Keep all factual information exactly as provided. Only add helpful context and organization.`;

    const options = {
      systemPrompt,
      maxTokens: 500,
      temperature: 0.2
    };

    try {
      const enhancedAnswer = await this.generateResponse(prompt, apiKey, options);
      
      return {
        ...knowledgeResult,
        answer: enhancedAnswer,
        confidence: Math.min(knowledgeResult.confidence + 0.1, 0.95),
        enhanced_by_ai: true
      };
    } catch (error) {
      logger.warn('AI enhancement failed, returning original knowledge base result', { error: error.message });
      return knowledgeResult;
    }
  }

  /**
   * Fallback AI generation when knowledge base is unavailable
   */
  async generateAIFallbackResponse(query, context, filters, apiKey) {
    const systemPrompt = `You are a Purdue University academic information assistant. Provide helpful responses but clearly indicate when information should be verified with official sources.`;
    
    const prompt = `User query: "${query}"
Context: ${context || 'None provided'}

Provide helpful information about Purdue University academics, but include a disclaimer that the user should verify important details with official university sources.`;

    const options = {
      systemPrompt,
      maxTokens: 400,
      temperature: 0.3
    };

    const response = await this.generateResponse(prompt, apiKey, options);
    
    return {
      sources: [
        {
          id: "ai-fallback",
          title: "AI Assistant Response",
          excerpt: "AI-generated response - please verify with official sources",
          relevance: 0.6
        }
      ],
      answer: response + "\n\n*Note: This information was generated by AI. Please verify important details with official Purdue University sources.*",
      confidence: 0.6,
      fallback_mode: true
    };
  }

  /**
   * Generate dynamic knowledge sources using real data
   */
  async generateKnowledgeSources(apiKey) {
    try {
      const knowledgeService = require('./knowledgeRetrievalService');
      return knowledgeService.getKnowledgeSources();
    } catch (error) {
      logger.warn('Real knowledge sources unavailable, using static fallback', { error: error.message });
      return this.getStaticKnowledgeSources();
    }
  }

  /**
   * Static knowledge sources fallback
   */
  getStaticKnowledgeSources() {
    return [
      {
        id: "purdue-catalog-current",
        name: "Purdue Course Catalog (Current)",
        type: "official",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: 1200
      },
      {
        id: "cs-handbook-current",
        name: "Computer Science Student Handbook",
        type: "department",
        lastUpdated: new Date().toISOString().split('T')[0],
        documentCount: 150
      }
    ];
  }

  /**
   * Generate AI-powered course data
   */
  async generateCourseData(filters = {}, apiKey) {
    try {
      const provider = this.detectApiKeyType(apiKey);
      if (!provider) {
        return this.getStaticCourseData();
      }

      const systemPrompt = `Generate realistic Purdue University course data in valid JSON format. Focus on Computer Science and related courses.`;
      
      const prompt = `Generate realistic Purdue University course data for academic planning.

Filters: ${JSON.stringify(filters)}

Generate courses with:
- Computer Science (CS) courses
- Mathematics (MA) courses  
- General education requirements
- Prerequisites chains
- Realistic credit hours (1-4)
- Course descriptions
- Appropriate course numbering

Return as JSON array: [{
  id: "subject + number",
  subject: "CS/MA/etc",
  courseNumber: "number",
  title: "course title",
  credits: number,
  description: "description",
  prerequisites: ["course codes"],
  level: "UG"
}]

Generate 8-12 courses covering different levels and requirements.`;

      const options = {
        systemPrompt,
        maxTokens: 1000,
        temperature: 0.3
      };

      const response = await this.generateResponse(prompt, apiKey, options);
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Course data generation failed', { error: error.message });
      return this.getStaticCourseData();
    }
  }

  /**
   * Static course data fallback
   */
  getStaticCourseData() {
    return [
      {
        id: 'cs18000',
        subject: 'CS',
        courseNumber: '18000',
        title: 'Problem Solving and Object-Oriented Programming',
        credits: 4,
        description: 'Introduction to programming concepts and problem solving',
        prerequisites: [],
        level: 'UG'
      }
    ];
  }

  /**
   * Search courses using AI
   */
  async searchCoursesWithAI(searchTerm, apiKey) {
    try {
      const provider = this.detectApiKeyType(apiKey);
      if (!provider) {
        return [];
      }

      const systemPrompt = `You are a Purdue University course search system. Generate relevant course results in JSON format.`;
      
      const prompt = `Find Purdue University courses related to: "${searchTerm}"

Generate realistic courses that match this search term, focusing on:
- Computer Science and related subjects
- Mathematics and supporting courses
- Prerequisites and course sequences
- Relevant to the search term

Return as JSON array with course objects following this structure:
[{
  id: "subject + number",
  subject: "subject code",
  courseNumber: "number", 
  title: "course title",
  credits: number,
  description: "description",
  prerequisites: ["prerequisites"],
  level: "UG",
  relevance: number (0-1)
}]

Limit to 6 most relevant courses.`;

      const options = {
        systemPrompt,
        maxTokens: 800,
        temperature: 0.4
      };

      const response = await this.generateResponse(prompt, apiKey, options);
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Course search failed', { error: error.message });
      return [{
        id: 'search-result-1',
        subject: 'CS',
        courseNumber: '00000',
        title: `Search Result for "${searchTerm}"`,
        credits: 3,
        description: 'AI-generated search result. Please verify with official catalog.',
        prerequisites: [],
        level: 'UG',
        relevance: 0.8
      }];
    }
  }
}

module.exports = new UnifiedAIService();