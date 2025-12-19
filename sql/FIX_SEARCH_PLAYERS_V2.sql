-- Fix search_players_global - use user_profiles table which has profile_data column

-- Drop ALL versions of the function
DROP FUNCTION IF EXISTS search_players_global(TEXT, TEXT);
DROP FUNCTION IF EXISTS search_players_global(TEXT, UUID, INTEGER, INTEGER, INTEGER, INTEGER);

-- Create with correct signature using user_profiles table
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
    up.line_user_id::TEXT,
    COALESCE(up.display_name,
             CONCAT_WS(' ', up.profile_data->'personalInfo'->>'firstName', up.profile_data->'personalInfo'->>'lastName'),
             'Unknown')::TEXT,
    COALESCE(
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION
    ),
    COALESCE(
      up.profile_data->'golfInfo'->>'homeClub',
      up.profile_data->'golfInfo'->>'homeCourse'
    )::TEXT,
    (SELECT COUNT(*) FROM scorecards sc WHERE sc.golfer_id = up.line_user_id)::BIGINT,
    ARRAY(
      SELECT sp.name
      FROM society_members sm
      JOIN society_profiles sp ON sm.society_id = sp.id
      WHERE sm.member_id = up.line_user_id
      LIMIT 3
    )
  FROM user_profiles up
  WHERE
    (p_search_query = '' OR p_search_query IS NULL OR
     up.display_name ILIKE '%' || p_search_query || '%' OR
     up.profile_data->'personalInfo'->>'firstName' ILIKE '%' || p_search_query || '%' OR
     up.profile_data->'personalInfo'->>'lastName' ILIKE '%' || p_search_query || '%')
    AND (p_society_id IS NULL OR EXISTS (
      SELECT 1 FROM society_members sm
      WHERE sm.member_id = up.line_user_id AND sm.society_id = p_society_id
    ))
    AND (p_handicap_min IS NULL OR COALESCE(
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION,
      54
    ) >= p_handicap_min)
    AND (p_handicap_max IS NULL OR COALESCE(
      (up.profile_data->'golfInfo'->>'handicap')::DOUBLE PRECISION,
      (up.profile_data->>'handicap')::DOUBLE PRECISION,
      0
    ) <= p_handicap_max)
  ORDER BY 2
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Test it
SELECT 'search_players_global created with user_profiles table' as status;
