-- ============================================================================
-- FULL SYSTEM DIAGNOSTIC
-- ============================================================================

-- ==================================================
-- 1. ALL TRIGGERS ON ALL TABLES
-- ==================================================
SELECT
  tgrelid::regclass as table_name,
  tgname as trigger_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    WHEN tgenabled = 'A' THEN 'ENABLED (ALWAYS)'
    WHEN tgenabled = 'R' THEN 'ENABLED (REPLICA)'
    ELSE 'UNKNOWN'
  END as status,
  tgtype as event_type,
  pg_get_functiondef(tgfoid) as function_definition
FROM pg_trigger
WHERE tgrelid::regclass::text IN (
  'rounds', 'user_profiles', 'scorecards', 'scores',
  'side_game_pools', 'round_holes', 'handicap_history'
)
ORDER BY tgrelid::regclass::text, tgname;

-- ==================================================
-- 2. ALL FUNCTIONS THAT TOUCH user_profiles
-- ==================================================
SELECT
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
  routine_definition LIKE '%UPDATE%user_profiles%'
  OR routine_definition LIKE '%INSERT%user_profiles%'
  OR routine_name LIKE '%profile%'
)
ORDER BY routine_name;

-- ==================================================
-- 3. ALL FUNCTIONS THAT TOUCH handicap
-- ==================================================
SELECT
  routine_name,
  routine_type,
  LEFT(routine_definition, 500) as definition_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
  routine_name LIKE '%handicap%'
  OR routine_definition LIKE '%handicap%'
)
ORDER BY routine_name;

-- ==================================================
-- 4. RLS STATUS ON ALL TABLES
-- ==================================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'rounds', 'user_profiles', 'scorecards', 'scores',
  'side_game_pools', 'round_holes', 'handicap_history',
  'society_events', 'event_registrations'
)
ORDER BY tablename;

-- ==================================================
-- 5. ALL RLS POLICIES
-- ==================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'rounds', 'user_profiles', 'scorecards', 'scores',
  'side_game_pools', 'round_holes', 'handicap_history'
)
ORDER BY tablename, cmd, policyname;

-- ==================================================
-- 6. rounds TABLE STRUCTURE
-- ==================================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'rounds'
ORDER BY ordinal_position;

-- ==================================================
-- 7. user_profiles TABLE STRUCTURE
-- ==================================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ==================================================
-- 8. RECENT HANDICAP CHANGES
-- ==================================================
SELECT
  golfer_id,
  old_handicap,
  new_handicap,
  change,
  rounds_used,
  calculated_at
FROM handicap_history
ORDER BY calculated_at DESC
LIMIT 20;

-- ==================================================
-- 9. CHECK FOR ORPHANED/DUPLICATE TRIGGERS
-- ==================================================
SELECT
  count(*) as trigger_count,
  tgname,
  tgrelid::regclass as table_name
FROM pg_trigger
WHERE tgrelid::regclass::text IN ('rounds', 'user_profiles')
GROUP BY tgname, tgrelid
HAVING count(*) > 1;

-- ==================================================
-- 10. FOREIGN KEY CONSTRAINTS
-- ==================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('rounds', 'round_holes', 'handicap_history')
ORDER BY tc.table_name;
