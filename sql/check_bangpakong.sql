-- Check what's currently in the database for Bangpakong
SELECT
    hole_number,
    par,
    stroke_index,
    yardage,
    tee_marker
FROM course_holes
WHERE course_id = 'bangpakong'
ORDER BY hole_number;
