-- Find Greenwood course
SELECT
    id,
    name,
    location,
    total_par,
    total_yardage,
    created_at
FROM courses
WHERE name ILIKE '%greenwood%'
ORDER BY name;

-- Get Greenwood course holes
SELECT
    course_id,
    hole_number,
    par,
    yardage,
    stroke_index
FROM course_holes
WHERE course_id IN (
    SELECT id FROM courses WHERE name ILIKE '%greenwood%'
)
ORDER BY course_id, hole_number;
