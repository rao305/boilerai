interface ConversationContext {
  userId: string;
  sessionId: string;
  topics: string[];
  currentTopic: string;
  academicContext: boolean;
  studentProfile?: any;
  conversationHistory: ConversationTurn[];
  preferences: UserPreferences;
  lastActivity: Date;
}

interface ConversationTurn {
  id: string;
  query: string;
  response: string;
  topic: string;
  timestamp: Date;
  confidence: number;
  helpful?: boolean; // User feedback
}

interface UserPreferences {
  communicationStyle: 'formal' | 'casual' | 'adaptive';
  detailLevel: 'brief' | 'moderate' | 'comprehensive';
  focusAreas: string[];
  academicYear: string;
  major?: string;
  goals?: string[];
}

interface TopicTransition {
  fromTopic: string;
  toTopic: string;
  transitionType: 'natural' | 'abrupt' | 'user-directed';
  confidence: number;
}

class ContextualMemoryService {
  private contexts: Map<string, ConversationContext> = new Map();
  private topicClassifier: Map<string, string[]> = new Map([
    ['academic', ['course', 'grade', 'transcript', 'gpa', 'major', 'degree', 'advisor', 'graduation', 'codo', 'semester']],
    ['career', ['job', 'internship', 'interview', 'resume', 'linkedin', 'career', 'professional', 'industry', 'salary', 'company']],
    ['social', ['friend', 'social', 'club', 'organization', 'activity', 'event', 'campus', 'dorm', 'housing']],
    ['personal', ['stress', 'mental health', 'wellness', 'balance', 'time management', 'motivation', 'goals', 'plans']],
    ['technical', ['programming', 'coding', 'software', 'algorithm', 'data structure', 'computer', 'technology', 'web', 'app']],
    ['general', ['help', 'question', 'information', 'explain', 'what', 'how', 'why', 'when', 'where']]
  ]);

  constructor() {
    this.loadContextsFromStorage();
  }

  // Initialize or get existing context for a user session
  getOrCreateContext(userId: string, sessionId: string): ConversationContext {
    const contextKey = `${userId}:${sessionId}`;
    
    if (this.contexts.has(contextKey)) {
      const context = this.contexts.get(contextKey)!;
      context.lastActivity = new Date();
      return context;
    }

    const newContext: ConversationContext = {
      userId,
      sessionId,
      topics: [],
      currentTopic: 'general',
      academicContext: false,
      conversationHistory: [],
      preferences: this.getDefaultPreferences(),
      lastActivity: new Date()
    };

    this.contexts.set(contextKey, newContext);
    this.saveContextsToStorage();
    return newContext;
  }

  // Update context with new conversation turn
  updateContext(userId: string, sessionId: string, query: string, response: string, metadata?: any): void {
    const context = this.getOrCreateContext(userId, sessionId);
    
    const topic = this.classifyTopic(query);
    const confidence = this.calculateConfidence(query, response);
    
    const conversationTurn: ConversationTurn = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query,
      response,
      topic,
      timestamp: new Date(),
      confidence,
      helpful: metadata?.helpful
    };

    // Add to history
    context.conversationHistory.push(conversationTurn);
    
    // Update topics and detect transitions
    if (topic !== context.currentTopic) {
      const transition: TopicTransition = {
        fromTopic: context.currentTopic,
        toTopic: topic,
        transitionType: this.detectTransitionType(context.currentTopic, topic, query),
        confidence: confidence
      };
      
      console.log(`📝 Topic transition: ${transition.fromTopic} → ${transition.toTopic} (${transition.transitionType})`);
      context.currentTopic = topic;
    }

    // Update topic frequency
    if (!context.topics.includes(topic)) {
      context.topics.push(topic);
    }

    // Update academic context flag
    context.academicContext = topic === 'academic' || this.hasAcademicContent(query);
    
    // Trim history to last 50 turns for performance
    if (context.conversationHistory.length > 50) {
      context.conversationHistory = context.conversationHistory.slice(-50);
    }

