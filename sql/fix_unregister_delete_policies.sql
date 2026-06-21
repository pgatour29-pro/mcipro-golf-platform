-- FIX (2026-06-21): golfers could not unregister from events.
-- event_registrations (+ event_join_requests, event_invites, caddy_bookings) had
-- RLS enabled with INSERT/SELECT/UPDATE policies for {anon,authenticated} but NO
-- DELETE policy. The app's unregister does a hard DELETE from the browser (anon key);
-- with no DELETE policy PostgREST removes 0 rows and returns SUCCESS, so the golfer
-- saw "Successfully unregistered" but stayed registered.
--
-- Add DELETE policies so unregister actually removes the row. This matches the
-- existing permissive tmp_* posture (anon already has INSERT/UPDATE/SELECT on these
-- tables); per-row JWT-scoped policies are a Phase-2 security task, not this fix.
-- The AFTER DELETE waitlist auto-promotion trigger fires correctly on a real delete.

DROP POLICY IF EXISTS tmp_delete ON event_registrations;
CREATE POLICY tmp_delete ON event_registrations FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS tmp_delete ON event_join_requests;
CREATE POLICY tmp_delete ON event_join_requests FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS tmp_delete ON event_invites;
CREATE POLICY tmp_delete ON event_invites FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS tmp_delete ON caddy_bookings;
CREATE POLICY tmp_delete ON caddy_bookings FOR DELETE TO anon, authenticated USING (true);
