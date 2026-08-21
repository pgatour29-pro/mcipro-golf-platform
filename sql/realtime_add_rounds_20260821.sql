-- 2026-08-21: rounds was never in the realtime publication, so paper-card/post-round
-- inserts broadcast nothing (results.html + community ticker subscriptions sat dead).
alter publication supabase_realtime add table public.rounds;
