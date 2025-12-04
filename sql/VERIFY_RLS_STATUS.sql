-- ============================================================================
-- VERIFY RLS STATUS ON ALL TABLES
-- ============================================================================

SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity = true THEN '🔒 ENABLED'
    WHEN rowsecurity = false THEN '🔓 DISABLED'
    ELSE 'UNKNOWN'
  END as rls_status,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('rounds', 'scorecards', 'scores', 'side_game_pools', 'golfers')
ORDER BY tablename;
