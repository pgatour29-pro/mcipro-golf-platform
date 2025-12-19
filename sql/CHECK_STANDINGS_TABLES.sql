-- Check schemas of existing standings/results tables

-- 1. event_results
SELECT 'event_results columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'event_results' ORDER BY ordinal_position;

-- 2. period_standings
SELECT 'period_standings columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'period_standings' ORDER BY ordinal_position;

-- 3. series_standings
SELECT 'series_standings columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'series_standings' ORDER BY ordinal_position;

-- 4. series_event_results
SELECT 'series_event_results columns:' as info;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'series_event_results' ORDER BY ordinal_position;

-- 5. Sample data from event_results
SELECT 'event_results sample:' as info;
SELECT * FROM event_results LIMIT 5;
