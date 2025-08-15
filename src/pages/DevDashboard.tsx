import React, { useState, useEffect } from 'react';
import { eloTrackingService, QueryPattern, HumanReviewItem } from '@/services/eloTrackingService';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, MessageSquare, User } from 'lucide-react';

export default function DevDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [reviewQueue, setReviewQueue] = useState<HumanReviewItem[]>([]);
  const [selectedReview, setSelectedReview] = useState<HumanReviewItem | null>(null);
  const [humanResponse, setHumanResponse] = useState('');
  const [improvementNotes, setImprovementNotes] = useState('');
  const [trainingPrompt, setTrainingPrompt] = useState('');

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading DevDashboard data...');
      const analyticsData = eloTrackingService.getAnalytics();
      const queueData = await eloTrackingService.getHumanReviewQueue();
      
      console.log('📈 Analytics loaded:', analyticsData);
      console.log('🔍 Review queue loaded:', queueData);
      
      setAnalytics(analyticsData);
      setReviewQueue(queueData);
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
    }
  };

  const submitHumanReview = async () => {
    if (!selectedReview) return;

    try {
      await eloTrackingService.submitHumanReview(selectedReview.id, {
        correctResponse: humanResponse,
        improvementNotes: improvementNotes,
        trainingPrompt: trainingPrompt,
        reviewedBy: 'admin' // In a real app, this would be the logged-in admin user
      });

      // Reset form and reload data
      setSelectedReview(null);
      setHumanResponse('');
      setImprovementNotes('');
      setTrainingPrompt('');
      await loadDashboardData();

      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review');
    }
  };

  if (!analytics) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <User className="text-blue-400" />
          Developer Dashboard
          <span className="text-sm font-normal text-neutral-400 ml-4">
            AI Response Quality & Human Review
          </span>
        </h1>

        {/* Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-400">Total Queries</h3>
              <MessageSquare className="text-blue-400" size={20} />
            </div>
            <p className="text-2xl font-bold mt-2">{analytics.totalQueries}</p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-400">Avg ELO Score</h3>
              <TrendingUp className="text-green-400" size={20} />
            </div>
            <p className="text-2xl font-bold mt-2">{Math.round(analytics.averageEloScore)}</p>
            <p className="text-xs text-neutral-400 mt-1">
              {analytics.averageEloScore > 1000 ? 'Above baseline' : 'Below baseline'}
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-400">Review Queue</h3>
              <AlertTriangle className="text-orange-400" size={20} />
            </div>
            <p className="text-2xl font-bold mt-2">{analytics.reviewQueueSize}</p>
            <p className="text-xs text-neutral-400 mt-1">
              {analytics.reviewQueueSize > 0 ? 'Needs attention' : 'All clear'}
            </p>
          </div>

          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-400">Recent Trend</h3>
              {analytics.recentTrends.improvingPatterns > analytics.recentTrends.decliningPatterns ? (
                <TrendingUp className="text-green-400" size={20} />
              ) : (
                <TrendingDown className="text-red-400" size={20} />
              )}
            </div>
            <p className="text-2xl font-bold mt-2">
              {analytics.recentTrends.improvingPatterns > analytics.recentTrends.decliningPatterns ? '↗' : '↘'}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {analytics.recentTrends.improvingPatterns} improving, {analytics.recentTrends.decliningPatterns} declining
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Human Review Queue */}
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-400" size={20} />
              Human Review Queue ({reviewQueue.length})
            </h2>
            
            {reviewQueue.length === 0 ? (
              <p className="text-neutral-400 text-center py-8">No items need review</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {reviewQueue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded border cursor-pointer transition-colors ${
                      selectedReview?.id === item.id 
                        ? 'border-blue-500 bg-blue-900/20' 
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                    onClick={() => setSelectedReview(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {item.originalQuery.substring(0, 80)}...
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          ELO: {item.eloScore} • {item.userRating === 'positive' ? '👍' : '👎'} • {item.submittedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        item.userRating === 'positive' 
                          ? 'bg-green-900/30 text-green-400' 
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {item.userRating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Patterns */}
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4">Performance Patterns</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-green-400 mb-2">Top Performing Queries</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analytics.topPerformingPatterns.slice(0, 5).map((pattern: QueryPattern) => (
                    <div key={pattern.id} className="flex items-center justify-between p-2 bg-green-900/10 rounded">
                      <span className="text-sm">{pattern.queryText.substring(0, 40)}...</span>
                      <span className="text-green-400 font-medium">{pattern.eloScore}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-red-400 mb-2">Needs Improvement</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analytics.lowPerformingPatterns.slice(0, 5).map((pattern: QueryPattern) => (
                    <div key={pattern.id} className="flex items-center justify-between p-2 bg-red-900/10 rounded">
                      <span className="text-sm">{pattern.queryText.substring(0, 40)}...</span>
                      <span className="text-red-400 font-medium">{pattern.eloScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Human Review Form */}
        {selectedReview && (
          <div className="mt-8 bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="text-blue-400" size={20} />
              Review Query: {selectedReview.userRating === 'positive' ? '👍' : '👎'}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-400 mb-2">Original Query</h3>
                <div className="p-3 bg-neutral-800 rounded text-sm">
                  {selectedReview.originalQuery}
                </div>

                <h3 className="text-sm font-medium text-neutral-400 mb-2 mt-4">AI Response</h3>
                <div className="p-3 bg-neutral-800 rounded text-sm max-h-40 overflow-y-auto">
                  {selectedReview.originalResponse}
                </div>

                <div className="mt-4 text-sm">
                  <p className="text-neutral-400">
                    ELO Score: <span className="text-white">{selectedReview.eloScore}</span> • 
                    Submitted: <span className="text-white">{selectedReview.submittedAt.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Correct Response
                  </label>
                  <textarea
                    value={humanResponse}
                    onChange={(e) => setHumanResponse(e.target.value)}
                    className="w-full h-32 p-3 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none resize-none"
                    placeholder="Provide the correct response that should have been given..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Improvement Notes
                  </label>
                  <textarea
                    value={improvementNotes}
                    onChange={(e) => setImprovementNotes(e.target.value)}
                    className="w-full h-24 p-3 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none resize-none"
                    placeholder="What went wrong? What should the AI learn from this?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">
                    Training Prompt (Optional)
                  </label>
                  <textarea
                    value={trainingPrompt}
                    onChange={(e) => setTrainingPrompt(e.target.value)}
                    className="w-full h-24 p-3 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none resize-none"
                    placeholder="System prompt addition to handle similar queries better..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={submitHumanReview}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                  >
                    Submit Review
                  </button>
                  <button
                    onClick={() => setSelectedReview(null)}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}