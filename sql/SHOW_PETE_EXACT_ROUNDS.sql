-- Show Pete's exact rounds with all details
SELECT
    course_name,
    total_gross,
    DATE(played_at) as date,
    TO_CHAR(played_at, 'YYYY-MM-DD') as exact_date
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY played_at DESC;
