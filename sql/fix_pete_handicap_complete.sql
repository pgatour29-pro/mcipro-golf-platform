-- COMPLETE FIX for Pete's Handicap - All Locations
-- Run this in Supabase SQL Editor
-- Date: 2026-01-23

-- Pete's LINE User ID
-- U2b6d976f19bca4b2f4374ae0e10ed873

-- TRGG Society ID
-- 7c0e4b72-d925-44bc-afda-38259a7ba346

-- Correct values:
-- Universal HCP: 2.9
-- TRGG HCP: 1.9

-- ============================================
-- STEP 1: Fix society_handicaps table (PRIMARY)
-- ============================================

-- First, check what records exist
SELECT 'BEFORE' as status, golfer_id, society_id, handicap_index, last_calculated_at
FROM society_handicaps
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Delete existing records and insert fresh (cleanest approach)
DELETE FROM society_handicaps
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Insert Universal handicap (society_id = NULL)
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('U2b6d976f19bca4b2f4374ae0e10ed873', NULL, 2.9, NOW());

-- Insert TRGG handicap
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('U2b6d976f19bca4b2f4374ae0e10ed873', '7c0e4b72-d925-44bc-afda-38259a7ba346', 1.9, NOW());

-- Verify the fix
SELECT 'AFTER' as status, golfer_id, society_id, handicap_index, last_calculated_at
FROM society_handicaps
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- ============================================
-- STEP 2: Fix user_profiles.profile_data
-- ============================================

-- Update both handicap locations in profile_data JSONB
UPDATE user_profiles
SET profile_data = jsonb_set(
    jsonb_set(
        COALESCE(profile_data, '{}'::jsonb),
        '{handicap}',
        '"2.9"'
    ),
    '{golfInfo,handicap}',
    '"2.9"'
)
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Verify
SELECT line_user_id, name,
       profile_data->>'handicap' as root_handicap,
       profile_data->'golfInfo'->>'handicap' as golfinfo_handicap
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- ============================================
-- STEP 3: Check global_players (if exists)
-- ============================================

-- Note: global_players may not have a direct link to Pete
-- Only update if you find a matching record
-- Use display_name to find Pete's record:
SELECT id, display_name, handicap
FROM global_players
WHERE display_name ILIKE '%Pete%' OR display_name ILIKE '%peter%';

-- If record found with wrong handicap, update it:
-- UPDATE global_players SET handicap = 2.9 WHERE id = 'THE_ID_FROM_ABOVE';

-- ============================================
-- DONE - Pete's handicap should now be fixed
-- ============================================

-- After running this SQL:
-- 1. Refresh the MyCaddiPro app
-- 2. Open Live Scorecard
-- 3. Add Pete to a round
-- 4. The dropdown should show 2.9 Universal and 1.9 TRGG
