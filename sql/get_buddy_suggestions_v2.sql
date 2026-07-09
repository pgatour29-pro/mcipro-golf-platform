-- get_buddy_suggestions v2 (2026-07-09) — the "Played with" quick-add list.
-- Changes vs v1:
--  • Counts SAME LIVE-SCORING GROUP partners (scorecards.group_id) as well as
--    same-society-event partners — so someone added to a casual round shows up
--    afterwards. v1 only saw society events.
--  • Includes one-time partners (v1 required >= 2 shared events, so the "random
--    person from search" never appeared for quick-add next time).
--  • LIMIT 15 (was 10).
-- Still EXCLUDES existing buddies — buddies live on their own tab; this list is
-- deliberately "people I've played with but who are NOT buddies" (Pete, 2026-07-09).
-- NB: a same-event-and-same-group partner can count both keys for one day; the
-- times_played metric is fuzzy by design (ordering signal, not a ledger).

CREATE OR REPLACE FUNCTION get_buddy_suggestions(p_user_id TEXT)
RETURNS TABLE(buddy_id TEXT, buddy_name TEXT, times_played INTEGER, last_played TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH pair_plays AS (
        -- Same society event, both completed
        SELECT
            CASE WHEN r1.golfer_id = p_user_id THEN r2.golfer_id ELSE r1.golfer_id END AS partner_id,
            'evt:' || r1.society_event_id::text AS play_key,
            MAX(COALESCE(r1.completed_at, r1.created_at)) AS played_at
        FROM rounds r1
        JOIN rounds r2 ON (
            r1.society_event_id IS NOT NULL
            AND r1.society_event_id = r2.society_event_id
        )
        WHERE
            (r1.golfer_id = p_user_id OR r2.golfer_id = p_user_id)
            AND r1.golfer_id != r2.golfer_id
            AND r1.status = 'completed'
            AND r2.status = 'completed'
        GROUP BY 1, 2

        UNION

        -- Same live-scoring group (covers casual rounds with no society event)
        SELECT
            s2.player_id AS partner_id,
            'grp:' || s1.group_id::text AS play_key,
            MAX(COALESCE(s1.updated_at, s1.created_at)) AS played_at
        FROM scorecards s1
        JOIN scorecards s2 ON (
            s1.group_id IS NOT NULL
            AND s1.group_id = s2.group_id
        )
        WHERE
            s1.player_id = p_user_id
            AND s2.player_id != p_user_id
        GROUP BY 1, 2
    ),
    play_partners AS (
        SELECT
            pp.partner_id,
            COUNT(DISTINCT pp.play_key)::INTEGER AS times_together,
            MAX(pp.played_at) AS last_played_date
        FROM pair_plays pp
        GROUP BY pp.partner_id
    )
    SELECT
        p.partner_id,
        up.name AS buddy_name,
        p.times_together,
        p.last_played_date
    FROM play_partners p
    JOIN user_profiles up ON up.line_user_id = p.partner_id
    LEFT JOIN golf_buddies gb ON gb.user_id = p_user_id AND gb.buddy_id = p.partner_id
    WHERE gb.id IS NULL
    ORDER BY p.times_together DESC, p.last_played_date DESC
    LIMIT 15;
END;
$$;
