-- =====================================================================
-- FIX DONALD LUMP 16 PROFILE - CLEAR USERNAME AND LASTNAME
-- =====================================================================
-- Problem: Profile keeps reverting to LINE display name and showing last name
-- Solution: Update Supabase to have blank username and clear last name
-- Date: 2025-10-11
-- =====================================================================

-- First, let's see what's currently stored
SELECT
    line_user_id,
    name,
    username,
    role,
    profile_data->'personalInfo'->>'username' as profile_username,
    profile_data->'personalInfo'->>'firstName' as firstName,
    profile_data->'personalInfo'->>'lastName' as lastName
FROM user_profiles
WHERE name = 'Donald Lump 16' OR username LIKE '%Donald%' OR username LIKE '%Lump%';

-- Update the profile to clear username and last name
UPDATE user_profiles
SET
    username = '',  -- Clear username at root level
    profile_data = jsonb_set(
        jsonb_set(
            profile_data,
            '{personalInfo,username}',
            '""'::jsonb  -- Clear username in nested structure
        ),
        '{personalInfo,lastName}',
        '""'::jsonb  -- Clear last name
    )
WHERE name = 'Donald Lump 16' OR username LIKE '%Donald%' OR username LIKE '%Lump%';

-- Verify the update
SELECT
    line_user_id,
    name,
    username,
    role,
    profile_data->'personalInfo'->>'username' as profile_username,
    profile_data->'personalInfo'->>'firstName' as firstName,
    profile_data->'personalInfo'->>'lastName' as lastName,
    profile_data->'golfInfo'->>'handicap' as handicap,
    profile_data->'golfInfo'->>'homeClub' as homeClub
FROM user_profiles
WHERE name = 'Donald Lump 16' OR username = '';

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify username is now empty string
-- 3. Verify lastName is now empty string
-- 4. Hard refresh app (Ctrl+Shift+R)
-- 5. Profile should now be blank and not revert
-- =====================================================================
