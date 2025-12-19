-- Check all player names and IDs to find duplicates
SELECT
  player_id,
  player_name,
  COUNT(*) as scorecard_count,
  MIN(DATE(started_at)) as first_round,
  MAX(DATE(started_at)) as last_round
FROM scorecards
WHERE total_net >= 10
  AND DATE(started_at) >= '2025-11-01'
GROUP BY player_id, player_name
ORDER BY player_name;
