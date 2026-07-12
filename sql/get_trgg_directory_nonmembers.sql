-- Everyone who has played a TRGG event (has an event_registration for a TRGG society_event) but is
-- NOT yet a member (their player_id is not linked into trgg_members). Powers the TRGG Directory's
-- "Non-members" so the directory shows everyone who plays, tagged, with their handicap — starting a
-- membership (which inserts a linked trgg_members row) flips them out of this list into the member list.
--
-- Also includes profiles the TRGG handicap pull created for NEW names (line_user_id 'TRGG-HCP-…'):
-- they're on the masterscoreboard list, so they belong in the directory even before their first event
-- (Pete 2026-07-12: show them with the NON-MEMBER pill, not as fabricated member rows).
CREATE OR REPLACE FUNCTION get_trgg_directory_nonmembers()
RETURNS TABLE(player_id text, name text, handicap numeric, last_played date, events bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH trgg_events AS (
    SELECT id::text AS id, event_date FROM society_events
    WHERE society_id IN ('17451cf3-f499-4aa3-83d7-c206149838c4','7c0e4b72-d925-44bc-afda-38259a7ba346')
  ),
  participants AS (
    SELECT er.player_id,
           max(te.event_date) AS last_played,
           count(DISTINCT te.id) AS events
    FROM event_registrations er
    JOIN trgg_events te ON te.id = er.event_id::text
    WHERE er.player_id IS NOT NULL
    GROUP BY er.player_id
  ),
  candidates AS (
    SELECT player_id, last_played, events FROM participants
    UNION ALL
    SELECT up.line_user_id, NULL::date, 0::bigint
    FROM user_profiles up
    WHERE up.line_user_id LIKE 'TRGG-HCP-%'
      AND up.line_user_id NOT IN (SELECT player_id FROM participants)
  )
  SELECT c.player_id,
         up.name,
         COALESCE(sh_trgg.handicap_index, sh_uni.handicap_index, up.handicap_index) AS handicap,
         c.last_played,
         c.events
  FROM candidates c
  JOIN user_profiles up ON up.line_user_id = c.player_id
  LEFT JOIN society_handicaps sh_trgg ON sh_trgg.golfer_id = c.player_id AND sh_trgg.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'
  LEFT JOIN society_handicaps sh_uni  ON sh_uni.golfer_id  = c.player_id AND sh_uni.society_id IS NULL
  WHERE up.name IS NOT NULL AND btrim(up.name) <> ''
    AND c.player_id NOT IN (SELECT matched_user_id FROM trgg_members WHERE matched_user_id IS NOT NULL)
  ORDER BY up.name;
$$;
GRANT EXECUTE ON FUNCTION get_trgg_directory_nonmembers() TO anon, authenticated;
