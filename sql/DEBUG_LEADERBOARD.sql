-- DEBUG: Find out why leaderboard returns no data

-- 1. Total scorecards
SELECT 'Total scorecards' as check_name, COUNT(*) as result FROM scorecards;

-- 2. Completed scorecards
SELECT 'Completed scorecards' as check_name, COUNT(*) as result
FROM scorecards WHERE status = 'completed';

-- 3. Completed with total_net NOT NULL
SELECT 'Completed with total_net' as check_name, COUNT(*) as result
FROM scorecards WHERE status = 'completed' AND total_net IS NOT NULL;

-- 4. Check completed_at dates
SELECT 'Has completed_at date' as check_name, COUNT(*) as result
FROM scorecards WHERE status = 'completed' AND completed_at IS NOT NULL;

-- 5. Current week range
SELECT
  'Week start' as check_name,
  DATE_TRUNC('week', CURRENT_DATE)::DATE as result;

SELECT
  'Week end' as check_name,
  (DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '6 days')::DATE as result;

-- 6. Scorecards completed THIS WEEK
SELECT 'Completed this week' as check_name, COUNT(*) as result
FROM scorecards
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND DATE(completed_at) >= DATE_TRUNC('week', CURRENT_DATE)::DATE
  AND DATE(completed_at) <= (DATE_TRUNC('week', CURRENT_DATE)::DATE + INTERVAL '6 days');

-- 7. Scorecards completed THIS MONTH
SELECT 'Completed this month' as check_name, COUNT(*) as result
FROM scorecards
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND DATE(completed_at) >= DATE_TRUNC('month', CURRENT_DATE)::DATE;

-- 8. Scorecards completed THIS YEAR
SELECT 'Completed this year' as check_name, COUNT(*) as result
FROM scorecards
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM CURRENT_DATE);

-- 9. Show recent completed scorecards
SELECT 'Recent completed scorecards:' as info;
SELECT player_name, total_gross, total_net, status, completed_at, started_at
FROM scorecards
WHERE status = 'completed'
ORDER BY COALESCE(completed_at, started_at) DESC
LIMIT 10;

-- 10. Show what dates exist
SELECT 'All completed_at dates:' as info;
SELECT DISTINCT DATE(completed_at) as completion_date, COUNT(*) as count
FROM scorecards
WHERE status = 'completed' AND completed_at IS NOT NULL
GROUP BY DATE(completed_at)
ORDER BY completion_date DESC
LIMIT 20;
