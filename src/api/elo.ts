// ELO Rating API endpoints for AI response quality tracking
// Simple +/- rating system with human review integration

import { eloTrackingService } from '../services/eloTrackingService';
import type { EloRating, HumanReviewItem } from '../services/eloTrackingService';

interface APIRequest {
  method: string;
  headers: Record<string, string>;
  body: any;
}

interface APIResponse {
  status: number;
  data?: any;
  error?: string;
}

// Submit ELO rating endpoint - called by SimpleEloRating component
export async function submitEloRating(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const eloData = req.body;
    
    // Validate required fields
    if (!eloData.messageId || !eloData.query || !eloData.response || !eloData.rating) {
      return { status: 400, error: 'Missing required fields: messageId, query, response, rating' };
    }

    // Validate rating value
    if (eloData.rating !== 'positive' && eloData.rating !== 'negative') {
      return { status: 400, error: 'Rating must be "positive" or "negative"' };
    }

    // Ensure score matches rating
    eloData.score = eloData.rating === 'positive' ? 1 : -1;

    // Submit rating through ELO tracking service
    await eloTrackingService.submitEloRating(eloData);
    
    return {
      status: 200,
      data: {
        success: true,
        messageId: eloData.messageId,
        rating: eloData.rating,
        score: eloData.score,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error submitting ELO rating:', error);
    return { status: 500, error: 'Failed to submit ELO rating' };
  }
}

// Store ELO data in persistent storage - called by eloTrackingService
export async function storeEloData(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const eloRating = req.body as EloRating;
    
    // In a real implementation, store in database
    // For now, log the data
    console.log('📊 Storing ELO rating:', {
      messageId: eloRating.messageId,
      rating: eloRating.rating,
      score: eloRating.score,
      queryHash: eloRating.query.substring(0, 50) + '...',
      needsReview: eloRating.needsReview,
      timestamp: eloRating.timestamp
    });

    // TODO: Implement database storage
    // Example SQL:
    // INSERT INTO elo_ratings (message_id, query, response, context, user_id, rating, score, needs_review, timestamp)
    // VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)

    return {
      status: 200,
      data: { success: true }
    };
  } catch (error) {
    console.error('Error storing ELO data:', error);
    return { status: 500, error: 'Failed to store ELO data' };
  }
}

// Store human review items - called by eloTrackingService
export async function storeHumanReviewItem(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const reviewItem = req.body as HumanReviewItem;
    
    console.log('🔍 Storing human review item:', {
      id: reviewItem.id,
      queryPreview: reviewItem.originalQuery.substring(0, 50) + '...',
      userRating: reviewItem.userRating,
      eloScore: reviewItem.eloScore,
      reviewStatus: reviewItem.reviewStatus,
      submittedAt: reviewItem.submittedAt
    });

    // TODO: Implement database storage
    // Example SQL:
    // INSERT INTO human_review_queue (id, original_query, original_response, user_rating, elo_score, context, submitted_at, review_status)
    // VALUES ($1, $2, $3, $4, $5, $6, $7, $8)

    return {
      status: 200,
      data: { success: true }
    };
  } catch (error) {
    console.error('Error storing human review item:', error);
    return { status: 500, error: 'Failed to store human review item' };
  }
}

// Get human review queue for admin dashboard
export async function getHumanReviewQueue(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'GET') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const reviewQueue = await eloTrackingService.getHumanReviewQueue();
    
    return {
      status: 200,
      data: {
        success: true,
        reviewQueue,
        count: reviewQueue.length
      }
    };
  } catch (error) {
    console.error('Error getting human review queue:', error);
    return { status: 500, error: 'Failed to get human review queue' };
  }
}

