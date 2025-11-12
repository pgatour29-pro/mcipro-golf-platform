-- =====================================================
-- FIND GREENWOOD GOLF & RESORT DATA IN SUPABASE
-- =====================================================
-- This script searches for Greenwood course data in the database
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. CHECK IF COURSES TABLE EXISTS
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'courses'
) as courses_table_exists;

-- 2. CHECK IF COURSE_HOLES TABLE EXISTS
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'course_holes'
) as course_holes_table_exists;

-- 3. VIEW COURSES TABLE STRUCTURE
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

-- 4. VIEW COURSE_HOLES TABLE STRUCTURE
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_holes'
ORDER BY ordinal_position;

-- 5. SEARCH FOR GREENWOOD IN COURSES TABLE (case insensitive)
SELECT * FROM courses
WHERE LOWER(name) LIKE '%greenwood%'
   OR LOWER(id) LIKE '%greenwood%';

-- 6. LIST ALL COURSES IN THE DATABASE
SELECT id, name, created_at, scorecard_url
FROM courses
ORDER BY name;

-- 7. COUNT TOTAL COURSES
SELECT COUNT(*) as total_courses FROM courses;

-- 8. SEARCH FOR GREENWOOD IN COURSE_HOLES TABLE
SELECT ch.*, c.name as course_name
FROM course_holes ch
LEFT JOIN courses c ON ch.course_id = c.id
WHERE LOWER(ch.course_id) LIKE '%greenwood%'
   OR LOWER(c.name) LIKE '%greenwood%'
ORDER BY ch.hole_number;

-- 9. SEARCH FOR "GREENWOOD" IN ALL TEXT COLUMNS (comprehensive search)
-- This checks courses table for any mention
SELECT 'courses' as table_name, id, name, 'Found in name' as location
FROM courses
WHERE name ILIKE '%greenwood%'
UNION ALL
SELECT 'courses', id, name, 'Found in id'
FROM courses
WHERE id ILIKE '%greenwood%'
UNION ALL
SELECT 'courses', id, name, 'Found in scorecard_url'
FROM courses
WHERE scorecard_url ILIKE '%greenwood%'
UNION ALL
SELECT 'courses', id, name, 'Found in location'
FROM courses
WHERE location ILIKE '%greenwood%';

-- 10. CHECK SOCIETY_EVENTS TABLE FOR GREENWOOD (used in TRGG schedule)
SELECT id, name, course_name, event_date, tee_time
FROM society_events
WHERE LOWER(course_name) LIKE '%greenwood%'
ORDER BY event_date DESC;

-- 11. CHECK IF GREENWOOD EXISTS IN ANY BOOKING/EVENT DATA
SELECT
    DISTINCT course_name,
    COUNT(*) as mention_count
FROM bookings
WHERE LOWER(course_name) LIKE '%greenwood%'
   OR LOWER(course) LIKE '%greenwood%'
   OR LOWER(tee_sheet_course) LIKE '%greenwood%'
GROUP BY course_name;

-- =====================================================
-- SUMMARY QUERIES TO UNDERSTAND THE DATABASE STATE
-- =====================================================

-- 12. List all course IDs (to see what naming convention is used)
SELECT id, name FROM courses ORDER BY id;

-- 13. Check if there are any courses with similar patterns
SELECT id, name FROM courses
WHERE name ILIKE '%green%'
   OR name ILIKE '%wood%'
   OR id ILIKE '%green%'
   OR id ILIKE '%wood%';

-- 14. Count holes per course (to verify data integrity)
SELECT
    c.id,
    c.name,
    COUNT(ch.hole_number) as hole_count
FROM courses c
LEFT JOIN course_holes ch ON c.id = ch.course_id
GROUP BY c.id, c.name
ORDER BY c.name;

-- =====================================================
-- EXPECTED RESULTS IF GREENWOOD EXISTS:
-- =====================================================
-- If Greenwood Golf & Resort is in the database:
-- - Query #5 should return course record(s)
-- - Query #8 should return 18 hole records
-- - Course ID likely: 'greenwood', 'greenwood_golf', or similar
--
-- If Greenwood is NOT in courses table:
-- - It may only exist in society_events (Query #10)
-- - Or in booking records as text (Query #11)
-- - But NOT as a playable course with hole data
-- =====================================================
