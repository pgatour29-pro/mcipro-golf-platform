-- =====================================================================
-- CHECK WHICH SOCIETIES EXIST IN DATABASE
-- =====================================================================
-- Run this to see what society organizers are currently in the database
-- =====================================================================

-- Show all organizer profiles
SELECT
    line_user_id,
    name,
    username,
    role,
    society_name,
    email,
    profile_data->'organizationInfo'->>'societyLogo' as logo,
    profile_data->'organizationInfo'->>'description' as description,
    created_at
FROM user_profiles
WHERE role = 'organizer'
ORDER BY society_name;

-- Count total organizers
SELECT COUNT(*) as total_organizers
FROM user_profiles
WHERE role = 'organizer';

-- Show what should be there:
-- 1. Ora Ora Golf (Uabcdef1234567890abcdef1234567890)
-- 2. Travellers Rest Golf Group (U2b6d976f19bca4b2f4374ae0e10ed873)
