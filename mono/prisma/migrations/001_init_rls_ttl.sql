-- Initial migration with RLS policies and TTL setup
-- Enable Row Level Security on all tables

-- Enable RLS on all multi-tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE redacted_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE dp_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_topic ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_match ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
CREATE POLICY users_isolation ON users
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY user_roles_isolation ON user_roles
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY outcomes_isolation ON outcomes
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY intent_stats_isolation ON intent_stats
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY redacted_examples_isolation ON redacted_examples
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY dp_metrics_isolation ON dp_metrics
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY elo_topic_isolation ON elo_topic
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY elo_match_isolation ON elo_match
    USING (org_id = current_setting('app.org_id')::uuid);

CREATE POLICY admin_audit_isolation ON admin_audit
    USING (org_id = current_setting('app.org_id')::uuid);

-- Enable pg_cron extension for TTL jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- TTL job: Delete redacted_examples older than 30 days
SELECT cron.schedule(
    'cleanup-redacted-examples',
    '0 2 * * *', -- Run daily at 2 AM
    'DELETE FROM redacted_examples WHERE created_at < NOW() - INTERVAL ''30 days'';'
);

-- TTL job: Delete dp_metrics older than 90 days
SELECT cron.schedule(
    'cleanup-dp-metrics',
    '0 3 * * *', -- Run daily at 3 AM
    'DELETE FROM dp_metrics WHERE created_at < NOW() - INTERVAL ''90 days'';'
);

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_email ON users(org_id, email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outcomes_status_topic ON outcomes(org_id, status, topic_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_intent_stats_topic_count ON intent_stats(org_id, topic_key, count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dp_metrics_key_time ON dp_metrics(org_id, metric_key, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_actor_time ON admin_audit(org_id, actor_user_id, created_at DESC);