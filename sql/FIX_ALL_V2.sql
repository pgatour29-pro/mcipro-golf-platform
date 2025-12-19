-- FIX ALL V2 - Corrected return types
-- Run this in Supabase SQL Editor

-- ============================================
-- DROP ALL EXISTING FUNCTIONS FIRST
-- ============================================
DROP FUNCTION IF EXISTS get_current_daily_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_weekly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_monthly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_yearly_standings(INTEGER, UUID, INTEGER);
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER);

-- ============================================
-- LEADERBOARD FUNCTIONS
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
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0) DESC)::INTEGER,
    er.golfer_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown'),
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date = CURRENT_DATE
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY 4 DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

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
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0) DESC)::INTEGER,
    er.golfer_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown'),
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date >= v_week_start
    AND se.event_date <= v_week_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY 4 DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

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
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0) DESC)::INTEGER,
    er.golfer_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown'),
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date >= v_month_start
    AND se.event_date <= v_month_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY 4 DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

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
    ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0) DESC)::INTEGER,
    er.golfer_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown'),
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT,
    COUNT(*)::BIGINT,
    0::INTEGER
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date >= v_year_start
    AND se.event_date <= v_year_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY 4 DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PLAYER DIRECTORY FUNCTION (FIXED)
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
    p.line_user_id::TEXT,
    COALESCE(p.display_name,
             CONCAT_WS(' ', p.profile_data->'personalInfo'->>'firstName', p.profile_data->'personalInfo'->>'lastName'),
             'Unknown')::TEXT,
    COALESCE(
      (p.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (p.profile_data->>'handicap')::DOUBLE PRECISION
    ),
    COALESCE(
      p.profile_data->'golfInfo'->>'homeClub',
      p.profile_data->'golfInfo'->>'homeCourse'
    )::TEXT,
    (SELECT COUNT(*) FROM scorecards sc WHERE sc.golfer_id = p.line_user_id)::BIGINT,
    ARRAY(
      SELECT sp.name
      FROM society_members sm
      JOIN society_profiles sp ON sm.society_id = sp.id
      WHERE sm.member_id = p.line_user_id
      LIMIT 3
    )
  FROM profiles p
  WHERE
    (p_search_query = '' OR p_search_query IS NULL OR
     p.display_name ILIKE '%' || p_search_query || '%' OR
     p.profile_data->'personalInfo'->>'firstName' ILIKE '%' || p_search_query || '%' OR
     p.profile_data->'personalInfo'->>'lastName' ILIKE '%' || p_search_query || '%')
    AND (p_society_id IS NULL OR EXISTS (
      SELECT 1 FROM society_members sm
      WHERE sm.member_id = p.line_user_id AND sm.society_id = p_society_id
    ))
    AND (p_handicap_min IS NULL OR COALESCE(
      (p.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (p.profile_data->>'handicap')::DOUBLE PRECISION,
      54
    ) >= p_handicap_min)
    AND (p_handicap_max IS NULL OR COALESCE(
      (p.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (p.profile_data->>'handicap')::DOUBLE PRECISION,
      0
    ) <= p_handicap_max)
  ORDER BY 2
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT 'All functions created successfully!' as status;
