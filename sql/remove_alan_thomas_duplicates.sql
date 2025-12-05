-- =====================================================
-- REMOVE DUPLICATE ROUNDS FOR ALAN THOMAS
-- Keeps the oldest entry for each date/course combination
-- =====================================================

-- Step 1: Show what will be deleted
SELECT
    'DUPLICATES TO DELETE' as action,
    r.id,
    r.course_name,
    r.played_at::date as date,
    r.total_stableford,
    r.created_at,
    'Will be DELETED' as status
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
  AND r.id NOT IN (
      -- Keep only the oldest (first created) round for each date/course
      SELECT DISTINCT ON (r2.played_at::date, r2.course_name)
          r2.id
      FROM rounds r2
      JOIN user_profiles up2 ON r2.golfer_id = up2.line_user_id
      WHERE up2.name ILIKE '%alan%thomas%'
      ORDER BY r2.played_at::date, r2.course_name, r2.created_at ASC
  )
ORDER BY r.played_at DESC, r.created_at DESC;

-- Step 2: Delete round_holes for duplicate rounds
DELETE FROM round_holes
WHERE round_id IN (
    SELECT r.id
    FROM rounds r
    JOIN user_profiles up ON r.golfer_id = up.line_user_id
    WHERE up.name ILIKE '%alan%thomas%'
      AND r.id NOT IN (
          -- Keep only the oldest round for each date/course
          SELECT DISTINCT ON (r2.played_at::date, r2.course_name)
              r2.id
          FROM rounds r2
          JOIN user_profiles up2 ON r2.golfer_id = up2.line_user_id
          WHERE up2.name ILIKE '%alan%thomas%'
          ORDER BY r2.played_at::date, r2.course_name, r2.created_at ASC
      )
);

-- Step 3: Delete duplicate rounds
DELETE FROM rounds
WHERE id IN (
    SELECT r.id
    FROM rounds r
    JOIN user_profiles up ON r.golfer_id = up.line_user_id
    WHERE up.name ILIKE '%alan%thomas%'
      AND r.id NOT IN (
          -- Keep only the oldest round for each date/course
          SELECT DISTINCT ON (r2.played_at::date, r2.course_name)
              r2.id
          FROM rounds r2
          JOIN user_profiles up2 ON r2.golfer_id = up2.line_user_id
          WHERE up2.name ILIKE '%alan%thomas%'
          ORDER BY r2.played_at::date, r2.course_name, r2.created_at ASC
      )
);

-- Step 4: Verify - show remaining rounds
SELECT
    'REMAINING ROUNDS' as status,
    r.course_name,
    r.played_at::date as date,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    r.created_at,
    COUNT(rh.hole_number) as holes
FROM rounds r
LEFT JOIN round_holes rh ON r.id = rh.round_id
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.id, r.course_name, r.played_at, r.total_gross, r.total_stableford, r.handicap_used, r.created_at
ORDER BY r.played_at DESC;

-- Step 5: Final count
SELECT
    'TOTAL ROUNDS AFTER CLEANUP' as info,
    COUNT(*) as count
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%';
