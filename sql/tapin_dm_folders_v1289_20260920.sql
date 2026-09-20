-- v1289 (Pete 2026-09-20): Tap-In DM centre — folders for players, caddies, golf courses,
-- societies and vendors. Pete picked option A (a chip row over one list).
--
-- The DM data itself is NOT new: Tap-In reads and writes direct_messages through the secure-dm
-- edge function, the same pipeline the Messages tab uses, so one inbox, one unread count, and the
-- LINE push still fires. All this function does is tell the client WHO each conversation partner
-- is, so a thread can be filed in a folder without the golfer filing anything.
--
-- Folder is derived, never stored:
--   course  — a course page (courses.id, with or without the Tap-In 'course:' prefix)
--   society — a society page (society_profiles.id, ditto)
--   caddy   — gfd_person says caddy (a real caddy_profiles row)
--   vendor  — they sell on the 19th Hole AND I have asked about or offered on one of their listings
--   player  — everyone else
-- A partner who is both a caddy and a seller files under caddy: who they ARE beats what they sold.

create or replace function public.gfd_dm_people(p_user text, p_ids text[])
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(
           public.gfd_person(x.norm) || jsonb_build_object('dm_id', x.id, 'folder', x.folder)
         ), '[]'::jsonb)
  from (
    select i.id,
           -- a page can arrive either as its bare id (direct_messages) or already prefixed (Tap-In)
           case
             when i.id like 'society:%' or i.id like 'course:%' then i.id
             when exists (select 1 from public.society_profiles s where s.id::text = i.id) then 'society:' || i.id
             when exists (select 1 from public.societies s where s.id::text = i.id) then
               coalesce((select 'society:' || sp.id::text from public.society_profiles sp
                          join public.societies so on so.id::text = i.id
                         where lower(sp.society_name) = lower(so.name) limit 1), i.id)
             when exists (select 1 from public.courses c where c.id = i.id) then 'course:' || i.id
             else i.id
           end as norm,
           case
             when i.id like 'course:%' or exists (select 1 from public.courses c where c.id = i.id) then 'course'
             when i.id like 'society:%' or exists (select 1 from public.society_profiles s where s.id::text = i.id)
                  or exists (select 1 from public.societies s where s.id::text = i.id) then 'society'
             when exists (select 1 from public.caddy_profiles cp
                           where cp.user_id = i.id and coalesce(cp.caddy_number,'') <> '' and cp.course_id is not null
                             and coalesce(cp.is_active, true) and not coalesce(cp.is_mock, false)) then 'caddy'
             when exists (select 1 from public.marketplace_listings l
                           where l.seller_line_id = i.id
                             and (exists (select 1 from public.marketplace_enquiries e where e.listing_id = l.id and e.buyer_id = p_user)
                               or exists (select 1 from public.marketplace_offers o where o.listing_id = l.id and o.buyer_line_id = p_user))) then 'vendor'
             else 'player'
           end as folder
    from unnest(coalesce(p_ids, '{}'::text[])) with ordinality as i(id, ord)
    where i.id is not null and i.id <> ''
    order by i.ord
  ) x
$function$;

revoke all on function public.gfd_dm_people(text, text[]) from public;
grant execute on function public.gfd_dm_people(text, text[]) to anon, authenticated;

-- Golf course pages need a sender profile the way societies got one in
-- sql/society_sender_profiles.sql, otherwise a DM to a course has no name in the Messages tab and
-- staff cannot answer AS the course. Keyed on the Tap-In page id so one id works in both places.
-- role CHECK allows golfer/caddy/organizer/admin/golf_course_manager/guest.
insert into public.user_profiles (line_user_id, name, role)
select 'course:' || c.id, c.name, 'golf_course_manager'
  from public.courses c
 where public.gfd_course_page_ok(c.id)
   and not exists (select 1 from public.user_profiles up where up.line_user_id = 'course:' || c.id)
on conflict (line_user_id) do nothing;
