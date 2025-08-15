import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface EloRatingProps {
  messageId: string;
  query: string;
  response: string;
  context: any;
  userId: string;
  onRatingSubmitted?: (rating: 'positive' | 'negative') => void;
}

export default function SimpleEloRating({ 
  messageId, 
  query, 
  response, 
  context, 
  userId, 
  onRatingSubmitted 
}: EloRatingProps) {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load persisted rating on component mount
  useEffect(() => {
    const savedRating = localStorage.getItem(`elo_rating_${messageId}`);
    if (savedRating && (savedRating === 'positive' || savedRating === 'negative')) {
      setRating(savedRating as 'positive' | 'negative');
    }
  }, [messageId]);

  const submitRating = async (ratingValue: 'positive' | 'negative') => {
    if (submitting || rating) return; // Prevent double submission
    
    setSubmitting(true);
    setRating(ratingValue);

    // Persist rating immediately to localStorage
    localStorage.setItem(`elo_rating_${messageId}`, ratingValue);

    try {
      const eloData = {
        messageId,
        query,
        response,
        context,
        userId,
        rating: ratingValue,
        timestamp: new Date().toISOString(),
        // ELO-specific data
        ratingType: 'elo',
        score: ratingValue === 'positive' ? 1 : -1
      };

      console.log('📊 Submitting ELO rating:', eloData);
      
      const response = await window.fetch('/api/elo/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eloData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ ELO rating submitted successfully:', result);
        onRatingSubmitted?.(ratingValue);
      } else {
        const errorData = await response.text();
        console.error('❌ ELO rating submission failed:', response.status, errorData);
        throw new Error(`Rating submission failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to submit ELO rating:', error);
      // Don't reset rating on error since it's already persisted
      // The user can see their rating was recorded even if submission failed
    } finally {
      setSubmitting(false);
    }
  };

  if (rating) {
    return (
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span className="text-neutral-400">Rated:</span>
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          rating === 'positive' 
            ? 'bg-green-900/20 text-green-400' 
            : 'bg-red-900/20 text-red-400'
        }`}>
          {rating === 'positive' ? (
            <>
              <ThumbsUp size={12} />
              <span>Good</span>
            </>
          ) : (
            <>
              <ThumbsDown size={12} />
              <span>Bad</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-neutral-400">Rate:</span>
      <div className="flex gap-1">
        <button
          onClick={() => submitRating('positive')}
          disabled={submitting}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-300 hover:text-green-400 hover:bg-green-900/20 transition-colors disabled:opacity-50"
          title="Good response"
        >
          <ThumbsUp size={12} />
          <span className="sr-only">Good</span>
        </button>
        
        <button
          onClick={() => submitRating('negative')}
          disabled={submitting}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-300 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
          title="Bad response"
        >
          <ThumbsDown size={12} />
          <span className="sr-only">Bad</span>
        </button>
      </div>
    </div>
  );
}