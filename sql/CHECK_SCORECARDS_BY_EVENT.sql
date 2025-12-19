-- Check scorecards grouped by event to calculate positions

-- 1. Events with multiple players (for ranking)
SELECT
  event_id,
  COUNT(*) as player_count,
  MIN(DATE(started_at)) as event_date
FROM scorecards
WHERE event_id IS NOT NULL
  AND total_net IS NOT NULL
  AND total_net > 0
  AND player_name NOT IN ('Bubba Gump', 'Willy')
  AND DATE(started_at) >= '2025-11-01'
GROUP BY event_id
HAVING COUNT(*) > 1
ORDER BY MIN(started_at) DESC;

-- 2. Show all players per event with their position (ranked by lowest net)
SELECT
  event_id,
  player_name,
  total_net,
  DATE(started_at) as event_date,
  ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY total_net ASC) as position
FROM scorecards
WHERE event_id IS NOT NULL
  AND total_net IS NOT NULL
  AND total_net > 0
  AND player_name NOT IN ('Bubba Gump', 'Willy')
  AND DATE(started_at) >= '2025-11-01'
ORDER BY event_id, total_net ASC;
