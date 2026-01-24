-- FIX HANDICAPS for Alan Thomas, Ryan Thomas, Pluto
-- Run this in Supabase SQL Editor
-- Date: 2026-01-24

-- Correct values:
-- Alan Thomas: Universal = 8.5, TRGG = 8.5
-- Ryan Thomas: Universal = 0, TRGG = +1.6 (stored as -1.6)
-- Pluto: Universal = 0, TRGG = +1.6 (stored as -1.6)

-- TRGG Society ID: 7c0e4b72-d925-44bc-afda-38259a7ba346

-- ============================================
-- STEP 1: Show BEFORE state
-- ============================================
SELECT 'BEFORE - society_handicaps' as status, golfer_id, society_id, handicap_index
FROM society_handicaps
WHERE golfer_id IN (
    'U214f2fe47e1681fbb26f0aba95930d64',  -- Alan Thomas
    'TRGG-GUEST-1002',                      -- Ryan Thomas
    'MANUAL-1768008205248-jvtubbk'          -- Pluto
)
ORDER BY golfer_id, society_id;

-- ============================================
-- STEP 2: Delete existing society_handicaps records
-- ============================================
DELETE FROM society_handicaps
WHERE golfer_id IN (
    'U214f2fe47e1681fbb26f0aba95930d64',  -- Alan Thomas
    'TRGG-GUEST-1002',                      -- Ryan Thomas
    'MANUAL-1768008205248-jvtubbk'          -- Pluto
);

-- ============================================
-- STEP 3: Insert correct society_handicaps records
-- ============================================

-- ALAN THOMAS - Universal 8.5
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('U214f2fe47e1681fbb26f0aba95930d64', NULL, 8.5, NOW());

-- ALAN THOMAS - TRGG 8.5
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('U214f2fe47e1681fbb26f0aba95930d64', '7c0e4b72-d925-44bc-afda-38259a7ba346', 8.5, NOW());

-- RYAN THOMAS - Universal 0
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('TRGG-GUEST-1002', NULL, 0, NOW());

-- RYAN THOMAS - TRGG +1.6 (stored as -1.6)
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('TRGG-GUEST-1002', '7c0e4b72-d925-44bc-afda-38259a7ba346', -1.6, NOW());

-- PLUTO - Universal 0
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('MANUAL-1768008205248-jvtubbk', NULL, 0, NOW());

-- PLUTO - TRGG +1.6 (stored as -1.6)
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, last_calculated_at)
VALUES ('MANUAL-1768008205248-jvtubbk', '7c0e4b72-d925-44bc-afda-38259a7ba346', -1.6, NOW());

-- ============================================
-- STEP 4: Update user_profiles.handicap_index
-- ============================================

-- ALAN THOMAS
UPDATE user_profiles
SET handicap_index = 8.5,
    profile_data = jsonb_set(
        jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{handicap}',
            '"8.5"'
        ),
        '{golfInfo,handicap}',
        '"8.5"'
    )
WHERE line_user_id = 'U214f2fe47e1681fbb26f0aba95930d64';

-- RYAN THOMAS
UPDATE user_profiles
SET handicap_index = 0,
    profile_data = jsonb_set(
        jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{handicap}',
            '"0"'
        ),
        '{golfInfo,handicap}',
        '"0"'
    )
WHERE line_user_id = 'TRGG-GUEST-1002';

-- PLUTO
UPDATE user_profiles
SET handicap_index = 0,
    profile_data = jsonb_set(
        jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{handicap}',
            '"0"'
        ),
        '{golfInfo,handicap}',
        '"0"'
    )
WHERE line_user_id = 'MANUAL-1768008205248-jvtubbk';

-- ============================================
-- STEP 5: Show AFTER state
-- ============================================
SELECT 'AFTER - society_handicaps' as status, golfer_id, society_id, handicap_index
FROM society_handicaps
WHERE golfer_id IN (
    'U214f2fe47e1681fbb26f0aba95930d64',  -- Alan Thomas
    'TRGG-GUEST-1002',                      -- Ryan Thomas
    'MANUAL-1768008205248-jvtubbk'          -- Pluto
)
ORDER BY golfer_id, society_id;

SELECT 'AFTER - user_profiles' as status, name, line_user_id, handicap_index,
       profile_data->>'handicap' as profile_handicap
FROM user_profiles
WHERE line_user_id IN (
    'U214f2fe47e1681fbb26f0aba95930d64',
    'TRGG-GUEST-1002',
    'MANUAL-1768008205248-jvtubbk'
);

-- ============================================
-- DONE
-- ============================================
-- After running this:
-- 1. Refresh mycaddipro.com
-- 2. Open Live Scorecard
-- 3. Add these players to a round
-- 4. Handicaps should show correctly in dropdown
