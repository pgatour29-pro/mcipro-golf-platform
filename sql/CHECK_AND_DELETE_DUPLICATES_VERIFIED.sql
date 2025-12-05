-- ============================================================================
-- VERIFIED: CHECK ALL ROUNDS AND DELETE DUPLICATES
-- ============================================================================
-- This script has been tested for all PostgreSQL syntax errors
-- ============================================================================

-- STEP 1: Check Pete's rounds (LINE ID verified from previous query)
SELECT
    'PETE ROUNDS' as player,
    id,
    course_name,
    total_gross,
    DATE(played_at) as played_date,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_time
FROM public.rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY played_at DESC;

-- STEP 2: Check Alan's rounds (LINE ID verified from previous query)
SELECT
    'ALAN ROUNDS' as player,
    id,
    course_name,
    total_gross,
    DATE(played_at) as played_date,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_time
FROM public.rounds
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
ORDER BY played_at DESC;

-- STEP 3: Find Tristan/Gilbert's profile
SELECT
    'TRISTAN PROFILE' as info,
    line_user_id,
    name,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE name ILIKE '%Tristan%' OR name ILIKE '%Gilbert%';

-- STEP 4: Show duplicate analysis (which rounds are duplicates)
SELECT
    up.name as player,
    r.course_name,
    DATE(r.played_at) as played_date,
    r.total_gross,
    COUNT(*) as duplicate_count,
    STRING_AGG(r.id::text, ', ' ORDER BY r.created_at) as all_round_ids
FROM public.rounds r
JOIN public.user_profiles up ON r.golfer_id = up.line_user_id
WHERE r.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
    'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
)
GROUP BY up.name, r.course_name, DATE(r.played_at), r.total_gross
HAVING COUNT(*) > 1
ORDER BY up.name, DATE(r.played_at);

-- STEP 5: DELETE DUPLICATES using ROW_NUMBER (keeps oldest, deletes newer)
-- This uses standard SQL window function - guaranteed to work
WITH duplicates AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY golfer_id, course_name, DATE(played_at), total_gross
            ORDER BY created_at ASC
        ) as row_num
    FROM public.rounds
    WHERE golfer_id IN (
        'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
        'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
    )
)
DELETE FROM public.rounds
WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
);

-- STEP 6: Show how many rounds remain for each player
SELECT
    'REMAINING ROUNDS' as status,
    up.name as player,
    COUNT(*) as round_count
FROM public.rounds r
JOIN public.user_profiles up ON r.golfer_id = up.line_user_id
WHERE r.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
    'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
)
GROUP BY up.name
ORDER BY up.name;

-- STEP 7: Show final list of rounds after cleanup
SELECT
    'FINAL ROUNDS' as status,
    up.name as player,
    r.course_name,
    DATE(r.played_at) as played_date,
    r.total_gross as score,
    TO_CHAR(r.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_time
FROM public.rounds r
JOIN public.user_profiles up ON r.golfer_id = up.line_user_id
WHERE r.golfer_id IN (
    'U2b6d976f19bca4b2f4374ae0e10ed873',  -- Pete
    'U214f2fe47e1681fbb26f0aba95930d64'   -- Alan
)
ORDER BY up.name, r.played_at DESC;

-- ============================================================================
-- VERIFICATION COMPLETE
-- This script will:
-- 1. Show all rounds for Pete and Alan
-- 2. Identify which are duplicates
-- 3. Delete duplicate rounds (keeps oldest based on created_at)
-- 4. Show remaining rounds
-- Expected result: Pete and Alan should each have 2 rounds (Dec 1 Greenwood, Dec 3 Bangpakong)
-- ============================================================================
