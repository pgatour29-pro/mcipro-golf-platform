-- Fix Rocky Jones handicap to +2.1
-- Run this in Supabase SQL Editor

UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    '"+2.1"'
)
WHERE name = 'Rocky Jones'
  AND line_user_id = 'U044fd835263fc6c0c596cf1d6c2414af';

-- Verify the update
SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM user_profiles
WHERE name = 'Rocky Jones';
