-- Check all rounds for Alan Thomas
SELECT
    r.id,
    r.course_name,
    r.played_at::date as date,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    r.status,
    r.created_at,
    COUNT(rh.hole_number) as holes_count
FROM rounds r
LEFT JOIN round_holes rh ON r.id = rh.round_id
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.id, r.course_name, r.played_at, r.total_gross, r.total_stableford, r.handicap_used, r.status, r.created_at
ORDER BY r.played_at DESC, r.created_at DESC;

-- Check for duplicates by date
SELECT
    r.played_at::date as date,
    r.course_name,
    COUNT(*) as duplicate_count,
    string_agg(r.id::text, ', ') as round_ids
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.played_at::date, r.course_name
HAVING COUNT(*) > 1
ORDER BY r.played_at::date DESC;

-- Total count
SELECT COUNT(*) as total_rounds
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%';
