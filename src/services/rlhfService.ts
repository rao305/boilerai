import { openaiChatService } from './openaiChatService';

// Interfaces for RLHF system
interface FeedbackData {
  messageId: string;
  query: string;
  response: string;
  context: any;
  rating?: number;
  feedback_type?: 'helpful' | 'unhelpful' | 'rating' | 'comment';
  comment?: string;
  timestamp: Date;
  userId: string;
  engagementScore?: number;
  implicitSignals?: ImplicitSignals;
}

interface ImplicitSignals {
  readingTime: number;
  scrollEvents: number;
  hasFollowUp: boolean;
  conversationContinuation: boolean;
  totalTime: number;
  responseLength: number;
}

interface RewardSignal {
  messageId: string;
  reward: number;
  confidence: number;
  breakdown: {
    explicit: number;
    implicit: number;
    contextual: number;
    novelty: number;
  };
}

interface PromptOptimizationData {
  originalPrompt: string;
  interactions: FeedbackData[];
  averageReward: number;
  improvementSuggestions: string[];
}

class RLHFService {
  private interactions: Map<string, FeedbackData> = new Map();
  private rewardHistory: RewardSignal[] = [];
  private currentPrompts: Map<string, string> = new Map();
  
  constructor() {
    this.initializeBasePrompts();
  }

  private initializeBasePrompts() {
    // Initialize with minimal base prompts - everything else should be AI-generated
    this.currentPrompts.set('reasoning', `
You are BoilerAI, an expert academic advisor for Purdue University students. Use your comprehensive knowledge of Purdue's academic programs, policies, and requirements to provide personalized guidance. Analyze each query thoroughly and provide specific, actionable recommendations based on the student's unique situation.
    `);
    
    this.currentPrompts.set('fallback', `
You are BoilerAI, an academic advisor for Purdue University students. While some systems may be limited, I can still provide academic guidance using my knowledge of Purdue programs and policies.
    `);
  }

  // Main method to calculate reward from feedback
  calculateReward(feedback: FeedbackData): RewardSignal {
    let reward = 0;
    let breakdown = {
      explicit: 0,
      implicit: 0,
      contextual: 0,
      novelty: 0
    };

    // 1. Explicit feedback (40% weight)
    if (feedback.rating) {
      breakdown.explicit = (feedback.rating - 3) / 2; // Normalize 1-5 to -1 to 1
    } else if (feedback.feedback_type === 'helpful') {
      breakdown.explicit = 0.5;
    } else if (feedback.feedback_type === 'unhelpful') {
      breakdown.explicit = -0.5;
    }

    // 2. Implicit feedback (30% weight)
    if (feedback.implicitSignals) {
      breakdown.implicit = this.calculateImplicitReward(feedback.implicitSignals);
    } else if (feedback.engagementScore) {
      breakdown.implicit = (feedback.engagementScore - 0.5) * 2; // Normalize to -1 to 1
    }

    // 3. Contextual quality (20% weight)
    breakdown.contextual = this.calculateContextualReward(feedback);

    // 4. Novelty bonus (10% weight)
    breakdown.novelty = this.calculateNoveltyBonus(feedback);

    // Combine all signals
    reward = (
      breakdown.explicit * 0.4 +
      breakdown.implicit * 0.3 +
      breakdown.contextual * 0.2 +
      breakdown.novelty * 0.1
    );

    // Calculate confidence based on available signals
    const confidence = this.calculateConfidence(feedback);

    const rewardSignal: RewardSignal = {
      messageId: feedback.messageId,
      reward: Math.max(-1, Math.min(1, reward)), // Clamp to [-1, 1]
      confidence,
      breakdown
    };

    this.rewardHistory.push(rewardSignal);
    return rewardSignal;
  }

  private calculateImplicitReward(signals: ImplicitSignals): number {
    let implicitReward = 0;

    // Reading time analysis
    const expectedReadingTime = signals.responseLength * 50; // 50ms per character
    const readingRatio = signals.readingTime / expectedReadingTime;
    
    if (readingRatio > 0.5 && readingRatio < 3) {
      // Good reading time indicates engagement
      implicitReward += 0.3;
    } else if (readingRatio < 0.2) {
      // Too quick, might indicate poor response
      implicitReward -= 0.2;
    }

    // Scroll engagement
    if (signals.scrollEvents > 2) {
      implicitReward += 0.2;
    }

    // Follow-up questions indicate satisfaction and engagement
    if (signals.hasFollowUp) {
      implicitReward += 0.3;
    }

    // Conversation continuation
    if (signals.conversationContinuation) {
      implicitReward += 0.2;
    }

    return Math.max(-1, Math.min(1, implicitReward));
  }

