-- Quick check: Show what's actually in the database right now
SELECT
    course_id,
    hole_number,
    stroke_index
FROM course_holes
WHERE course_id IN ('khao_kheow_a', 'khao_kheow_b_with_a')
AND tee_marker = 'white'
AND hole_number <= 4
ORDER BY course_id, hole_number;

-- Should show:
-- khao_kheow_a | 1 | 17
-- khao_kheow_a | 2 | 7
-- khao_kheow_a | 3 | 13
-- khao_kheow_a | 4 | 1
-- khao_kheow_b_with_a | 1 | 12
-- khao_kheow_b_with_a | 2 | 6
-- khao_kheow_b_with_a | 3 | 14
-- khao_kheow_b_with_a | 4 | 10
