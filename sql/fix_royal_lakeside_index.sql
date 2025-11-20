-- SQL script to fix the handicap (stroke_index) for Royal Lakeside Golf Club
-- Data provided by user.

-- Verify current data (optional)
-- SELECT hole_number, stroke_index FROM course_holes WHERE course_id = 'royal_lakeside' ORDER BY hole_number;

-- Update the stroke_index for all 18 holes based on user-provided values
UPDATE course_holes
SET stroke_index = CASE hole_number
    WHEN 1 THEN 7
    WHEN 2 THEN 3
    WHEN 3 THEN 17
    WHEN 4 THEN 13
    WHEN 5 THEN 5
    WHEN 6 THEN 15
    WHEN 7 THEN 9
    WHEN 8 THEN 1
    WHEN 9 THEN 11
    WHEN 10 THEN 12
    WHEN 11 THEN 8
    WHEN 12 THEN 16
    WHEN 13 THEN 6
    WHEN 14 THEN 4
    WHEN 15 THEN 18
    WHEN 16 THEN 2
    WHEN 17 THEN 14
    WHEN 18 THEN 10
END
WHERE course_id = 'royal_lakeside'
  AND hole_number BETWEEN 1 AND 18;

-- Verify the fix
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'royal_lakeside'
  AND tee_marker = 'white'
ORDER BY hole_number;
