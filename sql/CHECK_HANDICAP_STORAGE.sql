-- =============================================================================
-- CHECK HANDICAP STORAGE AND SCHEMA
-- =============================================================================
-- Date: 2025-12-02
-- Purpose: Verify how handicaps are stored and if there's any society-specific override
-- =============================================================================

-- Part 1: Check user_profiles table schema
SELECT '=== USER_PROFILES TABLE SCHEMA ===' as info;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Part 2: Check if there's a top-level handicap column
SELECT '=== CHECK FOR TOP-LEVEL HANDICAP COLUMN ===' as info;

SELECT
    column_name
FROM information_schema.columns
WHERE table_name = 'user_profiles'
    AND column_name LIKE '%handicap%'
    AND table_schema = 'public';

-- Part 3: Sample a few users to see how handicap is actually stored
SELECT '=== SAMPLE HANDICAP STORAGE ===' as info;

SELECT
    line_user_id,
    name,
    society_name,
    handicap,  -- Check if this column exists
    profile_data->'golfInfo'->>'handicap' as handicap_from_jsonb,
    profile_data->>'handicap' as handicap_from_profile_data_root
FROM user_profiles
WHERE name ILIKE '%Pete%' OR name ILIKE '%Park%'
LIMIT 10;

-- Part 4: Check for any society-specific handicap tables
SELECT '=== CHECK FOR SOCIETY-SPECIFIC HANDICAP TABLES ===' as info;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
    AND (table_name LIKE '%handicap%' OR table_name LIKE '%society_member%')
ORDER BY table_name;

-- Part 5: Check society_members table structure (if exists)
SELECT '=== SOCIETY_MEMBERS TABLE SCHEMA ===' as info;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'society_members'
    AND table_schema = 'public'
ORDER BY ordinal_position;
