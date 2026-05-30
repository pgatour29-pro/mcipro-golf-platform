-- ============================================================================
-- Chat policies + room_members correction + admin claim helper
-- Apply with the post-Phase-C batch.
-- ============================================================================
-- MyCaddiPro has TWO chat systems with DIFFERENT identity types:
--   UUID system  (rooms / chat_messages / room_members) -> auth.uid()
--   LINE system  (group_chats / group_chat_* / direct_messages) -> line_id()
--
-- *** UUID-SYSTEM ALIGNMENT PRECONDITION ***
-- auth.uid() = the minted sub = app_users.id (freshly generated). The UUID chat
-- policies only match existing rows if room_members.user_id / chat_messages.sender
-- store THAT uuid. If those tables already hold data keyed on a different user
-- uuid, DO NOT apply the UUID-system block until app_users.id is aligned to it
-- (or the tables are empty). Confirm row counts / the referenced id first.
-- ============================================================================


-- ---- CORRECTION: room_members was wrongly placed in C1 (line_id/text). Its
-- user_id is UUID, so it must use auth.uid(). Drop the C1 policies, re-create.
drop policy if exists own_select on public.room_members;
drop policy if exists own_insert on public.room_members;
drop policy if exists own_update on public.room_members;
create policy rm_select on public.room_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy rm_insert on public.room_members for insert to authenticated
  with check (user_id = (select auth.uid()));


-- ---- UUID SYSTEM: chat_messages (room_id uuid, sender uuid) -----------------
drop policy if exists tmp_select on public.chat_messages;
drop policy if exists tmp_insert on public.chat_messages;
drop policy if exists tmp_update on public.chat_messages;
create policy cm_read on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.room_members m
    where m.room_id = chat_messages.room_id
      and m.user_id = (select auth.uid())
  ));
create policy cm_insert on public.chat_messages for insert to authenticated
  with check (
    sender = (select auth.uid())
    and exists (select 1 from public.room_members m
                where m.room_id = chat_messages.room_id
                  and m.user_id = (select auth.uid()))
  );
create policy cm_update on public.chat_messages for update to authenticated
  using (sender = (select auth.uid()))
  with check (sender = (select auth.uid()));


-- ---- LINE SYSTEM: group_chat_members (group_id uuid, member_line_id text) --
drop policy if exists tmp_select on public.group_chat_members;
drop policy if exists tmp_insert on public.group_chat_members;
drop policy if exists tmp_update on public.group_chat_members;
create policy gcm_select on public.group_chat_members for select to authenticated
  using (member_line_id = (select public.line_id()));
create policy gcm_insert on public.group_chat_members for insert to authenticated
  with check (member_line_id = (select public.line_id()));

-- group_chat_messages (group_id uuid, sender_line_id text)
drop policy if exists tmp_select on public.group_chat_messages;
drop policy if exists tmp_insert on public.group_chat_messages;
drop policy if exists tmp_update on public.group_chat_messages;
create policy gcmsg_read on public.group_chat_messages for select to authenticated
  using (exists (
    select 1 from public.group_chat_members m
    where m.group_id = group_chat_messages.group_id
      and m.member_line_id = (select public.line_id())
  ));
create policy gcmsg_insert on public.group_chat_messages for insert to authenticated
  with check (
    sender_line_id = (select public.line_id())
    and exists (select 1 from public.group_chat_members m
                where m.group_id = group_chat_messages.group_id
                  and m.member_line_id = (select public.line_id()))
  );
create policy gcmsg_update on public.group_chat_messages for update to authenticated
  using (sender_line_id = (select public.line_id()))
  with check (sender_line_id = (select public.line_id()));

-- direct_messages (sender_line_id text, recipient_line_id text)
drop policy if exists tmp_select on public.direct_messages;
drop policy if exists tmp_insert on public.direct_messages;
drop policy if exists tmp_update on public.direct_messages;
create policy dm_read on public.direct_messages for select to authenticated
  using (sender_line_id = (select public.line_id())
         or recipient_line_id = (select public.line_id()));
create policy dm_insert on public.direct_messages for insert to authenticated
  with check (sender_line_id = (select public.line_id()));
-- DMs are typically immutable; no update policy. Add one only if you allow edits.


-- ---- ADMIN claim helper (enables the verify-admin-pin flow) -----------------
-- admin_courses is a JSONB array of course ids in the admin token. ? tests array
-- membership. course_id is uuid on caddy_bookings -> cast to text for the test.
create or replace function public.is_course_admin(p_course_id text)
returns boolean
language sql stable set search_path = public
as $$
  select coalesce((auth.jwt() -> 'admin_courses') ? p_course_id, false);
$$;
revoke all on function public.is_course_admin(text) from public, anon;
grant execute on function public.is_course_admin(text) to authenticated;

-- To let admins see/manage bookings, append to bk_read / bk_update in the
-- corrected booking block:
--   or public.is_course_admin(course_id::text)


-- ---- Remaining chat read-state tables (VERIFY identity type before applying)
-- group_chat_reads, group_chats, rooms, event_group_messages, event_message_reads,
-- conversation_participants, chat_room_members, and the C1 ephemera
-- (read_cursors, typing_events, message_receipts, condition_likes):
-- check whether each identity column is uuid (-> auth.uid()) or text (-> line_id())
-- and apply the matching membership/owner shape. Do NOT assume text.
