-- FIX LEADERBOARD V4 - VERIFIED AGAINST ACTUAL DATABASE SCHEMA
--
-- VERIFIED TABLE SCHEMAS:
-- ========================
-- scorecards: id(text), event_id(text), course_id(text), course_name(text), society_name(text),
--             tee_marker(text), player_id(text), player_name(text), handicap(numeric),
--             playing_handicap(integer), status(text), total_gross(integer), total_net(integer),
--             group_id(text), started_at(timestamp), completed_at(timestamp), created_at(timestamp),
--             updated_at(timestamp), scoring_format(text), match_play_config(jsonb)
--
-- user_profiles: line_user_id(text), display_name(text), picture_url(text), email(text),
--                phone(text), date_of_birth(date), gender(text), nationality(text),
--                handicap_index(numeric), home_course_id(uuid), society_id(uuid),
--                society_name(text), profile_data(jsonb), name(text), home_club(text), ...
--
-- society_profiles: id(uuid), organizer_id(text), society_name(text), society_logo(text),
--                   description(text), created_at(timestamp), updated_at(timestamp)
--
-- society_members: id(uuid), society_name(text), organizer_id(text), golfer_id(text),
--                  member_number(text), is_primary_society(boolean), status(text), ...

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
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(sc.total_net), 9999) ASC)::INTEGER,
    sc.player_id,
    COALESCE(up.display_name, sc.player_name, 'Unknown')::TEXT,
    COALESCE(SUM(sc.total_net), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM scorecards sc
  LEFT JOIN user_profiles up ON sc.player_id = up.line_user_id
  WHERE sc.status = 'completed'
    AND sc.total_net IS NOT NULL
    AND DATE(sc.completed_at) = CURRENT_DATE
  GROUP BY sc.player_id, up.display_name, sc.player_name
  ORDER BY 4 ASC
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
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(sc.total_net), 9999) ASC)::INTEGER,
    sc.player_id,
    COALESCE(up.display_name, sc.player_name, 'Unknown')::TEXT,
    COALESCE(SUM(sc.total_net), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM scorecards sc
  LEFT JOIN user_profiles up ON sc.player_id = up.line_user_id
  WHERE sc.status = 'completed'
    AND sc.total_net IS NOT NULL
    AND DATE(sc.completed_at) >= v_week_start
    AND DATE(sc.completed_at) <= v_week_end
  GROUP BY sc.player_id, up.display_name, sc.player_name
  ORDER BY 4 ASC
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
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(sc.total_net), 9999) ASC)::INTEGER,
    sc.player_id,
    COALESCE(up.display_name, sc.player_name, 'Unknown')::TEXT,
    COALESCE(SUM(sc.total_net), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM scorecards sc
  LEFT JOIN user_profiles up ON sc.player_id = up.line_user_id
  WHERE sc.status = 'completed'
    AND sc.total_net IS NOT NULL
    AND DATE(sc.completed_at) >= v_month_start
    AND DATE(sc.completed_at) <= v_month_end
  GROUP BY sc.player_id, up.display_name, sc.player_name
  ORDER BY 4 ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- YEARLY STANDINGS
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
  v_target_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
  v_year_start DATE := make_date(v_target_year, 1, 1);
  v_year_end DATE := make_date(v_target_year, 12, 31);
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(sc.total_net), 9999) ASC)::INTEGER,
    sc.player_id,
    COALESCE(up.display_name, sc.player_name, 'Unknown')::TEXT,
    COALESCE(SUM(sc.total_net), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM scorecards sc
  LEFT JOIN user_profiles up ON sc.player_id = up.line_user_id
  WHERE sc.status = 'completed'
    AND sc.total_net IS NOT NULL
    AND DATE(sc.completed_at) >= v_year_start
    AND DATE(sc.completed_at) <= v_year_end
  GROUP BY sc.player_id, up.display_name, sc.player_name
  ORDER BY 4 ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PLAYER DIRECTORY
-- Using VERIFIED columns:
-- - user_profiles.line_user_id (text)
-- - user_profiles.display_name (text)
-- - user_profiles.handicap_index (numeric)
-- - user_profiles.home_club (text)
-- - user_profiles.society_name (text)
-- - society_members.golfer_id (text) - NOT member_id
-- - society_members.society_name (text) - NOT society_id
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
    (SELECT COUNT(*) FROM scorecards sc WHERE sc.player_id = up.line_user_id)::BIGINT,
    ARRAY(
      SELECT sm.society_name
      FROM society_members sm
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
      JOIN society_profiles sp ON sm.society_name = sp.society_name
      WHERE sm.golfer_id = up.line_user_id AND sp.id = p_society_id
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
SELECT 'V4: All functions created with VERIFIED column names!' as status;
SELECT * FROM get_current_weekly_standings(NULL, 5);
SELECT * FROM search_players_global('', NULL, NULL, NULL, 5, 0);
