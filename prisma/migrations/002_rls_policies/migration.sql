-- Enable Row Level Security (RLS) on user data tables
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vault_items" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own profile
CREATE POLICY "users_can_access_own_profile" ON "profiles"
  FOR ALL
  USING (auth.uid()::text = user_id);

-- RLS Policy: Users can only access their own vault items
CREATE POLICY "users_can_access_own_vault_items" ON "vault_items"
  FOR ALL
  USING (auth.uid()::text = user_id);

-- RLS Policy: Insert new profile for authenticated users
CREATE POLICY "users_can_insert_own_profile" ON "profiles"
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- RLS Policy: Insert new vault items for authenticated users
CREATE POLICY "users_can_insert_own_vault_items" ON "vault_items"
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.uid() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    (current_setting('request.jwt.claims', true)::json ->> 'user_id')
  )
$$ LANGUAGE SQL STABLE;

-- Grant usage on auth schema
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

-- Create indexes for RLS performance
CREATE INDEX IF NOT EXISTS "profiles_user_id_rls_idx" ON "profiles"(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS "vault_items_user_id_rls_idx" ON "vault_items"(user_id) WHERE user_id IS NOT NULL;

-- Security: Prevent access to sensitive system tables
REVOKE ALL ON "signal_metrics" FROM anon;
REVOKE ALL ON "redacted_examples" FROM anon;

-- Grant authenticated users read access to their own data only
GRANT SELECT, INSERT, UPDATE, DELETE ON "profiles" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "vault_items" TO authenticated;

-- Admin-only access to aggregated metrics (via API only)
-- signal_metrics and redacted_examples are server-side only