-- Check CURRENT RLS status on all relevant tables
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '🔒 RLS ENABLED' ELSE '✅ RLS DISABLED' END as status
FROM pg_tables
WHERE tablename IN ('scorecards', 'scores', 'rounds', 'side_game_pools', 'pool_entrants')
ORDER BY tablename;
