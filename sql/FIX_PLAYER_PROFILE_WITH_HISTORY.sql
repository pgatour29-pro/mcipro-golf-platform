-- FIX PLAYER PROFILE WITH FULL ROUND HISTORY
-- Purpose: Add average score and complete playing history to player profiles
-- Date: 2025-12-14
-- V2: Fixed handicap to preserve "+" sign, added stableford sanity check

DROP FUNCTION IF EXISTS get_player_profile(TEXT);

CREATE OR REPLACE FUNCTION get_player_profile(target_player_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
  result JSON;
  v_player_name TEXT;
  v_handicap TEXT;  -- Changed to TEXT to preserve "+" sign
  v_home_club TEXT;
  v_primary_society TEXT;
  v_society_count INT;
  v_all_societies JSON;
  v_total_rounds INT;
  v_avg_gross DOUBLE PRECISION;
  v_best_gross INT;
  v_avg_stableford DOUBLE PRECISION;
  v_best_stableford INT;
  v_last_round_date TIMESTAMPTZ;
  v_recent_rounds JSON;
BEGIN
  -- Get basic profile info (handicap as TEXT to preserve "+" sign)
  SELECT
    COALESCE(up.display_name, up.name, 'Unknown'),
    COALESCE(
      up.handicap_index::TEXT,
      up.profile_data->'golfInfo'->>'handicap',
      up.profile_data->>'handicap'
    ),
    COALESCE(up.home_club, up.profile_data->'golfInfo'->>'homeClub')
  INTO v_player_name, v_handicap, v_home_club
  FROM user_profiles up
  WHERE up.line_user_id = target_player_id;

  -- Get primary society
  SELECT sp.society_name
  INTO v_primary_society
  FROM society_members sm
  JOIN society_profiles sp ON sm.society_id = sp.id
  WHERE sm.golfer_id = target_player_id
  ORDER BY sm.is_primary_society DESC NULLS LAST, sm.joined_at ASC
  LIMIT 1;

  -- Count societies
  SELECT COUNT(*)
  INTO v_society_count
  FROM society_members
  WHERE golfer_id = target_player_id;

  -- Get all society names
  SELECT COALESCE(json_agg(sp.society_name), '[]'::json)
  INTO v_all_societies
  FROM society_members sm
  JOIN society_profiles sp ON sm.society_id = sp.id
  WHERE sm.golfer_id = target_player_id;

  -- Get round statistics (only full 18-hole rounds with gross >= 50 and valid stableford <= 54)
  SELECT
    COUNT(*),
    ROUND(AVG(total_gross)::NUMERIC, 1),
    MIN(total_gross),
    ROUND(AVG(CASE WHEN total_stableford <= 54 THEN total_stableford ELSE NULL END)::NUMERIC, 1),
    MAX(CASE WHEN total_stableford <= 54 THEN total_stableford ELSE NULL END),
    MAX(played_at)
  INTO
    v_total_rounds,
    v_avg_gross,
    v_best_gross,
    v_avg_stableford,
    v_best_stableford,
    v_last_round_date
  FROM rounds
  WHERE golfer_id = target_player_id
    AND total_gross >= 50;  -- Filter out partial rounds

  -- Get recent rounds (last 20)
  SELECT COALESCE(json_agg(round_data ORDER BY played_at DESC), '[]'::json)
  INTO v_recent_rounds
  FROM (
    SELECT json_build_object(
      'id', r.id,
      'course_name', r.course_name,
      'total_gross', r.total_gross,
      'total_stableford', r.total_stableford,
      'played_at', r.played_at,
      'type', r.type
    ) AS round_data,
    r.played_at
    FROM rounds r
    WHERE r.golfer_id = target_player_id
      AND r.total_gross >= 50  -- Filter out partial rounds
    ORDER BY r.played_at DESC
    LIMIT 20
  ) sub;

  -- Build result with full statistics
  result := json_build_object(
    'player_id', target_player_id,
    'player_name', v_player_name,
    'handicap', v_handicap,
    'home_course', json_build_object('name', v_home_club),
    'statistics', json_build_object(
      'total_rounds', COALESCE(v_total_rounds, 0),
      'avg_gross', v_avg_gross,
      'best_gross', v_best_gross,
      'avg_stableford', v_avg_stableford,
      'best_stableford', v_best_stableford,
      'last_round_date', v_last_round_date
    ),
    'societies', json_build_object(
      'count', COALESCE(v_society_count, 0),
      'primary', v_primary_society,
      'all', v_all_societies
    ),
    'recent_rounds', v_recent_rounds
  );

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_player_profile(TEXT) TO anon, authenticated;

-- Also update search_players_global to include avg_gross
-- Drop ALL versions of this function (different parameter types create overloads)
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INT, INT);
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_players_global(TEXT, TEXT);
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, NUMERIC, NUMERIC, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_players_global(
  p_search_query TEXT DEFAULT '',
  p_society_id UUID DEFAULT NULL,
  p_handicap_min DOUBLE PRECISION DEFAULT NULL,
  p_handicap_max DOUBLE PRECISION DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  player_id TEXT,
  player_name TEXT,
  handicap TEXT,  -- Changed to TEXT to preserve "+" sign
  home_course TEXT,
  total_rounds BIGINT,
  avg_gross DOUBLE PRECISION,
  societies TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $func$
BEGIN
  RETURN QUERY
  WITH player_rounds AS (
    SELECT
      r.golfer_id,
      COUNT(*) as round_count,
      ROUND(AVG(r.total_gross)::NUMERIC, 1)::DOUBLE PRECISION as avg_score
    FROM rounds r
    WHERE r.total_gross >= 50  -- Only full rounds
    GROUP BY r.golfer_id
  ),
  player_societies AS (
    SELECT
      sm.golfer_id,
      ARRAY_AGG(sp.society_name) as society_names
    FROM society_members sm
    JOIN society_profiles sp ON sm.society_id = sp.id
    GROUP BY sm.golfer_id
  )
  SELECT
    up.line_user_id AS player_id,
    COALESCE(up.display_name, up.name) AS player_name,
    -- Return handicap as TEXT to preserve "+" sign for plus handicaps
    COALESCE(
      up.handicap_index::TEXT,
      up.profile_data->'golfInfo'->>'handicap',
      up.profile_data->>'handicap'
    ) AS handicap,
    COALESCE(up.home_club, up.profile_data->'golfInfo'->>'homeClub') AS home_course,
    COALESCE(pr.round_count, 0) AS total_rounds,
    pr.avg_score AS avg_gross,
    ps.society_names AS societies
  FROM user_profiles up
  LEFT JOIN player_rounds pr ON pr.golfer_id = up.line_user_id
  LEFT JOIN player_societies ps ON ps.golfer_id = up.line_user_id
  WHERE
    -- Search filter
    (p_search_query = '' OR
     LOWER(COALESCE(up.display_name, up.name, '')) LIKE '%' || LOWER(p_search_query) || '%' OR
     LOWER(up.line_user_id) LIKE '%' || LOWER(p_search_query) || '%')
    -- Handicap filter
    AND (p_handicap_min IS NULL OR COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ) >= p_handicap_min)
    AND (p_handicap_max IS NULL OR COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ) <= p_handicap_max)
    -- Society filter (check if player is member of specified society)
    AND (p_society_id IS NULL OR EXISTS (
      SELECT 1 FROM society_members sm
      WHERE sm.golfer_id = up.line_user_id
      AND sm.society_id = p_society_id
    ))
  ORDER BY
    COALESCE(pr.round_count, 0) DESC,
    up.display_name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$func$;

GRANT EXECUTE ON FUNCTION search_players_global(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, INT, INT) TO anon, authenticated;

-- Test the functions
SELECT get_player_profile('U2b6d976f19bca4b2f4374ae0e10ed873');
SELECT * FROM search_players_global('Pete', NULL, NULL, NULL, 10, 0);
