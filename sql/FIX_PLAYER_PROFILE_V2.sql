-- FIX PLAYER PROFILE V2
-- Season starts Dec 1, 2025

DROP FUNCTION IF EXISTS get_player_profile(TEXT);

CREATE OR REPLACE FUNCTION get_player_profile(target_player_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $func$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'player_id', up.line_user_id,
    'player_name', COALESCE(up.display_name, up.name, 'Unknown'),
    'handicap', COALESCE(
      up.handicap_index,
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ),
    'home_course', json_build_object(
      'name', COALESCE(up.home_club, up.profile_data->'golfInfo'->>'homeClub')
    ),
    'statistics', json_build_object(
      'total_rounds', (SELECT COUNT(DISTINCT event_id) FROM scorecards
                       WHERE player_id = up.line_user_id
                         AND event_id IS NOT NULL
                         AND total_net >= 10
                         AND DATE(started_at) >= '2025-12-01'),
      'avg_score', (SELECT ROUND(AVG(total_net)::NUMERIC, 1) FROM scorecards
                    WHERE player_id = up.line_user_id
                      AND total_net >= 10
                      AND DATE(started_at) >= '2025-12-01'),
      'last_round_date', (SELECT MAX(started_at) FROM scorecards
                          WHERE player_id = up.line_user_id
                            AND DATE(started_at) >= '2025-12-01')
    ),
    'societies', json_build_object(
      'count', (SELECT COUNT(*) FROM society_members sm WHERE sm.golfer_id = up.line_user_id),
      'primary', (SELECT sp.society_name FROM society_members sm
                  JOIN society_profiles sp ON sm.society_id = sp.id
                  WHERE sm.golfer_id = up.line_user_id AND sm.is_primary_society = true
                  LIMIT 1),
      'all', (SELECT COALESCE(json_agg(sp.society_name), '[]'::json) FROM society_members sm
              JOIN society_profiles sp ON sm.society_id = sp.id
              WHERE sm.golfer_id = up.line_user_id)
    ),
    'recent_rounds', (
      SELECT COALESCE(json_agg(r ORDER BY r->>'date' DESC), '[]'::json)
      FROM (
        SELECT json_build_object(
          'course_name', course_name,
          'date', started_at,
          'gross', total_gross,
          'net', total_net
        ) as r
        FROM scorecards
        WHERE player_id = up.line_user_id
          AND total_net >= 10
          AND DATE(started_at) >= '2025-12-01'
        ORDER BY started_at DESC
        LIMIT 10
      ) sub
    )
  ) INTO result
  FROM user_profiles up
  WHERE up.line_user_id = target_player_id;

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_player_profile(TEXT) TO anon, authenticated;

SELECT 'get_player_profile V2 created' as status;
SELECT get_player_profile('U2b6d976f19bca4b2f4374ae0e10ed873');
