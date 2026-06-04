-- ============================================================================
-- Auth alignment: profiles.auth_user_id mapping, access-token hook, claim helper,
-- and the UUID-policy patch so policies key off the profile_id CLAIM (not
-- auth.uid(), which won't equal profiles.id).
-- ============================================================================

-- 1. Map each canonical profile to its Supabase Auth user.
alter table public.profiles add column if not exists auth_user_id uuid unique;

-- 2. Custom Access Token Hook — runs on every token issuance. Maps the auth user
--    to its canonical profile and injects profile_id + line_id claims. This is
--    what makes auth work WITHOUT forcing auth.users.id = profiles.id.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  p_id uuid;
  p_line text;
begin
  select id, line_user_id into p_id, p_line
  from public.profiles
  where auth_user_id = (event ->> 'user_id')::uuid;

  if p_id is not null then
    claims := jsonb_set(claims, '{profile_id}', to_jsonb(p_id));
    claims := jsonb_set(claims, '{line_id}',    to_jsonb(p_line));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
-- Register it: Dashboard -> Authentication -> Hooks -> Custom Access Token.

-- 3. Claim helpers used by policies.
create or replace function public.current_profile_id()
returns uuid language sql stable set search_path = public
as $$ select nullif(auth.jwt() ->> 'profile_id', '')::uuid $$;
-- public.line_id() already exists and reads the line_id claim — unchanged.


-- ============================================================================
-- 4. PATCH the UUID-keyed policies: replace auth.uid() with current_profile_id().
--    (auth.uid() returns the auth-user id, which is NOT profiles.id. The claim is.)
--    Run this INSTEAD OF the auth.uid() versions in c1-split.sql / chat-policies.sql.
-- ============================================================================

-- C1 UUID group
do $$
declare t text;
  uuid_tables text[] := array[
    'chat_devices','chat_room_members','message_receipts','notifications',
    'push_tokens','read_cursors','support_tickets','typing_events','user_preferences'
  ];
begin
  foreach t in array uuid_tables loop
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id = (select public.current_profile_id()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id = (select public.current_profile_id()))', t);
    execute format('create policy own_update on public.%I for update to authenticated using (user_id = (select public.current_profile_id())) with check (user_id = (select public.current_profile_id()))', t);
  end loop;
end $$;

-- room_members
drop policy if exists rm_select on public.room_members;
drop policy if exists rm_insert on public.room_members;
create policy rm_select on public.room_members for select to authenticated
  using (user_id = (select public.current_profile_id()));
create policy rm_insert on public.room_members for insert to authenticated
  with check (user_id = (select public.current_profile_id()));

-- chat_messages
drop policy if exists cm_read on public.chat_messages;
drop policy if exists cm_insert on public.chat_messages;
drop policy if exists cm_update on public.chat_messages;
create policy cm_read on public.chat_messages for select to authenticated
  using (exists (select 1 from public.room_members m
                 where m.room_id = chat_messages.room_id
                   and m.user_id = (select public.current_profile_id())));
create policy cm_insert on public.chat_messages for insert to authenticated
  with check (sender = (select public.current_profile_id())
              and exists (select 1 from public.room_members m
                          where m.room_id = chat_messages.room_id
                            and m.user_id = (select public.current_profile_id())));
create policy cm_update on public.chat_messages for update to authenticated
  using (sender = (select public.current_profile_id()))
  with check (sender = (select public.current_profile_id()));

-- friendships (empty today, but keep consistent)
drop policy if exists friend_read on public.friendships;
drop policy if exists friend_insert on public.friendships;
drop policy if exists friend_update on public.friendships;
create policy friend_read on public.friendships for select to authenticated
  using (user_id = (select public.current_profile_id()) or friend_id = (select public.current_profile_id()));
create policy friend_insert on public.friendships for insert to authenticated
  with check (user_id = (select public.current_profile_id()));
create policy friend_update on public.friendships for update to authenticated
  using (user_id = (select public.current_profile_id()) or friend_id = (select public.current_profile_id()));

-- NOTE: text-keyed (line_id) policies are unchanged — line_id() still works.
-- is_course_admin() (admin_courses claim) is unchanged.
