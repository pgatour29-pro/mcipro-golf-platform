-- =============================================================================
-- INVESTIGATE PETE PARK DUPLICATE USERS
-- =============================================================================
-- Date: 2025-12-02
-- Purpose: Find all Pete Park users and check which account is receiving scores
-- =============================================================================

-- =============================================================================
-- PART 1: Find all Pete Park user profiles
-- =============================================================================
SELECT
    '=== ALL PETE PARK USER PROFILES ===' as section;

SELECT
    line_user_id,
    name,
    username,
    email,
    phone,
    society_name,
    COALESCE(
        (profile_data->'golfInfo'->>'handicap')::numeric,
        (profile_data->>'handicap')::numeric,
        0
    ) as handicap,
    profile_data,
    created_at,
    updated_at
FROM user_profiles
WHERE name ILIKE '%Pete Park%'
ORDER BY created_at;

-- =============================================================================
-- PART 2: Check recent scores for Pete Park users
-- =============================================================================
SELECT
    '=== RECENT SCORES FOR PETE PARK ===' as section;

-- Get all Pete Park line_user_ids first
WITH pete_park_users AS (
    SELECT
        line_user_id,
        name,
        COALESCE(
            (profile_data->'golfInfo'->>'handicap')::numeric,
            (profile_data->>'handicap')::numeric,
            0
        ) as handicap,
        society_name
    FROM user_profiles
    WHERE name ILIKE '%Pete Park%'
)
SELECT
    r.id as round_id,
    r.golfer_id,
    ppu.name,
    ppu.handicap as current_handicap,
    ppu.society_name,
    r.course_name,
    r.total_score,
    r.created_at as score_created_at
FROM rounds r
JOIN pete_park_users ppu ON r.golfer_id = ppu.line_user_id
ORDER BY r.created_at DESC
LIMIT 20;

-- =============================================================================
-- PART 3: Check scorecards for Pete Park users
-- =============================================================================
SELECT
    '=== RECENT SCORECARDS FOR PETE PARK ===' as section;

WITH pete_park_users AS (
    SELECT
        line_user_id,
        name,
        COALESCE(
            (profile_data->'golfInfo'->>'handicap')::numeric,
            (profile_data->>'handicap')::numeric,
            0
        ) as handicap,
        society_name
    FROM user_profiles
    WHERE name ILIKE '%Pete Park%'
)
SELECT
    s.id as scorecard_id,
    s.golfer_id,
    ppu.name,
    ppu.handicap as current_handicap,
    ppu.society_name,
    s.event_id,
    s.total_score,
    s.gross_score,
    s.net_score,
    s.created_at as scorecard_created_at
FROM scorecards s
JOIN pete_park_users ppu ON s.golfer_id = ppu.line_user_id
ORDER BY s.created_at DESC
LIMIT 20;

-- =============================================================================
-- PART 4: Check society memberships
-- =============================================================================
SELECT
    '=== SOCIETY MEMBERSHIPS FOR PETE PARK ===' as section;

WITH pete_park_users AS (
    SELECT line_user_id, name
    FROM user_profiles
    WHERE name ILIKE '%Pete Park%'
)
SELECT
    sm.id,
    sm.golfer_id,
    ppu.name,
    sm.society_name,
    sm.handicap as society_handicap,
    sm.is_primary_society,
    sm.status,
    sm.joined_date,
    sm.created_at
FROM society_members sm
JOIN pete_park_users ppu ON sm.golfer_id = ppu.line_user_id
ORDER BY sm.created_at;

-- =============================================================================
-- PART 5: Check handicap history
-- =============================================================================
SELECT
    '=== HANDICAP HISTORY FOR PETE PARK ===' as section;

WITH pete_park_users AS (
    SELECT
        line_user_id,
        name,
        COALESCE(
            (profile_data->'golfInfo'->>'handicap')::numeric,
            (profile_data->>'handicap')::numeric,
            0
        ) as current_handicap
    FROM user_profiles
    WHERE name ILIKE '%Pete Park%'
)
SELECT
    hh.id,
    hh.golfer_id,
    ppu.name,
    ppu.current_handicap,
    hh.old_handicap,
    hh.new_handicap,
    hh.change_reason,
    hh.changed_at,
    hh.created_at
FROM handicap_history hh
JOIN pete_park_users ppu ON hh.golfer_id = ppu.line_user_id
ORDER BY hh.created_at DESC
LIMIT 20;

-- =============================================================================
-- PART 6: Summary Statistics
-- =============================================================================
SELECT
    '=== SUMMARY STATISTICS ===' as section;

WITH pete_park_users AS (
    SELECT
        line_user_id,
        name,
        COALESCE(
            (profile_data->'golfInfo'->>'handicap')::numeric,
            (profile_data->>'handicap')::numeric,
            0
        ) as handicap,
        society_name
    FROM user_profiles
    WHERE name ILIKE '%Pete Park%'
)
SELECT
    ppu.line_user_id,
    ppu.name,
    ppu.handicap as current_handicap,
    ppu.society_name,
    COUNT(DISTINCT r.id) as total_rounds,
    COUNT(DISTINCT s.id) as total_scorecards,
    MAX(r.created_at) as last_round_date,
    MAX(s.created_at) as last_scorecard_date
FROM pete_park_users ppu
LEFT JOIN rounds r ON ppu.line_user_id = r.golfer_id
LEFT JOIN scorecards s ON ppu.line_user_id = s.golfer_id
GROUP BY ppu.line_user_id, ppu.name, ppu.handicap, ppu.society_name
ORDER BY total_rounds DESC;

-- =============================================================================
-- PART 7: Check LINE authentication
-- =============================================================================
SELECT
    '=== LINE AUTHENTICATION DATA ===' as section;

WITH pete_park_users AS (
    SELECT line_user_id, name
    FROM user_profiles
    WHERE name ILIKE '%Pete Park%'
)
SELECT
    ppu.line_user_id,
    ppu.name,
    up.username,
    up.email,
    up.profile_data->>'lineUserId' as line_user_id_in_profile_data,
    up.profile_data->>'displayName' as line_display_name,
    up.profile_data->>'pictureUrl' as line_picture_url,
    up.created_at as account_created,
    up.updated_at as last_updated
FROM pete_park_users ppu
JOIN user_profiles up ON ppu.line_user_id = up.line_user_id
ORDER BY up.created_at;
