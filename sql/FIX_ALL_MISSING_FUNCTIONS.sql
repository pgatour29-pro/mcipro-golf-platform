-- FIX ALL MISSING FUNCTIONS
-- Run this in Supabase SQL Editor
-- Fixes: Leaderboards + Player Directory

-- ============================================
-- PART 1: DROP EXISTING FUNCTIONS
-- ============================================
DROP FUNCTION IF EXISTS calculate_period_standings(UUID, TEXT, DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS get_current_daily_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_weekly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_monthly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_yearly_standings(INTEGER, UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_daily_standings(UUID, TEXT);
DROP FUNCTION IF EXISTS get_current_weekly_standings(UUID, TEXT);
DROP FUNCTION IF EXISTS get_current_monthly_standings(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER);

-- ============================================
-- PART 2: LEADERBOARD FUNCTIONS
-- ============================================

-- Daily standings
CREATE OR REPLACE FUNCTION get_current_daily_standings(
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
    ), 0) DESC)::INTEGER as rank,
    er.golfer_id as player_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown') as player_name,
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT as total_points,
    COUNT(*)::BIGINT as rounds_played,
    0::INTEGER as rank_change
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date = CURRENT_DATE
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Weekly standings
CREATE OR REPLACE FUNCTION get_current_weekly_standings(
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
    ), 0) DESC)::INTEGER as rank,
    er.golfer_id as player_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown') as player_name,
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT as total_points,
    COUNT(*)::BIGINT as rounds_played,
    0::INTEGER as rank_change
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date >= v_week_start
    AND se.event_date <= v_week_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Monthly standings
CREATE OR REPLACE FUNCTION get_current_monthly_standings(
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
    ), 0)::BIGINT DESC)::INTEGER as rank,
    er.golfer_id as player_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown') as player_name,
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT as total_points,
    COUNT(*)::BIGINT as rounds_played,
    0::INTEGER as rank_change
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date >= v_month_start
    AND se.event_date <= v_month_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Yearly standings
CREATE OR REPLACE FUNCTION get_yearly_standings(
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
    ), 0)::BIGINT DESC)::INTEGER as rank,
    er.golfer_id as player_id,
    COALESCE(p.display_name, er.golfer_name, 'Unknown') as player_name,
    COALESCE(SUM(
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position <= 5 THEN 50
        WHEN er.position <= 10 THEN 40
        ELSE 20
      END
    ), 0)::BIGINT as total_points,
    COUNT(*)::BIGINT as rounds_played,
    0::INTEGER as rank_change
  FROM event_registrations er
  JOIN society_events se ON er.event_id = se.id
  LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
  WHERE er.position IS NOT NULL
    AND er.position > 0
    AND se.event_date >= v_year_start
    AND se.event_date <= v_year_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- PART 3: PLAYER DIRECTORY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION search_players_global(
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
  handicap NUMERIC,
  home_course TEXT,
  total_rounds BIGINT,
  societies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.line_user_id as player_id,
    COALESCE(p.display_name, p.profile_data->>'firstName' || ' ' || p.profile_data->>'lastName', 'Unknown') as player_name,
    COALESCE(
      (p.profile_data->'golfInfo'->>'handicap')::NUMERIC,
      (p.profile_data->>'handicap')::NUMERIC
    ) as handicap,
    COALESCE(
      p.profile_data->'golfInfo'->>'homeClub',
      p.profile_data->'golfInfo'->>'homeCourse'
    ) as home_course,
    (SELECT COUNT(*) FROM scorecards sc WHERE sc.golfer_id = p.line_user_id)::BIGINT as total_rounds,
    ARRAY(
      SELECT sp.name
      FROM society_members sm
      JOIN society_profiles sp ON sm.society_id = sp.id
      WHERE sm.member_id = p.line_user_id
      LIMIT 3
    ) as societies
  FROM profiles p
  WHERE
    (p_search_query = '' OR
     p.display_name ILIKE '%' || p_search_query || '%' OR
     p.profile_data->>'firstName' ILIKE '%' || p_search_query || '%' OR
     p.profile_data->>'lastName' ILIKE '%' || p_search_query || '%')
    AND (p_society_id IS NULL OR EXISTS (
      SELECT 1 FROM society_members sm
      WHERE sm.member_id = p.line_user_id AND sm.society_id = p_society_id
    ))
    AND (p_handicap_min IS NULL OR COALESCE(
      (p.profile_data->'golfInfo'->>'handicap')::NUMERIC,
      (p.profile_data->>'handicap')::NUMERIC,
      54
    ) >= p_handicap_min)
    AND (p_handicap_max IS NULL OR COALESCE(
      (p.profile_data->'golfInfo'->>'handicap')::NUMERIC,
      (p.profile_data->>'handicap')::NUMERIC,
      0
    ) <= p_handicap_max)
  ORDER BY player_name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT 'All functions created successfully!' as status;
