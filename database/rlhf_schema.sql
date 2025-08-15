-- RLHF Database Schema for Boiler AI
-- This schema supports the reinforcement learning from human feedback system

-- Table for storing all user interactions and feedback
CREATE TABLE rlhf_interactions (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    context JSONB,
    
    -- User information
    user_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255),
    
    -- Explicit feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('helpful', 'unhelpful', 'rating', 'comment', 'implicit')),
    comment TEXT,
    
    -- Implicit feedback signals
    reading_time INTEGER DEFAULT 0,
    scroll_events INTEGER DEFAULT 0,
    has_follow_up BOOLEAN DEFAULT FALSE,
    conversation_continuation BOOLEAN DEFAULT FALSE,
    total_time INTEGER DEFAULT 0,
    engagement_score DECIMAL(3,2) DEFAULT 0,
    
    -- RLHF rewards and metrics
    reward DECIMAL(5,4) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    explicit_reward DECIMAL(5,4) DEFAULT 0,
    implicit_reward DECIMAL(5,4) DEFAULT 0,
    contextual_reward DECIMAL(5,4) DEFAULT 0,
    novelty_reward DECIMAL(5,4) DEFAULT 0,
    
    -- Metadata
    ai_service VARCHAR(50) DEFAULT 'openai',
    reasoning_mode BOOLEAN DEFAULT TRUE,
    model_used VARCHAR(100) DEFAULT 'gpt-4',
    response_time INTEGER, -- in milliseconds
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing optimized prompts from RLHF
CREATE TABLE optimized_prompts (
    id SERIAL PRIMARY KEY,
    prompt_type VARCHAR(100) NOT NULL, -- 'reasoning', 'fallback', etc.
    prompt_text TEXT NOT NULL,
    version BIGINT NOT NULL,
    
    -- Performance metrics
    average_reward DECIMAL(5,4),
    improvement_score DECIMAL(5,4),
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    replaced_by INTEGER REFERENCES optimized_prompts(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP,
    deactivated_at TIMESTAMP
);

-- Table for tracking prompt optimization events
CREATE TABLE prompt_optimizations (
    id SERIAL PRIMARY KEY,
    trigger_type VARCHAR(100) NOT NULL, -- 'schedule', 'threshold', 'manual'
    
    -- Input data
    interactions_analyzed INTEGER NOT NULL,
    avg_reward_before DECIMAL(5,4) NOT NULL,
    avg_reward_after DECIMAL(5,4),
    
    -- Optimization details
    old_prompt_id INTEGER REFERENCES optimized_prompts(id),
    new_prompt_id INTEGER REFERENCES optimized_prompts(id),
    improvement_suggestions JSONB,
    
    -- Results
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    error_message TEXT,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Table for query pattern learning
CREATE TABLE query_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_description TEXT,
    
    -- Pattern matching
    keywords JSONB, -- Array of keywords that match this pattern
    query_examples JSONB, -- Array of example queries
    context_requirements JSONB, -- What context is needed
    
    -- Success metrics
    match_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0,
    average_reward DECIMAL(5,4) DEFAULT 0,
    
    -- Learning status
    confidence_score DECIMAL(3,2) DEFAULT 0,
    last_matched_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for failure analysis and learning
CREATE TABLE failure_analysis (
    id SERIAL PRIMARY KEY,
    interaction_id INTEGER REFERENCES rlhf_interactions(id),
    
    -- Failure classification
    failure_type VARCHAR(100) NOT NULL, -- 'knowledge_gap', 'misunderstanding', 'incomplete_response', 'context_missing'
    failure_severity VARCHAR(50) DEFAULT 'medium' CHECK (failure_severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Analysis
    identified_issues JSONB,
    suggested_improvements JSONB,
    
    -- Resolution tracking
    resolution_status VARCHAR(50) DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'wont_fix')),
    resolution_notes TEXT,
    
    -- Timestamps
    identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Table for A/B testing RLHF improvements
CREATE TABLE ab_experiments (
    id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Experiment configuration
    control_prompt_id INTEGER REFERENCES optimized_prompts(id),
    test_prompt_id INTEGER REFERENCES optimized_prompts(id),
    traffic_split DECIMAL(3,2) DEFAULT 0.5, -- Percentage going to test
    
    -- Success criteria
    target_metric VARCHAR(100) NOT NULL, -- 'reward', 'satisfaction', 'engagement'
    success_threshold DECIMAL(5,4) NOT NULL,
    minimum_sample_size INTEGER DEFAULT 100,
    
    -- Results
    control_avg_reward DECIMAL(5,4),
    test_avg_reward DECIMAL(5,4),
    statistical_significance DECIMAL(5,4),
    winner VARCHAR(20) CHECK (winner IN ('control', 'test', 'inconclusive')),
    
    -- Status
    status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'completed', 'stopped')),
    
    -- Timestamps
    planned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_rlhf_interactions_user_id ON rlhf_interactions(user_id);
CREATE INDEX idx_rlhf_interactions_created_at ON rlhf_interactions(created_at);
CREATE INDEX idx_rlhf_interactions_reward ON rlhf_interactions(reward);
CREATE INDEX idx_rlhf_interactions_message_id ON rlhf_interactions(message_id);
CREATE INDEX idx_optimized_prompts_active ON optimized_prompts(prompt_type, is_active);
CREATE INDEX idx_query_patterns_keywords ON query_patterns USING GIN(keywords);
CREATE INDEX idx_failure_analysis_type ON failure_analysis(failure_type, failure_severity);

-- Views for analytics
CREATE VIEW rlhf_performance_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_interactions,
    AVG(reward) as avg_reward,
    AVG(confidence) as avg_confidence,
    AVG(engagement_score) as avg_engagement,
    COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings,
    COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_ratings,
    COUNT(CASE WHEN has_follow_up THEN 1 END) as follow_up_count
FROM rlhf_interactions 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE VIEW prompt_performance AS
SELECT 
    op.id,
    op.prompt_type,
    op.version,
    op.is_active,
    COUNT(ri.id) as usage_count,
    AVG(ri.reward) as avg_reward,
    AVG(ri.confidence) as avg_confidence,
    op.created_at
FROM optimized_prompts op
LEFT JOIN rlhf_interactions ri ON ri.created_at >= op.created_at 
    AND ri.created_at < COALESCE(op.deactivated_at, CURRENT_TIMESTAMP)
WHERE op.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY op.id, op.prompt_type, op.version, op.is_active, op.created_at
ORDER BY op.prompt_type, op.version DESC;

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rlhf_interactions_updated_at 
    BEFORE UPDATE ON rlhf_interactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_query_patterns_updated_at 
    BEFORE UPDATE ON query_patterns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate improvement trends
CREATE OR REPLACE FUNCTION calculate_improvement_trend(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    period TEXT,
    avg_reward DECIMAL,
    improvement_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_rewards AS (
        SELECT 
            DATE(created_at) as date,
            AVG(reward) as daily_avg_reward,
            ROW_NUMBER() OVER (ORDER BY DATE(created_at)) as day_num
        FROM rlhf_interactions 
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
        GROUP BY DATE(created_at)
    ),
    trend_calc AS (
        SELECT 
            'Last ' || days_back || ' days' as period,
            AVG(daily_avg_reward) as avg_reward,
            (
                SELECT 
                    (MAX(daily_avg_reward) - MIN(daily_avg_reward)) / 
                    NULLIF(MIN(daily_avg_reward), 0) * 100
                FROM daily_rewards
            ) as improvement_rate
        FROM daily_rewards
    )
    SELECT 
        trend_calc.period,
        trend_calc.avg_reward,
        trend_calc.improvement_rate
    FROM trend_calc;
END;
$$ LANGUAGE plpgsql;

-- Initial data
INSERT INTO optimized_prompts (prompt_type, prompt_text, version, is_active) VALUES 
('reasoning', 'You are BoilerAI, an expert academic advisor for Purdue University students.

ANALYZE the student''s query to understand:
- Their academic status and goals
- Specific requirements or constraints
- The urgency and context of their situation

REASON through the academic implications:
- Course prerequisites and scheduling
- Graduation timeline impacts
- Academic policy considerations
- Alternative options and trade-offs

VALIDATE your recommendations:
- Check against Purdue requirements
- Consider the student''s specific situation
- Ensure practical feasibility

SYNTHESIZE a clear, actionable response:
- Prioritize immediate next steps
- Provide specific course recommendations
- Include timeline and scheduling guidance
- Offer encouragement and support', 1, TRUE),

('fallback', 'You are BoilerAI, a helpful academic advisor. The main system is experiencing issues, but I can still provide general academic guidance for Purdue students. I''ll do my best to help with course planning, graduation requirements, and academic decisions.', 1, TRUE);