-- Player Profile V3 - Enhanced with scorecard drill-down support
-- Adds: scorecard_id, stableford totals, hole_count, avg/best stats

DROP FUNCTION IF EXISTS get_player_profile(TEXT);

CREATE OR REPLACE FUNCTION get_player_profile(target_player_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
      'total_rounds', (SELECT COUNT(*) FROM scorecards
                       WHERE player_id = up.line_user_id
                         AND total_net >= 10
                         AND DATE(started_at) >= '2025-12-01'),
      'avg_gross', (SELECT ROUND(AVG(total_gross)::NUMERIC, 1) FROM scorecards
                    WHERE player_id = up.line_user_id
                      AND total_gross >= 50
                      AND DATE(started_at) >= '2025-12-01'),
      'best_gross', (SELECT MIN(total_gross) FROM scorecards
                     WHERE player_id = up.line_user_id
                       AND total_gross >= 50
                       AND DATE(started_at) >= '2025-12-01'),
      'avg_net', (SELECT ROUND(AVG(total_net)::NUMERIC, 1) FROM scorecards
                  WHERE player_id = up.line_user_id
                    AND total_net >= 10
                    AND DATE(started_at) >= '2025-12-01'),
      'avg_stableford', (
        SELECT ROUND(AVG(s_total)::NUMERIC, 1)
        FROM (
          SELECT SUM(COALESCE(sc.stableford_points, sc.stableford, 0)) as s_total
          FROM scores sc
          WHERE sc.scorecard_id IN (
            SELECT id FROM scorecards
            WHERE player_id = up.line_user_id
              AND total_net >= 10
              AND DATE(started_at) >= '2025-12-01'
          )
          GROUP BY sc.scorecard_id
          HAVING SUM(COALESCE(sc.stableford_points, sc.stableford, 0)) > 0
        ) sub
      ),
      'best_stableford', (
        SELECT MAX(s_total)
        FROM (
          SELECT SUM(COALESCE(sc.stableford_points, sc.stableford, 0)) as s_total
          FROM scores sc
          WHERE sc.scorecard_id IN (
            SELECT id FROM scorecards
            WHERE player_id = up.line_user_id
              AND total_net >= 10
              AND DATE(started_at) >= '2025-12-01'
          )
          GROUP BY sc.scorecard_id
          HAVING SUM(COALESCE(sc.stableford_points, sc.stableford, 0)) > 0
        ) sub
      ),
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
      SELECT COALESCE(json_agg(r ORDER BY (r->>'played_at')::timestamp DESC), '[]'::json)
      FROM (
        SELECT json_build_object(
          'scorecard_id', sc.id,
          'course_name', sc.course_name,
          'played_at', sc.started_at,
          'total_gross', sc.total_gross,
          'total_net', sc.total_net,
          'total_stableford', COALESCE(
            (SELECT SUM(COALESCE(s.stableford_points, s.stableford, 0))
             FROM scores s WHERE s.scorecard_id = sc.id), 0
          ),
          'handicap', sc.handicap,
          'playing_handicap', sc.playing_handicap,
          'tee_marker', sc.tee_marker,
          'scoring_format', sc.scoring_format,
          'type', CASE WHEN sc.event_id IS NOT NULL THEN 'society' ELSE 'private' END,
          'hole_count', (SELECT COUNT(*) FROM scores s WHERE s.scorecard_id = sc.id)
        ) as r
        FROM scorecards sc
        WHERE sc.player_id = up.line_user_id
          AND sc.total_net >= 10
          AND DATE(sc.started_at) >= '2025-12-01'
        ORDER BY sc.started_at DESC
        LIMIT 20
      ) sub
    )
  ) INTO result
  FROM user_profiles up
  WHERE up.line_user_id = target_player_id;

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_player_profile(TEXT) TO anon, authenticated;
