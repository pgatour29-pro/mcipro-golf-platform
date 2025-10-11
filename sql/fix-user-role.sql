-- FIX USER ROLE IN SUPABASE
-- Change Pete's profile from manager to golfer

UPDATE user_profiles
SET role = 'golfer',
    user_role = 'golfer'
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Verify the change
SELECT line_user_id, name, role, user_role
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
