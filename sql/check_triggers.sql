-- Check for any triggers that might affect handicaps
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('rounds', 'scorecards', 'scores', 'user_profiles', 'side_game_pools')
ORDER BY event_object_table, trigger_name;

-- Check for functions related to handicap
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%handicap%' OR routine_definition LIKE '%handicap%')
ORDER BY routine_name;
