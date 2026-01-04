-- =====================================================
-- FIX PETE PARK HANDICAP TO 3.2
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Find Pete Park and show current handicap
SELECT
    up.line_user_id,
    up.name,
    sh.handicap_index as current_hcp,
    CASE WHEN sh.society_id IS NULL THEN 'UNIVERSAL' ELSE sp.society_name END as scope
FROM user_profiles up
LEFT JOIN society_handicaps sh ON sh.golfer_id = up.line_user_id
LEFT JOIN society_profiles sp ON sp.id = sh.society_id
WHERE up.name ILIKE '%pete%park%';

-- Step 2: FIX - Update ALL Pete Park's handicaps to 3.2
UPDATE society_handicaps
SET handicap_index = 3.2,
    last_calculated_at = NOW()
WHERE golfer_id IN (
    SELECT line_user_id
    FROM user_profiles
    WHERE name ILIKE '%pete%park%'
);

-- Step 3: FIX - Update profile_data handicap too
UPDATE user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '"3.2"'
)
WHERE name ILIKE '%pete%park%';

-- Step 4: Verify the fix worked
SELECT
    up.name,
    sh.handicap_index as fixed_hcp,
    CASE WHEN sh.society_id IS NULL THEN 'UNIVERSAL' ELSE sp.society_name END as scope
FROM user_profiles up
LEFT JOIN society_handicaps sh ON sh.golfer_id = up.line_user_id
LEFT JOIN society_profiles sp ON sp.id = sh.society_id
WHERE up.name ILIKE '%pete%park%';
