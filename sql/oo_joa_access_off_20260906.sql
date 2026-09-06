-- 1on1: SUSPEND JOA's access (2026-09-06). Pete: "I want you to take JOA access to 1on1 away for now.
-- Remove the cube as well until I say put it back."
--
-- The cube gate is oo_cube_visible(uid) = "row in oo_admins OR a non-removed oo_members row", and every dashboard
-- re-runs it on init (v1096) — so dropping both rows takes the access AND the cube away on the next load. Nothing
-- else of JOA's is touched: the society, its events and its members are untouched, and no 1on1 data is deleted.
-- PUT IT BACK with sql/oo_joa_access_restore_20260906.sql (one command, restores exactly these two rows).
-- Run: npx supabase db query --linked -f sql/oo_joa_access_off_20260906.sql

delete from public.oo_admins  where user_id = 'KAKAO-4911042963';   -- JOA Golf Pattaya (파타야 조아골프)
delete from public.oo_members where user_id = 'KAKAO-4911042963';   -- the member row seeded for testing today

select public.oo_cube_visible('KAKAO-4911042963') as joa_cube_visible,
       (select count(*) from public.oo_admins  where user_id = 'KAKAO-4911042963') as joa_admin_rows,
       (select count(*) from public.oo_members where user_id = 'KAKAO-4911042963') as joa_member_rows,
       public.oo_cube_visible('U2b6d976f19bca4b2f4374ae0e10ed873') as pete_cube_visible,
       (select count(*) from public.oo_admins) as admins_left;
