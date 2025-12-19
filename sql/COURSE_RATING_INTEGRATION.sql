-- ============================================================================
-- COURSE RATING & SLOPE INTEGRATION SYSTEM
-- ============================================================================
-- Created: 2025-12-11
-- Purpose: Replace hard-coded handicap defaults with actual course data
-- Features:
--   - Courses table with tee-specific ratings
--   - WHS-compliant score differential calculation
--   - Course handicap calculation
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. COURSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  course_code TEXT UNIQUE NOT NULL,
  location TEXT,
  country TEXT DEFAULT 'Thailand',
  par INTEGER DEFAULT 72,
  total_holes INTEGER DEFAULT 18,
  designer TEXT,
  year_opened INTEGER,

  -- Tee configurations (JSONB array)
  tees JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- Structure: [
  --   {"name": "Championship", "color": "Black", "rating": 74.5, "slope": 135, "par": 72, "yardage": 7227},
  --   {"name": "Men", "color": "Blue", "rating": 72.0, "slope": 130, "par": 72, "yardage": 6700}
  -- ]

  -- Hole-by-hole data
  holes JSONB,

  -- Full course data (backup)
  course_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(course_name);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_country ON courses(country);
CREATE INDEX IF NOT EXISTS idx_courses_tees ON courses USING GIN (tees);

-- ============================================================================
-- 3. GET COURSE RATING/SLOPE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_course_rating_slope(
  p_course_id TEXT,
  p_tee_name TEXT
)
RETURNS TABLE (
  rating NUMERIC,
  slope INTEGER,
  par INTEGER
) AS $$
DECLARE
  v_tee_data JSONB;
  v_course_uuid UUID;
BEGIN
  -- Try to parse as UUID first, otherwise treat as course_code
  BEGIN
    v_course_uuid := p_course_id::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    SELECT id INTO v_course_uuid FROM courses WHERE course_code = p_course_id;
  END;

  -- Get matching tee configuration
  SELECT t INTO v_tee_data
  FROM courses c, jsonb_array_elements(c.tees) AS t
  WHERE c.id = v_course_uuid
    AND (
      LOWER(t->>'name') = LOWER(p_tee_name)
      OR LOWER(t->>'color') = LOWER(p_tee_name)
      OR LOWER(t->>'name') LIKE '%' || LOWER(p_tee_name) || '%'
      OR LOWER(t->>'color') LIKE '%' || LOWER(p_tee_name) || '%'
    )
  ORDER BY
    CASE
      WHEN LOWER(t->>'name') = LOWER(p_tee_name) THEN 1
      WHEN LOWER(t->>'color') = LOWER(p_tee_name) THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF v_tee_data IS NOT NULL THEN
    RETURN QUERY SELECT
      COALESCE((v_tee_data->>'rating')::NUMERIC, 72.0),
      COALESCE((v_tee_data->>'slope')::INTEGER, 113),
      COALESCE((v_tee_data->>'par')::INTEGER, 72);
  ELSE
    -- Fallback to defaults based on tee color
    RETURN QUERY SELECT
      CASE
        WHEN p_tee_name ILIKE '%black%' OR p_tee_name ILIKE '%championship%' THEN 73.5
        WHEN p_tee_name ILIKE '%blue%' OR p_tee_name ILIKE '%men%' THEN 72.0
        WHEN p_tee_name ILIKE '%white%' OR p_tee_name ILIKE '%regular%' THEN 70.5
        WHEN p_tee_name ILIKE '%yellow%' OR p_tee_name ILIKE '%senior%' THEN 69.0
        WHEN p_tee_name ILIKE '%red%' OR p_tee_name ILIKE '%ladies%' THEN 67.5
        ELSE 72.0
      END::NUMERIC,
      CASE
        WHEN p_tee_name ILIKE '%black%' OR p_tee_name ILIKE '%championship%' THEN 130
        WHEN p_tee_name ILIKE '%blue%' OR p_tee_name ILIKE '%men%' THEN 125
        WHEN p_tee_name ILIKE '%white%' OR p_tee_name ILIKE '%regular%' THEN 120
        WHEN p_tee_name ILIKE '%yellow%' OR p_tee_name ILIKE '%senior%' THEN 115
        WHEN p_tee_name ILIKE '%red%' OR p_tee_name ILIKE '%ladies%' THEN 110
        ELSE 113
      END::INTEGER,
      72::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. GET COURSE TEES FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_course_tees(p_course_id TEXT)
