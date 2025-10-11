-- MciPro Golf Platform - Society Golf Extension
-- Add Society Organizer role and event management tables

-- =====================================================
-- 1. UPDATE USER PROFILES - Add society_organizer role
-- =====================================================
-- No schema changes needed - role field already exists as TEXT
-- Valid roles: 'golfer', 'caddie', 'manager', 'proshop', 'admin', 'society_organizer'

-- =====================================================
-- 2. SOCIETY EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS society_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE,
  cutoff TIMESTAMPTZ,

  -- Fees
  base_fee INTEGER DEFAULT 0,
  cart_fee INTEGER DEFAULT 0,
  caddy_fee INTEGER DEFAULT 0,
  transport_fee INTEGER DEFAULT 0,
  competition_fee INTEGER DEFAULT 0,

  -- Event limits
  max_players INTEGER,

  -- Organizer info
  organizer_id TEXT,
  organizer_name TEXT,

  -- Metadata
  status TEXT DEFAULT 'open',
  course_id TEXT,
  course_name TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_date ON society_events(date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON society_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON society_events(status);

-- =====================================================
-- 3. EVENT REGISTRATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES society_events(id) ON DELETE CASCADE,

  -- Player info
  player_name TEXT NOT NULL,
  player_id TEXT,
  handicap REAL NOT NULL,

  -- Preferences
  partner_prefs TEXT[], -- Array of player IDs for preferred partners
  want_transport BOOLEAN DEFAULT FALSE,
  want_competition BOOLEAN DEFAULT FALSE,

  -- Pairing info
  paired_group INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reg_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_reg_player ON event_registrations(player_id);

-- =====================================================
-- 4. EVENT WAITLIST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_waitlist (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES society_events(id) ON DELETE CASCADE,

  -- Player info
  player_name TEXT NOT NULL,
  player_id TEXT,
  handicap REAL NOT NULL,

  -- Preferences
  want_transport BOOLEAN DEFAULT FALSE,
  want_competition BOOLEAN DEFAULT FALSE,

  -- Queue position
  position INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wait_event ON event_waitlist(event_id, position);
CREATE INDEX IF NOT EXISTS idx_wait_player ON event_waitlist(player_id);

-- =====================================================
-- 5. EVENT PAIRINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_pairings (
  event_id TEXT PRIMARY KEY REFERENCES society_events(id) ON DELETE CASCADE,

  -- Pairing configuration
  group_size INTEGER DEFAULT 4,
  groups JSONB, -- Array of arrays of player registration IDs

  -- Lock status
  locked_at TIMESTAMPTZ,
  locked_by TEXT,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE society_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pairings ENABLE ROW LEVEL SECURITY;

-- Public read access for events
CREATE POLICY "Events are viewable by everyone" ON society_events
  FOR SELECT USING (true);

CREATE POLICY "Events are insertable by everyone" ON society_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Events are updatable by everyone" ON society_events
  FOR UPDATE USING (true);

CREATE POLICY "Events are deletable by everyone" ON society_events
  FOR DELETE USING (true);

-- Public access for registrations
CREATE POLICY "Registrations are viewable by everyone" ON event_registrations
  FOR SELECT USING (true);

CREATE POLICY "Registrations are insertable by everyone" ON event_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Registrations are updatable by everyone" ON event_registrations
  FOR UPDATE USING (true);

CREATE POLICY "Registrations are deletable by everyone" ON event_registrations
  FOR DELETE USING (true);

-- Public access for waitlist
CREATE POLICY "Waitlist is viewable by everyone" ON event_waitlist
  FOR SELECT USING (true);

CREATE POLICY "Waitlist is insertable by everyone" ON event_waitlist
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Waitlist is updatable by everyone" ON event_waitlist
  FOR UPDATE USING (true);

CREATE POLICY "Waitlist is deletable by everyone" ON event_waitlist
  FOR DELETE USING (true);

-- Public access for pairings
CREATE POLICY "Pairings are viewable by everyone" ON event_pairings
  FOR SELECT USING (true);

CREATE POLICY "Pairings are insertable by everyone" ON event_pairings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Pairings are updatable by everyone" ON event_pairings
  FOR UPDATE USING (true);

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for society golf tables
ALTER PUBLICATION supabase_realtime ADD TABLE society_events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE event_waitlist;
ALTER PUBLICATION supabase_realtime ADD TABLE event_pairings;

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp triggers
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON society_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pairings_updated_at BEFORE UPDATE ON event_pairings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-promote waitlist function
CREATE OR REPLACE FUNCTION auto_promote_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  event_max INTEGER;
  current_count INTEGER;
  spots_available INTEGER;
  next_waitlist RECORD;
BEGIN
  -- Get event max players
  SELECT max_players INTO event_max
  FROM society_events
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);

  -- If no max, skip auto-promotion
  IF event_max IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current registrations
  SELECT COUNT(*) INTO current_count
  FROM event_registrations
  WHERE event_id = COALESCE(NEW.event_id, OLD.event_id);

  -- Calculate spots
  spots_available := event_max - current_count;

  -- Promote from waitlist if spots available
  WHILE spots_available > 0 LOOP
    -- Get next person on waitlist
    SELECT * INTO next_waitlist
    FROM event_waitlist
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    -- No one on waitlist, exit
    EXIT WHEN next_waitlist IS NULL;

    -- Move to registrations
    INSERT INTO event_registrations (
      id, event_id, player_name, player_id, handicap,
      want_transport, want_competition, partner_prefs
    ) VALUES (
      next_waitlist.id,
      next_waitlist.event_id,
      next_waitlist.player_name,
      next_waitlist.player_id,
      next_waitlist.handicap,
      next_waitlist.want_transport,
      next_waitlist.want_competition,
      ARRAY[]::TEXT[]
    );

    -- Remove from waitlist
    DELETE FROM event_waitlist WHERE id = next_waitlist.id;

    -- Update counter
    spots_available := spots_available - 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger auto-promote when registrations are deleted
CREATE TRIGGER auto_promote_on_delete AFTER DELETE ON event_registrations
  FOR EACH ROW EXECUTE FUNCTION auto_promote_waitlist();

-- Trigger auto-promote when event max_players is increased
CREATE TRIGGER auto_promote_on_update AFTER UPDATE ON society_events
  FOR EACH ROW
  WHEN (OLD.max_players IS DISTINCT FROM NEW.max_players)
  EXECUTE FUNCTION auto_promote_waitlist();

-- =====================================================
-- DONE!
-- =====================================================
-- Society Golf schema created successfully
-- Next: Run this in Supabase SQL Editor