// Submit human review feedback - called by DevDashboard
export async function submitHumanReview(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const { reviewId, humanFeedback } = req.body;
    
    if (!reviewId || !humanFeedback) {
      return { status: 400, error: 'Missing reviewId or humanFeedback' };
    }

    await eloTrackingService.submitHumanReview(reviewId, humanFeedback);
    
    return {
      status: 200,
      data: {
        success: true,
        reviewId,
        reviewedBy: humanFeedback.reviewedBy,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error submitting human review:', error);
    return { status: 500, error: 'Failed to submit human review' };
  }
}

// Store training data from human reviews
export async function storeTrainingData(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const trainingData = req.body;
    
    console.log('🎯 Storing training data:', {
      queryPreview: trainingData.query.substring(0, 50) + '...',
      hasCorrectResponse: !!trainingData.correctResponse,
      hasTrainingPrompt: !!trainingData.trainingPrompt,
      improvedBy: trainingData.improvedBy,
      originalEloScore: trainingData.originalEloScore
    });

    // TODO: Implement database storage
    // Example SQL:
    // INSERT INTO training_data (query, context, correct_response, training_prompt, improved_by, original_elo_score, reviewed_at)
    // VALUES ($1, $2, $3, $4, $5, $6, $7)

    return {
      status: 200,
      data: { success: true }
    };
  } catch (error) {
    console.error('Error storing training data:', error);
    return { status: 500, error: 'Failed to store training data' };
  }
}

// Get ELO analytics for admin dashboard
export async function getEloAnalytics(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'GET') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    const analytics = eloTrackingService.getAnalytics();
    
    return {
      status: 200,
      data: {
        success: true,
        analytics,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error getting ELO analytics:', error);
    return { status: 500, error: 'Failed to get ELO analytics' };
  }
}

// Development endpoint to reset ELO data (for testing)
export async function resetEloData(req: APIRequest): Promise<APIResponse> {
  if (req.method !== 'POST') {
    return { status: 405, error: 'Method not allowed' };
  }

  try {
    // Clear localStorage data
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('elo_query_patterns');
    }
    
    console.log('🧹 ELO data reset (localStorage cleared)');
    
    return {
      status: 200,
      data: {
        success: true,
        message: 'ELO data reset successfully',
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error resetting ELO data:', error);
    return { status: 500, error: 'Failed to reset ELO data' };
  }
}

// Export all ELO API endpoints
export const eloAPI = {
  '/api/elo/submit': submitEloRating,
  '/api/elo/store': storeEloData,
  '/api/elo/review-queue': storeHumanReviewItem,
  '/api/elo/review-queue-get': getHumanReviewQueue,
  '/api/elo/submit-review': submitHumanReview,
  '/api/elo/training-data': storeTrainingData,
  '/api/elo/analytics': getEloAnalytics,
  '/api/elo/reset': resetEloData
};

// Development helper to create mock server responses
export function createMockEloServer() {
  const mockServer = {
    async handleRequest(url: string, options: RequestInit) {
      const method = options.method || 'GET';
      const req: APIRequest = {
        method,
        headers: (options.headers as Record<string, string>) || {},
        body: options.body ? JSON.parse(options.body as string) : null
      };

      // Route to appropriate handler
      if (url.includes('/api/elo/submit')) {
        return await submitEloRating(req);
      } else if (url.includes('/api/elo/store')) {
        return await storeEloData(req);
      } else if (url.includes('/api/elo/review-queue-get')) {
        return await getHumanReviewQueue(req);
      } else if (url.includes('/api/elo/review-queue')) {
        return await storeHumanReviewItem(req);
      } else if (url.includes('/api/elo/submit-review')) {
        return await submitHumanReview(req);
      } else if (url.includes('/api/elo/training-data')) {
        return await storeTrainingData(req);
      } else if (url.includes('/api/elo/analytics')) {
        return await getEloAnalytics(req);
      } else if (url.includes('/api/elo/reset')) {
        return await resetEloData(req);
      }

      return { status: 404, error: 'Endpoint not found' };
    }
  };

  return mockServer;
}