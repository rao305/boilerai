// ELO Tracking Service for AI Response Quality
// Simple +/- rating system with human review integration
import { contextualMemoryService } from './contextualMemoryService';

interface EloRating {
  messageId: string;
  query: string;
  response: string;
  context: any;
  userId: string;
  rating: 'positive' | 'negative';
  score: number; // 1 or -1
  timestamp: string;
  needsReview?: boolean;
}

interface QueryPattern {
  id: string;
  queryText: string;
  similarQueries: string[];
  totalRatings: number;
  positiveRatings: number;
  negativeRatings: number;
  eloScore: number;
  needsHumanReview: boolean;
  lastRated: Date;
}

interface HumanReviewItem {
  id: string;
  originalQuery: string;
  originalResponse: string;
  userRating: 'positive' | 'negative';
  eloScore: number;
  context: any;
  submittedAt: Date;
  reviewStatus: 'pending' | 'reviewed' | 'training_added';
  humanFeedback?: {
    correctResponse?: string;
    improvementNotes?: string;
    trainingPrompt?: string;
    reviewedBy: string;
    reviewedAt: Date;
  };
}

class EloTrackingService {
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private humanReviewQueue: HumanReviewItem[] = [];
  private baseEloScore = 1000;
  
  // Dynamic configuration - no hardcoding
  private config = {
    eloKFactor: 32,
    similarityThreshold: 0.3,
    minRatingsForReview: 3,
    lowEloThreshold: 800,
    highEloThreshold: 1200,
    negativeRatioThreshold: 0.7,
    minRatingsForRatio: 5,
    minWordLength: 2,
    stopWords: new Set([
      'the', 'and', 'or', 'but', 'for', 'with', 'what', 'how', 'can', 
      'should', 'will', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 
      'has', 'had', 'do', 'does', 'did', 'a', 'an', 'this', 'that', 'these', 
      'those', 'in', 'on', 'at', 'to', 'from', 'by', 'about', 'up', 'down',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ])
  };

  constructor() {
    this.loadStoredData();
  }

