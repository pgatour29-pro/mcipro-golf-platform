-- v1549 one-off (2026-10-13): give every player already in history a claimable profile.
-- Ids in event_registrations / rounds / caddy_bookings / tee sheet bookings with NO user_profiles row
-- (pre-July live-scoring player_*, organizer manual_*, registration GUEST-*) are moved onto the guest
-- profile golfer_for_name() picks for their name (an existing one, or a new MANUAL-), via
-- relink_guest_rows — the same sweep a first-login claim runs. Name-only caddy jobs get the same id.
-- Refused (left as they are, reported): one-word / nameless / generic names, and names a REAL account
-- carries (a name alone never moves rows onto someone's account), TEST-* ids, the Chee Chan tester course.
-- Run:  begin; select * from public._v1549_backfill(); rollback;   (dry)   then without the rollback.

CREATE OR REPLACE FUNCTION public._v1549_backfill()
RETURNS TABLE (old_id text, nm text, result text, new_id text) LANGUAGE plpgsql AS $$
DECLARE o record; r jsonb;
BEGIN
  BEGIN SET LOCAL session_replication_role = replica; EXCEPTION WHEN OTHERS THEN NULL; END;
  FOR o IN
    WITH h AS (
      SELECT player_id id, player_name n, created_at at FROM event_registrations
      UNION ALL SELECT golfer_id, player_name, created_at FROM rounds
      UNION ALL SELECT coalesce(golfer_id, user_id), golfer_name, created_at FROM caddy_bookings
      UNION ALL SELECT g->>'odoo_id', g->>'name', b.created_at FROM bookings b,
        jsonb_array_elements(CASE WHEN jsonb_typeof(b.booking_data->'golfers') = 'array' THEN b.booking_data->'golfers' ELSE '[]' END) g
    )
    SELECT h.id, (array_agg(h.n ORDER BY h.at DESC) FILTER (WHERE coalesce(h.n, '') <> ''))[1] n
    FROM h WHERE coalesce(h.id, '') <> '' AND h.id !~ '^TEST-'
      AND NOT EXISTS (SELECT 1 FROM user_profiles u WHERE u.line_user_id = h.id)
    GROUP BY h.id ORDER BY 1
  LOOP
    old_id := o.id; nm := o.n; new_id := NULL;
    IF NOT (o.id LIKE '%-GUEST-%' OR o.id LIKE 'GUEST-%' OR o.id LIKE 'MANUAL-%' OR o.id LIKE 'manual\_%'
            OR o.id LIKE 'player\_%' OR o.id LIKE 'TRGG-HCP-%') THEN
      result := 'skip:not_placeholder'; RETURN NEXT; CONTINUE;   -- relink_guest_rows' own rule; checked BEFORE a profile is made
    END IF;
    r := public.golfer_for_name(o.n, NULL, 'backfill-v1549');
    IF (r->>'ok')::boolean THEN
      BEGIN
        PERFORM public.relink_guest_rows(o.id, r->>'id');
        result := 'moved:' || (r->>'linked'); new_id := r->>'id';
      EXCEPTION WHEN OTHERS THEN result := 'error:' || SQLERRM;
      END;
    ELSE result := 'skip:' || (r->>'reason');
    END IF;
    RETURN NEXT;
  END LOOP;

  -- caddy jobs typed with a name only (pro shop desk), real courses only
  FOR o IN
    SELECT golfer_name n, array_agg(id) ids FROM caddy_bookings
    WHERE golfer_id IS NULL AND user_id IS NULL AND coalesce(golfer_name, '') <> ''
      AND coalesce(status, '') <> 'cancelled' AND course_name !~* 'chee ?chan'
    GROUP BY golfer_name
  LOOP
    old_id := '(name only)'; nm := o.n; new_id := NULL;
    r := public.golfer_for_name(o.n, NULL, 'backfill-v1549');
    IF (r->>'ok')::boolean THEN
      UPDATE caddy_bookings SET golfer_id = r->>'id' WHERE id = ANY (o.ids);
      result := 'linked:' || (r->>'linked'); new_id := r->>'id';
    ELSE result := 'skip:' || (r->>'reason');
    END IF;
    RETURN NEXT;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public._v1549_backfill() FROM PUBLIC, anon, authenticated;
