-- ============================================================================
-- TIME-WINDOWED LEADERBOARD SYSTEM
-- ============================================================================
-- Created: 2025-12-11
-- Purpose: Daily, Weekly, Monthly, Yearly standings like PGA TOUR FedEx Cup
-- Features:
--   - Period-based standings tracking
--   - Position change indicators
--   - Historical snapshots
--   - Auto-archive triggers
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. LEADERBOARD PERIODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  society_id UUID REFERENCES society_profiles(id) ON DELETE CASCADE,
  division TEXT, -- 'A', 'B', 'C', 'D', or NULL for all
  display_name TEXT, -- e.g., "Week 49 2025", "December 2025"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_type, start_date, society_id, division)
);

-- ============================================================================
-- 2. PERIOD STANDINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS period_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES leaderboard_periods(id) ON DELETE CASCADE,
  golfer_id TEXT NOT NULL,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  points INTEGER DEFAULT 0,
  events_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  top3 INTEGER DEFAULT 0,
  top5 INTEGER DEFAULT 0,
  top10 INTEGER DEFAULT 0,
  best_finish INTEGER,
  avg_finish NUMERIC(5,2),
  previous_position INTEGER,
  position_change INTEGER, -- positive = moved up, negative = moved down
  trend TEXT, -- 'hot', 'warm', 'neutral', 'cold'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, golfer_id)
);

