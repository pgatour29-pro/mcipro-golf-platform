-- Check what Khao Kheow courses exist in database
SELECT id, name, location
FROM courses
WHERE id LIKE '%khao%'
ORDER BY id;
