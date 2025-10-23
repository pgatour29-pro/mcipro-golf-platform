-- =====================================================================
-- CHECK AND FIX COURSE_HOLES TABLE
-- =====================================================================
-- This script:
-- 1. Checks if course_holes table exists
-- 2. Fixes RLS policies to allow anon access
-- 3. Checks if table has data
-- 4. If empty, inserts sample data for Pattana Golf
-- =====================================================================

BEGIN;

-- =====================================================================
-- STEP 1: CREATE TABLE IF IT DOESN'T EXIST
-- =====================================================================
CREATE TABLE IF NOT EXISTS course_holes (
    id SERIAL PRIMARY KEY,
    course_id TEXT NOT NULL,
    hole_number INTEGER NOT NULL,
    par INTEGER NOT NULL,
    stroke_index INTEGER NOT NULL,
    yardage INTEGER NOT NULL,
    tee_marker TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 2: FIX RLS POLICIES
-- =====================================================================
DROP POLICY IF EXISTS "course_holes_select_all" ON course_holes;

CREATE POLICY "course_holes_select_all"
  ON course_holes FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================================
-- STEP 3: INSERT SAMPLE DATA IF TABLE IS EMPTY
-- =====================================================================
-- Insert Pattana Golf - White Tees (sample data)
INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 1, 4, 9, 380, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white');

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 2, 4, 3, 410, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 2);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 3, 3, 15, 175, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 3);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 4, 5, 1, 520, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 4);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 5, 4, 7, 390, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 5);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 6, 4, 5, 400, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 6);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 7, 3, 17, 160, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 7);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 8, 4, 11, 370, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 8);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 9, 5, 13, 500, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 9);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 10, 4, 2, 420, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 10);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 11, 3, 18, 150, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 11);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 12, 4, 10, 380, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 12);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 13, 5, 4, 510, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 13);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 14, 4, 8, 385, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 14);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 15, 3, 16, 170, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 15);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 16, 4, 6, 395, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 16);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 17, 4, 12, 375, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 17);

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
SELECT 'pattana_golf', 18, 5, 14, 505, 'white'
WHERE NOT EXISTS (SELECT 1 FROM course_holes WHERE course_id = 'pattana_golf' AND tee_marker = 'white' AND hole_number = 18);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_course_holes_lookup ON course_holes(course_id, tee_marker, hole_number);

COMMIT;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$
DECLARE
    hole_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hole_count FROM course_holes;

    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE 'COURSE_HOLES TABLE FIXED';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'STATUS:';
    RAISE NOTICE '  - Table created/verified';
    RAISE NOTICE '  - RLS policy added for anon access';
    RAISE NOTICE '  - Total holes in database: %', hole_count;
    RAISE NOTICE '';
    IF hole_count >= 18 THEN
        RAISE NOTICE '  SUCCESS! Course data available for Start Round';
        RAISE NOTICE '';
        RAISE NOTICE 'NEXT STEPS:';
        RAISE NOTICE '  1. Hard refresh browser: Ctrl + Shift + F5';
        RAISE NOTICE '  2. Go to Live Scorecard';
        RAISE NOTICE '  3. SELECT Pattana Golf from dropdown';
        RAISE NOTICE '  4. SELECT White tee marker';
        RAISE NOTICE '  5. Click Start Round - should work!';
    ELSE
        RAISE NOTICE '  WARNING: Only % holes found', hole_count;
        RAISE NOTICE '  You may need to import course data from your course library';
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
END $$;
