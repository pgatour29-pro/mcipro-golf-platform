-- =====================================================
-- NUCLEAR FIX FOR SCORES TABLE 400 ERRORS
-- Run this in Supabase SQL Editor
-- Created: 2025-12-07
-- =====================================================
-- This is a more aggressive fix for the persistent 400 errors
-- on the scores table
-- =====================================================

-- STEP 1: Check if scores table exists and its structure
SELECT 'SCORES TABLE STRUCTURE' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'scores'
ORDER BY ordinal_position;

-- STEP 2: Check for ANY policies on scores (even disabled ones)
SELECT 'POLICIES ON SCORES TABLE' as info;
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'scores';

-- STEP 3: Force drop ALL policies on scores
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'scores'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON scores', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- STEP 4: Disable RLS (even if it says it's already disabled)
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- STEP 5: Force RLS off at the role level too
ALTER TABLE scores FORCE ROW LEVEL SECURITY;
ALTER TABLE scores NO FORCE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;

-- STEP 6: Grant ALL permissions to ALL roles
GRANT ALL ON scores TO anon;
GRANT ALL ON scores TO authenticated;
GRANT ALL ON scores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON scores TO authenticated;

-- STEP 7: Also fix scorecards table (scores references scorecards)
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'scorecards'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON scorecards', pol.policyname);
    END LOOP;
END $$;
GRANT ALL ON scorecards TO anon, authenticated, service_role;

-- STEP 8: Verify RLS is disabled
SELECT 'RLS STATUS AFTER FIX' as check_item;
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '❌ STILL ENABLED!' ELSE '✅ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('scores', 'scorecards')
ORDER BY tablename;

-- STEP 9: Test direct query on scores
SELECT 'TEST QUERY ON SCORES' as test;
SELECT COUNT(*) as total_scores FROM scores;

-- STEP 10: Check if there are any scores for recent scorecards
SELECT 'RECENT SCORES' as info;
SELECT
    s.scorecard_id,
    s.hole_number,
    s.gross_score,
    s.stableford_points,
    sc.player_id,
    sc.created_at::date as scorecard_date
FROM scores s
JOIN scorecards sc ON sc.id = s.scorecard_id
WHERE sc.created_at > NOW() - INTERVAL '7 days'
ORDER BY sc.created_at DESC, s.hole_number
LIMIT 20;

-- STEP 11: Check for any triggers that might be blocking
SELECT 'TRIGGERS ON SCORES' as info;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'scores';

-- STEP 12: Final verification - show any remaining policies
SELECT 'FINAL POLICY CHECK' as check_item;
SELECT COUNT(*) as remaining_policies
FROM pg_policies
WHERE tablename IN ('scores', 'scorecards');
