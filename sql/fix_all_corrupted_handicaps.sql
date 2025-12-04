-- Fix all corrupted handicaps
-- Run this in Supabase SQL Editor

-- First, let's see what we have
SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' as current_handicap
FROM user_profiles
WHERE profile_data->'golfInfo'->>'handicap' IS NOT NULL
ORDER BY name;

-- ==============================================================
-- MANUALLY EDIT THIS SECTION TO FIX SPECIFIC USERS
-- ==============================================================
-- Example: If Rocky Jones should be +2.1, uncomment and run:

/*
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    '"+2.1"'
)
WHERE name = 'Rocky Jones';
*/

-- Add more UPDATE statements here for each user that needs fixing
-- Replace 'Name' and '+X.X' or 'X.X' with actual values:

/*
UPDATE user_profiles
SET profile_data = jsonb_set(profile_data, '{golfInfo,handicap}', '"+1.5"')
WHERE name = 'Player Name';

UPDATE user_profiles
SET profile_data = jsonb_set(profile_data, '{golfInfo,handicap}', '"18"')
WHERE name = 'Another Player';
*/

-- Verify after updates
SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' as fixed_handicap
FROM user_profiles
WHERE profile_data->'golfInfo'->>'handicap' IS NOT NULL
ORDER BY name;
