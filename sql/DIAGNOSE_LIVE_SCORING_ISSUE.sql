-- ============================================================================
-- DIAGNOSE LIVE SCORING ISSUE - Why scores aren't saving
-- ============================================================================

-- 1. CHECK WHICH TABLES EXIST
SELECT
    '=== ROUND TABLES ===' AS check_type,
    table_name,
    CASE
        WHEN table_name = 'rounds' THEN '✅ Code saves HERE'
        WHEN table_name = 'round_history' THEN '⚠️ Different table name'
        ELSE '❓ Unknown'
    END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('rounds', 'round_history')
ORDER BY table_name;

-- 2. CHECK ROUNDS TABLE STRUCTURE (if exists)
SELECT
    '=== ROUNDS TABLE COLUMNS ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
ORDER BY ordinal_position;

-- 3. CHECK ROUND_HISTORY TABLE STRUCTURE (if exists)
SELECT
    '=== ROUND_HISTORY TABLE COLUMNS ===' AS info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'round_history'
ORDER BY ordinal_position;

-- 4. CHECK IF ANY ROUNDS EXIST
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rounds') THEN
        RAISE NOTICE '=== CHECKING ROUNDS TABLE DATA ===';
        PERFORM 1; -- Dummy operation
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'round_history') THEN
        RAISE NOTICE '=== CHECKING ROUND_HISTORY TABLE DATA ===';
        PERFORM 1;
    END IF;
END $$;

-- Count records in rounds (if exists)
SELECT
    '=== ROUNDS TABLE ===' AS table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24_hours
FROM rounds
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rounds');

-- Count records in round_history (if exists)
SELECT
    '=== ROUND_HISTORY TABLE ===' AS table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24_hours
FROM round_history
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'round_history');

-- 5. CHECK RLS POLICIES ON ROUNDS
SELECT
    '=== RLS POLICIES ON ROUNDS ===' AS info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'rounds';

-- 6. CHECK RLS POLICIES ON ROUND_HISTORY
SELECT
    '=== RLS POLICIES ON ROUND_HISTORY ===' AS info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'round_history';

-- 7. CHECK IF RLS IS ENABLED
SELECT
    '=== RLS STATUS ===' AS info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('rounds', 'round_history');

-- 8. FINAL DIAGNOSIS
DO $$
DECLARE
    rounds_exists BOOLEAN;
    round_history_exists BOOLEAN;
    rounds_count INTEGER;
    round_history_count INTEGER;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rounds') INTO rounds_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'round_history') INTO round_history_exists;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'LIVE SCORING DIAGNOSIS';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';

    IF rounds_exists THEN
        SELECT COUNT(*) INTO rounds_count FROM rounds;
        RAISE NOTICE '✅ "rounds" table EXISTS with % records', rounds_count;
        RAISE NOTICE '   Code is configured to save to this table';
    ELSE
        RAISE NOTICE '❌ "rounds" table DOES NOT EXIST';
        RAISE NOTICE '   Code tries to save here but table is missing!';
    END IF;

    IF round_history_exists THEN
        SELECT COUNT(*) INTO round_history_count FROM round_history;
        RAISE NOTICE '✅ "round_history" table EXISTS with % records', round_history_count;
        IF NOT rounds_exists THEN
            RAISE NOTICE '   ⚠️ Code should save to "round_history" instead of "rounds"';
        END IF;
    ELSE
        RAISE NOTICE '❌ "round_history" table DOES NOT EXIST';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';

    IF NOT rounds_exists AND NOT round_history_exists THEN
        RAISE NOTICE '🔴 CRITICAL: No round tables exist! Need to create one.';
    ELSIF NOT rounds_exists AND round_history_exists THEN
        RAISE NOTICE '🟡 TABLE NAME MISMATCH: Code saves to "rounds" but table is "round_history"';
        RAISE NOTICE '   FIX: Update index.html to use "round_history" instead of "rounds"';
    ELSIF rounds_exists THEN
        RAISE NOTICE '🟢 Table exists. If scores still not saving, check:';
        RAISE NOTICE '   1. Browser console for JavaScript errors';
        RAISE NOTICE '   2. RLS policies (see output above)';
        RAISE NOTICE '   3. Player LINE IDs are populated';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;
