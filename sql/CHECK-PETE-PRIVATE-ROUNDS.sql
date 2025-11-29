-- ============================================================================
-- CHECK PETE'S PRIVATE ROUNDS (Saved Scorecards)
-- ============================================================================

-- 1. Check all rounds for Pete
SELECT
    '=== PETE PARK ALL ROUNDS ===' AS section,
    id,
    course_name,
    type,
    status,
    total_gross,
    total_stableford,
    handicap_used,
    started_at,
    completed_at,
    created_at
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count rounds by type
SELECT
    '=== PETE PARK ROUNDS BY TYPE ===' AS section,
    type,
    COUNT(*) as count,
    MAX(created_at) as last_round
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
GROUP BY type
ORDER BY count DESC;

-- 3. Check specifically for private rounds
SELECT
    '=== PETE PARK PRIVATE ROUNDS ===' AS section,
    id,
    course_name,
    total_gross,
    total_stableford,
    handicap_used,
    started_at,
    created_at
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND type = 'private'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if rounds table exists and has data
SELECT
    '=== ROUNDS TABLE STATS ===' AS section,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' THEN 1 END) as pete_rounds,
    COUNT(CASE WHEN type = 'private' THEN 1 END) as all_private_rounds,
    COUNT(CASE WHEN golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873' AND type = 'private' THEN 1 END) as pete_private_rounds
FROM rounds;
