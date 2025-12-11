-- FIX SEARCH PLAYERS - Return handicap as TEXT to preserve "+" sign
-- Plus handicaps like "+2.1" are stored as strings, casting to DOUBLE PRECISION loses the "+"

DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_players_global(TEXT, TEXT);

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
  handicap TEXT,  -- Changed from DOUBLE PRECISION to TEXT to preserve "+" sign
  home_course TEXT,
  total_rounds BIGINT,
  societies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    up.line_user_id::TEXT,
    COALESCE(up.display_name, up.name, 'Unknown')::TEXT,
    -- Return handicap as TEXT to preserve "+" sign for plus handicaps
    COALESCE(
      up.profile_data->'golfInfo'->>'handicap',
      up.profile_data->>'handicap',
      up.handicap_index::TEXT
    )::TEXT,
    COALESCE(up.home_club, up.profile_data->'golfInfo'->>'homeClub')::TEXT,
    (SELECT COUNT(DISTINCT sc.event_id)
     FROM scorecards sc
     WHERE sc.player_id = up.line_user_id
       AND sc.event_id IS NOT NULL
       AND sc.total_net >= 10
       AND DATE(sc.started_at) >= '2025-12-01')::BIGINT,
    ARRAY(
      SELECT sp.society_name
      FROM society_members sm
      JOIN society_profiles sp ON sm.society_id = sp.id
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
      WHERE sm.golfer_id = up.line_user_id AND sm.society_id = p_society_id
    ))
    -- For filtering, we need to handle "+" as negative for comparison
    AND (p_handicap_min IS NULL OR
      CASE
        WHEN up.profile_data->'golfInfo'->>'handicap' LIKE '+%' THEN
          -(REPLACE(up.profile_data->'golfInfo'->>'handicap', '+', ''))::DOUBLE PRECISION
        ELSE
          COALESCE(
            (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
            (up.profile_data->>'handicap')::DOUBLE PRECISION,
            up.handicap_index,
            54
          )
      END >= p_handicap_min)
    AND (p_handicap_max IS NULL OR
      CASE
        WHEN up.profile_data->'golfInfo'->>'handicap' LIKE '+%' THEN
          -(REPLACE(up.profile_data->'golfInfo'->>'handicap', '+', ''))::DOUBLE PRECISION
        ELSE
          COALESCE(
            (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
            (up.profile_data->>'handicap')::DOUBLE PRECISION,
            up.handicap_index,
            0
          )
      END <= p_handicap_max)
  ORDER BY 2
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER) TO anon, authenticated;

-- Test
SELECT 'search_players_global fixed - handicap as TEXT preserves + sign' as status;
SELECT * FROM search_players_global('Rocky', NULL::UUID, NULL::INTEGER, NULL::INTEGER, 5, 0);
SELECT * FROM search_players_global('Jesse', NULL::UUID, NULL::INTEGER, NULL::INTEGER, 5, 0);
