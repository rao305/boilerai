-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'ANALYST', 'DEVOPS', 'USER');

-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('success', 'fallback', 'policy_block', 'no_answer');

-- CreateEnum
CREATE TYPE "MatchWinner" AS ENUM ('A', 'B', 'draw');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcomes" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" TEXT,
    "topic_key" TEXT NOT NULL,
    "status" "OutcomeStatus" NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "tokens_in" INTEGER NOT NULL,
    "tokens_out" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_stats" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "intent_hash" TEXT NOT NULL,
    "topic_key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redacted_examples" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "snippet" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redacted_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dp_metrics" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "value_numeric" DOUBLE PRECISION NOT NULL,
    "labels" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dp_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elo_topic" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "topic_key" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "rd" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "vol" DOUBLE PRECISION NOT NULL DEFAULT 0.06,

    CONSTRAINT "elo_topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "elo_match" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "topic_key" TEXT NOT NULL,
    "model_a" TEXT NOT NULL,
    "model_b" TEXT NOT NULL,
    "winner" "MatchWinner" NOT NULL,
    "judge" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "elo_match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit" (
    "id" TEXT NOT NULL,
    "org_id" UUID NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_org_id_role_key" ON "user_roles"("user_id", "org_id", "role");

-- CreateIndex
CREATE INDEX "outcomes_org_id_topic_key_status_idx" ON "outcomes"("org_id", "topic_key", "status");

-- CreateIndex
CREATE INDEX "outcomes_org_id_created_at_idx" ON "outcomes"("org_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "intent_stats_org_id_intent_hash_topic_key_key" ON "intent_stats"("org_id", "intent_hash", "topic_key");

-- CreateIndex
CREATE INDEX "intent_stats_org_id_topic_key_idx" ON "intent_stats"("org_id", "topic_key");

-- CreateIndex
CREATE INDEX "redacted_examples_org_id_created_at_idx" ON "redacted_examples"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "dp_metrics_org_id_metric_key_created_at_idx" ON "dp_metrics"("org_id", "metric_key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "elo_topic_org_id_topic_key_key" ON "elo_topic"("org_id", "topic_key");

-- CreateIndex
CREATE INDEX "elo_match_org_id_topic_key_created_at_idx" ON "elo_match"("org_id", "topic_key", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_org_id_created_at_idx" ON "admin_audit"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_audit_org_id_action_idx" ON "admin_audit"("org_id", "action");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elo_match" ADD CONSTRAINT "elo_match_org_id_topic_key_fkey" FOREIGN KEY ("org_id", "topic_key") REFERENCES "elo_topic"("org_id", "topic_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit" ADD CONSTRAINT "admin_audit_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- Create RLS policies for org isolation
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

-- Enable pg_cron extension for TTL cleanup jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule TTL cleanup jobs
-- Delete redacted_examples older than 30 days
SELECT cron.schedule('cleanup-redacted-examples', '0 2 * * *', 'DELETE FROM redacted_examples WHERE created_at < NOW() - INTERVAL ''30 days'';');

-- Delete dp_metrics older than 90 days
SELECT cron.schedule('cleanup-dp-metrics', '0 3 * * *', 'DELETE FROM dp_metrics WHERE created_at < NOW() - INTERVAL ''90 days'';');