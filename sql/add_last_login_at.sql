-- Real login tracking for User Activity analytics.
-- Previously the panel used user_profiles.updated_at as "last active", but ANY profile
-- write (e.g. a global handicap update) bumps updated_at, creating phantom "Online" users.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
