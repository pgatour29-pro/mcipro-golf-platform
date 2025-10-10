-- Optimize course loading performance
-- Add indexes and ensure RLS policies are efficient

-- ==============================================
-- ADD INDEXES FOR FAST QUERIES
-- ==============================================

-- Index for course name ordering (used in dropdown)
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);

-- Index for course_holes lookup by course_id
CREATE INDEX IF NOT EXISTS idx_course_holes_course_id ON course_holes(course_id);

-- Index for hole number ordering
CREATE INDEX IF NOT EXISTS idx_course_holes_hole_number ON course_holes(course_id, hole_number);

-- ==============================================
-- CHECK/FIX RLS POLICIES FOR PUBLIC READ ACCESS
-- ==============================================

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Courses viewable by all" ON courses;
DROP POLICY IF EXISTS "Course holes viewable by all" ON course_holes;

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;

-- Allow PUBLIC read access (no authentication needed for course data)
CREATE POLICY "Courses viewable by all"
    ON courses FOR SELECT
    USING (true);

CREATE POLICY "Course holes viewable by all"
    ON course_holes FOR SELECT
    USING (true);

-- Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage courses"
    ON courses FOR ALL
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage course holes"
    ON course_holes FOR ALL
    USING (auth.uid() IS NOT NULL);

-- ==============================================
-- VERIFY PERFORMANCE
-- ==============================================

-- Test query speed (should be instant)
EXPLAIN ANALYZE
SELECT * FROM courses ORDER BY name;

-- Count courses
SELECT COUNT(*) as total_courses FROM courses;

-- Count holes per course
SELECT
    c.name,
    COUNT(ch.id) as hole_count
FROM courses c
LEFT JOIN course_holes ch ON c.id = ch.course_id
GROUP BY c.id, c.name
ORDER BY c.name;