RETURNS TABLE (
  tee_name TEXT,
  tee_color TEXT,
  rating NUMERIC,
  slope INTEGER,
  par INTEGER,
  yardage INTEGER
) AS $$
DECLARE
  v_course_uuid UUID;
BEGIN
  BEGIN
    v_course_uuid := p_course_id::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    SELECT id INTO v_course_uuid FROM courses WHERE course_code = p_course_id;
  END;

  RETURN QUERY
  SELECT
    t->>'name' AS tee_name,
    t->>'color' AS tee_color,
    COALESCE((t->>'rating')::NUMERIC, 72.0) AS rating,
    COALESCE((t->>'slope')::INTEGER, 113) AS slope,
    COALESCE((t->>'par')::INTEGER, 72) AS par,
    COALESCE((t->>'yardage')::INTEGER, 0) AS yardage
  FROM courses c, jsonb_array_elements(c.tees) AS t
  WHERE c.id = v_course_uuid
  ORDER BY COALESCE((t->>'yardage')::INTEGER, 0) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. CALCULATE SCORE DIFFERENTIAL (WHS)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_score_differential_v2(
  p_gross_score INTEGER,
  p_course_id TEXT,
  p_tee_marker TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_rating NUMERIC;
  v_slope INTEGER;
  v_par INTEGER;
  v_differential NUMERIC;
BEGIN
  SELECT rating, slope, par INTO v_rating, v_slope, v_par
  FROM get_course_rating_slope(p_course_id, p_tee_marker);

  -- WHS formula: (Score - Rating) * 113 / Slope
  v_differential := (p_gross_score - v_rating) * 113.0 / v_slope;

  RETURN ROUND(v_differential, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. CALCULATE COURSE HANDICAP (WHS)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_course_handicap(
  p_handicap_index NUMERIC,
  p_course_id TEXT,
  p_tee_marker TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_rating NUMERIC;
  v_slope INTEGER;
  v_par INTEGER;
  v_course_handicap NUMERIC;
BEGIN
  SELECT rating, slope, par INTO v_rating, v_slope, v_par
  FROM get_course_rating_slope(p_course_id, p_tee_marker);

  -- WHS formula: Index * (Slope / 113) + (Rating - Par)
  v_course_handicap := p_handicap_index * (v_slope / 113.0) + (v_rating - v_par);

  RETURN ROUND(v_course_handicap)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. GET COURSE INFO FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_course_info(p_course_id TEXT)
RETURNS TABLE (
  course_id UUID,
  course_name TEXT,
  course_code TEXT,
  location TEXT,
  country TEXT,
  par INTEGER,
  total_holes INTEGER,
  tee_count INTEGER
) AS $$
DECLARE
  v_course_uuid UUID;
BEGIN
  BEGIN
    v_course_uuid := p_course_id::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    SELECT id INTO v_course_uuid FROM courses WHERE course_code = p_course_id;
  END;

  RETURN QUERY
  SELECT
    c.id,
    c.course_name,
    c.course_code,
    c.location,
    c.country,
    c.par,
    c.total_holes,
    jsonb_array_length(c.tees) AS tee_count
  FROM courses c
  WHERE c.id = v_course_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Service manage courses" ON courses FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 9. UPDATE TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'COURSE_RATING_INTEGRATION.sql deployed successfully' as status;
