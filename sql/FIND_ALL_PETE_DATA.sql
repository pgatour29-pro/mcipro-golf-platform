-- Find ALL rounds for Pete under any ID
SELECT
    'Pete rounds by LINE ID' as source,
    golfer_id,
    COUNT(*) as count
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
GROUP BY golfer_id

UNION ALL

SELECT
    'Rounds under TRGG-GUEST-0793',
    golfer_id,
    COUNT(*)
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0793'
GROUP BY golfer_id

UNION ALL

SELECT
    'Rounds under TRGG-GUEST-0217',
    golfer_id,
    COUNT(*)
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0217'
GROUP BY golfer_id;

-- Show all Pete profiles
SELECT * FROM public.user_profiles
WHERE line_user_id IN ('U2b6d976f19bca4b2f4374ae0e10ed873', 'TRGG-GUEST-0793', 'TRGG-GUEST-0217');
