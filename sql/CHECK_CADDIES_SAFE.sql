-- Safe caddy data check - checks structure first

-- Check caddies table structure
SELECT '=== CADDIES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caddies'
ORDER BY ordinal_position;

-- Check if caddies table has any data
DO $$
DECLARE
    caddies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO caddies_count FROM caddies;
    RAISE NOTICE 'Total caddies in caddies table: %', caddies_count;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'caddies table may not exist or has issues';
END $$;

-- Show all caddies (first 10 rows, all columns)
SELECT '=== SAMPLE CADDIES DATA ===' as info;
SELECT *
FROM caddies
LIMIT 10;

-- Check caddy_profiles table structure
SELECT '=== CADDY_PROFILES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caddy_profiles'
ORDER BY ordinal_position;

-- Check if caddy_profiles has any data
DO $$
DECLARE
    profiles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_count FROM caddy_profiles;
    RAISE NOTICE 'Total rows in caddy_profiles: %', profiles_count;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'caddy_profiles table may not exist or has issues';
END $$;

-- Show all caddy_profiles (first 10 rows, all columns)
SELECT '=== SAMPLE CADDY_PROFILES DATA ===' as info;
SELECT *
FROM caddy_profiles
LIMIT 10;
