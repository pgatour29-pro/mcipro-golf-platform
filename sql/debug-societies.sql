-- =====================================================================
-- DEBUG: Check what's in the database right now
-- =====================================================================

-- Show ALL user profiles
SELECT
    line_user_id,
    name,
    username,
    role,
    society_name,
    email,
    created_at
FROM user_profiles
ORDER BY role, name;

-- Show only organizers
SELECT
    line_user_id,
    name,
    role,
    society_name
FROM user_profiles
WHERE role = 'organizer';

-- Check if Pete's LINE ID is used for multiple profiles
SELECT
    line_user_id,
    name,
    role,
    COUNT(*) as count
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
GROUP BY line_user_id, name, role;