  private calculateContextualReward(feedback: FeedbackData): number {
    let contextualReward = 0;

    // Check if response used available context effectively
    if (feedback.context) {
      // Has transcript data and response mentions specific courses
      if (feedback.context.hasTranscript && feedback.response.includes('CS ')) {
        contextualReward += 0.3;
      }

      // Personalized response based on academic level
      if (feedback.context.academic_level && 
          feedback.response.toLowerCase().includes(feedback.context.academic_level)) {
        contextualReward += 0.2;
      }

      // Mentions specific Purdue information
      if (feedback.response.includes('Purdue') || feedback.response.includes('Boilermaker')) {
        contextualReward += 0.1;
      }
    }

    // Response length appropriateness
    const responseLength = feedback.response.length;
    if (responseLength > 100 && responseLength < 2000) {
      contextualReward += 0.2;
    }

    // Check for specific, actionable advice
    if (feedback.response.includes('next semester') || 
        feedback.response.includes('recommend') ||
        feedback.response.includes('should take')) {
      contextualReward += 0.2;
    }

    return Math.max(-1, Math.min(1, contextualReward));
  }

  private calculateNoveltyBonus(feedback: FeedbackData): number {
    // Check if this query type is new or uncommon
    const queryEmbedding = this.getQueryEmbedding(feedback.query);
    const similarQueries = this.findSimilarQueries(queryEmbedding);
    
    if (similarQueries.length < 3) {
      // Novel query type - bonus for handling it well
      return 0.3;
    } else if (similarQueries.length < 10) {
      return 0.1;
    }
    
    return 0;
  }

  private calculateConfidence(feedback: FeedbackData): number {
    let confidence = 0;

    // Higher confidence with explicit feedback
    if (feedback.rating || feedback.feedback_type) {
      confidence += 0.4;
    }

    // Higher confidence with implicit signals
    if (feedback.implicitSignals) {
      confidence += 0.3;
    }

    // Higher confidence with more context
    if (feedback.context && Object.keys(feedback.context).length > 2) {
      confidence += 0.2;
    }

    // Higher confidence with detailed comments
    if (feedback.comment && feedback.comment.length > 20) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  // Store feedback and calculate reward
  async processFeedback(feedback: FeedbackData): Promise<RewardSignal> {
    this.interactions.set(feedback.messageId, feedback);
    const rewardSignal = this.calculateReward(feedback);
    
    // Store in database for persistence
    await this.storeFeedbackData(feedback, rewardSignal);
    
    // Trigger optimization if we have enough data
    if (this.shouldTriggerOptimization()) {
      await this.triggerPromptOptimization();
    }

    return rewardSignal;
  }

  private async storeFeedbackData(feedback: FeedbackData, reward: RewardSignal) {
    try {
      // Store in your database
      await fetch('/api/rlhf/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, reward })
      });
    } catch (error) {
      console.error('Failed to store feedback data:', error);
    }
  }

  // Check if we should trigger prompt optimization
  private shouldTriggerOptimization(): boolean {
    const recentInteractions = this.rewardHistory.slice(-50); // Last 50 interactions
    
    if (recentInteractions.length < 20) return false;
    
    // Calculate average reward over recent interactions
    const averageReward = recentInteractions.reduce((sum, r) => sum + r.reward, 0) / recentInteractions.length;
    
    // Trigger if average reward is below threshold or we have enough new data
    return averageReward < 0.3 || recentInteractions.length >= 50;
  }

  // Main RLHF optimization method
  async triggerPromptOptimization(): Promise<void> {
    console.log('🧠 Triggering RLHF prompt optimization...');
    
    try {
      const recentFeedback = Array.from(this.interactions.values()).slice(-30);
      const optimizationData = await this.analyzeAndOptimizePrompts(recentFeedback);
      
      if (optimizationData.improvementSuggestions.length > 0) {
        await this.updatePrompts(optimizationData);
        console.log('✅ Prompts optimized based on user feedback');
      }
    } catch (error) {
      console.error('❌ Failed to optimize prompts:', error);
    }
  }

  private async analyzeAndOptimizePrompts(feedbacks: FeedbackData[]): Promise<PromptOptimizationData> {
    const lowRewardInteractions = feedbacks.filter(f => {
      const reward = this.rewardHistory.find(r => r.messageId === f.messageId);
      return reward && reward.reward < 0.2;
    });

    const highRewardInteractions = feedbacks.filter(f => {
      const reward = this.rewardHistory.find(r => r.messageId === f.messageId);
      return reward && reward.reward > 0.6;
    });

    // Use OpenAI to analyze patterns and suggest improvements
    const analysisPrompt = `
Analyze these academic advising interactions and suggest prompt improvements:

HIGH-PERFORMING interactions (keep these patterns):
${highRewardInteractions.map(f => `Query: ${f.query}\nResponse: ${f.response.substring(0, 200)}...\n`).join('\n')}

LOW-PERFORMING interactions (improve these patterns):
${lowRewardInteractions.map(f => `Query: ${f.query}\nResponse: ${f.response.substring(0, 200)}...\nUser feedback: ${f.comment || f.feedback_type}\n`).join('\n')}

Current reasoning prompt:
${this.currentPrompts.get('reasoning')}

Suggest specific improvements to the reasoning prompt that would:
1. Better handle the types of queries in low-performing interactions
2. Maintain the successful patterns from high-performing interactions
3. Be more specific to Purdue University academic advising
4. Improve student engagement and satisfaction

Provide specific suggestions as a JSON array of improvement strings.
    `;

    try {
      const response = await openaiChatService.sendMessage(analysisPrompt, 'rlhf-system');
      
      // Extract improvement suggestions (this would need proper JSON parsing)
      const suggestions = this.extractImprovementSuggestions(response);
      
      return {
        originalPrompt: this.currentPrompts.get('reasoning') || '',
        interactions: feedbacks,
        averageReward: this.calculateAverageReward(feedbacks),
        improvementSuggestions: suggestions
      };
    } catch (error) {
      console.error('Failed to analyze prompts:', error);
      return {
        originalPrompt: this.currentPrompts.get('reasoning') || '',
        interactions: feedbacks,
        averageReward: 0,
        improvementSuggestions: []
      };
    }
  }

