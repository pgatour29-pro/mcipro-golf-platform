-- FIX PLAYER PROFILE V5
-- SIMPLE: Just handicap and society. No rounds until tomorrow.

DROP FUNCTION IF EXISTS get_player_profile(TEXT);

CREATE OR REPLACE FUNCTION get_player_profile(target_player_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
  result JSON;
  v_player_name TEXT;
  v_handicap DOUBLE PRECISION;
  v_home_club TEXT;
  v_primary_society TEXT;
  v_society_count INT;
  v_all_societies JSON;
BEGIN
  -- Get basic profile info
  SELECT
    COALESCE(up.display_name, up.name, 'Unknown'),
    COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
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

  -- Build result - NO ROUNDS DATA
  result := json_build_object(
    'player_id', target_player_id,
    'player_name', v_player_name,
    'handicap', v_handicap,
    'home_course', json_build_object('name', v_home_club),
    'statistics', json_build_object(
      'total_rounds', 0,
      'avg_score', NULL,
      'last_round_date', NULL
    ),
    'societies', json_build_object(
      'count', COALESCE(v_society_count, 0),
      'primary', v_primary_society,
      'all', v_all_societies
    ),
    'recent_rounds', '[]'::json
  );

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_player_profile(TEXT) TO anon, authenticated;

SELECT get_player_profile('U2b6d976f19bca4b2f4374ae0e10ed873');
