-- =============================================================================
-- FIND BOTH PETE PARK ACCOUNTS
-- =============================================================================
-- Search for variations and similar names
-- =============================================================================

-- Search 1: Broad search for Pete and Park
SELECT
    '=== BROAD SEARCH: PETE AND PARK ===' as info;

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
    created_at
FROM user_profiles
WHERE name ILIKE '%Pete%' AND name ILIKE '%Park%'
ORDER BY created_at;

-- Search 2: Just "Pete Park" exact variations
SELECT
    '=== EXACT VARIATIONS ===' as info;

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
    created_at
FROM user_profiles
WHERE name ILIKE 'Pete Park'
   OR name ILIKE 'Pete Park%'
   OR name ILIKE '%Pete Park'
   OR name ILIKE 'PetePark'
   OR name = 'Pete Park'
ORDER BY created_at;

-- Search 3: Search for the known line_user_id and similar patterns
SELECT
    '=== KNOWN ACCOUNT AND SIMILAR ===' as info;

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
    created_at
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
   OR name ILIKE '%pete%park%'
ORDER BY created_at;

-- Search 4: All users with "Park" in the name to see variations
SELECT
    '=== ALL USERS WITH PARK IN NAME ===' as info;

SELECT
    line_user_id,
    name,
    username,
    society_name,
    COALESCE(
        (profile_data->'golfInfo'->>'handicap')::numeric,
        (profile_data->>'handicap')::numeric,
        0
    ) as handicap
FROM user_profiles
WHERE name ILIKE '%Park%'
ORDER BY name;

-- Search 5: Check for duplicate names or similar names
SELECT
    '=== USERS WITH SIMILAR NAMES (Levenshtein distance) ===' as info;

SELECT
    line_user_id,
    name,
    username,
    society_name,
    COALESCE(
        (profile_data->'golfInfo'->>'handicap')::numeric,
        (profile_data->>'handicap')::numeric,
        0
    ) as handicap,
    created_at
FROM user_profiles
WHERE (
    name ILIKE '%pete%'
    OR name ILIKE '%peter%'
    OR name ILIKE '%park%'
)
AND (
    name ILIKE '%park%'
    OR name ILIKE '%pete%'
)
ORDER BY name, created_at;
