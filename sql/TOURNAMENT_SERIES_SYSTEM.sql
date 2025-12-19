-- ============================================================================
-- TOURNAMENT SERIES & PLAYOFF SYSTEM
-- ============================================================================
-- Created: 2025-12-11
-- Purpose: FedEx Cup-style multi-event competitions with playoffs
-- Features:
--   - Multi-event tournament series tracking
--   - Playoff brackets with elimination rounds
--   - Qualification rules and automatic advancement
--   - Points multipliers for majors
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TOURNAMENT SERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tournament_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES society_profiles(id) ON DELETE CASCADE,
  series_name TEXT NOT NULL,
  series_type TEXT NOT NULL CHECK (series_type IN ('season', 'playoffs', 'major', 'mini-series', 'championship')),
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'playoffs', 'completed', 'cancelled')),
  points_config_id UUID REFERENCES points_config(id),

  -- Qualification rules
  qualification_rules JSONB DEFAULT '{
    "regular_season_cutoff": 70,
    "playoff_round_1_cutoff": 50,
    "playoff_round_2_cutoff": 30,
    "finale_field_size": 30,
    "points_reset_for_finale": false,
    "starting_strokes_enabled": false
  }'::JSONB,

  -- Prize pool
  prize_pool JSONB DEFAULT '{}'::JSONB,

  -- Settings
  settings JSONB DEFAULT '{
    "allow_divisions": true,
    "count_all_events": true,
    "max_events_counted": null,
    "min_events_required": 3
  }'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. SERIES EVENTS TABLE (links events to series)
-- ============================================================================
CREATE TABLE IF NOT EXISTS series_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES tournament_series(id) ON DELETE CASCADE,
  event_id UUID REFERENCES society_events(id) ON DELETE CASCADE,
  event_order INTEGER NOT NULL,
  event_type TEXT DEFAULT 'regular' CHECK (event_type IN ('regular', 'major', 'playoff', 'finale')),
  points_multiplier NUMERIC(3,1) DEFAULT 1.0,
  is_playoff_event BOOLEAN DEFAULT false,
  qualification_cutoff INTEGER, -- top N qualify for next event
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  results_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, event_id),
  UNIQUE(series_id, event_order)
);

-- ============================================================================
-- 3. SERIES STANDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS series_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES tournament_series(id) ON DELETE CASCADE,
  golfer_id TEXT NOT NULL,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  total_points INTEGER DEFAULT 0,
  events_played INTEGER DEFAULT 0,
  events_qualified INTEGER DEFAULT 0,
  qualification_status TEXT DEFAULT 'pending' CHECK (qualification_status IN ('qualified', 'bubble', 'eliminated', 'pending')),
  is_eliminated BOOLEAN DEFAULT false,
  elimination_stage TEXT,
  best_finish INTEGER,
  wins INTEGER DEFAULT 0,
  top3 INTEGER DEFAULT 0,
  top5 INTEGER DEFAULT 0,
  points_to_qualify INTEGER, -- calculated field
  previous_position INTEGER,
  position_change INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, golfer_id)
);

-- ============================================================================
-- 4. SERIES EVENT RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS series_event_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES tournament_series(id) ON DELETE CASCADE,
  series_event_id UUID REFERENCES series_events(id) ON DELETE CASCADE,
  golfer_id TEXT NOT NULL,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  gross_score INTEGER,
  net_score INTEGER,
  stableford_points INTEGER,
  base_points INTEGER DEFAULT 0,
  multiplied_points INTEGER DEFAULT 0, -- base_points * multiplier
  qualified_for_next BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_event_id, golfer_id)
);

