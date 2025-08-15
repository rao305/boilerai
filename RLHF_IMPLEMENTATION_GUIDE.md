# RLHF Implementation Guide for Boiler AI

## 🎯 Overview

This implementation adds **Reinforcement Learning from Human Feedback (RLHF)** to your existing Boiler AI system, enabling it to continuously improve based on user interactions and feedback. The system learns from both explicit feedback (ratings, comments) and implicit signals (engagement, behavior patterns).

## 🏗️ Architecture

### Core Components

1. **FeedbackCollector.tsx** - Frontend feedback collection UI
2. **rlhfService.ts** - Reward calculation and prompt optimization
3. **selfImprovementEngine.ts** - Automated improvement triggers
4. **API endpoints** - Backend feedback processing
5. **Database schema** - RLHF data storage
6. **Enhanced OpenAI service** - Uses optimized prompts

### How It Works

```
User Query → AI Response → Feedback Collection → Reward Calculation → 
Prompt Optimization → Improved Future Responses
```

## 🚀 Quick Start

### 1. Database Setup

```sql
-- Run the database schema
psql -d your_database -f database/rlhf_schema.sql
```

### 2. Environment Variables

Add to your environment:
```env
# Database connection (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/boilerai

# OpenAI API key (already configured)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Frontend Integration

The feedback collector is already integrated into your `AIAssistant.tsx`. Each AI response now shows:

- 👍/👎 quick feedback buttons
- ⭐ Star rating system
- 💬 Optional comment field
- Automatic implicit feedback tracking

### 4. Backend Integration

Add the API endpoints to your backend router:

```typescript
import { rlhfAPI } from './src/api/rlhf';

// Add these routes to your Express/Next.js API
app.use('/api/feedback', rlhfAPI);
app.use('/api/rlhf', rlhfAPI);
```

### 5. Start Self-Improvement Engine

The engine starts automatically, but you can also control it:

```typescript
import { selfImprovementEngine } from './src/services/selfImprovementEngine';

// Manual trigger (for testing)
await selfImprovementEngine.triggerManualImprovement();

// Check status
console.log(selfImprovementEngine.getSystemStatus());
```

## 📊 How RLHF Improves Your AI

### Feedback Types Collected

1. **Explicit Feedback**
   - Star ratings (1-5)
   - Thumbs up/down
   - Written comments
   - Follow-up questions

2. **Implicit Feedback**
   - Reading time vs response length
   - Scrolling behavior
   - Conversation continuation
   - Question refinement patterns

### Reward Calculation

```typescript
reward = (
  explicit_feedback * 0.4 +     // User ratings/comments
  implicit_feedback * 0.3 +     // Engagement signals
  contextual_quality * 0.2 +    // Response relevance
  novelty_bonus * 0.1           // Handling new query types
)
```

### Automatic Improvements

The system automatically triggers improvements when:

- **Performance drops**: Average reward < 0.3
- **New data available**: Every 50 interactions
- **Scheduled**: Daily optimization
- **Failure spike**: High error rates detected

## 🔧 Configuration

### Improvement Triggers

Customize trigger thresholds:

```typescript
// Adjust sensitivity
selfImprovementEngine.updateTrigger('performance_threshold', {
  threshold: 0.4 // Trigger when reward drops below 0.4
});

selfImprovementEngine.updateTrigger('data_volume', {
  threshold: 25 // Trigger every 25 interactions instead of 50
});
```

### Reward Weights

Modify reward calculation in `rlhfService.ts`:

```typescript
// In calculateReward method, adjust these weights:
reward = (
  breakdown.explicit * 0.5 +    // Increase explicit feedback weight
  breakdown.implicit * 0.2 +    // Decrease implicit weight
  breakdown.contextual * 0.2 +
  breakdown.novelty * 0.1
);
```

## 📈 Monitoring and Analytics

### Real-Time Metrics

```typescript
import { rlhfService } from './src/services/rlhfService';

const metrics = rlhfService.getPerformanceMetrics();
console.log({
  averageReward: metrics.averageReward,
  totalInteractions: metrics.totalInteractions,
  improvementTrend: metrics.improvementTrend
});
```

### Database Queries

Monitor performance with SQL queries:

```sql
-- Daily performance summary
SELECT * FROM rlhf_performance_summary ORDER BY date DESC LIMIT 7;

-- Prompt performance comparison
SELECT * FROM prompt_performance WHERE prompt_type = 'reasoning';

