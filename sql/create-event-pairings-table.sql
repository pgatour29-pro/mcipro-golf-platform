-- =====================================================
-- CREATE EVENT_PAIRINGS TABLE
-- =====================================================
-- This table stores pairing/grouping data for society golf events
-- Fix for 406 errors when loading pairings

-- Create the table
CREATE TABLE IF NOT EXISTS event_pairings (
  event_id TEXT PRIMARY KEY REFERENCES society_events(id) ON DELETE CASCADE,

  -- Pairing configuration
  group_size INTEGER DEFAULT 4,
  groups JSONB, -- Array of arrays of player registration IDs

  -- Lock status
  locked_at TIMESTAMPTZ,
  locked_by TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE event_pairings ENABLE ROW LEVEL SECURITY;

-- Public access for pairings (same as other society tables)
CREATE POLICY "Pairings are viewable by everyone" ON event_pairings
  FOR SELECT USING (true);

CREATE POLICY "Pairings are insertable by everyone" ON event_pairings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Pairings are updatable by everyone" ON event_pairings
  FOR UPDATE USING (true);

CREATE POLICY "Pairings are deletable by everyone" ON event_pairings
  FOR DELETE USING (true);

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for pairings table
ALTER PUBLICATION supabase_realtime ADD TABLE event_pairings;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamp on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at automatically
CREATE TRIGGER update_pairings_updated_at
  BEFORE UPDATE ON event_pairings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ event_pairings table created successfully!' AS status;
SELECT 'You can now create and save pairings for your events.' AS message;