-- ============================================================================
-- 5. PLAYOFF BRACKETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS playoff_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID REFERENCES tournament_series(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  round_name TEXT NOT NULL, -- 'Quarter Finals', 'Semi Finals', 'Championship'
  bracket_type TEXT DEFAULT 'single-elimination' CHECK (bracket_type IN ('single-elimination', 'double-elimination', 'round-robin')),
  matches JSONB DEFAULT '[]'::JSONB,
  -- matches structure: [
  --   {"match_id": 1, "player1_id": "...", "player2_id": "...", "winner_id": null, "player1_score": null, "player2_score": null}
  -- ]
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tournament_series_society ON tournament_series(society_id);
CREATE INDEX IF NOT EXISTS idx_tournament_series_status ON tournament_series(status);
CREATE INDEX IF NOT EXISTS idx_series_events_series ON series_events(series_id);
CREATE INDEX IF NOT EXISTS idx_series_events_event ON series_events(event_id);
CREATE INDEX IF NOT EXISTS idx_series_standings_series ON series_standings(series_id);
CREATE INDEX IF NOT EXISTS idx_series_standings_golfer ON series_standings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_series_standings_position ON series_standings("position");
CREATE INDEX IF NOT EXISTS idx_series_event_results_series ON series_event_results(series_id);
CREATE INDEX IF NOT EXISTS idx_playoff_brackets_series ON playoff_brackets(series_id);

-- ============================================================================
-- 7. CALCULATE SERIES STANDINGS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_series_standings(target_series_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_series RECORD;
  v_count INTEGER := 0;
  v_cutoff INTEGER;
  v_prev_standings JSONB;
BEGIN
  -- Get series info
  SELECT * INTO v_series FROM tournament_series WHERE id = target_series_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Series not found: %', target_series_id;
  END IF;

  -- Get qualification cutoff
  v_cutoff := (v_series.qualification_rules->>'regular_season_cutoff')::INTEGER;

  -- Store previous positions
  SELECT jsonb_object_agg(golfer_id, "position") INTO v_prev_standings
  FROM series_standings WHERE series_id = target_series_id;

  -- Clear existing standings
  DELETE FROM series_standings WHERE series_id = target_series_id;

  -- Calculate new standings
  INSERT INTO series_standings (
    series_id, golfer_id, golfer_name, division, "position", total_points,
    events_played, wins, top3, top5, best_finish, qualification_status,
    previous_position, position_change
  )
  SELECT
    target_series_id,
    ser.golfer_id,
    ser.golfer_name,
    ser.division,
    ROW_NUMBER() OVER (ORDER BY SUM(ser.multiplied_points) DESC, COUNT(*) FILTER (WHERE ser."position" = 1) DESC)::INTEGER,
    COALESCE(SUM(ser.multiplied_points), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE ser."position" = 1),
    COUNT(*) FILTER (WHERE ser."position" <= 3),
    COUNT(*) FILTER (WHERE ser."position" <= 5),
    MIN(ser."position"),
    CASE
      WHEN ROW_NUMBER() OVER (ORDER BY SUM(ser.multiplied_points) DESC) <= v_cutoff THEN 'qualified'
      WHEN ROW_NUMBER() OVER (ORDER BY SUM(ser.multiplied_points) DESC) <= v_cutoff + 5 THEN 'bubble'
      ELSE 'pending'
    END,
    (v_prev_standings->>ser.golfer_id)::INTEGER,
    CASE
      WHEN v_prev_standings->>ser.golfer_id IS NULL THEN NULL
      ELSE (v_prev_standings->>ser.golfer_id)::INTEGER -
           ROW_NUMBER() OVER (ORDER BY SUM(ser.multiplied_points) DESC)::INTEGER
    END
  FROM series_event_results ser
  WHERE ser.series_id = target_series_id
  GROUP BY ser.golfer_id, ser.golfer_name, ser.division;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update series timestamp
  UPDATE tournament_series SET updated_at = NOW() WHERE id = target_series_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. QUALIFY PLAYERS FOR PLAYOFF FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION qualify_players_for_playoff(
  p_series_id UUID,
  p_cutoff_position INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Mark players above cutoff as qualified
  UPDATE series_standings
  SET
    qualification_status = 'qualified',
    events_qualified = events_qualified + 1,
    updated_at = NOW()
  WHERE series_id = p_series_id
    AND "position" <= p_cutoff_position
    AND NOT is_eliminated;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mark players below cutoff as eliminated (if in playoffs)
  UPDATE series_standings
  SET
    qualification_status = 'eliminated',
    is_eliminated = true,
    elimination_stage = (
      SELECT se.event_type FROM series_events se
      WHERE se.series_id = p_series_id AND se.is_playoff_event
      ORDER BY se.event_order DESC LIMIT 1
    ),
    updated_at = NOW()
  WHERE series_id = p_series_id
    AND "position" > p_cutoff_position
    AND NOT is_eliminated;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. ELIMINATE PLAYERS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION eliminate_players(
  p_series_id UUID,
  p_event_id UUID,
  p_cutoff INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_event_type TEXT;
BEGIN
  -- Get event type
  SELECT se.event_type INTO v_event_type
  FROM series_events se
  WHERE se.series_id = p_series_id AND se.event_id = p_event_id;

  -- Mark players outside cutoff as eliminated
  UPDATE series_standings
  SET
    is_eliminated = true,
    elimination_stage = v_event_type,
    qualification_status = 'eliminated',
    updated_at = NOW()
  WHERE series_id = p_series_id
    AND "position" > p_cutoff
    AND NOT is_eliminated;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. GENERATE PLAYOFF BRACKET FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_playoff_bracket(
  p_series_id UUID,
  p_round_number INTEGER,
  p_round_name TEXT,
  p_bracket_type TEXT DEFAULT 'single-elimination'
)
RETURNS UUID AS $$
DECLARE
  v_bracket_id UUID;
  v_matches JSONB := '[]'::JSONB;
  v_qualified RECORD;
  v_players TEXT[];
  v_match_count INTEGER;
  i INTEGER;
BEGIN
  -- Get qualified players ordered by position
  SELECT array_agg(golfer_id ORDER BY "position")
  INTO v_players
  FROM series_standings
  WHERE series_id = p_series_id
    AND qualification_status = 'qualified'
    AND NOT is_eliminated;

  -- Calculate number of matches
  v_match_count := array_length(v_players, 1) / 2;

  -- Generate matches (1 vs last, 2 vs second-to-last, etc.)
  FOR i IN 1..v_match_count LOOP
    v_matches := v_matches || jsonb_build_object(
      'match_id', i,
      'player1_id', v_players[i],
      'player2_id', v_players[array_length(v_players, 1) - i + 1],
      'winner_id', NULL,
      'player1_score', NULL,
      'player2_score', NULL,
      'status', 'pending'
    );
  END LOOP;

  -- Insert bracket
  INSERT INTO playoff_brackets (series_id, round_number, round_name, bracket_type, matches, status)
  VALUES (p_series_id, p_round_number, p_round_name, p_bracket_type, v_matches, 'pending')
  RETURNING id INTO v_bracket_id;

  RETURN v_bracket_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. GET PLAYOFF BRACKET FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_playoff_bracket(p_series_id UUID)
RETURNS TABLE (
  bracket_id UUID,
  round_number INTEGER,
  round_name TEXT,
  bracket_type TEXT,
  matches JSONB,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.round_number,
    pb.round_name,
    pb.bracket_type,
    pb.matches,
    pb.status
  FROM playoff_brackets pb
  WHERE pb.series_id = p_series_id
  ORDER BY pb.round_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 12. ADVANCE PLAYOFF ROUND FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION advance_playoff_round(
  p_series_id UUID,
  p_round_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_bracket RECORD;
  v_match RECORD;
  v_winners TEXT[];
BEGIN
  -- Get bracket
  SELECT * INTO v_bracket
  FROM playoff_brackets
  WHERE series_id = p_series_id AND round_number = p_round_number;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Collect winners
  FOR v_match IN SELECT * FROM jsonb_array_elements(v_bracket.matches) LOOP
    IF v_match.value->>'winner_id' IS NOT NULL THEN
      v_winners := array_append(v_winners, v_match.value->>'winner_id');
    ELSE
      RAISE EXCEPTION 'Not all matches completed in round %', p_round_number;
    END IF;
  END LOOP;

  -- Mark losers as eliminated
  UPDATE series_standings
  SET
    is_eliminated = true,
    elimination_stage = v_bracket.round_name,
    qualification_status = 'eliminated',
    updated_at = NOW()
  WHERE series_id = p_series_id
    AND qualification_status = 'qualified'
    AND NOT (golfer_id = ANY(v_winners));

  -- Mark bracket as completed
  UPDATE playoff_brackets
  SET status = 'completed', completed_at = NOW()
  WHERE id = v_bracket.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. GET QUALIFICATION PROJECTIONS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_qualification_projections(p_series_id UUID)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  "position" INTEGER,
  total_points INTEGER,
  qualification_status TEXT,
  points_to_qualify INTEGER,
  events_remaining INTEGER,
  projected_finish TEXT
) AS $$
DECLARE
  v_cutoff_position INTEGER;
  v_cutoff_points INTEGER;
  v_remaining_events INTEGER;
BEGIN
  -- Get cutoff info
  SELECT (ts.qualification_rules->>'regular_season_cutoff')::INTEGER
  INTO v_cutoff_position
  FROM tournament_series ts WHERE ts.id = p_series_id;

  -- Get points at cutoff position
  SELECT ss.total_points INTO v_cutoff_points
  FROM series_standings ss
  WHERE ss.series_id = p_series_id AND ss."position" = v_cutoff_position;

  -- Get remaining events
  SELECT COUNT(*) INTO v_remaining_events
  FROM series_events se
  WHERE se.series_id = p_series_id AND se.status = 'upcoming';

  RETURN QUERY
  SELECT
    ss.golfer_id,
    ss.golfer_name,
    ss."position",
    ss.total_points,
    ss.qualification_status,
    CASE
      WHEN ss."position" <= v_cutoff_position THEN 0
      ELSE GREATEST(0, v_cutoff_points - ss.total_points + 1)
    END as points_to_qualify,
    v_remaining_events,
    CASE
      WHEN ss."position" <= v_cutoff_position - 10 THEN 'Safe'
      WHEN ss."position" <= v_cutoff_position THEN 'Likely'
      WHEN ss."position" <= v_cutoff_position + 5 THEN 'Possible'
      ELSE 'Unlikely'
    END as projected_finish
  FROM series_standings ss
  WHERE ss.series_id = p_series_id
    AND NOT ss.is_eliminated
  ORDER BY ss."position";
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 14. RLS POLICIES
-- ============================================================================
ALTER TABLE tournament_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE series_event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_brackets ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read tournament_series" ON tournament_series FOR SELECT USING (true);
CREATE POLICY "Public read series_events" ON series_events FOR SELECT USING (true);
CREATE POLICY "Public read series_standings" ON series_standings FOR SELECT USING (true);
CREATE POLICY "Public read series_event_results" ON series_event_results FOR SELECT USING (true);
CREATE POLICY "Public read playoff_brackets" ON playoff_brackets FOR SELECT USING (true);

-- Service role management
CREATE POLICY "Service manage tournament_series" ON tournament_series FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service manage series_events" ON series_events FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service manage series_standings" ON series_standings FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service manage series_event_results" ON series_event_results FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service manage playoff_brackets" ON playoff_brackets FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'TOURNAMENT_SERIES_SYSTEM.sql deployed successfully' as status;