  private extractImprovementSuggestions(response: string): string[] {
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback: extract bullet points or numbered lists
      const lines = response.split('\n');
      return lines
        .filter(line => line.match(/^[\d\-\*]\s/))
        .map(line => line.replace(/^[\d\-\*]\s*/, '').trim())
        .filter(line => line.length > 10);
    } catch (error) {
      console.error('Failed to extract suggestions:', error);
      return [];
    }
  }

  private async updatePrompts(optimizationData: PromptOptimizationData): Promise<void> {
    // Generate new prompt based on suggestions
    const newPromptRequest = `
Based on these improvement suggestions, rewrite the academic advising prompt:

Current prompt: ${optimizationData.originalPrompt}

Suggestions:
${optimizationData.improvementSuggestions.map(s => `- ${s}`).join('\n')}

Create an improved prompt that:
1. Incorporates the successful patterns
2. Addresses the identified weaknesses
3. Maintains the ANALYZE/REASON/VALIDATE/SYNTHESIZE structure
4. Is specifically tailored for Purdue University academic advising

Return only the new prompt text.
    `;

    try {
      const newPrompt = await openaiChatService.sendMessage(newPromptRequest, 'rlhf-system');
      
      // Update the prompt
      this.currentPrompts.set('reasoning', newPrompt);
      
      // Store in database for persistence
      await this.storeOptimizedPrompt('reasoning', newPrompt);
      
      console.log('📝 Updated reasoning prompt based on feedback');
    } catch (error) {
      console.error('Failed to update prompts:', error);
    }
  }

  private async storeOptimizedPrompt(promptType: string, prompt: string): Promise<void> {
    try {
      await fetch('/api/rlhf/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          promptType, 
          prompt, 
          timestamp: new Date(),
          version: Date.now() 
        })
      });
    } catch (error) {
      console.error('Failed to store optimized prompt:', error);
    }
  }

  // Get current optimized prompt
  getOptimizedPrompt(promptType: string): string {
    return this.currentPrompts.get(promptType) || '';
  }

  // Utility methods
  private getQueryEmbedding(query: string): number[] {
    // Simple hash-based embedding for now
    // In production, you'd use a proper embedding model
    const hash = query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [hash % 1000, (hash * 7) % 1000, (hash * 13) % 1000];
  }

  private findSimilarQueries(embedding: number[]): FeedbackData[] {
    // Simple similarity search
    return Array.from(this.interactions.values()).filter(interaction => {
      const queryEmb = this.getQueryEmbedding(interaction.query);
      const distance = Math.sqrt(
        embedding.reduce((sum, val, i) => sum + Math.pow(val - queryEmb[i], 2), 0)
      );
      return distance < 100; // Threshold for similarity
    });
  }

  private calculateAverageReward(feedbacks: FeedbackData[]): number {
    const rewards = feedbacks.map(f => 
      this.rewardHistory.find(r => r.messageId === f.messageId)?.reward || 0
    );
    return rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
  }

  // Get performance metrics
  getPerformanceMetrics(): any {
    const recentRewards = this.rewardHistory.slice(-100);
    const averageReward = recentRewards.reduce((sum, r) => sum + r.reward, 0) / recentRewards.length;
    
    return {
      totalInteractions: this.interactions.size,
      averageReward,
      improvementTrend: this.calculateImprovementTrend(),
      optimizationCount: this.countOptimizations(),
      lastOptimization: this.getLastOptimizationTime()
    };
  }

  private calculateImprovementTrend(): number {
    const recent = this.rewardHistory.slice(-50);
    const earlier = this.rewardHistory.slice(-100, -50);
    
    if (recent.length < 10 || earlier.length < 10) return 0;
    
    const recentAvg = recent.reduce((sum, r) => sum + r.reward, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, r) => sum + r.reward, 0) / earlier.length;
    
    return recentAvg - earlierAvg;
  }

  private countOptimizations(): number {
    // This would be stored in database in production
    return 0;
  }

  private getLastOptimizationTime(): Date | null {
    // This would be retrieved from database in production
    return null;
  }
}

// Create singleton instance
export const rlhfService = new RLHFService();