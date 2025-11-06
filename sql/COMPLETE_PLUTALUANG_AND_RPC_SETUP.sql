-- COMPLETE SETUP FOR PLUTALUANG AND MISSING DATABASE FUNCTIONS
-- Run this ONCE in Supabase Studio SQL Editor
-- Safe to run multiple times (uses CREATE IF NOT EXISTS and ON CONFLICT)
--
-- This script:
-- 1. Creates course_nine and nine_hole tables
-- 2. Inserts all 36 holes of Plutaluang data (4 nines × 9 holes)
-- 3. Adds RLS policies for public read access
-- 4. Creates count_event_registrations RPC function
--
-- Created: 2025-11-06

-- =====================================================
-- PART 1: CREATE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS course_nine (
  id SERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  nine_name TEXT NOT NULL,
  CONSTRAINT uniq_course_nine UNIQUE(course_name, nine_name)
);

CREATE TABLE IF NOT EXISTS nine_hole (
  id SERIAL PRIMARY KEY,
  course_nine_id INTEGER NOT NULL REFERENCES course_nine(id) ON DELETE CASCADE,
  hole INTEGER NOT NULL CHECK (hole between 1 and 9),
  blue INTEGER NOT NULL,
  white INTEGER NOT NULL,
  yellow INTEGER NOT NULL,
  red INTEGER NOT NULL,
  par INTEGER NOT NULL CHECK (par in (3,4,5)),
  hcp INTEGER NOT NULL CHECK (hcp between 1 and 18),
  CONSTRAINT uniq_nine_hole UNIQUE(course_nine_id, hole)
);

-- =====================================================
-- PART 2: INSERT COURSE NINES
-- =====================================================

INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','East') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','South') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','West') ON CONFLICT DO NOTHING;
INSERT INTO course_nine (course_name, nine_name) VALUES ('Plutaluang Navy Golf Course','North') ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 3: INSERT ALL 36 HOLES
-- =====================================================

-- EAST COURSE (9 holes)
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 1, 562, 552, 470, 419, 5, 3) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 2, 178, 148, 137, 132, 3, 13) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 3, 379, 349, 280, 273, 4, 11) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 4, 425, 405, 366, 338, 4, 1) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 5, 174, 156, 143, 123, 3, 17) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 6, 363, 333, 316, 275, 4, 15) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 7, 370, 335, 313, 264, 4, 7) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 8, 422, 371, 345, 322, 4, 5) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='East'), 9, 572, 548, 531, 479, 5, 9) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- SOUTH COURSE (9 holes)
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 1, 500, 490, 480, 446, 5, 6) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 2, 434, 374, 356, 332, 4, 8) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 3, 470, 418, 392, 353, 4, 4) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 4, 162, 142, 130, 110, 3, 18) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 5, 428, 390, 359, 321, 4, 16) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 6, 557, 507, 495, 439, 5, 2) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 7, 225, 210, 180, 137, 3, 14) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 8, 347, 329, 319, 314, 4, 12) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='South'), 9, 417, 407, 387, 367, 4, 10) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- WEST COURSE (9 holes)
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 1, 373, 367, 331, 312, 4, 13) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 2, 539, 518, 447, 436, 5, 7) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 3, 165, 154, 149, 141, 3, 17) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 4, 414, 380, 365, 346, 4, 5) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 5, 560, 545, 518, 503, 5, 3) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 6, 404, 382, 314, 283, 4, 11) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 7, 454, 434, 387, 357, 4, 1) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 8, 172, 155, 142, 128, 3, 15) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='West'), 9, 408, 395, 364, 358, 4, 9) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- NORTH COURSE (9 holes)
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 1, 381, 361, 376, 338, 4, 6) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 2, 520, 484, 468, 395, 5, 12) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 3, 173, 153, 125, 110, 3, 16) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 4, 600, 563, 559, 489, 5, 8) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 5, 420, 400, 367, 333, 4, 4) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 6, 175, 160, 144, 129, 3, 18) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 7, 410, 390, 367, 325, 4, 14) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 8, 430, 410, 346, 343, 4, 2) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;
INSERT INTO nine_hole (course_nine_id, hole, blue, white, yellow, red, par, hcp) VALUES ((SELECT id FROM course_nine WHERE course_name='Plutaluang Navy Golf Course' AND nine_name='North'), 9, 391, 381, 312, 301, 4, 10) ON CONFLICT (course_nine_id, hole) DO UPDATE SET blue=EXCLUDED.blue, white=EXCLUDED.white, yellow=EXCLUDED.yellow, red=EXCLUDED.red, par=EXCLUDED.par, hcp=EXCLUDED.hcp;

-- =====================================================
-- PART 4: ADD RLS POLICIES
-- =====================================================

-- Enable RLS on tables (if not already enabled)
ALTER TABLE course_nine ENABLE ROW LEVEL SECURITY;
ALTER TABLE nine_hole ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to course_nine" ON course_nine;
DROP POLICY IF EXISTS "Allow public read access to nine_hole" ON nine_hole;

-- Create public read access policies
CREATE POLICY "Allow public read access to course_nine"
    ON course_nine
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Allow public read access to nine_hole"
    ON nine_hole
    FOR SELECT
    TO public
    USING (true);

-- Grant table permissions
GRANT SELECT ON course_nine TO anon, authenticated;
GRANT SELECT ON nine_hole TO anon, authenticated;

-- =====================================================
-- PART 5: CREATE RPC FUNCTION FOR EVENT REGISTRATIONS
-- =====================================================

CREATE OR REPLACE FUNCTION count_event_registrations(event_ids UUID[])
RETURNS TABLE (
    event_id UUID,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.event_id,
        COUNT(*)::BIGINT as count
    FROM event_registrations er
    WHERE er.event_id = ANY(event_ids)
    GROUP BY er.event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_event_registrations(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION count_event_registrations(UUID[]) TO anon;

-- =====================================================
-- VERIFICATION QUERIES (optional - run these to test)
-- =====================================================

-- Verify course nines created (should return 4 rows)
-- SELECT * FROM course_nine WHERE course_name = 'Plutaluang Navy Golf Course';

-- Verify holes created (should return 36 rows)
-- SELECT COUNT(*) FROM nine_hole;

-- Test RPC function (replace with real event ID)
-- SELECT * FROM count_event_registrations(ARRAY['test-id']::uuid[]);

-- =====================================================
-- COMPLETE! All tables, data, policies, and functions created
-- =====================================================
