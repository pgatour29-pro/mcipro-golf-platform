-- FIX LEADERBOARD V10 - FINAL
-- Points: 1st=25, 2nd=15, 3rd=10, 4th=7, 5th=5
-- Season: December 1, 2025 onwards
-- Only valid players (no duplicates)
-- Valid players: Pete Park, Gilbert, Tristan, Alan Thomas, Rocky Jones, Ludvig, Jesse, Mike, Perry

-- ============================================
-- DROP ALL EXISTING FUNCTIONS FIRST
-- ============================================
DROP FUNCTION IF EXISTS get_current_daily_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_weekly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_monthly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_yearly_standings(INTEGER, UUID, INTEGER);
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_players_global(TEXT, TEXT);

-- ============================================
-- DAILY STANDINGS
-- ============================================
CREATE FUNCTION get_current_daily_standings(
  p_society_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank INTEGER,
  player_id TEXT,
  player_name TEXT,
  total_points BIGINT,
  rounds_played BIGINT,
  rank_change INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH valid_scorecards AS (
    SELECT
      sc.player_id,
      sc.player_name,
      sc.event_id,
      sc.total_net,
      DATE(sc.started_at) as play_date
    FROM scorecards sc
    WHERE sc.total_net IS NOT NULL
      AND sc.total_net >= 10
      AND sc.player_name IN ('Pete Park', 'Gilbert, Tristan', 'Alan Thomas', 'Rocky Jones', 'Ludvig', 'Jesse', 'Mike', 'Perry')
      AND DATE(sc.started_at) = CURRENT_DATE
  ),
  event_positions AS (
    SELECT
      vs.event_id,
      vs.player_id,
      vs.player_name,
      vs.total_net,
      ROW_NUMBER() OVER (PARTITION BY vs.event_id ORDER BY vs.total_net ASC) as position
    FROM valid_scorecards vs
    WHERE vs.event_id IS NOT NULL
  ),
  player_points AS (
    SELECT
      ep.player_id,
      ep.player_name,
      SUM(CASE
        WHEN ep.position = 1 THEN 25
        WHEN ep.position = 2 THEN 15
        WHEN ep.position = 3 THEN 10
        WHEN ep.position = 4 THEN 7
        WHEN ep.position = 5 THEN 5
        ELSE 0
      END) as points,
      COUNT(DISTINCT ep.event_id) as rounds
    FROM event_positions ep
    GROUP BY ep.player_id, ep.player_name
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pp.points DESC)::INTEGER,
    pp.player_id,
    COALESCE(up.display_name, pp.player_name, 'Unknown')::TEXT,
    pp.points::BIGINT,
    pp.rounds::BIGINT,
    0::INTEGER
  FROM player_points pp
  LEFT JOIN user_profiles up ON pp.player_id = up.line_user_id
  ORDER BY pp.points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- WEEKLY STANDINGS
-- ============================================
CREATE FUNCTION get_current_weekly_standings(
  p_society_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank INTEGER,
  player_id TEXT,
  player_name TEXT,
  total_points BIGINT,
  rounds_played BIGINT,
  rank_change INTEGER
) AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_week_end DATE := v_week_start + INTERVAL '6 days';
BEGIN
  RETURN QUERY
  WITH valid_scorecards AS (
    SELECT
      sc.player_id,
      sc.player_name,
      sc.event_id,
      sc.total_net,
      DATE(sc.started_at) as play_date
    FROM scorecards sc
    WHERE sc.total_net IS NOT NULL
      AND sc.total_net >= 10
      AND sc.player_name IN ('Pete Park', 'Gilbert, Tristan', 'Alan Thomas', 'Rocky Jones', 'Ludvig', 'Jesse', 'Mike', 'Perry')
      AND DATE(sc.started_at) >= v_week_start
      AND DATE(sc.started_at) <= v_week_end
  ),
  event_positions AS (
    SELECT
      vs.event_id,
      vs.player_id,
      vs.player_name,
      vs.total_net,
      ROW_NUMBER() OVER (PARTITION BY vs.event_id ORDER BY vs.total_net ASC) as position
    FROM valid_scorecards vs
    WHERE vs.event_id IS NOT NULL
  ),
  player_points AS (
    SELECT
      ep.player_id,
      ep.player_name,
      SUM(CASE
        WHEN ep.position = 1 THEN 25
        WHEN ep.position = 2 THEN 15
        WHEN ep.position = 3 THEN 10
        WHEN ep.position = 4 THEN 7
        WHEN ep.position = 5 THEN 5
        ELSE 0
      END) as points,
      COUNT(DISTINCT ep.event_id) as rounds
    FROM event_positions ep
    GROUP BY ep.player_id, ep.player_name
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pp.points DESC)::INTEGER,
    pp.player_id,
    COALESCE(up.display_name, pp.player_name, 'Unknown')::TEXT,
    pp.points::BIGINT,
    pp.rounds::BIGINT,
    0::INTEGER
  FROM player_points pp
  LEFT JOIN user_profiles up ON pp.player_id = up.line_user_id
  ORDER BY pp.points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- MONTHLY STANDINGS
-- ============================================
CREATE FUNCTION get_current_monthly_standings(
  p_society_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  rank INTEGER,
  player_id TEXT,
  player_name TEXT,
  total_points BIGINT,
  rounds_played BIGINT,
  rank_change INTEGER
) AS $$
DECLARE
  v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_month_end DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
BEGIN
  RETURN QUERY
  WITH valid_scorecards AS (
    SELECT
      sc.player_id,
      sc.player_name,
      sc.event_id,
      sc.total_net,
      DATE(sc.started_at) as play_date
    FROM scorecards sc
    WHERE sc.total_net IS NOT NULL
      AND sc.total_net >= 10
      AND sc.player_name IN ('Pete Park', 'Gilbert, Tristan', 'Alan Thomas', 'Rocky Jones', 'Ludvig', 'Jesse', 'Mike', 'Perry')
      AND DATE(sc.started_at) >= v_month_start
      AND DATE(sc.started_at) <= v_month_end
  ),
  event_positions AS (
    SELECT
      vs.event_id,
      vs.player_id,
      vs.player_name,
      vs.total_net,
      ROW_NUMBER() OVER (PARTITION BY vs.event_id ORDER BY vs.total_net ASC) as position
    FROM valid_scorecards vs
    WHERE vs.event_id IS NOT NULL
  ),
  player_points AS (
    SELECT
      ep.player_id,
      ep.player_name,
      SUM(CASE
        WHEN ep.position = 1 THEN 25
        WHEN ep.position = 2 THEN 15
        WHEN ep.position = 3 THEN 10
        WHEN ep.position = 4 THEN 7
        WHEN ep.position = 5 THEN 5
        ELSE 0
      END) as points,
      COUNT(DISTINCT ep.event_id) as rounds
    FROM event_positions ep
    GROUP BY ep.player_id, ep.player_name
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pp.points DESC)::INTEGER,
    pp.player_id,
    COALESCE(up.display_name, pp.player_name, 'Unknown')::TEXT,
    pp.points::BIGINT,
    pp.rounds::BIGINT,
    0::INTEGER
  FROM player_points pp
  LEFT JOIN user_profiles up ON pp.player_id = up.line_user_id
  ORDER BY pp.points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SEASON STANDINGS - Dec 1, 2025 onwards
-- ============================================
CREATE FUNCTION get_yearly_standings(
  p_year INTEGER DEFAULT NULL,
  p_society_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank INTEGER,
  player_id TEXT,
  player_name TEXT,
  total_points BIGINT,
  rounds_played BIGINT,
  rank_change INTEGER
) AS $$
DECLARE
  v_season_start DATE := '2025-12-01'::DATE;
  v_season_end DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH valid_scorecards AS (
    SELECT
      sc.player_id,
      sc.player_name,
      sc.event_id,
      sc.total_net,
      DATE(sc.started_at) as play_date
    FROM scorecards sc
    WHERE sc.total_net IS NOT NULL
      AND sc.total_net >= 10
      AND sc.player_name IN ('Pete Park', 'Gilbert, Tristan', 'Alan Thomas', 'Rocky Jones', 'Ludvig', 'Jesse', 'Mike', 'Perry')
      AND DATE(sc.started_at) >= v_season_start
      AND DATE(sc.started_at) <= v_season_end
  ),
  event_positions AS (
    SELECT
      vs.event_id,
      vs.player_id,
      vs.player_name,
      vs.total_net,
      ROW_NUMBER() OVER (PARTITION BY vs.event_id ORDER BY vs.total_net ASC) as position
    FROM valid_scorecards vs
    WHERE vs.event_id IS NOT NULL
  ),
  player_points AS (
    SELECT
      ep.player_id,
      ep.player_name,
      SUM(CASE
        WHEN ep.position = 1 THEN 25
        WHEN ep.position = 2 THEN 15
        WHEN ep.position = 3 THEN 10
        WHEN ep.position = 4 THEN 7
        WHEN ep.position = 5 THEN 5
        ELSE 0
      END) as points,
      COUNT(DISTINCT ep.event_id) as rounds
    FROM event_positions ep
    GROUP BY ep.player_id, ep.player_name
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pp.points DESC)::INTEGER,
    pp.player_id,
    COALESCE(up.display_name, pp.player_name, 'Unknown')::TEXT,
    pp.points::BIGINT,
    pp.rounds::BIGINT,
    0::INTEGER
  FROM player_points pp
  LEFT JOIN user_profiles up ON pp.player_id = up.line_user_id
  ORDER BY pp.points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PLAYER DIRECTORY
-- ============================================
CREATE FUNCTION search_players_global(
  p_search_query TEXT DEFAULT '',
  p_society_id UUID DEFAULT NULL,
  p_handicap_min INTEGER DEFAULT NULL,
  p_handicap_max INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  player_id TEXT,
  player_name TEXT,
  handicap DOUBLE PRECISION,
  home_course TEXT,
  total_rounds BIGINT,
  societies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    up.line_user_id::TEXT,
    COALESCE(up.display_name, up.name, 'Unknown')::TEXT,
    up.handicap_index::DOUBLE PRECISION,
    up.home_club::TEXT,
    (SELECT COUNT(DISTINCT sc.event_id) FROM scorecards sc
     WHERE sc.player_id = up.line_user_id AND sc.event_id IS NOT NULL)::BIGINT,
    ARRAY(
      SELECT sp.society_name
      FROM society_members sm
      JOIN society_profiles sp ON sm.society_id = sp.id
      WHERE sm.golfer_id = up.line_user_id
      LIMIT 3
    )
  FROM user_profiles up
  WHERE
    (p_search_query = '' OR p_search_query IS NULL OR
     up.display_name ILIKE '%' || p_search_query || '%' OR
     up.name ILIKE '%' || p_search_query || '%')
    AND (p_society_id IS NULL OR EXISTS (
      SELECT 1 FROM society_members sm
      WHERE sm.golfer_id = up.line_user_id AND sm.society_id = p_society_id
    ))
    AND (p_handicap_min IS NULL OR COALESCE(up.handicap_index, 54) >= p_handicap_min)
    AND (p_handicap_max IS NULL OR COALESCE(up.handicap_index, 0) <= p_handicap_max)
  ORDER BY 2
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_current_daily_standings(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_weekly_standings(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_monthly_standings(UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_yearly_standings(INTEGER, UUID, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER) TO anon, authenticated;

-- ============================================
-- TEST
-- ============================================
SELECT 'V10 FINAL: Dec 1 2025, valid players only, points 25/15/10/7/5' as status;
SELECT * FROM get_yearly_standings(NULL::INTEGER, NULL::UUID, 10);
