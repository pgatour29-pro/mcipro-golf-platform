-- Find Alan Thomas in the system
SELECT
    line_user_id,
    name,
    email,
    handicap,
    created_at
FROM user_profiles
WHERE name ILIKE '%alan%thomas%' OR name ILIKE '%thomas%alan%';

-- Check existing rounds for Alan Thomas
SELECT
    r.id,
    r.golfer_id,
    r.course_name,
    r.played_at,
    r.total_gross,
    r.total_net,
    r.total_stableford,
    r.handicap_index,
    r.playing_handicap
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
ORDER BY r.played_at DESC;
