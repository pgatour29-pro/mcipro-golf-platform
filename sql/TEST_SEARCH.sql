-- Test search_players_global
SELECT * FROM search_players_global('', NULL::UUID, NULL::INTEGER, NULL::INTEGER, 10, 0);

-- Check user_profiles data directly
SELECT
  line_user_id,
  display_name,
  name,
  handicap_index,
  home_club
FROM user_profiles
WHERE display_name IS NOT NULL
LIMIT 10;

-- Check if handicap data exists in profile_data
SELECT
  line_user_id,
  display_name,
  handicap_index,
  profile_data->'golfInfo'->>'handicap' as profile_handicap,
  profile_data->>'handicap' as alt_handicap
FROM user_profiles
WHERE display_name ILIKE '%Pete%' OR display_name ILIKE '%Abbey%'
LIMIT 5;
