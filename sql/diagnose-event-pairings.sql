-- =====================================================
-- DIAGNOSE EVENT_PAIRINGS TABLE
-- =====================================================
-- Check what exists and what might be causing 406 errors

-- 1. Check if table exists and show structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'event_pairings'
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'event_pairings';

-- 3. Check existing policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'event_pairings';

-- 4. Check if table is in realtime publication
SELECT
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'event_pairings';

-- 5. Count existing records
SELECT COUNT(*) AS record_count
FROM event_pairings;
