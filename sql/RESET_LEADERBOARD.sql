-- RESET LEADERBOARD
-- Zero out everything. Fresh start tomorrow Dec 12, 2025.

DROP FUNCTION IF EXISTS get_society_standings(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_society_standings(p_society_id UUID, p_period TEXT DEFAULT 'all')
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $func$
BEGIN
  -- Return empty standings - fresh start tomorrow
  RETURN json_build_object(
    'period', p_period,
    'society_id', p_society_id,
    'standings', '[]'::json,
    'last_updated', NOW()
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION get_society_standings(UUID, TEXT) TO anon, authenticated;

SELECT 'Leaderboard reset - fresh start Dec 12' as status;
