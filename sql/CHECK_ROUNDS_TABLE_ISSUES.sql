-- ============================================================================
-- CHECK WHY ROUNDS AREN'T SAVING - rounds table exists
-- ============================================================================

-- 1. CHECK RLS POLICIES (might be blocking inserts)
SELECT
    '=== RLS POLICIES ON ROUNDS TABLE ===' AS section,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'rounds';

-- 2. CHECK IF RLS IS ENABLED
SELECT
    '=== RLS STATUS ===' AS section,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN '⚠️ RLS is ON - might block inserts'
        ELSE '✅ RLS is OFF'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'rounds';

-- 3. CHECK EXACT COLUMNS IN ROUNDS TABLE
SELECT
    '=== ROUNDS TABLE COLUMNS ===' AS section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
ORDER BY ordinal_position;

-- 4. COUNT RECORDS
SELECT
    '=== RECORDS IN ROUNDS ===' AS section,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END) as last_24_hours,
    MAX(created_at) as most_recent_round
FROM rounds;

-- 5. CHECK IF PETE HAS ANY ROUNDS
SELECT
    '=== PETE PARK ROUNDS ===' AS section,
    COUNT(*) as petes_rounds,
    MAX(created_at) as last_round_date
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 6. SHOW RECENT ROUNDS (if any)
SELECT
    '=== RECENT ROUNDS ===' AS section,
    id,
    golfer_id,
    course_name,
    total_gross,
    status,
    created_at
FROM rounds
ORDER BY created_at DESC
LIMIT 5;

-- 7. TEST INSERT (to see if RLS blocks it)
DO $$
BEGIN
    -- Try to insert a test round
    BEGIN
        INSERT INTO rounds (
            golfer_id,
            course_name,
            type,
            started_at,
            completed_at,
            status,
            total_gross,
            total_stableford,
            handicap_used,
            tee_marker
        ) VALUES (
            'U2b6d976f19bca4b2f4374ae0e10ed873',
            'TEST COURSE',
            'practice',
            NOW(),
            NOW(),
            'completed',
            85,
            36,
            2,
            'white'
        );

        RAISE NOTICE '✅ TEST INSERT SUCCEEDED - RLS is not blocking';

        -- Delete the test round
        DELETE FROM rounds WHERE course_name = 'TEST COURSE' AND golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
        RAISE NOTICE '✅ Test round cleaned up';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST INSERT FAILED: %', SQLERRM;
        RAISE NOTICE '   This means RLS or constraints are blocking inserts';
    END;
END $$;

-- 8. FINAL DIAGNOSIS
DO $$
DECLARE
    rls_enabled BOOLEAN;
    total_rounds INTEGER;
    pete_rounds INTEGER;
    has_insert_policy BOOLEAN;
BEGIN
    -- Check RLS
    SELECT rowsecurity INTO rls_enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rounds';

    -- Count rounds
    SELECT COUNT(*) INTO total_rounds FROM rounds;
    SELECT COUNT(*) INTO pete_rounds FROM rounds WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

    -- Check for INSERT policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rounds'
        AND cmd = 'INSERT'
    ) INTO has_insert_policy;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'ROUNDS TABLE DIAGNOSIS';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Table Status: ✅ rounds table EXISTS';
    RAISE NOTICE 'Total Rounds: %', total_rounds;
    RAISE NOTICE 'Pete''s Rounds: %', pete_rounds;
    RAISE NOTICE '';

    IF rls_enabled THEN
        RAISE NOTICE 'RLS: ⚠️ ENABLED';
        IF has_insert_policy THEN
            RAISE NOTICE 'INSERT Policy: ✅ EXISTS (but might be too restrictive)';
        ELSE
            RAISE NOTICE 'INSERT Policy: ❌ MISSING (this blocks all inserts!)';
            RAISE NOTICE '';
            RAISE NOTICE '🔴 PROBLEM FOUND: RLS is enabled but no INSERT policy exists';
            RAISE NOTICE '   FIX: Add INSERT policy to allow authenticated users to insert';
        END IF;
    ELSE
        RAISE NOTICE 'RLS: ✅ DISABLED (inserts should work)';
    END IF;

    RAISE NOTICE '';

    IF total_rounds = 0 THEN
        RAISE NOTICE '🔴 NO ROUNDS EXIST - Scores are definitely not saving';
        RAISE NOTICE '';
        RAISE NOTICE 'Possible causes:';
        RAISE NOTICE '1. JavaScript error preventing save (check test insert result above)';
        RAISE NOTICE '2. RLS policy blocking inserts';
        RAISE NOTICE '3. Missing required columns';
        RAISE NOTICE '4. Frontend never calls the save function';
    ELSIF pete_rounds = 0 THEN
        RAISE NOTICE '🟡 Rounds exist but none for Pete - LINE ID might be wrong';
    ELSE
        RAISE NOTICE '✅ Rounds are being saved! (% total, % for Pete)', total_rounds, pete_rounds;
        RAISE NOTICE '   If you think scores are missing, check if they''re in the table';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;
