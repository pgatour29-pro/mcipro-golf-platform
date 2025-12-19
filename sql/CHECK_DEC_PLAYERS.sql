-- Check all players and rounds from December 1st, 2025
SELECT
  player_id,
  player_name,
  COUNT(*) as scorecard_count
FROM scorecards
WHERE total_net >= 10
  AND DATE(started_at) >= '2025-12-01'
GROUP BY player_id, player_name
ORDER BY player_name;

-- Check shared events from Dec 1
SELECT
  event_id,
  COUNT(DISTINCT player_name) as player_count,
  STRING_AGG(player_name, ', ') as players,
  DATE(MIN(started_at)) as play_date
FROM scorecards
WHERE total_net >= 10
  AND DATE(started_at) >= '2025-12-01'
  AND player_name NOT IN ('Bubba Gump', 'Willy')
GROUP BY event_id
ORDER BY play_date;
