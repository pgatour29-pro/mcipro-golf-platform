-- 1on1: REMOVE the mock test data seeded by sql/oo_mock_partners_20260906.sql.
-- Everything the seed created is keyed 'MOCK-OO-%'; nothing else is touched. The two admin member rows
-- (Pete, JOA) are left alone — deactivate those from Admin → Members if they are no longer wanted.
-- Run: npx supabase db query --linked -f sql/oo_mock_partners_cleanup_20260906.sql

delete from public.oo_reviews   where member_id like 'MOCK-OO-%' or partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_likes     where member_id like 'MOCK-OO-%' or partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_reports   where reporter_id like 'MOCK-OO-%' or target_user_id like 'MOCK-OO-%';
delete from public.oo_bookings  where member_id like 'MOCK-OO-%' or partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_blackouts where partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
update public.oo_partners set cover_media_id = null where user_id like 'MOCK-OO-%';
delete from public.oo_media     where partner_id in (select id from public.oo_partners where user_id like 'MOCK-OO-%');
delete from public.oo_partners  where user_id like 'MOCK-OO-%';
delete from public.oo_members   where user_id like 'MOCK-OO-%';

select (select count(*) from public.oo_partners where user_id like 'MOCK-OO-%') as partners_left,
       (select count(*) from public.oo_members  where user_id like 'MOCK-OO-%') as members_left;
