-- Check how many rounds exist for Pete Park and Alan Thomas

-- First, find their LINE user IDs
SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' AS current_handicap
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%' OR name ILIKE '%Alan%Thomas%';

-- Count rounds for Pete Park (replace with actual line_user_id from above)
-- SELECT
--     golfer_id,
--     COUNT(*) AS total_rounds,
--     COUNT(*) FILTER (WHERE status = 'completed') AS completed_rounds,
--     MAX(completed_at) AS last_round_date
-- FROM public.rounds
-- WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' -- Pete's LINE ID
-- GROUP BY golfer_id;

-- Show last 10 rounds for Pete to see what data exists
-- SELECT
--     id,
--     golfer_id,
--     course_name,
--     total_gross,
--     status,
--     completed_at,
--     created_at
-- FROM public.rounds
-- WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
-- ORDER BY completed_at DESC NULLS LAST
-- LIMIT 10;
