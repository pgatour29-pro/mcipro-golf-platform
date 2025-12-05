-- Show all 3 rounds for Alan Thomas
SELECT
    r.id,
    r.course_name,
    r.played_at::date as date,
    r.total_gross,
    r.total_stableford,
    r.handicap_used,
    r.created_at::timestamp as created_at,
    COUNT(rh.hole_number) as holes_count,
    SUM(rh.stableford_points) as calculated_stableford
FROM rounds r
LEFT JOIN round_holes rh ON r.id = rh.round_id
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
GROUP BY r.id, r.course_name, r.played_at, r.total_gross, r.total_stableford, r.handicap_used, r.created_at
ORDER BY r.played_at DESC, r.created_at DESC;
