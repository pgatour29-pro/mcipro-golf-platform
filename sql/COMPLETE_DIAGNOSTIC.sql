-- ============================================================================
-- COMPLETE DIAGNOSTIC - Find what's actually broken
-- ============================================================================

-- 1. Check if scorecards table exists and its structure
SELECT 'SCORECARDS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'scorecards'
ORDER BY ordinal_position;

-- 2. Check RLS and policies on scorecards
SELECT 'SCORECARDS RLS STATUS:' as info;
SELECT schemaname, tablename, rowsecurity, CASE WHEN rowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END as status
FROM pg_tables
WHERE tablename = 'scorecards';

SELECT 'SCORECARDS POLICIES:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'scorecards';

-- 3. Check triggers on scorecards
SELECT 'SCORECARDS TRIGGERS:' as info;
SELECT tgname as trigger_name,
       CASE WHEN tgenabled = 'O' THEN 'ENABLED' WHEN tgenabled = 'D' THEN 'DISABLED' ELSE 'OTHER' END as status,
       tgtype
FROM pg_trigger
WHERE tgrelid = 'scorecards'::regclass
AND tgname NOT LIKE 'RI_%';

-- 4. Check table permissions
SELECT 'SCORECARDS GRANTS:' as info;
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name = 'scorecards';

-- 5. Repeat for scores, side_game_pools, rounds
SELECT 'SCORES TABLE:' as info;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'scores';

SELECT 'SIDE_GAME_POOLS TABLE:' as info;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'side_game_pools';

SELECT 'ROUNDS TABLE:' as info;
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'rounds';

-- 6. Check if anon/authenticated roles have access
SELECT 'ROLE PERMISSIONS:' as info;
SELECT r.rolname, r.rolsuper, r.rolinherit, r.rolcreaterole, r.rolcreatedb
FROM pg_roles r
WHERE r.rolname IN ('anon', 'authenticated', 'service_role');
