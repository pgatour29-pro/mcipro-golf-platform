-- ============================================================================
-- CHECK DATABASE SCHEMA BEFORE FIXING
-- ============================================================================

-- 1. Check if societies table exists and what columns it has
SELECT
    '=== SOCIETIES TABLE SCHEMA ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'societies'
ORDER BY ordinal_position;

-- 2. Check all existing societies
SELECT
    '=== ALL SOCIETIES ===' AS info,
    *
FROM societies
LIMIT 10;

-- 3. Check the society_profiles table for TRGG
SELECT
    '=== SOCIETY PROFILES FOR TRGG ===' AS info,
    *
FROM society_profiles
WHERE organizer_id = 'trgg-pattaya';

-- 4. Check what society_id the dashboard expects
SELECT
    '=== EXPECTED UUID ===' AS info,
    'Dashboard expects: 7c0e4b72-d925-44bc-afda-38259a7ba346' as message;
