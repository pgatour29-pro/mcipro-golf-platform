-- =====================================================
-- SAFE DIAGNOSTIC QUERIES - Checks structure first
-- =====================================================

-- Check rounds table structure
SELECT '=== ROUNDS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rounds'
ORDER BY ordinal_position;

-- Check if rounds table exists and has data
DO $$
DECLARE
    rounds_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rounds_count FROM rounds;
    RAISE NOTICE 'Total rounds in database: %', rounds_count;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'rounds table may not exist or has issues';
END $$;

-- Check caddies table structure
SELECT '=== CADDIES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caddies'
ORDER BY ordinal_position;

-- Check if caddies table exists and has data
DO $$
DECLARE
    caddies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO caddies_count FROM caddies;
    RAISE NOTICE 'Total caddies in database: %', caddies_count;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'caddies table may not exist or has issues';
END $$;

-- Check caddy_profiles table structure (Personal Organizer)
SELECT '=== CADDY_PROFILES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'caddy_profiles'
ORDER BY ordinal_position;

-- Check society_events table structure
SELECT '=== SOCIETY_EVENTS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'society_events'
ORDER BY ordinal_position;

-- Show recent rounds (using only columns we know exist)
SELECT '=== RECENT ROUNDS (Last 5) ===' as info;
SELECT
    id,
    golfer_id,
    society_event_id,
    status,
    created_at
FROM rounds
ORDER BY created_at DESC
LIMIT 5;

-- Show rounds with society_event_id
SELECT '=== ROUNDS WITH SOCIETY EVENT ID ===' as info;
SELECT
    COUNT(*) as total_rounds_with_event_id,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rounds_with_event
FROM rounds
WHERE society_event_id IS NOT NULL;

-- Show all available tables
SELECT '=== ALL TABLES IN PUBLIC SCHEMA ===' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
