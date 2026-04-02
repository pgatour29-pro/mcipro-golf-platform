-- Get hole-by-hole scorecard data for the player scorecard viewer
-- Returns all holes for a given scorecard, plus the scorecard header info

CREATE OR REPLACE FUNCTION get_scorecard_detail(p_scorecard_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $func$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'scorecard', json_build_object(
      'id', sc.id,
      'player_name', sc.player_name,
      'player_id', sc.player_id,
      'course_name', sc.course_name,
      'played_at', sc.started_at,
      'total_gross', sc.total_gross,
      'total_net', sc.total_net,
      'handicap', sc.handicap,
      'playing_handicap', sc.playing_handicap,
      'tee_marker', sc.tee_marker,
      'scoring_format', sc.scoring_format,
      'status', sc.status
    ),
    'holes', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'hole_number', s.hole_number,
          'par', s.par,
          'stroke_index', s.stroke_index,
          'gross_score', s.gross_score,
          'net_score', s.net_score,
          'handicap_strokes', s.handicap_strokes,
          'stableford_points', COALESCE(s.stableford_points, s.stableford, 0)
        ) ORDER BY s.hole_number
      ), '[]'::json)
      FROM scores s
      WHERE s.scorecard_id = sc.id
    )
  ) INTO result
  FROM scorecards sc
  WHERE sc.id = p_scorecard_id;

  RETURN result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_scorecard_detail(TEXT) TO anon, authenticated;
