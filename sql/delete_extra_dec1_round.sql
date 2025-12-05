-- =====================================================
-- DELETE EXTRA DECEMBER 1 ROUND
-- Keeps oldest December 1, 2025 Greenwood round
-- Deletes any newer duplicates created on same date
-- =====================================================

-- Show which Dec 1 rounds will be kept vs deleted
SELECT
    r.id,
    r.course_name,
    r.played_at::date as date,
    r.total_stableford,
    r.created_at::timestamp as created_at,
    CASE
        WHEN r.id = (
            SELECT r2.id
            FROM rounds r2
            JOIN user_profiles up2 ON r2.golfer_id = up2.line_user_id
            WHERE up2.name ILIKE '%alan%thomas%'
              AND r2.played_at::date = '2025-12-01'
              AND r2.course_name ILIKE '%greenwood%'
            ORDER BY r2.created_at ASC
            LIMIT 1
        ) THEN '✓ KEEP (oldest)'
        ELSE '✗ DELETE (duplicate)'
    END as action
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
  AND r.played_at::date = '2025-12-01'
  AND r.course_name ILIKE '%greenwood%'
ORDER BY r.created_at DESC;

-- Delete round_holes for duplicate Dec 1 rounds
DELETE FROM round_holes
WHERE round_id IN (
    SELECT r.id
    FROM rounds r
    JOIN user_profiles up ON r.golfer_id = up.line_user_id
    WHERE up.name ILIKE '%alan%thomas%'
      AND r.played_at::date = '2025-12-01'
      AND r.course_name ILIKE '%greenwood%'
      AND r.id != (
          -- Keep oldest
          SELECT r2.id
          FROM rounds r2
          JOIN user_profiles up2 ON r2.golfer_id = up2.line_user_id
          WHERE up2.name ILIKE '%alan%thomas%'
            AND r2.played_at::date = '2025-12-01'
            AND r2.course_name ILIKE '%greenwood%'
          ORDER BY r2.created_at ASC
          LIMIT 1
      )
);

-- Delete duplicate Dec 1 rounds
DELETE FROM rounds
WHERE id IN (
    SELECT r.id
    FROM rounds r
    JOIN user_profiles up ON r.golfer_id = up.line_user_id
    WHERE up.name ILIKE '%alan%thomas%'
      AND r.played_at::date = '2025-12-01'
      AND r.course_name ILIKE '%greenwood%'
      AND r.id != (
          -- Keep oldest
          SELECT r2.id
          FROM rounds r2
          JOIN user_profiles up2 ON r2.golfer_id = up2.line_user_id
          WHERE up2.name ILIKE '%alan%thomas%'
            AND r2.played_at::date = '2025-12-01'
            AND r2.course_name ILIKE '%greenwood%'
          ORDER BY r2.created_at ASC
          LIMIT 1
      )
);

-- Final verification
SELECT
    'FINAL ROUNDS FOR ALAN THOMAS' as status,
    r.course_name,
    r.played_at::date as date,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    COUNT(rh.hole_number) as holes
FROM rounds r
LEFT JOIN round_holes rh ON r.id = rh.round_id
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.id, r.course_name, r.played_at, r.total_gross, r.total_stableford, r.handicap_used
ORDER BY r.played_at DESC;

-- Count
SELECT COUNT(*) as total_rounds
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%';