-- ============================================================================
-- 3. LEADERBOARD SNAPSHOTS TABLE (Historical Archive)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  period_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  society_id UUID REFERENCES society_profiles(id) ON DELETE CASCADE,
  division TEXT,
  standings JSONB NOT NULL, -- Full standings array
  metadata JSONB, -- Additional info like total_events, total_players
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_type ON leaderboard_periods(period_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_dates ON leaderboard_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_society ON leaderboard_periods(society_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_periods_active ON leaderboard_periods(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_period_standings_period ON period_standings(period_id);
CREATE INDEX IF NOT EXISTS idx_period_standings_golfer ON period_standings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_period_standings_position ON period_standings("position");
CREATE INDEX IF NOT EXISTS idx_period_standings_points ON period_standings(points DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_type ON leaderboard_snapshots(period_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_date ON leaderboard_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshots_society ON leaderboard_snapshots(society_id);

-- ============================================================================
-- 5. GET OR CREATE PERIOD FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_period(
  p_period_type TEXT,
  p_date DATE DEFAULT CURRENT_DATE,
  p_society_id UUID DEFAULT NULL,
  p_division TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_period_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_display_name TEXT;
BEGIN
  -- Calculate period boundaries based on type
  CASE p_period_type
    WHEN 'daily' THEN
      v_start_date := p_date;
      v_end_date := p_date;
      v_display_name := TO_CHAR(p_date, 'Mon DD, YYYY');

    WHEN 'weekly' THEN
      -- Week starts on Monday
      v_start_date := DATE_TRUNC('week', p_date)::DATE;
      v_end_date := v_start_date + INTERVAL '6 days';
      v_display_name := 'Week ' || EXTRACT(WEEK FROM p_date)::TEXT || ' ' || EXTRACT(YEAR FROM p_date)::TEXT;

    WHEN 'monthly' THEN
      v_start_date := DATE_TRUNC('month', p_date)::DATE;
      v_end_date := (DATE_TRUNC('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
      v_display_name := TO_CHAR(p_date, 'Month YYYY');

    WHEN 'yearly' THEN
      v_start_date := DATE_TRUNC('year', p_date)::DATE;
      v_end_date := (DATE_TRUNC('year', p_date) + INTERVAL '1 year - 1 day')::DATE;
      v_display_name := EXTRACT(YEAR FROM p_date)::TEXT || ' Season';

    ELSE
      RAISE EXCEPTION 'Invalid period type: %', p_period_type;
  END CASE;

  -- Try to find existing period
  SELECT id INTO v_period_id
  FROM leaderboard_periods
  WHERE period_type = p_period_type
    AND start_date = v_start_date
    AND COALESCE(society_id::text, '') = COALESCE(p_society_id::text, '')
    AND COALESCE(division, '') = COALESCE(p_division, '');

  -- Create if not exists
  IF v_period_id IS NULL THEN
    INSERT INTO leaderboard_periods (period_type, start_date, end_date, society_id, division, display_name)
    VALUES (p_period_type, v_start_date, v_end_date, p_society_id, p_division, v_display_name)
    RETURNING id INTO v_period_id;
  END IF;

  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CALCULATE PERIOD STANDINGS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_period_standings(
  p_society_id UUID DEFAULT NULL,
  p_period_type TEXT DEFAULT 'yearly',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_division TEXT DEFAULT NULL
)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  points BIGINT,
  events_played BIGINT,
  wins BIGINT,
  top3 BIGINT,
  top5 BIGINT,
  top10 BIGINT,
  best_finish INTEGER,
  avg_finish NUMERIC
) AS $$
DECLARE
  v_start DATE;
  v_end DATE;
BEGIN
  -- Set date range based on period type if not provided
  IF p_start_date IS NULL THEN
    CASE p_period_type
      WHEN 'daily' THEN
        v_start := CURRENT_DATE;
        v_end := CURRENT_DATE;
      WHEN 'weekly' THEN
        v_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
        v_end := v_start + INTERVAL '6 days';
      WHEN 'monthly' THEN
        v_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
        v_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
      WHEN 'yearly' THEN
        v_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;
        v_end := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE;
      ELSE
        v_start := DATE_TRUNC('year', CURRENT_DATE)::DATE;
        v_end := CURRENT_DATE;
    END CASE;
  ELSE
    v_start := p_start_date;
    v_end := COALESCE(p_end_date, CURRENT_DATE);
  END IF;

  RETURN QUERY
  WITH event_data AS (
    SELECT
      er.golfer_id,
      er.golfer_name,
      er.division,
      er.points_awarded,
      er.position,
      se.date as event_date
    FROM event_results er
    JOIN society_events se ON er.event_id = se.id
    WHERE se.date BETWEEN v_start AND v_end
      AND (p_society_id IS NULL OR se.society_id = p_society_id)
      AND (p_division IS NULL OR er.division = p_division)
  ),
  aggregated AS (
    SELECT
      ed.golfer_id,
      MAX(ed.golfer_name) as golfer_name,
      MAX(ed.division) as division,
      COALESCE(SUM(ed.points_awarded), 0) as total_points,
      COUNT(*) as events_played,
      COUNT(*) FILTER (WHERE ed.position = 1) as wins,
      COUNT(*) FILTER (WHERE ed.position <= 3) as top3,
      COUNT(*) FILTER (WHERE ed.position <= 5) as top5,
      COUNT(*) FILTER (WHERE ed.position <= 10) as top10,
      MIN(ed.position) as best_finish,
      AVG(ed.position) as avg_finish
    FROM event_data ed
    GROUP BY ed.golfer_id
  )
  SELECT
    a.golfer_id,
    a.golfer_name,
    a.division,
    ROW_NUMBER() OVER (ORDER BY a.total_points DESC, a.wins DESC, a.best_finish ASC)::INTEGER as "position",
    a.total_points,
    a.events_played,
    a.wins,
    a.top3,
    a.top5,
    a.top10,
    a.best_finish,
    ROUND(a.avg_finish, 2)
  FROM aggregated a
  ORDER BY total_points DESC, wins DESC, best_finish ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. UPDATE PERIOD STANDINGS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_period_standings(
  p_period_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_period RECORD;
  v_count INTEGER := 0;
  v_prev_standings JSONB;
BEGIN
  -- Get period info
  SELECT * INTO v_period FROM leaderboard_periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Period not found: %', p_period_id;
  END IF;

  -- Get previous standings for position change calculation
  SELECT jsonb_object_agg(golfer_id, "position") INTO v_prev_standings
  FROM period_standings
  WHERE period_id = p_period_id;

  -- Clear existing standings for this period
  DELETE FROM period_standings WHERE period_id = p_period_id;

  -- Insert new standings
  INSERT INTO period_standings (
    period_id, golfer_id, golfer_name, division, "position", points,
    events_played, wins, top3, top5, top10, best_finish, avg_finish,
    previous_position, position_change, trend
  )
  SELECT
    p_period_id,
    cs.golfer_id,
    cs.golfer_name,
    cs.division,
    cs."position",
    cs.points,
    cs.events_played,
    cs.wins,
    cs.top3,
    cs.top5,
    cs.top10,
    cs.best_finish,
    cs.avg_finish,
    (v_prev_standings->>cs.golfer_id)::INTEGER,
    CASE
      WHEN v_prev_standings->>cs.golfer_id IS NULL THEN NULL
      ELSE (v_prev_standings->>cs.golfer_id)::INTEGER - cs."position"
    END,
    CASE
      WHEN v_prev_standings->>cs.golfer_id IS NULL THEN 'neutral'
      WHEN (v_prev_standings->>cs.golfer_id)::INTEGER - cs."position" >= 3 THEN 'hot'
      WHEN (v_prev_standings->>cs.golfer_id)::INTEGER - cs."position" > 0 THEN 'warm'
      WHEN (v_prev_standings->>cs.golfer_id)::INTEGER - cs."position" < -3 THEN 'cold'
      ELSE 'neutral'
    END
  FROM calculate_period_standings(
    v_period.society_id,
    v_period.period_type,
    v_period.start_date,
    v_period.end_date,
    v_period.division
  ) cs;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Update period timestamp
  UPDATE leaderboard_periods SET updated_at = NOW() WHERE id = p_period_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. GET CURRENT STANDINGS FUNCTIONS
-- ============================================================================

-- Daily standings
CREATE OR REPLACE FUNCTION get_current_daily_standings(
  p_society_id UUID DEFAULT NULL,
  p_division TEXT DEFAULT NULL
)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  points BIGINT,
  events_played BIGINT,
  wins BIGINT,
  top3 BIGINT,
  best_finish INTEGER,
  position_change INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.golfer_id,
    cs.golfer_name,
    cs.division,
    cs."position",
    cs.points,
    cs.events_played,
    cs.wins,
    cs.top3,
    cs.best_finish,
    NULL::INTEGER as position_change
  FROM calculate_period_standings(p_society_id, 'daily', CURRENT_DATE, CURRENT_DATE, p_division) cs;
END;
$$ LANGUAGE plpgsql STABLE;

-- Weekly standings
CREATE OR REPLACE FUNCTION get_current_weekly_standings(
  p_society_id UUID DEFAULT NULL,
  p_division TEXT DEFAULT NULL
)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  points BIGINT,
  events_played BIGINT,
  wins BIGINT,
  top3 BIGINT,
  best_finish INTEGER,
  position_change INTEGER
) AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_week_end DATE := v_week_start + INTERVAL '6 days';
BEGIN
  RETURN QUERY
  SELECT
    cs.golfer_id,
    cs.golfer_name,
    cs.division,
    cs."position",
    cs.points,
    cs.events_played,
    cs.wins,
    cs.top3,
    cs.best_finish,
    NULL::INTEGER as position_change
  FROM calculate_period_standings(p_society_id, 'weekly', v_week_start, v_week_end, p_division) cs;
END;
$$ LANGUAGE plpgsql STABLE;

-- Monthly standings
CREATE OR REPLACE FUNCTION get_current_monthly_standings(
  p_society_id UUID DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_month INTEGER DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  points BIGINT,
  events_played BIGINT,
  wins BIGINT,
  top3 BIGINT,
  best_finish INTEGER,
  position_change INTEGER
) AS $$
DECLARE
  v_target_date DATE;
  v_month_start DATE;
  v_month_end DATE;
BEGIN
  -- Build target date from parameters or use current
  IF p_month IS NOT NULL AND p_year IS NOT NULL THEN
    v_target_date := MAKE_DATE(p_year, p_month, 1);
  ELSE
    v_target_date := CURRENT_DATE;
  END IF;

  v_month_start := DATE_TRUNC('month', v_target_date)::DATE;
  v_month_end := (DATE_TRUNC('month', v_target_date) + INTERVAL '1 month - 1 day')::DATE;

  RETURN QUERY
  SELECT
    cs.golfer_id,
    cs.golfer_name,
    cs.division,
    cs."position",
    cs.points,
    cs.events_played,
    cs.wins,
    cs.top3,
    cs.best_finish,
    NULL::INTEGER as position_change
  FROM calculate_period_standings(p_society_id, 'monthly', v_month_start, v_month_end, p_division) cs;
END;
$$ LANGUAGE plpgsql STABLE;

-- Yearly standings
CREATE OR REPLACE FUNCTION get_yearly_standings(
  p_society_id UUID DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  division TEXT,
  "position" INTEGER,
  points BIGINT,
  events_played BIGINT,
  wins BIGINT,
  top3 BIGINT,
  top5 BIGINT,
  top10 BIGINT,
  best_finish INTEGER,
  avg_finish NUMERIC,
  position_change INTEGER
) AS $$
DECLARE
  v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_year_start DATE := MAKE_DATE(v_year, 1, 1);
  v_year_end DATE := MAKE_DATE(v_year, 12, 31);
BEGIN
  RETURN QUERY
  SELECT
    cs.golfer_id,
    cs.golfer_name,
    cs.division,
    cs."position",
    cs.points,
    cs.events_played,
    cs.wins,
    cs.top3,
    cs.top5,
    cs.top10,
    cs.best_finish,
    cs.avg_finish,
    NULL::INTEGER as position_change
  FROM calculate_period_standings(p_society_id, 'yearly', v_year_start, v_year_end, p_division) cs;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. CREATE LEADERBOARD SNAPSHOT FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION create_leaderboard_snapshot(
  p_society_id UUID DEFAULT NULL,
  p_period_type TEXT DEFAULT 'weekly',
  p_division TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_snapshot_id UUID;
  v_standings JSONB;
  v_start_date DATE;
  v_end_date DATE;
  v_total_events INTEGER;
  v_total_players INTEGER;
BEGIN
  -- Calculate date range
  CASE p_period_type
    WHEN 'daily' THEN
      v_start_date := CURRENT_DATE;
      v_end_date := CURRENT_DATE;
    WHEN 'weekly' THEN
      v_start_date := DATE_TRUNC('week', CURRENT_DATE)::DATE;
      v_end_date := v_start_date + INTERVAL '6 days';
    WHEN 'monthly' THEN
      v_start_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
      v_end_date := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    WHEN 'yearly' THEN
      v_start_date := DATE_TRUNC('year', CURRENT_DATE)::DATE;
      v_end_date := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE;
  END CASE;

  -- Get standings as JSONB
  SELECT jsonb_agg(row_to_json(cs))
  INTO v_standings
  FROM calculate_period_standings(p_society_id, p_period_type, v_start_date, v_end_date, p_division) cs;

  -- Get metadata
  SELECT COUNT(DISTINCT id), COUNT(DISTINCT golfer_id)
  INTO v_total_events, v_total_players
  FROM event_results er
  JOIN society_events se ON er.event_id = se.id
  WHERE se.date BETWEEN v_start_date AND v_end_date
    AND (p_society_id IS NULL OR se.society_id = p_society_id);

  -- Insert snapshot
  INSERT INTO leaderboard_snapshots (
    period_type, period_start, period_end, society_id, division, standings, metadata
  )
  VALUES (
    p_period_type, v_start_date, v_end_date, p_society_id, p_division,
    COALESCE(v_standings, '[]'::JSONB),
    jsonb_build_object(
      'total_events', v_total_events,
      'total_players', v_total_players,
      'snapshot_time', NOW()
    )
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. GET POSITION CHANGES FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_position_changes(
  p_golfer_id TEXT,
  p_period_type TEXT DEFAULT 'weekly',
  p_society_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  snapshot_date TIMESTAMPTZ,
  "position" INTEGER,
  points INTEGER,
  position_change INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH snapshots AS (
    SELECT
      ls.snapshot_date,
      (s->>'position')::INTEGER as pos,
      (s->>'points')::INTEGER as points
    FROM leaderboard_snapshots ls,
         jsonb_array_elements(ls.standings) s
    WHERE ls.period_type = p_period_type
      AND (p_society_id IS NULL OR ls.society_id = p_society_id)
      AND s->>'golfer_id' = p_golfer_id
    ORDER BY ls.snapshot_date DESC
    LIMIT p_limit
  )
  SELECT
    s.snapshot_date,
    s.pos,
    s.points,
    LAG(s.pos) OVER (ORDER BY s.snapshot_date) - s.pos as position_change
  FROM snapshots s
  ORDER BY s.snapshot_date DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 11. GET MOVERS AND SHAKERS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_movers_and_shakers(
  p_society_id UUID DEFAULT NULL,
  p_period_type TEXT DEFAULT 'weekly',
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  golfer_id TEXT,
  golfer_name TEXT,
  current_position INTEGER,
  previous_position INTEGER,
  position_change INTEGER,
  movement_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH current_standings AS (
    SELECT cs.golfer_id, cs.golfer_name, cs."position"
    FROM calculate_period_standings(p_society_id, p_period_type) cs
  ),
  previous_snapshot AS (
    SELECT
      s->>'golfer_id' as golfer_id,
      (s->>'position')::INTEGER as position
    FROM leaderboard_snapshots ls,
         jsonb_array_elements(ls.standings) s
    WHERE ls.period_type = p_period_type
      AND (p_society_id IS NULL OR ls.society_id = p_society_id)
    ORDER BY ls.snapshot_date DESC
    LIMIT 1
  ),
  changes AS (
    SELECT
      cs.golfer_id,
      cs.golfer_name,
      cs."position" as current_position,
      ps.position as previous_position,
      COALESCE(ps.position - cs."position", 0) as position_change
    FROM current_standings cs
    LEFT JOIN previous_snapshot ps ON cs.golfer_id = ps.golfer_id
  )
  -- Get top gainers
  (SELECT c.golfer_id, c.golfer_name, c.current_position, c.previous_position,
          c.position_change, 'gainer' as movement_type
   FROM changes c
   WHERE c.position_change > 0
   ORDER BY c.position_change DESC
   LIMIT p_limit)
  UNION ALL
  -- Get top fallers
  (SELECT c.golfer_id, c.golfer_name, c.current_position, c.previous_position,
          c.position_change, 'faller' as movement_type
   FROM changes c
   WHERE c.position_change < 0
   ORDER BY c.position_change ASC
   LIMIT p_limit);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 12. RLS POLICIES
-- ============================================================================
ALTER TABLE leaderboard_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read leaderboard_periods" ON leaderboard_periods;
DROP POLICY IF EXISTS "Public read period_standings" ON period_standings;
DROP POLICY IF EXISTS "Public read leaderboard_snapshots" ON leaderboard_snapshots;
DROP POLICY IF EXISTS "Service manage leaderboard_periods" ON leaderboard_periods;
DROP POLICY IF EXISTS "Service manage period_standings" ON period_standings;
DROP POLICY IF EXISTS "Service manage leaderboard_snapshots" ON leaderboard_snapshots;

-- Public read access
CREATE POLICY "Public read leaderboard_periods" ON leaderboard_periods FOR SELECT USING (true);
CREATE POLICY "Public read period_standings" ON period_standings FOR SELECT USING (true);
CREATE POLICY "Public read leaderboard_snapshots" ON leaderboard_snapshots FOR SELECT USING (true);

-- Service role can manage
CREATE POLICY "Service manage leaderboard_periods" ON leaderboard_periods FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service manage period_standings" ON period_standings FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service manage leaderboard_snapshots" ON leaderboard_snapshots FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'TIME_WINDOWED_LEADERBOARDS.sql deployed successfully' as status;
