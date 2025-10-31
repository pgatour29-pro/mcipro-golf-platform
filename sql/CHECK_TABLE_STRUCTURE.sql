-- ============================================================================
-- CHECK ACTUAL TABLE STRUCTURE IN SUPABASE
-- Run this FIRST to see what columns actually exist
-- ============================================================================

-- Check user_profiles table structure
SELECT
    '=== USER_PROFILES TABLE STRUCTURE ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check society_profiles table structure (if exists)
SELECT
    '=== SOCIETY_PROFILES TABLE STRUCTURE ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'society_profiles'
ORDER BY ordinal_position;

-- Check society_members table structure (if exists)
SELECT
    '=== SOCIETY_MEMBERS TABLE STRUCTURE ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'society_members'
ORDER BY ordinal_position;

-- Check society_events table structure (if exists)
SELECT
    '=== SOCIETY_EVENTS TABLE STRUCTURE ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'society_events'
ORDER BY ordinal_position;

-- List ALL tables in public schema
SELECT
    '=== ALL TABLES IN DATABASE ===' AS info,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if society_profiles table exists
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'society_profiles')
        THEN '✅ society_profiles table EXISTS'
        ELSE '❌ society_profiles table MISSING'
    END AS society_profiles_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'society_members')
        THEN '✅ society_members table EXISTS'
        ELSE '❌ society_members table MISSING'
    END AS society_members_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'society_events')
        THEN '✅ society_events table EXISTS'
        ELSE '❌ society_events table MISSING'
    END AS society_events_status;
