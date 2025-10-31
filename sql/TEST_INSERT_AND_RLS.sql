-- ============================================================================
-- TEST IF WE CAN INSERT INTO ROUNDS + CHECK RLS POLICIES
-- ============================================================================

-- 1. CHECK RLS STATUS
SELECT
    '=== RLS STATUS ===' AS section,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN '⚠️ RLS IS ENABLED - might block inserts'
        ELSE '✅ RLS IS DISABLED - inserts should work'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'rounds';

-- 2. CHECK RLS POLICIES
SELECT
    '=== RLS POLICIES ===' AS section,
    policyname,
    cmd as command_type,
    CASE
        WHEN cmd = 'INSERT' THEN '✅ INSERT policy'
        WHEN cmd = 'SELECT' THEN 'SELECT policy'
        WHEN cmd = 'UPDATE' THEN 'UPDATE policy'
        WHEN cmd = 'DELETE' THEN 'DELETE policy'
        ELSE cmd
    END as policy_type,
    roles,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'rounds'
ORDER BY cmd;

-- 3. CHECK REQUIRED COLUMNS (NOT NULL columns)
SELECT
    '=== REQUIRED COLUMNS (NOT NULL) ===' AS section,
    column_name,
    data_type,
    column_default,
    CASE
        WHEN column_name = 'id' THEN '✅ Auto-generated'
        WHEN column_default IS NOT NULL THEN '✅ Has default value'
        ELSE '⚠️ MUST be provided in INSERT'
    END as requirement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 4. TRY TEST INSERT
DO $$
BEGIN
    BEGIN
        INSERT INTO rounds (
            user_id,
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
            'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete's LINE ID
            'TEST COURSE - DELETE ME',
            'practice',
            NOW(),
            NOW(),
            'completed',
            85,
            36,
            2,
            'white'
        );

        RAISE NOTICE '✅ TEST INSERT SUCCEEDED!';
        RAISE NOTICE '   Database accepts inserts - problem must be in JavaScript code';

        -- Clean up test
        DELETE FROM rounds WHERE course_name = 'TEST COURSE - DELETE ME';
        RAISE NOTICE '✅ Test record cleaned up';

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ TEST INSERT FAILED!';
        RAISE NOTICE '   Error: %', SQLERRM;
        RAISE NOTICE '   This means database is blocking inserts';
        RAISE NOTICE '';

        -- Try to identify the issue
        IF SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
            RAISE NOTICE '🔴 PROBLEM: RLS POLICY is blocking inserts';
            RAISE NOTICE '   FIX: Need to add/update INSERT policy';
        ELSIF SQLERRM ILIKE '%null%' THEN
            RAISE NOTICE '🔴 PROBLEM: Missing required column';
            RAISE NOTICE '   Check REQUIRED COLUMNS section above';
        ELSIF SQLERRM ILIKE '%constraint%' THEN
            RAISE NOTICE '🔴 PROBLEM: Constraint violation';
            RAISE NOTICE '   Error details: %', SQLERRM;
        ELSE
            RAISE NOTICE '🔴 PROBLEM: Unknown error';
            RAISE NOTICE '   Full error: %', SQLERRM;
        END IF;
    END;
END $$;

-- 5. COUNT CURRENT ROUNDS
SELECT
    '=== CURRENT ROUNDS COUNT ===' AS section,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as last_hour,
    MAX(created_at) as most_recent
FROM rounds;

-- 6. SHOW RECENT ROUNDS (if any exist)
SELECT
    '=== RECENT ROUNDS ===' AS section,
    id,
    user_id,
    course_name,
    total_gross,
    created_at
FROM rounds
ORDER BY created_at DESC
LIMIT 5;

-- 7. FINAL DIAGNOSIS
DO $$
DECLARE
    rls_enabled BOOLEAN;
    has_insert_policy BOOLEAN;
    required_columns TEXT;
BEGIN
    -- Check RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'rounds';

    -- Check INSERT policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rounds' AND cmd = 'INSERT'
    ) INTO has_insert_policy;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'FINAL DIAGNOSIS - WHY ROUNDS NOT SAVING';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';

    IF rls_enabled THEN
        RAISE NOTICE '⚠️  RLS IS ENABLED on rounds table';
        IF has_insert_policy THEN
            RAISE NOTICE '   ✅ INSERT policy exists (check if it allows your inserts above)';
        ELSE
            RAISE NOTICE '   ❌ NO INSERT POLICY - RLS will block ALL inserts!';
            RAISE NOTICE '';
            RAISE NOTICE '🔴 THIS IS THE PROBLEM!';
            RAISE NOTICE '   RLS is ON but no INSERT policy exists';
            RAISE NOTICE '';
            RAISE NOTICE 'FIX: Add this policy:';
            RAISE NOTICE 'CREATE POLICY "allow_authenticated_insert" ON rounds';
            RAISE NOTICE 'FOR INSERT TO authenticated';
            RAISE NOTICE 'WITH CHECK (true);';
        END IF;
    ELSE
        RAISE NOTICE '✅ RLS IS DISABLED';
        RAISE NOTICE '   Database should accept inserts (check test result above)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Check test insert result above';
    RAISE NOTICE '2. If test succeeded but app fails: clear browser cache';
    RAISE NOTICE '3. If test failed: fix the error shown above';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;
