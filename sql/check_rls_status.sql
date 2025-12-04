-- Check if RLS is actually disabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('side_game_pools', 'scorecards', 'scores')
ORDER BY tablename;
