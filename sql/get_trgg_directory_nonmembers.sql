-- Everyone who has played a TRGG event (has an event_registration for a TRGG society_event) but is
-- NOT yet a member (their player_id is not linked into trgg_members). Powers the TRGG Directory's
-- "Non-members" so the directory shows everyone who plays, tagged, with their handicap — starting a
-- membership (which inserts a linked trgg_members row) flips them out of this list into the member list.
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
      AND er.player_id NOT IN (SELECT matched_user_id FROM trgg_members WHERE matched_user_id IS NOT NULL)
    GROUP BY er.player_id
  )
  SELECT p.player_id,
         up.name,
         COALESCE(sh_trgg.handicap_index, sh_uni.handicap_index, up.handicap_index) AS handicap,
         p.last_played,
         p.events
  FROM participants p
  JOIN user_profiles up ON up.line_user_id = p.player_id
  LEFT JOIN society_handicaps sh_trgg ON sh_trgg.golfer_id = p.player_id AND sh_trgg.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'
  LEFT JOIN society_handicaps sh_uni  ON sh_uni.golfer_id  = p.player_id AND sh_uni.society_id IS NULL
  WHERE up.name IS NOT NULL AND btrim(up.name) <> ''
  ORDER BY up.name;
$$;
GRANT EXECUTE ON FUNCTION get_trgg_directory_nonmembers() TO anon, authenticated;
