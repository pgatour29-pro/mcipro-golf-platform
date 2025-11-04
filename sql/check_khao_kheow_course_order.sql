-- Check which course (A, B, or C) is in holes 1-9 vs 10-18 for each combination
-- We can tell by looking at the yardages

SELECT
    'khao_kheow_ab holes 1-9' as check_name,
    hole_number,
    par,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ab'
    AND hole_number BETWEEN 1 AND 9
    AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT
    'khao_kheow_ab holes 10-18' as check_name,
    hole_number,
    par,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ab'
    AND hole_number BETWEEN 10 AND 18
    AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT
    'khao_kheow_bc holes 1-9' as check_name,
    hole_number,
    par,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_bc'
    AND hole_number BETWEEN 1 AND 9
    AND tee_marker = 'blue'
ORDER BY hole_number;

SELECT
    'khao_kheow_ac holes 1-9' as check_name,
    hole_number,
    par,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'khao_kheow_ac'
    AND hole_number BETWEEN 1 AND 9
    AND tee_marker = 'blue'
ORDER BY hole_number;
