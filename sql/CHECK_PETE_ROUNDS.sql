-- Check Pete's actual rounds since Nov 1
SELECT
  event_id,
  player_name,
  total_net,
  DATE(started_at) as play_date,
  started_at
FROM scorecards
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND total_net IS NOT NULL
  AND total_net >= 10
  AND DATE(started_at) >= '2025-11-01'
ORDER BY started_at DESC;

-- Count by date (actual rounds per day)
SELECT
  DATE(started_at) as play_date,
  COUNT(*) as scorecards_count
FROM scorecards
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND total_net IS NOT NULL
  AND total_net >= 10
  AND DATE(started_at) >= '2025-11-01'
GROUP BY DATE(started_at)
ORDER BY play_date DESC;

-- Check event_id values
SELECT DISTINCT event_id
FROM scorecards
WHERE player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND DATE(started_at) >= '2025-11-01';
