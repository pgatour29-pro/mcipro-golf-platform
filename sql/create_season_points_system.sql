-- ============================================================================
-- PLAYER OF THE YEAR POINTS SYSTEM (FedEx Cup Style)
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Track cumulative season points across events for competitive rankings
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLE: points_config
-- Purpose: Configurable point systems per organizer/season
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS points_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organizer & season identification
  organizer_id TEXT NOT NULL,
  season_year INTEGER NOT NULL,

  config_name TEXT NOT NULL DEFAULT 'Default',

  -- Point allocation system
  -- Example: {"1": 100, "2": 50, "3": 35, "4": 25, "5": 20, ...}
  point_system JSONB NOT NULL DEFAULT '{"1": 100, "2": 50, "3": 35, "4": 25, "5": 20, "6": 15, "7": 12, "8": 10, "9": 8, "10": 6}'::jsonb,

  -- Division settings
  divisions_enabled BOOLEAN DEFAULT false,
  -- Example: {"A": "0-9", "B": "10-18", "C": "19-28", "D": "29+"}
  division_definitions JSONB DEFAULT '{"A": "0-9", "B": "10-18", "C": "19-28", "D": "29+"}'::jsonb,

  -- Season settings
  min_events_required INTEGER DEFAULT 0,
  max_events_counted INTEGER, -- NULL = count all events

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(organizer_id, season_year)
);

-- ----------------------------------------------------------------------------
-- TABLE: season_points
-- Purpose: Cumulative year-to-date points for each player
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS season_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Season identification
  season_year INTEGER NOT NULL,
  organizer_id TEXT NOT NULL,

  -- Player identification
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,

  -- Division (optional)
  division TEXT,

  -- Points tracking
  total_points INTEGER DEFAULT 0,
  events_played INTEGER DEFAULT 0,
  events_counted INTEGER DEFAULT 0, -- For max_events_counted logic

  -- Performance stats
  wins INTEGER DEFAULT 0,
  top_3_finishes INTEGER DEFAULT 0,
  top_5_finishes INTEGER DEFAULT 0,
  top_10_finishes INTEGER DEFAULT 0,

  -- Best results (for tiebreakers)
  best_finish INTEGER,
  best_finish_event_id TEXT,

  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(season_year, organizer_id, player_id, division)
);

-- ----------------------------------------------------------------------------
-- TABLE: event_results
-- Purpose: Individual event results with points awarded
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event linkage
  event_id TEXT NOT NULL,
  round_id UUID,

  -- Player info
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,

  -- Division
  division TEXT,

  -- Performance
  position INTEGER NOT NULL,
  score INTEGER,
  score_type TEXT DEFAULT 'stableford', -- 'stableford', 'strokeplay', etc.

  -- Points awarded
  points_earned INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'completed',
  is_counted BOOLEAN DEFAULT true, -- For max_events_counted logic

  -- Metadata
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(event_id, player_id, division)
);

-- ----------------------------------------------------------------------------
-- INDEXES for Performance
-- ----------------------------------------------------------------------------

-- Points config lookups
CREATE INDEX IF NOT EXISTS idx_points_config_organizer_season
  ON points_config(organizer_id, season_year) WHERE is_active = true;

-- Season standings leaderboard (most common query)
CREATE INDEX IF NOT EXISTS idx_season_points_leaderboard
  ON season_points(season_year, organizer_id, division, total_points DESC);

-- Player history lookup
CREATE INDEX IF NOT EXISTS idx_season_points_player
  ON season_points(player_id, season_year);

-- Organizer season lookup
CREATE INDEX IF NOT EXISTS idx_season_points_organizer_season
  ON season_points(organizer_id, season_year);

-- Event results by event
CREATE INDEX IF NOT EXISTS idx_event_results_event
  ON event_results(event_id);

-- Event results by player
CREATE INDEX IF NOT EXISTS idx_event_results_player
  ON event_results(player_id);

-- Event results by season (for rollup)
CREATE INDEX IF NOT EXISTS idx_event_results_date
  ON event_results(event_date);

