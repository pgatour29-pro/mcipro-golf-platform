-- Test the search function output
SELECT * FROM search_players_global('Pete', NULL::UUID, NULL::INTEGER, NULL::INTEGER, 5, 0);

-- Check what the societies subquery returns
SELECT
  up.line_user_id,
  up.display_name,
  up.handicap_index,
  ARRAY(
    SELECT sp.society_name
    FROM society_members sm
    JOIN society_profiles sp ON sm.society_id = sp.id
    WHERE sm.golfer_id = up.line_user_id
    LIMIT 3
  ) as societies
FROM user_profiles up
WHERE up.display_name ILIKE '%Pete%'
LIMIT 5;

-- Check society_members for Pete
SELECT sm.*, sp.society_name
FROM society_members sm
JOIN society_profiles sp ON sm.society_id = sp.id
WHERE sm.golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
