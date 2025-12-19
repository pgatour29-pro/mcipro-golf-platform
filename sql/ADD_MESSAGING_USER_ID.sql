-- Add messaging_user_id column to user_profiles
-- This stores the LINE Messaging API user ID (different from LINE Login user ID)
-- Needed for push notifications

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS messaging_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_messaging_user_id
ON user_profiles(messaging_user_id);

-- Update your profile with the correct messaging user ID
-- (Pete Park's Messaging API user ID from LINE Developers Console)
UPDATE user_profiles
SET messaging_user_id = 'U3a1e201b64695f2bde2e72d97e8adc61'
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Verify
SELECT line_user_id, messaging_user_id, name
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