-- ----------------------------------------------------------------------------
-- FUNCTION: calculate_player_division
-- Purpose: Auto-assign division based on handicap
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_player_division(
  p_handicap REAL,
  p_division_definitions JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_division TEXT;
  v_key TEXT;
  v_range TEXT;
  v_min INTEGER;
  v_max INTEGER;
BEGIN
  -- Loop through division definitions
  FOR v_key, v_range IN SELECT * FROM jsonb_each_text(p_division_definitions)
  LOOP
    -- Parse range like "0-9" or "29+"
    IF v_range LIKE '%+' THEN
      -- Handle open-ended ranges like "29+"
      v_min := SUBSTRING(v_range FROM 1 FOR LENGTH(v_range) - 1)::INTEGER;
      IF p_handicap >= v_min THEN
        RETURN v_key;
      END IF;
    ELSIF v_range LIKE '%-%' THEN
      -- Handle closed ranges like "0-9"
      v_min := SPLIT_PART(v_range, '-', 1)::INTEGER;
      v_max := SPLIT_PART(v_range, '-', 2)::INTEGER;
      IF p_handicap >= v_min AND p_handicap <= v_max THEN
        RETURN v_key;
      END IF;
    END IF;
  END LOOP;

  -- Default to 'Open' if no match
  RETURN 'Open';
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: get_points_for_position
-- Purpose: Lookup points for a given position from point system
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_points_for_position(
  p_position INTEGER,
  p_point_system JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  -- Try exact position match
  v_points := (p_point_system->>p_position::text)::INTEGER;

  -- Return points or 0 if not found
  RETURN COALESCE(v_points, 0);
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: update_season_standings
-- Purpose: Recalculate season points after event completion
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_season_standings(p_event_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_event RECORD;
  v_config RECORD;
  v_result RECORD;
  v_season_year INTEGER;
BEGIN
  -- Get event details
  SELECT
    id,
    organizer_id,
    EXTRACT(YEAR FROM date)::INTEGER as year,
    date
  INTO v_event
  FROM society_events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_event_id;
  END IF;

  v_season_year := v_event.year;

  -- Get points configuration
  SELECT *
  INTO v_config
  FROM points_config
  WHERE organizer_id = v_event.organizer_id
    AND season_year = v_season_year
    AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'No active points config found for organizer % season %', v_event.organizer_id, v_season_year;
    RETURN;
  END IF;

  -- Loop through event results and update season standings
  FOR v_result IN
    SELECT
      player_id,
      player_name,
      division,
      position,
      points_earned
    FROM event_results
    WHERE event_id = p_event_id
      AND is_counted = true
  LOOP
    -- Insert or update season points
    INSERT INTO season_points (
      season_year,
      organizer_id,
      player_id,
      player_name,
      division,
      total_points,
      events_played,
      events_counted,
      wins,
      top_3_finishes,
      top_5_finishes,
      top_10_finishes,
      best_finish,
      best_finish_event_id,
      last_updated
    )
    VALUES (
      v_season_year,
      v_event.organizer_id,
      v_result.player_id,
      v_result.player_name,
      v_result.division,
      v_result.points_earned,
      1,
      1,
      CASE WHEN v_result.position = 1 THEN 1 ELSE 0 END,
      CASE WHEN v_result.position <= 3 THEN 1 ELSE 0 END,
      CASE WHEN v_result.position <= 5 THEN 1 ELSE 0 END,
      CASE WHEN v_result.position <= 10 THEN 1 ELSE 0 END,
      v_result.position,
      p_event_id,
      NOW()
    )
    ON CONFLICT (season_year, organizer_id, player_id, division)
    DO UPDATE SET
      total_points = season_points.total_points + v_result.points_earned,
      events_played = season_points.events_played + 1,
      events_counted = season_points.events_counted + 1,
      wins = season_points.wins + CASE WHEN v_result.position = 1 THEN 1 ELSE 0 END,
      top_3_finishes = season_points.top_3_finishes + CASE WHEN v_result.position <= 3 THEN 1 ELSE 0 END,
      top_5_finishes = season_points.top_5_finishes + CASE WHEN v_result.position <= 5 THEN 1 ELSE 0 END,
      top_10_finishes = season_points.top_10_finishes + CASE WHEN v_result.position <= 10 THEN 1 ELSE 0 END,
      best_finish = LEAST(COALESCE(season_points.best_finish, 999), v_result.position),
      best_finish_event_id = CASE
        WHEN v_result.position < COALESCE(season_points.best_finish, 999)
        THEN p_event_id
        ELSE season_points.best_finish_event_id
      END,
      last_updated = NOW();
  END LOOP;

  RAISE NOTICE 'Season standings updated for event %', p_event_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- FUNCTION: get_division_leaderboard
-- Purpose: Fast leaderboard query for a specific division
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_division_leaderboard(
  p_season_year INTEGER,
  p_organizer_id TEXT,
  p_division TEXT DEFAULT NULL
)
RETURNS TABLE (
  rank INTEGER,
  player_id TEXT,
  player_name TEXT,
  division TEXT,
  total_points INTEGER,
  events_played INTEGER,
  wins INTEGER,
  top_3 INTEGER,
  top_5 INTEGER,
  best_finish INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY sp.total_points DESC, sp.wins DESC, sp.best_finish ASC)::INTEGER as rank,
    sp.player_id,
    sp.player_name,
    sp.division,
    sp.total_points,
    sp.events_played,
    sp.wins,
    sp.top_3_finishes as top_3,
    sp.top_5_finishes as top_5,
    sp.best_finish
  FROM season_points sp
  WHERE sp.season_year = p_season_year
    AND sp.organizer_id = p_organizer_id
    AND (p_division IS NULL OR sp.division = p_division)
  ORDER BY sp.total_points DESC, sp.wins DESC, sp.best_finish ASC;
END;
$$;

-- ----------------------------------------------------------------------------
-- ALTER EXISTING TABLES
-- ----------------------------------------------------------------------------

-- Add columns to society_events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'society_events' AND column_name = 'counts_for_season') THEN
    ALTER TABLE society_events ADD COLUMN counts_for_season BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'society_events' AND column_name = 'point_multiplier') THEN
    ALTER TABLE society_events ADD COLUMN point_multiplier DECIMAL(3,1) DEFAULT 1.0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'society_events' AND column_name = 'division_mode') THEN
    ALTER TABLE society_events ADD COLUMN division_mode TEXT DEFAULT 'none';
    COMMENT ON COLUMN society_events.division_mode IS 'none, auto, manual';
  END IF;
