-- ============================================================================
-- Custom username/password auth (no Supabase Auth / no email required)
-- ============================================================================

-- Reuse existing user_role enum (created in schema-auth.sql)
-- CREATE TYPE user_role AS ENUM ('super_admin', 'cro', 'product_analyst', 'risk_analyst');

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read app_users" ON app_users FOR SELECT USING (true);
CREATE POLICY "Allow anon insert app_users" ON app_users FOR INSERT WITH CHECK (true);
