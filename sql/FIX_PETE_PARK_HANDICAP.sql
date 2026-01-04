-- =====================================================
-- INVESTIGATE & FIX PETE PARK HANDICAP
-- =====================================================
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. Find Pete Park's user ID
SELECT
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as profile_handicap,
    updated_at
FROM user_profiles
WHERE name ILIKE '%pete%park%'
   OR name ILIKE '%park%pete%';

-- 2. Check society_handicaps table for Pete Park
SELECT
    sh.golfer_id,
    sh.society_id,
    sp.society_name,
    sh.handicap_index,
    sh.last_calculated_at
FROM society_handicaps sh
LEFT JOIN society_profiles sp ON sp.id = sh.society_id
WHERE sh.golfer_id IN (
    SELECT line_user_id
    FROM user_profiles
    WHERE name ILIKE '%pete%park%'
)
ORDER BY sh.last_calculated_at DESC;

-- 3. Check recent rounds for Pete Park (to see what triggered the change)
SELECT
    r.id,
    r.golfer_id,
    r.course_name,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    r.course_rating,
    r.slope_rating,
    r.created_at,
    se.title as event_title
FROM rounds r
LEFT JOIN society_events se ON se.id = r.society_event_id
WHERE r.golfer_id IN (
    SELECT line_user_id
    FROM user_profiles
    WHERE name ILIKE '%pete%park%'
)
ORDER BY r.created_at DESC
LIMIT 10;

-- =====================================================
-- FIX: Reset Pete Park's handicap to 3.2
-- =====================================================
-- UNCOMMENT AND RUN THIS AFTER VERIFYING PETE'S ID

/*
-- Step 1: Update society_handicaps (universal handicap - society_id is NULL)
UPDATE society_handicaps
SET handicap_index = 3.2,
    last_calculated_at = NOW()
WHERE golfer_id = 'PETE_PARK_LINE_USER_ID_HERE'  -- Replace with actual ID
  AND society_id IS NULL;

-- Step 2: Update society-specific handicap for Travellers Rest
UPDATE society_handicaps
SET handicap_index = 3.2,
    last_calculated_at = NOW()
WHERE golfer_id = 'PETE_PARK_LINE_USER_ID_HERE'  -- Replace with actual ID
  AND society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';  -- Travellers Rest

-- Step 3: Update user_profiles profile_data
UPDATE user_profiles
SET profile_data = jsonb_set(
        COALESCE(profile_data, '{}'::jsonb),
        '{golfInfo,handicap}',
        '"3.2"'
    )
WHERE line_user_id = 'PETE_PARK_LINE_USER_ID_HERE';  -- Replace with actual ID
*/

-- Verify the fix
SELECT
    'Check' as status,
    up.name,
    up.profile_data->'golfInfo'->>'handicap' as profile_handicap,
    sh.handicap_index as society_handicap,
    CASE WHEN sh.society_id IS NULL THEN 'Universal' ELSE sp.society_name END as scope
FROM user_profiles up
LEFT JOIN society_handicaps sh ON sh.golfer_id = up.line_user_id
LEFT JOIN society_profiles sp ON sp.id = sh.society_id
WHERE up.name ILIKE '%pete%park%';
