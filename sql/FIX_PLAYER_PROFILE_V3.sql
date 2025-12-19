-- FIX PLAYER PROFILE V3
-- Use player_id to match scorecards, show gross score, fix society

DROP FUNCTION IF EXISTS get_player_profile(TEXT);

CREATE OR REPLACE FUNCTION get_player_profile(target_player_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
  result JSON;
  v_handicap DOUBLE PRECISION;
  v_home_club TEXT;
  v_primary_society TEXT;
BEGIN
  -- Get handicap from profile_data
  SELECT
    COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ),
    COALESCE(up.home_club, up.profile_data->'golfInfo'->>'homeClub'),
    (SELECT sp.society_name FROM society_members sm
     JOIN society_profiles sp ON sm.society_id = sp.id
     WHERE sm.golfer_id = target_player_id
     ORDER BY sm.is_primary_society DESC NULLS LAST, sm.joined_at ASC
     LIMIT 1)
  INTO v_handicap, v_home_club, v_primary_society
  FROM user_profiles up
  WHERE up.line_user_id = target_player_id;

  SELECT json_build_object(
    'player_id', up.line_user_id,
    'player_name', COALESCE(up.display_name, up.name, 'Unknown'),
    'handicap', v_handicap,
    'home_course', json_build_object(
      'name', v_home_club
    ),
    'statistics', json_build_object(
      'total_rounds', (SELECT COUNT(DISTINCT event_id) FROM scorecards
                       WHERE player_id = target_player_id
                         AND event_id IS NOT NULL
                         AND total_net >= 10
                         AND DATE(started_at) >= '2025-12-01'),
      'avg_score', (SELECT ROUND(AVG(total_gross)::NUMERIC, 1) FROM scorecards
                    WHERE player_id = target_player_id
                      AND total_gross > 0
                      AND DATE(started_at) >= '2025-12-01'),
      'last_round_date', (SELECT MAX(started_at) FROM scorecards
                          WHERE player_id = target_player_id
                            AND DATE(started_at) >= '2025-12-01')
    ),
    'societies', json_build_object(
      'count', (SELECT COUNT(*) FROM society_members sm WHERE sm.golfer_id = target_player_id),
      'primary', v_primary_society,
      'all', (SELECT COALESCE(json_agg(sp.society_name), '[]'::json) FROM society_members sm
              JOIN society_profiles sp ON sm.society_id = sp.id
              WHERE sm.golfer_id = target_player_id)
    ),
    'recent_rounds', (
      SELECT COALESCE(json_agg(json_build_object(
        'course_name', sc.course_name,
        'date', sc.started_at,
        'gross', sc.total_gross,
        'net', sc.total_net
      ) ORDER BY sc.started_at DESC), '[]'::json)
      FROM scorecards sc
      WHERE sc.player_id = target_player_id
        AND sc.total_net >= 10
        AND DATE(sc.started_at) >= '2025-12-01'
    )
  ) INTO result
  FROM user_profiles up
  WHERE up.line_user_id = target_player_id;

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_player_profile(TEXT) TO anon, authenticated;

SELECT 'get_player_profile V3 - fixed society and scores' as status;
SELECT get_player_profile('U2b6d976f19bca4b2f4374ae0e10ed873');
