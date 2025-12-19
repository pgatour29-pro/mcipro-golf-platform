-- What do we have?
SELECT COUNT(*) as total FROM scorecards;
SELECT COUNT(*) as completed FROM scorecards WHERE status = 'completed';
SELECT COUNT(*) as has_total_net FROM scorecards WHERE total_net IS NOT NULL;
SELECT COUNT(*) as completed_with_net FROM scorecards WHERE status = 'completed' AND total_net IS NOT NULL;

-- Show ALL scorecards
SELECT player_id, player_name, status, total_gross, total_net, started_at, completed_at
FROM scorecards
ORDER BY started_at DESC
LIMIT 20;
