-- FIX course_nine and nine_hole table RLS policies
-- These tables were created without public access policies
-- Causing 404 errors when loading Plutaluang course data
--
-- Created: 2025-11-06
-- Issue: Tables exist but RLS blocks all access

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

COMMENT ON POLICY "Allow public read access to course_nine" ON course_nine IS 'Allow anyone to read course nine information for course selection';
COMMENT ON POLICY "Allow public read access to nine_hole" ON nine_hole IS 'Allow anyone to read nine hole data for scorecard display';