    context.lastActivity = new Date();
    this.saveContextsToStorage();
  }

  // Set student profile for enhanced context
  setStudentProfile(userId: string, sessionId: string, studentProfile: any): void {
    const context = this.getOrCreateContext(userId, sessionId);
    context.studentProfile = studentProfile;
    context.academicContext = true;
    context.preferences.academicYear = studentProfile.performanceMetrics?.yearLevel || 'Unknown';
    
    // Update focus areas based on student strengths
    if (studentProfile.academicStrengths) {
      context.preferences.focusAreas = studentProfile.academicStrengths.slice(0, 3);
    }
    
    this.saveContextsToStorage();
    console.log(`🎓 Student profile integrated for ${userId}:${sessionId}`);
  }

  // Generate contextual system prompt based on conversation history
  generateContextualPrompt(userId: string, sessionId: string, currentQuery: string): string {
    const context = this.getOrCreateContext(userId, sessionId);
    const recentHistory = context.conversationHistory.slice(-5); // Last 5 interactions
    
    let contextualPrompt = '';

    // Add conversation context
    if (recentHistory.length > 0) {
      contextualPrompt += `CONVERSATION CONTEXT:
Recent Topics: ${[...new Set(recentHistory.map(turn => turn.topic))].join(', ')}
Current Topic: ${context.currentTopic}
Academic Focus: ${context.academicContext ? 'Yes' : 'No'}

Recent Conversation:
${recentHistory.map(turn => 
  `- User: ${turn.query.substring(0, 100)}${turn.query.length > 100 ? '...' : ''}`
).join('\n')}

`;
    }

    // Add student profile context
    if (context.studentProfile) {
      contextualPrompt += `STUDENT PROFILE MEMORY:
- Year Level: ${context.studentProfile.performanceMetrics?.yearLevel}
- Overall GPA: ${context.studentProfile.gpa?.overall}
- Academic Strengths: ${context.studentProfile.academicStrengths?.join(', ')}
- Completion: ${context.studentProfile.majorProgress?.completionPercentage}%

`;
    }

    // Add preferences and adaptation
    contextualPrompt += `USER PREFERENCES:
- Communication Style: ${context.preferences.communicationStyle}
- Detail Level: ${context.preferences.detailLevel}
- Focus Areas: ${context.preferences.focusAreas.join(', ')}

CONTEXTUAL AWARENESS INSTRUCTIONS:
1. Maintain awareness of the ongoing conversation flow
2. Reference previous topics when relevant to current query
3. Adapt communication style based on user preferences
4. Smoothly transition between topics as conversation evolves
5. Use student profile data for personalized academic guidance
6. Remember context across the entire conversation session

`;

    return contextualPrompt;
  }

  // Smart context switching - determine when to shift focus
  shouldSwitchContext(userId: string, sessionId: string, newQuery: string): { shouldSwitch: boolean; reason: string; newTopic: string } {
    const context = this.getOrCreateContext(userId, sessionId);
    const newTopic = this.classifyTopic(newQuery);
    const currentTopic = context.currentTopic;

    if (newTopic === currentTopic) {
      return { shouldSwitch: false, reason: 'Same topic', newTopic: currentTopic };
    }

    // Detect strong topic indicators
    const strongIndicators = this.getStrongTopicIndicators(newQuery);
    if (strongIndicators.length > 0) {
      return { 
        shouldSwitch: true, 
        reason: `Strong indicators for ${newTopic}: ${strongIndicators.join(', ')}`, 
        newTopic 
      };
    }

    // Check for natural transitions
    const isNaturalTransition = this.isNaturalTopicTransition(currentTopic, newTopic, newQuery);
    if (isNaturalTransition) {
      return { 
        shouldSwitch: true, 
        reason: `Natural transition from ${currentTopic} to ${newTopic}`, 
        newTopic 
      };
    }

    // Stay in current context if transition seems forced
    return { 
      shouldSwitch: false, 
      reason: `Maintaining ${currentTopic} context`, 
      newTopic: currentTopic 
    };
  }

  // Update user feedback for continuous learning
  updateFeedback(userId: string, sessionId: string, turnId: string, helpful: boolean): void {
    const context = this.getOrCreateContext(userId, sessionId);
    const turn = context.conversationHistory.find(t => t.id === turnId);
    
    if (turn) {
      turn.helpful = helpful;
      
      // Adjust preferences based on feedback
      if (helpful) {
        // Positive feedback - reinforce current approach
        console.log(`👍 Positive feedback for ${turn.topic} conversation`);
      } else {
        // Negative feedback - adapt approach
        console.log(`👎 Negative feedback for ${turn.topic} conversation - adapting`);
        this.adaptPreferencesBasedOnFeedback(context, turn);
      }
      
      this.saveContextsToStorage();
    }
  }

  // Get conversation analytics for ELO integration
  getConversationAnalytics(userId: string, sessionId: string): any {
    const context = this.getOrCreateContext(userId, sessionId);
    
    const totalTurns = context.conversationHistory.length;
    const topicDistribution = this.calculateTopicDistribution(context.conversationHistory);
    const averageConfidence = this.calculateAverageConfidence(context.conversationHistory);
    const helpfulnessRate = this.calculateHelpfulnessRate(context.conversationHistory);

    return {
      totalTurns,
      topicDistribution,
      averageConfidence,
      helpfulnessRate,
      academicFocus: context.academicContext,
      currentTopic: context.currentTopic,
      sessionDuration: Date.now() - context.conversationHistory[0]?.timestamp.getTime() || 0
    };
  }

  // Private helper methods
  private classifyTopic(query: string): string {
    const queryLower = query.toLowerCase();
    let maxMatches = 0;
    let bestTopic = 'general';

    for (const [topic, keywords] of this.topicClassifier) {
      const matches = keywords.filter(keyword => queryLower.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestTopic = topic;
      }
    }

    return bestTopic;
  }

  private calculateConfidence(query: string, response: string): number {
    // Simple confidence calculation based on response length and keyword matching
    const responseQuality = Math.min(response.length / 500, 1); // Normalize to 0-1
    const topicAlignment = this.getTopicAlignmentScore(query, response);
    return (responseQuality * 0.4 + topicAlignment * 0.6) * 100;
  }

  private getTopicAlignmentScore(query: string, response: string): number {
    const queryTopic = this.classifyTopic(query);
    const responseTopic = this.classifyTopic(response);
    return queryTopic === responseTopic ? 1 : 0.6; // Partial credit for related topics
  }

  private detectTransitionType(fromTopic: string, toTopic: string, query: string): 'natural' | 'abrupt' | 'user-directed' {
    // Check for explicit transition indicators
    const transitionWords = ['now', 'instead', 'also', 'additionally', 'but', 'however', 'moving on'];
    const hasTransitionWords = transitionWords.some(word => query.toLowerCase().includes(word));
    
    if (hasTransitionWords) {
      return 'user-directed';
    }

    // Check for natural topic relationships
    const relatedTopics = {
      'academic': ['career', 'technical'],
      'career': ['academic', 'technical', 'social'],
      'technical': ['academic', 'career'],
      'social': ['personal', 'career'],
      'personal': ['social', 'academic']
    };

    const isRelated = relatedTopics[fromTopic]?.includes(toTopic);
    return isRelated ? 'natural' : 'abrupt';
  }

  private hasAcademicContent(query: string): boolean {
    const academicKeywords = this.topicClassifier.get('academic') || [];
    return academicKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  private getStrongTopicIndicators(query: string): string[] {
    const strongIndicators: { [topic: string]: string[] } = {
      'academic': ['transcript', 'gpa', 'codo', 'graduation', 'degree'],
      'career': ['job', 'internship', 'interview', 'salary'],
      'technical': ['programming', 'coding', 'algorithm', 'software'],
      'personal': ['stress', 'mental health', 'wellness']
    };

    const found: string[] = [];
    const queryLower = query.toLowerCase();

    for (const [topic, indicators] of Object.entries(strongIndicators)) {
      for (const indicator of indicators) {
        if (queryLower.includes(indicator)) {
          found.push(indicator);
        }
      }
    }

    return found;
  }

  private isNaturalTopicTransition(fromTopic: string, toTopic: string, query: string): boolean {
    // Define natural transition flows
    const naturalFlows: { [from: string]: string[] } = {
      'academic': ['career', 'technical', 'personal'],
      'career': ['academic', 'technical'],
      'technical': ['academic', 'career'],
      'general': ['academic', 'career', 'technical', 'social', 'personal']
    };

    return naturalFlows[fromTopic]?.includes(toTopic) || false;
  }

  private adaptPreferencesBasedOnFeedback(context: ConversationContext, turn: ConversationTurn): void {
    // Adapt communication style based on negative feedback
    if (turn.topic === 'academic' && context.preferences.communicationStyle === 'casual') {
      context.preferences.communicationStyle = 'formal';
    } else if (turn.topic !== 'academic' && context.preferences.communicationStyle === 'formal') {
      context.preferences.communicationStyle = 'casual';
    }

    // Adjust detail level
    if (turn.response.length > 800 && context.preferences.detailLevel === 'comprehensive') {
      context.preferences.detailLevel = 'moderate';
    }
  }

  private calculateTopicDistribution(history: ConversationTurn[]): { [topic: string]: number } {
    const distribution: { [topic: string]: number } = {};
    history.forEach(turn => {
      distribution[turn.topic] = (distribution[turn.topic] || 0) + 1;
    });
    return distribution;
  }

  private calculateAverageConfidence(history: ConversationTurn[]): number {
    if (history.length === 0) return 0;
    const totalConfidence = history.reduce((sum, turn) => sum + turn.confidence, 0);
    return totalConfidence / history.length;
  }

  private calculateHelpfulnessRate(history: ConversationTurn[]): number {
    const rateable = history.filter(turn => turn.helpful !== undefined);
    if (rateable.length === 0) return 0;
    const helpful = rateable.filter(turn => turn.helpful).length;
    return (helpful / rateable.length) * 100;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      communicationStyle: 'adaptive',
      detailLevel: 'moderate',
      focusAreas: [],
      academicYear: 'Unknown'
    };
  }

  private loadContextsFromStorage(): void {
    try {
      const stored = localStorage.getItem('contextual_memory_contexts');
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [key, context] of Object.entries(parsed)) {
          // Convert date strings back to Date objects
          const contextObj = context as any;
          contextObj.lastActivity = new Date(contextObj.lastActivity);
          contextObj.conversationHistory = contextObj.conversationHistory.map((turn: any) => ({
            ...turn,
            timestamp: new Date(turn.timestamp)
          }));
          this.contexts.set(key, contextObj);
        }
      }
    } catch (error) {
      console.error('Failed to load contextual memory from storage:', error);
    }
  }

  private saveContextsToStorage(): void {
    try {
      const contextsObject = Object.fromEntries(this.contexts);
      localStorage.setItem('contextual_memory_contexts', JSON.stringify(contextsObject));
    } catch (error) {
      console.error('Failed to save contextual memory to storage:', error);
    }
  }

  // Public methods for memory management
  clearUserContext(userId: string): void {
    const keysToDelete = Array.from(this.contexts.keys()).filter(key => key.startsWith(`${userId}:`));
    keysToDelete.forEach(key => this.contexts.delete(key));
    this.saveContextsToStorage();
    console.log(`🧹 Cleared context for user ${userId}`);
  }

  getActiveContexts(): number {
    return this.contexts.size;
  }

  // Clean up old contexts (older than 7 days)
  cleanupOldContexts(): void {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const keysToDelete: string[] = [];

    this.contexts.forEach((context, key) => {
      if (context.lastActivity < weekAgo) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.contexts.delete(key));
    if (keysToDelete.length > 0) {
      this.saveContextsToStorage();
      console.log(`🧹 Cleaned up ${keysToDelete.length} old contexts`);
    }
  }
}

export const contextualMemoryService = new ContextualMemoryService();
export default contextualMemoryService;