-- Recent high-reward interactions
SELECT query, response, reward FROM rlhf_interactions 
WHERE reward > 0.7 ORDER BY created_at DESC LIMIT 10;
```

### Improvement History

Track what improvements have been made:

```typescript
const history = selfImprovementEngine.getImprovementHistory();
console.log('Recent improvements:', history.slice(-5));
```

## 🧪 Testing the System

### 1. Generate Test Feedback

```typescript
// Simulate positive feedback
await fetch('/api/feedback/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messageId: 'test-123',
    query: 'What courses should I take next semester?',
    response: 'Based on your academic progress...',
    rating: 5,
    feedback_type: 'rating',
    userId: 'test-user',
    context: { hasTranscript: true }
  })
});
```

### 2. Trigger Manual Optimization

```typescript
// Force an improvement cycle
const result = await selfImprovementEngine.triggerManualImprovement();
console.log('Improvement result:', result);
```

### 3. Test Prompt Evolution

Before and after optimization, test the same query:

```typescript
// Before optimization
const oldPrompt = rlhfService.getOptimizedPrompt('reasoning');

// Trigger optimization
await selfImprovementEngine.triggerManualImprovement();

// After optimization
const newPrompt = rlhfService.getOptimizedPrompt('reasoning');

console.log('Prompt evolved:', oldPrompt !== newPrompt);
```

## 🎯 Expected Results

### Short Term (1-2 weeks)
- Feedback collection starts
- Basic reward calculation working
- First prompt optimizations triggered

### Medium Term (1 month)
- 10-20% improvement in user satisfaction ratings
- AI learns to handle previously failed query types
- Adaptive responses based on user patterns

### Long Term (3+ months)
- 30-50% improvement in response quality
- AI develops domain expertise in common student questions
- Proactive handling of edge cases and novel queries

## 🔍 Troubleshooting

### Common Issues

1. **No feedback being collected**
   ```typescript
   // Check if feedback collector is rendering
   console.log('Feedback collector loaded:', document.querySelector('[data-testid="feedback-collector"]'));
   ```

2. **Optimizations not triggering**
   ```typescript
   // Check trigger conditions
   const status = selfImprovementEngine.getSystemStatus();
   console.log('Engine status:', status);
   ```

3. **Database connection issues**
   ```sql
   -- Test database connection
   SELECT COUNT(*) FROM rlhf_interactions;
   ```

### Debug Mode

Enable verbose logging:

```typescript
// In rlhfService.ts constructor
console.log('🧠 RLHF Service initialized in debug mode');

// In selfImprovementEngine.ts
localStorage.setItem('rlhf_debug', 'true');
```

## 🔒 Security Considerations

### Data Privacy
- User feedback is stored with anonymized IDs
- PII is not included in RLHF data
- Feedback data retention policies can be configured

### Rate Limiting
- Feedback collection has built-in rate limiting
- Optimization triggers have cooldown periods
- Manual improvements require authentication

### Prompt Safety
- All optimized prompts are validated before deployment
- Fallback to original prompts if optimization fails
- Human review can be required for major prompt changes

## 🚀 Advanced Features

### A/B Testing
Use the `ab_experiments` table to test prompt variations:

```sql
INSERT INTO ab_experiments (experiment_name, control_prompt_id, test_prompt_id, traffic_split)
VALUES ('reasoning_improvement_v2', 1, 2, 0.3);
```

### Custom Reward Functions
Implement domain-specific reward calculations:

```typescript
// In rlhfService.ts, add custom reward logic
private calculateAcademicAdvisingReward(feedback: FeedbackData): number {
  // Custom logic for academic advising quality
  let reward = 0;
  
  if (feedback.response.includes('specific course codes')) reward += 0.2;
  if (feedback.response.includes('prerequisite')) reward += 0.1;
  if (feedback.response.includes('graduation timeline')) reward += 0.1;
  
  return reward;
}
```

### Multi-Agent RLHF
Extend to different AI agents:

```typescript
// Different reward models for different agents
const agents = {
  'academic-advisor': new RLHFService('academic'),
  'career-counselor': new RLHFService('career'),
  'course-planner': new RLHFService('planning')
};
```

## 📚 Further Reading

- [RLHF Paper](https://arxiv.org/abs/2203.02155) - Original research
- [OpenAI RLHF](https://openai.com/research/learning-from-human-preferences) - Implementation details
- [Anthropic Constitutional AI](https://arxiv.org/abs/2212.08073) - Advanced techniques

## 🤝 Contributing

To extend the RLHF system:

1. Add new feedback types in `FeedbackCollector.tsx`
2. Implement custom reward calculations in `rlhfService.ts`
3. Create specialized improvement triggers in `selfImprovementEngine.ts`
4. Add new analytics views in the database schema

The system is designed to be modular and extensible while maintaining your existing architecture.