  // Update configuration dynamically - no hardcoding
  updateConfig(updates: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...updates };
    console.log('📊 ELO configuration updated:', updates);
  }

  // Get current configuration
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  // Submit ELO rating and determine if human review is needed
  async submitEloRating(rating: EloRating): Promise<void> {
    try {
      // Calculate ELO impact
      const queryPattern = this.getOrCreateQueryPattern(rating.query);
      const newEloScore = this.calculateNewEloScore(queryPattern, rating.score);
      
      // Update pattern data
      queryPattern.totalRatings++;
      if (rating.score > 0) {
        queryPattern.positiveRatings++;
      } else {
        queryPattern.negativeRatings++;
      }
      queryPattern.eloScore = newEloScore;
      queryPattern.lastRated = new Date();

      // Update contextual memory with feedback
      if (rating.context?.sessionId) {
        contextualMemoryService.updateFeedback(
          rating.userId,
          rating.context.sessionId,
          rating.messageId,
          rating.score > 0
        );
      }

      // Determine if human review is needed
      const needsReview = this.shouldTriggerHumanReview(queryPattern, rating);
      
      if (needsReview) {
        await this.addToHumanReviewQueue(rating, queryPattern);
      }

      // Store the rating
      await this.storeEloRating({
        ...rating,
        needsReview
      });

      // Save updated patterns
      this.saveQueryPatterns();

      console.log(`📊 ELO Rating: ${rating.rating} (${rating.score}) - Score: ${newEloScore}`);
      
      if (needsReview) {
        console.log(`🔍 Query flagged for human review: ${rating.query.substring(0, 50)}...`);
      }

    } catch (error) {
      console.error('Failed to submit ELO rating:', error);
    }
  }

  // Calculate new ELO score based on rating
  private calculateNewEloScore(pattern: QueryPattern, score: number): number {
    const K = this.config.eloKFactor;
    const currentElo = pattern.eloScore;
    
    // Expected score based on current ELO (normalized to 0-1)
    const expectedScore = 1 / (1 + Math.pow(10, (this.baseEloScore - currentElo) / 400));
    
    // Actual score (1 for positive, 0 for negative)
    const actualScore = score > 0 ? 1 : 0;
    
    // New ELO calculation
    const newElo = currentElo + K * (actualScore - expectedScore);
    
    return Math.round(Math.max(100, Math.min(2000, newElo))); // Clamp between 100-2000
  }

  // Determine if query needs human review
  private shouldTriggerHumanReview(pattern: QueryPattern, rating: EloRating): boolean {
    // Trigger human review for:
    
    // 1. Low ELO score (consistently bad responses)
    if (pattern.eloScore < this.config.lowEloThreshold && pattern.totalRatings >= this.config.minRatingsForReview) {
      return true;
    }

    // 2. High negative rating ratio
    const negativeRatio = pattern.negativeRatings / pattern.totalRatings;
    if (negativeRatio >= this.config.negativeRatioThreshold && pattern.totalRatings >= this.config.minRatingsForRatio) {
      return true;
    }

    // 3. Recent negative on previously good query
    if (rating.score < 0 && pattern.eloScore > this.config.highEloThreshold && pattern.totalRatings >= 10) {
      return true;
    }

    // 4. Novel query type (no similar patterns)
    const similarPatterns = this.findSimilarQueryPatterns(rating.query);
    if (similarPatterns.length === 0 && rating.score < 0) {
      return true;
    }

    return false;
  }

  // Add query to human review queue
  private async addToHumanReviewQueue(rating: EloRating, pattern: QueryPattern): Promise<void> {
    const reviewItem: HumanReviewItem = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalQuery: rating.query,
      originalResponse: rating.response,
      userRating: rating.rating,
      eloScore: pattern.eloScore,
      context: rating.context,
      submittedAt: new Date(),
      reviewStatus: 'pending'
    };

    this.humanReviewQueue.push(reviewItem);
    
    // Store in database for admin access
    await this.storeHumanReviewItem(reviewItem);
  }

  // Get or create query pattern
  private getOrCreateQueryPattern(query: string): QueryPattern {
    // Create a simple hash for the query
    const queryHash = this.hashQuery(query);
    
    if (!this.queryPatterns.has(queryHash)) {
      const newPattern: QueryPattern = {
        id: queryHash,
        queryText: query,
        similarQueries: [],
        totalRatings: 0,
        positiveRatings: 0,
        negativeRatings: 0,
        eloScore: this.baseEloScore,
        needsHumanReview: false,
        lastRated: new Date()
      };
      
      this.queryPatterns.set(queryHash, newPattern);
    }

    return this.queryPatterns.get(queryHash)!;
  }

  // Simple query hashing for pattern matching
  private hashQuery(query: string): string {
    // Normalize query: lowercase, remove common words, extract key terms
    const normalized = query.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(' ')
      .filter(word => word.length > this.config.minWordLength) // Remove short words
      .filter(word => !this.config.stopWords.has(word)) // Remove stop words
      .sort()
      .join('_');
    
    return normalized || 'general_query';
  }

  // Find similar query patterns
  private findSimilarQueryPatterns(query: string): QueryPattern[] {
    const queryWords = query.toLowerCase().split(' ')
      .filter(w => w.length > this.config.minWordLength)
      .filter(w => !this.config.stopWords.has(w));
    const similar: QueryPattern[] = [];

    for (const pattern of this.queryPatterns.values()) {
      const patternWords = pattern.queryText.toLowerCase().split(' ')
        .filter(w => w.length > this.config.minWordLength)
        .filter(w => !this.config.stopWords.has(w));
      
      // Calculate word overlap
      const commonWords = queryWords.filter(word => patternWords.includes(word));
      const similarity = commonWords.length / Math.max(queryWords.length, patternWords.length);
      
      if (similarity > this.config.similarityThreshold) {
        similar.push(pattern);
      }
    }

    return similar.sort((a, b) => b.eloScore - a.eloScore);
  }

  // Admin methods for human review
  async getHumanReviewQueue(): Promise<HumanReviewItem[]> {
    return this.humanReviewQueue.filter(item => item.reviewStatus === 'pending');
  }

  async submitHumanReview(reviewId: string, humanFeedback: {
    correctResponse?: string;
    improvementNotes?: string;
    trainingPrompt?: string;
    reviewedBy: string;
  }): Promise<void> {
    const reviewItem = this.humanReviewQueue.find(item => item.id === reviewId);
    if (!reviewItem) {
      throw new Error('Review item not found');
    }

    reviewItem.humanFeedback = {
      ...humanFeedback,
      reviewedAt: new Date()
    };
    reviewItem.reviewStatus = 'reviewed';

    // If training prompt is provided, add to training data
    if (humanFeedback.trainingPrompt) {
      await this.addToTrainingData(reviewItem, humanFeedback.trainingPrompt);
      reviewItem.reviewStatus = 'training_added';
    }

    // Store updated review
    await this.storeHumanReviewItem(reviewItem);

    console.log(`✅ Human review completed for: ${reviewItem.originalQuery.substring(0, 50)}...`);
  }

  // Add human-reviewed response to training data
  private async addToTrainingData(reviewItem: HumanReviewItem, trainingPrompt: string): Promise<void> {
    const trainingData = {
      query: reviewItem.originalQuery,
      context: reviewItem.context,
      correctResponse: reviewItem.humanFeedback?.correctResponse,
      trainingPrompt: trainingPrompt,
      improvedBy: reviewItem.humanFeedback?.reviewedBy,
      originalEloScore: reviewItem.eloScore,
      reviewedAt: new Date()
    };

    // Store in training database
    await fetch('/api/elo/training-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainingData)
    });
  }

  // Get analytics for admin dashboard
  getAnalytics(): {
    totalQueries: number;
    averageEloScore: number;
    topPerformingPatterns: QueryPattern[];
    lowPerformingPatterns: QueryPattern[];
    reviewQueueSize: number;
    recentTrends: any;
  } {
    const patterns = Array.from(this.queryPatterns.values());
    
    return {
      totalQueries: patterns.reduce((sum, p) => sum + p.totalRatings, 0),
      averageEloScore: patterns.reduce((sum, p) => sum + p.eloScore, 0) / patterns.length,
      topPerformingPatterns: patterns
        .filter(p => p.totalRatings >= 3)
        .sort((a, b) => b.eloScore - a.eloScore)
        .slice(0, 10),
      lowPerformingPatterns: patterns
        .filter(p => p.totalRatings >= 3)
        .sort((a, b) => a.eloScore - b.eloScore)
        .slice(0, 10),
      reviewQueueSize: this.humanReviewQueue.filter(r => r.reviewStatus === 'pending').length,
      recentTrends: this.calculateRecentTrends()
    };
  }

  private calculateRecentTrends(): any {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentPatterns = Array.from(this.queryPatterns.values())
      .filter(p => p.lastRated >= last7Days);
    
    return {
      recentQueries: recentPatterns.length,
      averageRecentElo: recentPatterns.reduce((sum, p) => sum + p.eloScore, 0) / recentPatterns.length,
      improvingPatterns: recentPatterns.filter(p => p.eloScore > this.baseEloScore).length,
      decliningPatterns: recentPatterns.filter(p => p.eloScore < 800).length
    };
  }

  // Storage methods
  private async storeEloRating(rating: EloRating): Promise<void> {
    try {
      await fetch('/api/elo/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rating)
      });
    } catch (error) {
      console.error('Failed to store ELO rating:', error);
    }
  }

  private async storeHumanReviewItem(item: HumanReviewItem): Promise<void> {
    try {
      await fetch('/api/elo/review-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (error) {
      console.error('Failed to store human review item:', error);
    }
  }

  private loadStoredData(): void {
    try {
      const stored = localStorage.getItem('elo_query_patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        for (const pattern of patterns) {
          this.queryPatterns.set(pattern.id, {
            ...pattern,
            lastRated: new Date(pattern.lastRated)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load stored ELO data:', error);
    }
  }

  private saveQueryPatterns(): void {
    try {
      const patterns = Array.from(this.queryPatterns.values());
      localStorage.setItem('elo_query_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to save query patterns:', error);
    }
  }

  // Get comprehensive analytics integrating contextual memory
  getComprehensiveAnalytics(userId: string, sessionId?: string): any {
    const patterns = Array.from(this.queryPatterns.values());
    
    // Basic ELO analytics
    const totalPatterns = patterns.length;
    const totalRatings = patterns.reduce((sum, p) => sum + p.totalRatings, 0);
    const averageEloScore = patterns.reduce((sum, p) => sum + p.eloScore, 0) / totalPatterns || 0;
    const positiveRatings = patterns.reduce((sum, p) => sum + p.positiveRatings, 0);
    const negativeRatings = patterns.reduce((sum, p) => sum + p.negativeRatings, 0);
    const overallPositiveRate = totalRatings > 0 ? (positiveRatings / totalRatings) * 100 : 0;
    
    // Contextual memory analytics
    let conversationAnalytics = {};
    if (sessionId) {
      conversationAnalytics = contextualMemoryService.getConversationAnalytics(userId, sessionId);
    }

    // Performance categories
    const highPerformers = patterns.filter(p => p.eloScore > this.config.highEloThreshold).length;
    const lowPerformers = patterns.filter(p => p.eloScore < this.config.lowEloThreshold).length;
    const needingReview = patterns.filter(p => p.needsHumanReview).length;

    return {
      eloAnalytics: {
        totalPatterns,
        totalRatings,
        averageEloScore: Math.round(averageEloScore),
        positiveRatings,
        negativeRatings,
        overallPositiveRate: Math.round(overallPositiveRate),
        highPerformers,
        lowPerformers,
        needingReview,
        reviewQueueSize: this.humanReviewQueue.length
      },
      conversationAnalytics,
      insights: this.generateInsights(patterns, conversationAnalytics),
      recommendations: this.generateRecommendations(patterns, conversationAnalytics)
    };
  }

  private generateInsights(patterns: QueryPattern[], conversationAnalytics: any): string[] {
    const insights: string[] = [];
    
    if (patterns.length === 0) {
      insights.push('No rating data available yet');
      return insights;
    }

    const averageElo = patterns.reduce((sum, p) => sum + p.eloScore, 0) / patterns.length;
    
    if (averageElo > this.config.highEloThreshold) {
      insights.push('🎯 AI performance is excellent across most queries');
    } else if (averageElo < this.config.lowEloThreshold) {
      insights.push('⚠️ AI performance needs improvement across several areas');
    } else {
      insights.push('📊 AI performance is moderate with room for targeted improvements');
    }

    // Topic-based insights from conversation analytics
    if (conversationAnalytics.topicDistribution) {
      const topTopic = Object.entries(conversationAnalytics.topicDistribution)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      if (topTopic) {
        insights.push(`💬 Most discussed topic: ${topTopic[0]} (${topTopic[1]} conversations)`);
      }
    }

    if (conversationAnalytics.helpfulnessRate) {
      const rate = conversationAnalytics.helpfulnessRate;
      if (rate > 80) {
        insights.push('✨ High user satisfaction with contextual responses');
      } else if (rate < 60) {
        insights.push('🔧 Context awareness needs improvement for better user satisfaction');
      }
    }

    return insights;
  }

  private generateRecommendations(patterns: QueryPattern[], conversationAnalytics: any): string[] {
    const recommendations: string[] = [];
    
    const lowPerformers = patterns.filter(p => p.eloScore < this.config.lowEloThreshold);
    if (lowPerformers.length > 0) {
      recommendations.push(`Focus training on ${lowPerformers.length} low-performing query patterns`);
    }

    const needingReview = patterns.filter(p => p.needsHumanReview);
    if (needingReview.length > 0) {
      recommendations.push(`Review ${needingReview.length} queries flagged for human oversight`);
    }

    if (conversationAnalytics.helpfulnessRate < 70) {
      recommendations.push('Improve contextual awareness and memory integration');
    }

    if (conversationAnalytics.averageConfidence < 80) {
      recommendations.push('Enhance AI confidence through better training data');
    }

    return recommendations;
  }
}

export const eloTrackingService = new EloTrackingService();
export { EloRating, QueryPattern, HumanReviewItem };