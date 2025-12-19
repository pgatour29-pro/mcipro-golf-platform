-- How are event results/positions stored?

-- 1. Check scorecards by event_id (grouped rounds)
SELECT event_id, COUNT(*) as players, MIN(started_at) as event_date
FROM scorecards
WHERE event_id IS NOT NULL
GROUP BY event_id
ORDER BY MIN(started_at) DESC
LIMIT 10;

-- 2. Sample event with multiple players - show their scores
SELECT event_id, player_name, total_gross, total_net, started_at
FROM scorecards
WHERE event_id IS NOT NULL
  AND total_net IS NOT NULL
  AND total_net > 0
ORDER BY event_id, total_net ASC
LIMIT 30;

-- 3. Check society_events columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'society_events' ORDER BY ordinal_position;

-- 4. Check if there's a results or leaderboard table
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND (table_name LIKE '%result%' OR table_name LIKE '%position%' OR table_name LIKE '%standing%' OR table_name LIKE '%place%');
