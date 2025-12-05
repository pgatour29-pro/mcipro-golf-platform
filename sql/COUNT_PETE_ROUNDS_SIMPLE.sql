-- Simple query to count Pete's rounds

-- Count rounds under Pete's real LINE ID
SELECT 'Rounds under Pete LINE ID' as description, COUNT(*) as count
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Count rounds under old guest ID 0793
SELECT 'Rounds under TRGG-GUEST-0793' as description, COUNT(*) as count
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0793';

-- Count rounds under new guest ID 0217
SELECT 'Rounds under TRGG-GUEST-0217' as description, COUNT(*) as count
FROM public.rounds
WHERE golfer_id = 'TRGG-GUEST-0217';

-- Show ALL rounds for Pete if they exist
SELECT
    id,
    golfer_id,
    course_name,
    total_gross,
    DATE(played_at) as date,
    created_at
FROM public.rounds
WHERE golfer_id IN ('U2b6d976f19bca4b2f4374ae0e10ed873', 'TRGG-GUEST-0793', 'TRGG-GUEST-0217')
ORDER BY created_at DESC;
