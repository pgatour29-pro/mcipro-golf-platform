-- ROOT CAUSE of "registration / tee sheet / event-day sheet not syncing":
-- event_registrations was NOT in the supabase_realtime publication, so registration
-- changes (add/remove player, fees, payments, renewals) never broadcast. All three
-- modules subscribe to it; they just never received events.
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_registrations;
-- REPLICA IDENTITY FULL so DELETE events carry event_id (needed for the event_id filter,
-- otherwise removing a player wouldn't propagate to subscribers).
ALTER TABLE public.event_registrations REPLICA IDENTITY FULL;

-- Also publish society_events so event-level changes (fees, tee time, course) sync live.
ALTER PUBLICATION supabase_realtime ADD TABLE public.society_events;

-- verify
SELECT tablename FROM pg_publication_tables
WHERE pubname='supabase_realtime'
  AND tablename IN ('event_registrations','event_pairings','society_events')
ORDER BY tablename;
