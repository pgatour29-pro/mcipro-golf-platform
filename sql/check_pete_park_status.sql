-- =====================================================
-- CHECK PETE PARK STATUS IN BOTH TABLES
-- =====================================================

-- Check if Pete Park exists in user_profiles (main system)
SELECT
    'MAIN SYSTEM (user_profiles)' as table_name,
    line_user_id,
    name,
    email,
    created_at,
    CASE
        WHEN created_at IS NULL THEN '⚠️ MISSING created_at - This might cause Admin System issues'
        ELSE '✅ Has created_at'
    END as status
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Check Pete Park entries in society_members (society directory)
SELECT
    'SOCIETY DIRECTORY (society_members)' as table_name,
    sm.id,
    sp.society_name,
    sm.golfer_id,
    sm.member_number,
    sm.status
FROM society_members sm
JOIN society_profiles sp ON sm.society_id = sp.id
WHERE sm.golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY sp.society_name, sm.id;

-- Count duplicates for Pete Park
SELECT
    'DUPLICATE COUNT' as info,
    sp.society_name,
    COUNT(*) as pete_park_entries
FROM society_members sm
JOIN society_profiles sp ON sm.society_id = sp.id
WHERE sm.golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
GROUP BY sp.society_name;

-- Fix Pete Park's user_profiles record if created_at is missing
UPDATE user_profiles
SET created_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND created_at IS NULL;

-- Verify the fix
SELECT
    'AFTER FIX' as status,
    line_user_id,
    name,
    email,
    created_at
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
