-- Pin Positions System for MyCaddiPro
-- Stores daily pin locations extracted from pin sheet photos

-- Main pin_positions table
CREATE TABLE IF NOT EXISTS pin_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name TEXT NOT NULL,
  course_id TEXT, -- Optional: link to courses table if it exists
  date DATE NOT NULL,
  green_speed TEXT, -- e.g., "9'4"" or "10.5"
  uploaded_by TEXT, -- LINE user ID of uploader
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_image_url TEXT, -- URL to pin sheet image in Supabase Storage
  image_hash TEXT, -- For deduplication
  holes_detected INTEGER DEFAULT 18,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  metadata JSONB, -- Extra data from OCR processing

  -- Ensure one active pin sheet per course per day
  UNIQUE (course_name, date, status)
);

-- Individual pin locations for each hole
CREATE TABLE IF NOT EXISTS pin_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_position_id UUID NOT NULL REFERENCES pin_positions(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
  position_label TEXT, -- e.g., "back-right", "front-center", "middle-left"
  x_position DECIMAL(4, 3) CHECK (x_position BETWEEN 0 AND 1), -- Normalized 0-1 (0=left, 1=right)
  y_position DECIMAL(4, 3) CHECK (y_position BETWEEN 0 AND 1), -- Normalized 0-1 (0=front, 1=back)
  description TEXT, -- Human-readable: "Back right", "Front center"

  UNIQUE (pin_position_id, hole_number)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pin_positions_course_date
  ON pin_positions(course_name, date DESC);

CREATE INDEX IF NOT EXISTS idx_pin_positions_uploaded_by
  ON pin_positions(uploaded_by, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_locations_pin_position
  ON pin_locations(pin_position_id);

-- Row Level Security (RLS)
ALTER TABLE pin_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pin_locations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pin positions (public data)
CREATE POLICY "Pin positions are viewable by everyone"
  ON pin_positions FOR SELECT
  USING (true);

CREATE POLICY "Pin locations are viewable by everyone"
  ON pin_locations FOR SELECT
  USING (true);

-- Only authenticated users can upload pin sheets
CREATE POLICY "Authenticated users can create pin positions"
  ON pin_positions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uploaders can update their own pin positions"
  ON pin_positions FOR UPDATE
  USING (uploaded_by = auth.jwt() ->> 'sub');

-- System can insert pin locations (via Edge Function)
CREATE POLICY "System can create pin locations"
  ON pin_locations FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON pin_positions TO anon, authenticated;
GRANT SELECT ON pin_locations TO anon, authenticated;
GRANT INSERT ON pin_positions TO authenticated;
GRANT INSERT, UPDATE ON pin_locations TO authenticated;

-- Comments for documentation
COMMENT ON TABLE pin_positions IS 'Daily pin sheet data for golf courses';
COMMENT ON TABLE pin_locations IS 'Individual hole pin locations (18 per pin_positions record)';
COMMENT ON COLUMN pin_locations.x_position IS 'Horizontal position: 0=far left, 0.5=center, 1=far right';
COMMENT ON COLUMN pin_locations.y_position IS 'Vertical position: 0=front of green, 0.5=middle, 1=back of green';
