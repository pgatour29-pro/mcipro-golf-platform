-- User Sessions Table for Accurate Login Tracking
-- Created: 2026-01-10

-- Create the user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                          -- LINE user ID (U...) or other OAuth ID
    session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_end TIMESTAMPTZ,                         -- NULL if still active
    device_info JSONB DEFAULT '{}',                  -- Browser, OS, screen size
    ip_address TEXT,
    login_method TEXT DEFAULT 'line',                -- line, google, kakao, manual
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = true;

-- Add last_login column to user_profiles for quick lookup
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create index on last_login
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login DESC);

-- Function to record a login session
CREATE OR REPLACE FUNCTION record_user_session(
    p_user_id TEXT,
    p_device_info JSONB DEFAULT '{}',
    p_login_method TEXT DEFAULT 'line'
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- End any existing active sessions for this user (optional - for single session mode)
    -- UPDATE user_sessions SET is_active = false, session_end = NOW()
    -- WHERE user_id = p_user_id AND is_active = true;

    -- Create new session
    INSERT INTO user_sessions (user_id, device_info, login_method)
    VALUES (p_user_id, p_device_info, p_login_method)
    RETURNING id INTO v_session_id;

    -- Update last_login in user_profiles
    UPDATE user_profiles
    SET last_login = NOW(), updated_at = NOW()
    WHERE line_user_id = p_user_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user activity stats
CREATE OR REPLACE FUNCTION get_user_activity_stats()
RETURNS TABLE (
    total_real_users BIGINT,
    active_today BIGINT,
    active_this_week BIGINT,
    active_this_month BIGINT,
    new_users_today BIGINT,
    new_users_this_week BIGINT,
    new_users_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Total real users (exclude TRGG-GUEST-*, include U*, GOOGLE-*, KAKAO-*, MANUAL-*)
        (SELECT COUNT(*) FROM user_profiles
         WHERE line_user_id IS NOT NULL
         AND line_user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as total_real_users,

        -- Active today (had a session today)
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions
         WHERE session_start >= CURRENT_DATE
         AND user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as active_today,

        -- Active this week
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions
         WHERE session_start >= CURRENT_DATE - INTERVAL '7 days'
         AND user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as active_this_week,

        -- Active this month
        (SELECT COUNT(DISTINCT user_id) FROM user_sessions
         WHERE session_start >= CURRENT_DATE - INTERVAL '30 days'
         AND user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as active_this_month,

        -- New users today
        (SELECT COUNT(*) FROM user_profiles
         WHERE created_at >= CURRENT_DATE
         AND line_user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as new_users_today,

        -- New users this week
        (SELECT COUNT(*) FROM user_profiles
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
         AND line_user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as new_users_this_week,

        -- New users this month
        (SELECT COUNT(*) FROM user_profiles
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         AND line_user_id NOT LIKE 'TRGG-GUEST-%')::BIGINT as new_users_this_month;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON user_sessions TO service_role;
GRANT EXECUTE ON FUNCTION record_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION record_user_session TO service_role;
GRANT EXECUTE ON FUNCTION get_user_activity_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_stats TO service_role;

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role can do everything
CREATE POLICY "Service role full access" ON user_sessions
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE user_sessions IS 'Tracks user login sessions for accurate activity reporting';
COMMENT ON COLUMN user_sessions.user_id IS 'LINE user ID (U...) or other OAuth provider ID';
COMMENT ON COLUMN user_sessions.session_start IS 'When the user logged in';
COMMENT ON COLUMN user_sessions.device_info IS 'Browser, OS, screen size info';
