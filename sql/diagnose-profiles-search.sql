-- DIAGNOSTIC: Why isn't profile search finding players?
-- Run this in Supabase SQL Editor to see what data exists

-- 1. Check total profile count
SELECT COUNT(*) as total_profiles FROM profiles;

-- 2. Check how many have display_name populated
SELECT
    COUNT(*) as total,
    COUNT(display_name) as has_display_name,
    COUNT(username) as has_username
FROM profiles;

-- 3. Sample some actual data to see structure
SELECT
    id,
    display_name,
    username,
    profile_data->>'golfInfo' as golf_info_json
FROM profiles
LIMIT 10;

-- 4. Search for "Pete" (case-insensitive)
SELECT
    id,
    display_name,
    username,
    profile_data
FROM profiles
WHERE
    display_name ILIKE '%Pete%'
    OR username ILIKE '%Pete%'
LIMIT 10;

-- 5. Search for "Donald"
SELECT
    id,
    display_name,
    username,
    profile_data
FROM profiles
WHERE
    display_name ILIKE '%Donald%'
    OR username ILIKE '%Donald%'
LIMIT 10;

-- 6. Check if profile_data contains names instead
SELECT
    id,
    profile_data->>'displayName' as displayName_in_json,
    profile_data->>'username' as username_in_json,
    profile_data
FROM profiles
LIMIT 10;
