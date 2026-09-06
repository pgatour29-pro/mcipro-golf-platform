-- 1on1: PUT JOA's access back — the exact inverse of sql/oo_joa_access_off_20260906.sql.
-- Run ONLY when Pete says so ("until I say put it back", 2026-09-06).
-- Restores the 1on1 admin row; the member row is NOT restored (it was only seeded for testing — add it from
-- Admin → Members if JOA should browse as a member too).
-- Run: npx supabase db query --linked -f sql/oo_joa_access_restore_20260906.sql

insert into public.oo_admins (user_id, added_by)
values ('KAKAO-4911042963', 'restore:2026-09-06')
on conflict (user_id) do nothing;

select public.oo_cube_visible('KAKAO-4911042963') as joa_cube_visible,
       (select count(*) from public.oo_admins) as admins;
