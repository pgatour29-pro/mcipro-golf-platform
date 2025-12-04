-- Backup all handicaps before fixing
-- Run this FIRST before running fix_all_corrupted_handicaps.sql

SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' as handicap,
    created_at,
    updated_at
FROM user_profiles
WHERE profile_data->'golfInfo'->>'handicap' IS NOT NULL
ORDER BY name;

-- Copy the output to a text file as backup
