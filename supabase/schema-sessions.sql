-- ============================================================================
-- User Session Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_out_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_at ON user_sessions(login_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert user_sessions" ON user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon select user_sessions" ON user_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anon update user_sessions" ON user_sessions FOR UPDATE USING (true);
