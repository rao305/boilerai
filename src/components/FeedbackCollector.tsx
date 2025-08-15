import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, MessageSquare, AlertCircle } from 'lucide-react';

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
}

interface FeedbackCollectorProps {
  messageId: string;
  query: string;
  response: string;
  context: any;
  userId: string;
  onFeedbackSubmitted?: (feedback: FeedbackData) => void;
}

export default function FeedbackCollector({ 
  messageId, 
  query, 
  response, 
  context, 
  userId, 
  onFeedbackSubmitted 
}: FeedbackCollectorProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (feedbackData: Partial<FeedbackData>) => {
    if (submitting) return;
    
    setSubmitting(true);
    
    const feedback: FeedbackData = {
      messageId,
      query,
      response,
      context,
      userId,
      timestamp: new Date(),
      ...feedbackData
    };

    try {
      // Send to your backend feedback service
      const response = await window.fetch('/api/feedback/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback)
      });

      if (response.ok) {
        setFeedbackGiven(true);
        onFeedbackSubmitted?.(feedback);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFeedback = (type: 'helpful' | 'unhelpful') => {
    submitFeedback({ 
      feedback_type: type,
      rating: type === 'helpful' ? 4 : 2 
    });
  };

  const handleDetailedFeedback = () => {
    if (rating === 0) return;
    
    submitFeedback({
      feedback_type: 'rating',
      rating,
      comment: comment.trim() || undefined
    });
    setShowDetailedFeedback(false);
  };

  if (feedbackGiven) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400 mt-2">
        <ThumbsUp size={16} />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-neutral-800 pt-3">
      {!showDetailedFeedback ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-400">Was this helpful?</span>
          
          {/* Quick feedback buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickFeedback('helpful')}
              disabled={submitting}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-sm text-neutral-300 hover:text-green-400 hover:bg-green-900/20 transition-colors disabled:opacity-50"
            >
              <ThumbsUp size={14} />
              <span>Yes</span>
            </button>
            
            <button
              onClick={() => handleQuickFeedback('unhelpful')}
              disabled={submitting}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-sm text-neutral-300 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <ThumbsDown size={14} />
              <span>No</span>
            </button>
            
            <button
              onClick={() => setShowDetailedFeedback(true)}
              disabled={submitting}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-sm text-neutral-300 hover:text-blue-400 hover:bg-blue-900/20 transition-colors disabled:opacity-50"
            >
              <Star size={14} />
              <span>Rate</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">Rate this response:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 rounded transition-colors ${
                    star <= rating 
                      ? 'text-yellow-400' 
                      : 'text-neutral-600 hover:text-yellow-400'
                  }`}
                >
                  <Star size={16} fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What could be improved? (optional)"
              className="w-full px-3 py-2 text-sm bg-neutral-900 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none resize-none"
              rows={2}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowDetailedFeedback(false)}
              className="px-3 py-1 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDetailedFeedback}
              disabled={rating === 0 || submitting}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Implicit feedback collector for user behavior
export class ImplicitFeedbackCollector {
  private interactions: Map<string, any> = new Map();
  
  startTracking(messageId: string, query: string, response: string) {
    this.interactions.set(messageId, {
      messageId,
      query,
      response,
      startTime: Date.now(),
      scrollEvents: 0,
      readingTime: 0,
      hasFollowUp: false,
      conversationContinuation: false
    });
  }
  
  trackScrolling(messageId: string) {
    const interaction = this.interactions.get(messageId);
    if (interaction) {
      interaction.scrollEvents++;
    }
  }
  
  trackReadingTime(messageId: string, timeSpent: number) {
    const interaction = this.interactions.get(messageId);
    if (interaction) {
      interaction.readingTime = timeSpent;
    }
  }
  
  trackFollowUp(messageId: string, hasFollowUp: boolean) {
    const interaction = this.interactions.get(messageId);
    if (interaction) {
      interaction.hasFollowUp = hasFollowUp;
    }
  }
  
  trackConversationContinuation(messageId: string, continues: boolean) {
    const interaction = this.interactions.get(messageId);
    if (interaction) {
      interaction.conversationContinuation = continues;
    }
  }
  
  async submitImplicitFeedback(messageId: string, userId: string) {
    const interaction = this.interactions.get(messageId);
    if (!interaction) return;
    
    const implicitFeedback = {
      ...interaction,
      userId,
      endTime: Date.now(),
      totalTime: Date.now() - interaction.startTime,
      engagementScore: this.calculateEngagementScore(interaction)
    };
    
    try {
      await window.fetch('/api/feedback/implicit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(implicitFeedback)
      });
    } catch (error) {
      console.error('Failed to submit implicit feedback:', error);
    }
    
    this.interactions.delete(messageId);
  }
  
  private calculateEngagementScore(interaction: any): number {
    let score = 0;
    
    // Reading time relative to response length
    const expectedReadingTime = interaction.response.length * 50; // ~50ms per character
    const readingRatio = Math.min(interaction.readingTime / expectedReadingTime, 2);
    score += readingRatio * 0.3;
    
    // Scroll engagement
    score += Math.min(interaction.scrollEvents / 3, 1) * 0.2;
    
    // Follow-up questions indicate engagement
    if (interaction.hasFollowUp) score += 0.3;
    
    // Conversation continuation
    if (interaction.conversationContinuation) score += 0.2;
    
    return Math.min(score, 1);
  }
}

export const implicitFeedbackCollector = new ImplicitFeedbackCollector();