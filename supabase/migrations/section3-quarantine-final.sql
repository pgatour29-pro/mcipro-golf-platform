-- ============================================================================
-- Section Z — final quarantine policies
-- ============================================================================
-- PART 1 is URGENT and applies NOW (independent of the mint).
-- PART 2 applies post-Phase-C with the rest of Section 3 (uses tokens).
-- ============================================================================


-- ============================================================================
-- PART 1 — URGENT: lock the admin PIN tables (apply immediately)
-- ============================================================================
-- These hold super_admin_pin / staff_pin / access_pin and are currently
-- world-readable via the anon key. Lock = no client policies = service_role only.
-- ALSO remove these three from the C2 public-read array in section3-real-policies.sql.
do $$
declare t text;
  pin_tables text[] := array[
    'course_admins','society_organizer_access','society_organizer_roles'
  ];
begin
  foreach t in array pin_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('drop policy if exists public_read on public.%I', t);  -- in case C2 already ran
    -- no policies => only service_role can read/write. PIN verification must move
    -- to an Edge Function (service_role), never a client-side comparison.
  end loop;
end $$;


-- ============================================================================
-- PART 2 — applies post-Phase-C
-- ============================================================================

-- ---- Helpers: check admin/organizer status WITHOUT exposing the locked tables.
-- SECURITY DEFINER lets these read the locked tables on the policy's behalf, so
-- clients still can't read PINs but policies can ask "is this caller an admin?".
-- CONFIRM column names against the introspection output before deploying.

create or replace function public.is_course_admin(p_course_id text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.course_admins ca
    where ca.course_id = p_course_id
      and ca.user_id = (select public.line_id())   -- CONFIRM: admin id column
  );
$$;
revoke all on function public.is_course_admin(text) from public, anon;
grant execute on function public.is_course_admin(text) to authenticated;

create or replace function public.is_society_organizer(p_society_id text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.society_organizer_roles sor
    where sor.society_id = p_society_id              -- CONFIRM: society link column
      and sor.user_id = (select public.line_id())
  );
$$;
revoke all on function public.is_society_organizer(text) from public, anon;
grant execute on function public.is_society_organizer(text) to authenticated;


-- ---- TWO-PARTY relationships -----------------------------------------------
-- golf_buddies: LINE-ID based (text) -> line_id()
drop policy if exists tmp_select on public.golf_buddies;
drop policy if exists tmp_insert on public.golf_buddies;
drop policy if exists tmp_update on public.golf_buddies;
create policy buddy_read on public.golf_buddies for select to authenticated
  using (user_id = (select public.line_id()) or buddy_id = (select public.line_id()));
create policy buddy_insert on public.golf_buddies for insert to authenticated
  with check (user_id = (select public.line_id()));
create policy buddy_update on public.golf_buddies for update to authenticated
  using (user_id = (select public.line_id()) or buddy_id = (select public.line_id()));

-- friendships: UUID based -> auth.uid()
-- *** PRECONDITION (see prose): auth.uid() returns the MINTED sub = app_users.id.
-- These policies only match existing rows if friendships.user_id/friend_id store
-- THAT uuid. If they store a pre-existing user uuid, do NOT apply yet — we must
-- align sub to that id (or add a claim) first, or all friendships go invisible.
drop policy if exists tmp_select on public.friendships;
drop policy if exists tmp_insert on public.friendships;
drop policy if exists tmp_update on public.friendships;
create policy friend_read on public.friendships for select to authenticated
  using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));
create policy friend_insert on public.friendships for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy friend_update on public.friendships for update to authenticated
  using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));


-- ---- BOOKINGS multi-party: golfer + assigned caddie + course admin ---------
-- golfer_id assumed LINE-id (text, like caddy_notebook). caddie_id identity:
-- CONFIRM whether a caddie authenticates via LINE (then caddie_id = line_id())
-- or is a caddies-table id (then the check differs). Written for LINE-id caddie.
do $$
declare t text;
  bk text[] := array['bookings','caddy_bookings','caddy_waitlist'];
begin
  foreach t in array bk loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format($f$create policy bk_read on public.%I for select to authenticated
      using (golfer_id = (select public.line_id())
             or caddie_id = (select public.line_id())
             or public.is_course_admin(course_id))$f$, t);
    execute format($f$create policy bk_insert on public.%I for insert to authenticated
      with check (golfer_id = (select public.line_id()))$f$, t);
    execute format($f$create policy bk_update on public.%I for update to authenticated
      using (golfer_id = (select public.line_id()) or public.is_course_admin(course_id))
      with check (golfer_id = (select public.line_id()) or public.is_course_admin(course_id))$f$, t);
  end loop;
end $$;


-- ---- SOCIETY/EVENT: member sees own + organizer sees all -------------------
-- CONFIRM: the member owner column (golfer_id vs user_id), and how each table
-- links to its society/event so is_society_organizer() gets the right id.
-- Template for society_members (owner golfer_id, links via society_id):
-- drop policy if exists tmp_select on public.society_members;
-- drop policy if exists tmp_insert on public.society_members;
-- drop policy if exists tmp_update on public.society_members;
-- create policy sm_read on public.society_members for select to authenticated
--   using (golfer_id = (select public.line_id()) or public.is_society_organizer(society_id));
-- create policy sm_insert on public.society_members for insert to authenticated
--   with check (golfer_id = (select public.line_id()));
-- create policy sm_update on public.society_members for update to authenticated
--   using (golfer_id = (select public.line_id()) or public.is_society_organizer(society_id))
--   with check (golfer_id = (select public.line_id()) or public.is_society_organizer(society_id));
-- event_registrations / event_join_requests: same shape, but events link to a
-- society indirectly (event -> society_id). CONFIRM that path, then organizer
-- check becomes is_society_organizer(<the event's society_id>).


-- ---- CHAT: two systems, two identity types (TEMPLATES — confirm FK names) --
-- UUID system (rooms / chat_messages): membership via room_members, auth.uid()
-- create policy chat_read on public.chat_messages for select to authenticated
--   using (exists (select 1 from public.room_members m
--                  where m.room_id = chat_messages.room_id        -- CONFIRM FK
--                    and m.user_id = (select auth.uid())));        -- CONFIRM uuid col
-- create policy chat_insert on public.chat_messages for insert to authenticated
--   with check (sender_id = (select auth.uid())                   -- CONFIRM sender col
--               and exists (select 1 from public.room_members m
--                           where m.room_id = chat_messages.room_id
--                             and m.user_id = (select auth.uid())));
--
-- LINE-ID system (group_chats / direct_messages): line_id()
-- direct_messages (sender + recipient pair):
-- create policy dm_read on public.direct_messages for select to authenticated
--   using (sender_id = (select public.line_id())                  -- CONFIRM cols
--          or recipient_id = (select public.line_id()));
-- group_chat_messages: membership via group_chat_members, line_id()
-- create policy gc_read on public.group_chat_messages for select to authenticated
--   using (exists (select 1 from public.group_chat_members gm
--                  where gm.group_id = group_chat_messages.group_id  -- CONFIRM FK
--                    and gm.user_id = (select public.line_id())));
