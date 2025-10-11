-- Verify ALL course data in one query
-- Shows par totals for all updated courses

SELECT
    'Bangpakong' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'bangpakong'

UNION ALL

SELECT
    'Burapha West' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'burapha_west'

UNION ALL

SELECT
    'Khao Kheow A+B' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'khao_kheow_ab'

UNION ALL

SELECT
    'Khao Kheow A+C' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'khao_kheow_ac'

UNION ALL

SELECT
    'Khao Kheow B+C' as course,
    SUM(CASE WHEN hole_number <= 9 THEN par ELSE 0 END) as front_par,
    SUM(CASE WHEN hole_number > 9 THEN par ELSE 0 END) as back_par,
    SUM(par) as total_par,
    COUNT(*) as hole_count
FROM course_holes
WHERE course_id = 'khao_kheow_bc'

ORDER BY course;
