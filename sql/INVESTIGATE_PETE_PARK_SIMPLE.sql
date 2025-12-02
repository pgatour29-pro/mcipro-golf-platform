-- =============================================================================
-- SIMPLIFIED PETE PARK INVESTIGATION
-- =============================================================================
-- Just the essentials without assumptions about column names
-- =============================================================================

-- Find all Pete Park users
SELECT
    '=== PETE PARK USER PROFILES ===' as info;

SELECT
    line_user_id,
    name,
    username,
    email,
    society_name,
    COALESCE(
        (profile_data->'golfInfo'->>'handicap')::numeric,
        (profile_data->>'handicap')::numeric,
        0
    ) as handicap,
    created_at,
    updated_at
FROM user_profiles
WHERE name ILIKE '%Pete Park%'
ORDER BY created_at;

-- Check which columns exist in rounds table
SELECT
    '=== ROUNDS TABLE COLUMNS ===' as info;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rounds'
ORDER BY ordinal_position;

-- Check which columns exist in scorecards table
SELECT
    '=== SCORECARDS TABLE COLUMNS ===' as info;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scorecards'
ORDER BY ordinal_position;

-- Get Pete Park line_user_ids
SELECT
    '=== PETE PARK IDs ===' as info;

SELECT line_user_id, name
FROM user_profiles
WHERE name ILIKE '%Pete Park%';
