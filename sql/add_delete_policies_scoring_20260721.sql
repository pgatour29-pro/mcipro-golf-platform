-- 2026-07-21: give organizer/admin FULL control to delete a player's scores.
-- The scoring tables were permissive for SELECT/INSERT/UPDATE (tmp_* policies, USING/CHECK true)
-- but had NO DELETE policy, so the browser (anon key) could not remove a scored player's card/
-- round (RLS silent 0-row delete). This completes the existing model with a matching DELETE
-- policy so OrganizerScoringSystem.removePlayerFromEvent can fully purge a player.
-- Applied to prod via `supabase db query --linked` on 2026-07-21. Verified anon insert->delete
-- round-trip returns "deleted OK". (Part of the broader anon->JWT RLS remediation: these tmp_*
-- USING(true) policies are the loose interim model, not the hardened target.)

DROP POLICY IF EXISTS tmp_delete ON public.scorecards;
CREATE POLICY tmp_delete ON public.scorecards FOR DELETE USING (true);

DROP POLICY IF EXISTS tmp_delete ON public.scores;
CREATE POLICY tmp_delete ON public.scores FOR DELETE USING (true);

DROP POLICY IF EXISTS tmp_delete ON public.rounds;
CREATE POLICY tmp_delete ON public.rounds FOR DELETE USING (true);
