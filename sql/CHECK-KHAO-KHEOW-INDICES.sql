-- Check current stroke indices for Khao Kheow courses
SELECT
    course_id,
    hole_number,
    stroke_index,
    par,
    tee_marker
FROM course_holes
WHERE course_id IN ('khao_kheow_a', 'khao_kheow_b_with_a', 'khao_kheow_b_with_c', 'khao_kheow_c')
AND tee_marker = 'white'
ORDER BY course_id, hole_number;