END $$;

-- Add columns to event_registrations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'event_registrations' AND column_name = 'division') THEN
    ALTER TABLE event_registrations ADD COLUMN division TEXT;
  END IF;
END $$;

-- Add columns to rounds table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rounds') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'division') THEN
      ALTER TABLE rounds ADD COLUMN division TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'rounds' AND column_name = 'points_awarded') THEN
      ALTER TABLE rounds ADD COLUMN points_awarded INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- SEED DEFAULT POINT SYSTEMS
-- ----------------------------------------------------------------------------

-- Insert default FedEx Cup style point system
INSERT INTO points_config (
  organizer_id,
  season_year,
  config_name,
  point_system,
  divisions_enabled,
  division_definitions
)
VALUES (
  'default',
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  'FedEx Cup Style',
  '{"1": 100, "2": 50, "3": 35, "4": 25, "5": 20, "6": 15, "7": 12, "8": 10, "9": 8, "10": 6, "11": 5, "12": 4, "13": 3, "14": 2, "15": 1}'::jsonb,
  true,
  '{"A": "0-9", "B": "10-18", "C": "19-28", "D": "29+"}'::jsonb
)
ON CONFLICT (organizer_id, season_year) DO NOTHING;

-- ============================================================================
-- PERMISSIONS (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;

-- Points config: Organizers can manage their own configs
CREATE POLICY "Organizers can view their points config"
  ON points_config FOR SELECT
  USING (organizer_id = auth.uid()::text OR organizer_id = 'default');

CREATE POLICY "Organizers can insert their points config"
  ON points_config FOR INSERT
  WITH CHECK (organizer_id = auth.uid()::text);

CREATE POLICY "Organizers can update their points config"
  ON points_config FOR UPDATE
  USING (organizer_id = auth.uid()::text);

-- Season points: Public read, system updates
CREATE POLICY "Anyone can view season points"
  ON season_points FOR SELECT
  USING (true);

-- Event results: Public read, organizers can insert/update
CREATE POLICY "Anyone can view event results"
  ON event_results FOR SELECT
  USING (true);

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE points_config IS 'Configurable point allocation systems per organizer/season';
COMMENT ON TABLE season_points IS 'Cumulative year-to-date player rankings (FedEx Cup style)';
COMMENT ON TABLE event_results IS 'Individual event results with points awarded per division';
