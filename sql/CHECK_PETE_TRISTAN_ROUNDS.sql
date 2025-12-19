-- Find rounds where Pete and Tristan played together (same event_id)

-- Pete's event_ids
SELECT 'Pete rounds:' as info;
SELECT event_id, total_net, DATE(started_at) as play_date
FROM scorecards
WHERE player_name = 'Pete Park'
  AND total_net >= 10
  AND DATE(started_at) >= '2025-11-01'
ORDER BY started_at;

-- Tristan's event_ids
SELECT 'Tristan rounds:' as info;
SELECT event_id, total_net, DATE(started_at) as play_date
FROM scorecards
WHERE player_name LIKE '%Tristan%'
  AND total_net >= 10
  AND DATE(started_at) >= '2025-11-01'
ORDER BY started_at;

-- Shared events (where both played)
SELECT 'Shared events:' as info;
SELECT
  p.event_id,
  p.total_net as pete_net,
  t.total_net as tristan_net,
  DATE(p.started_at) as play_date
FROM scorecards p
JOIN scorecards t ON p.event_id = t.event_id
WHERE p.player_name = 'Pete Park'
  AND t.player_name LIKE '%Tristan%'
  AND p.total_net >= 10
  AND t.total_net >= 10
  AND DATE(p.started_at) >= '2025-11-01';
