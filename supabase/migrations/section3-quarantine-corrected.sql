-- ============================================================================
-- Section Z — corrected policies (supersedes the booking/society/admin parts
-- of section3-quarantine-final.sql per the schema findings)
-- ============================================================================
-- Drop the helpers from the previous file that don't match the schema:
drop function if exists public.is_course_admin(text);
drop function if exists public.is_society_organizer(text);


-- ============================================================================
-- Organizer helper — GLOBAL (society_organizer_roles has organizer_id only)
-- NOTE: this grants every organizer visibility into ALL societies' members.
-- Per-society scoping would require a society_id column on the roles table.
-- ============================================================================
create or replace function public.is_organizer()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.society_organizer_roles
    where user_id = (select public.line_id())
    -- user_id = the LINE user; organizer_id = which organizer group they belong to
  );
$$;
revoke all on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;


-- ============================================================================
-- SOCIETY / EVENT: member sees own row, organizer sees all
-- ============================================================================
-- owner = golfer_id
do $$
declare t text;
  gid text[] := array['society_members','golfer_society_subscriptions','event_join_requests'];
begin
  foreach t in array gid loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format($f$create policy se_read on public.%I for select to authenticated
      using (golfer_id = (select public.line_id()) or public.is_organizer())$f$, t);
    execute format($f$create policy se_insert on public.%I for insert to authenticated
      with check (golfer_id = (select public.line_id()))$f$, t);
    execute format($f$create policy se_update on public.%I for update to authenticated
      using (golfer_id = (select public.line_id()) or public.is_organizer())
      with check (golfer_id = (select public.line_id()) or public.is_organizer())$f$, t);
  end loop;
end $$;

-- event_registrations: owner = player_id (text, LINE userId)
-- user_id column is uuid and NULL in all rows; player_id holds the LINE ID
drop policy if exists tmp_select on public.event_registrations;
drop policy if exists tmp_insert on public.event_registrations;
drop policy if exists tmp_update on public.event_registrations;
create policy er_read on public.event_registrations for select to authenticated
  using (player_id = (select public.line_id()) or public.is_organizer());
create policy er_insert on public.event_registrations for insert to authenticated
  with check (player_id = (select public.line_id()));
create policy er_update on public.event_registrations for update to authenticated
  using (player_id = (select public.line_id()) or public.is_organizer())
  with check (player_id = (select public.line_id()) or public.is_organizer());


-- ============================================================================
-- BOOKINGS: golfer-only in RLS (caddie = UUID FK, admin = PIN-only; neither is
-- a LINE-authenticated identity, so their access is NOT expressed here)
-- ============================================================================
do $$
declare t text;
  bk text[] := array['bookings','caddy_bookings','caddy_waitlist'];
begin
  foreach t in array bk loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy bk_read on public.%I for select to authenticated using (golfer_id = (select public.line_id()))', t);
    execute format('create policy bk_insert on public.%I for insert to authenticated with check (golfer_id = (select public.line_id()))', t);
    execute format('create policy bk_update on public.%I for update to authenticated using (golfer_id = (select public.line_id())) with check (golfer_id = (select public.line_id()))', t);
  end loop;
end $$;
-- Caddie access: if caddies authenticate via LINE and caddies.line_user_id exists,
-- add to bk_read using:  caddy_id in (select id from public.caddies where line_user_id = (select public.line_id()))
-- Admin access: via verify-admin-pin Edge Function + admin_courses claim (below).


-- ============================================================================
-- ADMIN via claim (stub) — enable AFTER verify-admin-pin issues admin_courses
-- ============================================================================
-- create or replace function public.is_course_admin(p_course_id text)
-- returns boolean language sql stable set search_path = public
-- as $$
--   select coalesce((select auth.jwt() -> 'admin_courses') ? p_course_id, false);
-- $$;
-- Then append to bk_read / bk_update:  or public.is_course_admin(course_id)
-- (course_id on caddy_bookings is a UUID; cast p_course_id accordingly.)


-- ============================================================================
-- CHAT (templates) — sender column is "sender"; still need the FK/membership cols
-- ============================================================================
-- UUID system (rooms / chat_messages), auth.uid():
-- create policy chat_read on public.chat_messages for select to authenticated
--   using (exists (select 1 from public.room_members m
--                  where m.room_id = chat_messages.room_id     -- CONFIRM FK name
--                    and m.user_id = (select auth.uid())));     -- CONFIRM uuid col
-- create policy chat_insert on public.chat_messages for insert to authenticated
--   with check (sender = (select auth.uid())                    -- "sender", confirmed
--               and exists (select 1 from public.room_members m
--                           where m.room_id = chat_messages.room_id
--                             and m.user_id = (select auth.uid())));
-- LINE-ID system (group_chats / direct_messages), line_id(): as templated before.
