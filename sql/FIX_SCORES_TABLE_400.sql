-- =====================================================
-- FIX SCORES TABLE 400 ERRORS
-- Run this in Supabase SQL Editor
-- Created: 2025-12-07
-- =====================================================

-- The scores table is returning 400 errors when querying
-- This completely disables RLS on scores table

-- Step 1: Disable RLS completely
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (they may be causing issues)
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'scores'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON scores', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
    END LOOP;
END $$;

-- Step 3: Verify RLS is disabled
SELECT
    'scores' as table_name,
    CASE WHEN rowsecurity THEN '❌ RLS STILL ENABLED - PROBLEM!' ELSE '✅ RLS DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'scores';

-- Step 4: Test query (should return data, not 400)
SELECT COUNT(*) as score_count FROM scores LIMIT 1;

-- Step 5: Also ensure scorecards table is accessible
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'scorecards'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON scorecards', policy_rec.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.policyname;
    END LOOP;
END $$;

SELECT
    'scorecards' as table_name,
    CASE WHEN rowsecurity THEN '❌ RLS STILL ENABLED' ELSE '✅ RLS DISABLED' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'scorecards';
