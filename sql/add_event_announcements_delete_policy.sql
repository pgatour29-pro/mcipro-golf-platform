-- Organizers need to delete their event notices from the browser (anon key). There was no DELETE
-- policy, so a browser delete silently removed 0 rows. Add one (matches the existing permissive
-- ann_update/ann_insert; JWT-scoped hardening is a separate phase).
drop policy if exists ann_delete on public.event_announcements;
create policy ann_delete on public.event_announcements for delete to anon, authenticated using (true);
