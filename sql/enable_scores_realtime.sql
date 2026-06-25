-- Cross-device live scoring (host follows a self-scorer's entries, auto-advance) relies on a
-- realtime subscription to the scores table — but scores was never in the realtime publication,
-- so the subscription never fired. Enable it. REPLICA IDENTITY FULL so UPDATE events can be
-- filtered by scorecard_id (re-scores), not just INSERTs.
alter table public.scores replica identity full;
alter publication supabase_realtime add table public.scores;
