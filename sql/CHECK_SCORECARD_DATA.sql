-- Check if there are any completed scorecards with total_net
SELECT
  'Total scorecards' as metric,
  COUNT(*) as count
FROM scorecards;

SELECT
  'Completed scorecards' as metric,
  COUNT(*) as count
FROM scorecards WHERE status = 'completed';

SELECT
  'Completed with total_net' as metric,
  COUNT(*) as count
FROM scorecards WHERE status = 'completed' AND total_net IS NOT NULL;

-- Check date range of completed scorecards
SELECT
  MIN(completed_at) as earliest,
  MAX(completed_at) as latest
FROM scorecards WHERE status = 'completed';

-- Sample of recent completed scorecards
SELECT player_id, player_name, total_gross, total_net, completed_at
FROM scorecards
WHERE status = 'completed'
ORDER BY completed_at DESC
LIMIT 10;
