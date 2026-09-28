-- 2026-09-28 Pete: get rid of the King of the Mountain pages.
-- Backup: backups/kotm_2026_removed_20260928.json. DELETE on society_events fires no LINE push.
begin;
update public.event_series set status = 'archived', updated_at = now() where id = 'king_of_the_mountain_2026';
delete from public.event_waitlist where event_id::text in ('702bcbeb-5bd6-4ce0-8e60-a838417f4ee1','f9b0b4c1-ad8e-4dc3-add9-610cc671da46','05c1b8ee-218a-4e7b-894c-9baecb62892d','32ddc926-af32-49b7-90ee-56bd79f0290e','99326d7f-05fa-44ec-b80a-284d79a51c94');
delete from public.society_events where id::text in ('702bcbeb-5bd6-4ce0-8e60-a838417f4ee1','f9b0b4c1-ad8e-4dc3-add9-610cc671da46','05c1b8ee-218a-4e7b-894c-9baecb62892d','32ddc926-af32-49b7-90ee-56bd79f0290e','99326d7f-05fa-44ec-b80a-284d79a51c94');
commit;
