-- FIX: Create missing leaderboard RPC functions
-- Run this in Supabase SQL Editor

-- Drop existing functions first to allow return type changes
DROP FUNCTION IF EXISTS calculate_period_standings(UUID, TEXT, DATE, DATE, TEXT);
DROP FUNCTION IF EXISTS get_current_daily_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_weekly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_current_monthly_standings(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_yearly_standings(INTEGER, UUID, INTEGER);

-- Also drop old signatures
DROP FUNCTION IF EXISTS get_current_daily_standings(UUID, TEXT);
DROP FUNCTION IF EXISTS get_current_weekly_standings(UUID, TEXT);
DROP FUNCTION IF EXISTS get_current_monthly_standings(UUID, TEXT, INTEGER, INTEGER);

-- First, create the calculate_period_standings function that others depend on
CREATE OR REPLACE FUNCTION calculate_period_standings(
  p_society_id UUID DEFAULT NULL,
  p_period_type TEXT DEFAULT 'weekly',
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
  best_finish INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH event_results AS (
    SELECT
      er.golfer_id,
      COALESCE(p.display_name, er.golfer_name, 'Unknown') as golfer_name,
      er.division,
      er.position as finish_position,
      CASE
        WHEN er.position = 1 THEN 100
        WHEN er.position = 2 THEN 80
        WHEN er.position = 3 THEN 65
        WHEN er.position = 4 THEN 55
        WHEN er.position = 5 THEN 50
        WHEN er.position <= 10 THEN 45 - (er.position - 6) * 2
        WHEN er.position <= 20 THEN 35 - (er.position - 11)
        ELSE GREATEST(5, 25 - (er.position - 21))
      END as points_earned
    FROM event_registrations er
    JOIN society_events se ON er.event_id = se.id
    LEFT JOIN profiles p ON er.golfer_id = p.line_user_id
    WHERE er.position IS NOT NULL
      AND er.position > 0
      AND se.event_date >= COALESCE(p_start_date, CURRENT_DATE - INTERVAL '7 days')
      AND se.event_date <= COALESCE(p_end_date, CURRENT_DATE)
      AND (p_society_id IS NULL OR se.society_id = p_society_id)
      AND (p_division IS NULL OR er.division = p_division)
  ),
  aggregated AS (
    SELECT
      er.golfer_id,
      er.golfer_name,
      er.division,
      SUM(er.points_earned)::BIGINT as total_points,
      COUNT(*)::BIGINT as events_played,
      COUNT(*) FILTER (WHERE er.finish_position = 1)::BIGINT as wins,
      COUNT(*) FILTER (WHERE er.finish_position <= 3)::BIGINT as top3,
      MIN(er.finish_position) as best_finish
    FROM event_results er
    GROUP BY er.golfer_id, er.golfer_name, er.division
  )
  SELECT
    a.golfer_id,
    a.golfer_name,
    a.division,
    ROW_NUMBER() OVER (ORDER BY a.total_points DESC, a.wins DESC, a.best_finish ASC)::INTEGER as "position",
    a.total_points as points,
    a.events_played,
    a.wins,
    a.top3,
    a.best_finish
  FROM aggregated a
  ORDER BY a.total_points DESC, a.wins DESC, a.best_finish ASC;
END;
$$ LANGUAGE plpgsql STABLE;

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
    AND se.event_date >= v_year_start
    AND se.event_date <= v_year_end
    AND (p_society_id IS NULL OR se.society_id = p_society_id)
  GROUP BY er.golfer_id, p.display_name, er.golfer_name
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

SELECT 'Leaderboard functions created successfully' as status;
