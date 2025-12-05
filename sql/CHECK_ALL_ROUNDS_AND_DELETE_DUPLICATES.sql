-- ============================================================================
-- CHECK ALL ROUNDS FOR PETE, ALAN, TRISTAN AND DELETE DUPLICATES
-- ============================================================================
-- Official rounds:
--   Dec 1: Greenwood
--   Dec 3: Bangpakong
-- All other rounds should be deleted if they're duplicates
-- ============================================================================

-- STEP 1: Check Pete's rounds
SELECT
    'PETE ROUNDS' as player,
    id,
    course_name,
    total_gross,
    DATE(played_at) as played_date,
    created_at
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY played_at DESC;

-- STEP 2: Check Alan's rounds
SELECT
    'ALAN ROUNDS' as player,
    id,
    course_name,
    total_gross,
    DATE(played_at) as played_date,
    created_at
FROM public.rounds
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
ORDER BY played_at DESC;

-- STEP 3: Check Tristan's rounds (need to find his LINE ID first)
SELECT
    'TRISTAN PROFILE' as info,
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE name ILIKE '%Tristan%' OR name ILIKE '%Gilbert%';

-- STEP 4: Get Tristan's rounds (if he has a real LINE ID)
SELECT
    'TRISTAN ROUNDS' as player,
    r.id,
    r.course_name,
    r.total_gross,
    DATE(r.played_at) as played_date,
    r.created_at
FROM public.rounds r
JOIN public.user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%Tristan%' OR up.name ILIKE '%Gilbert%'
ORDER BY r.played_at DESC;

-- STEP 5: Find duplicate rounds (same player, course, date, score)
WITH round_counts AS (
    SELECT
        golfer_id,
        course_name,
        DATE(played_at) as played_date,
        total_gross,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at) as all_ids
    FROM public.rounds
    WHERE golfer_id IN (
        'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
        'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
    )
    GROUP BY golfer_id, course_name, DATE(played_at), total_gross
    HAVING COUNT(*) > 1
)
SELECT
    'DUPLICATES FOUND' as status,
    up.name,
    rc.course_name,
    rc.played_date,
    rc.total_gross,
    rc.count as duplicate_count,
    rc.all_ids as round_ids
FROM round_counts rc
JOIN public.user_profiles up ON rc.golfer_id = up.line_user_id;

-- STEP 6: DELETE DUPLICATES (keep oldest, delete newer ones)
-- This deletes all duplicate rounds except the first one created
WITH duplicates_to_delete AS (
    SELECT
        UNNEST(all_ids[2:]) as id_to_delete
    FROM (
        SELECT
            ARRAY_AGG(id ORDER BY created_at) as all_ids
        FROM public.rounds
        WHERE golfer_id IN (
            'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
            'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
        )
        GROUP BY golfer_id, course_name, DATE(played_at), total_gross
        HAVING COUNT(*) > 1
    ) sub
)
DELETE FROM public.rounds
WHERE id IN (SELECT id_to_delete FROM duplicates_to_delete);

-- STEP 7: Show remaining rounds count
SELECT
    up.name,
    COUNT(*) as remaining_rounds
FROM public.rounds r
JOIN public.user_profiles up ON r.golfer_id = up.line_user_id
WHERE r.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
    'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
)
GROUP BY up.name;

-- STEP 8: Show final rounds for verification
SELECT
    up.name as player,
    r.course_name,
    DATE(r.played_at) as played_date,
    r.total_gross,
    r.created_at
FROM public.rounds r
JOIN public.user_profiles up ON r.golfer_id = up.line_user_id
WHERE r.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
    'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
)
ORDER BY up.name, r.played_at DESC;
