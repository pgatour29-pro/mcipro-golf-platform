
-- mcipro chat schema + RLS + helper RPC
-- Run this in Supabase SQL editor (on the 'postgres' database).

-- Extensions (usually enabled in Supabase projects)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- SCHEMA ----------------------------------------------------------------------
-- rooms: DM or group. For DMs, slug = 'dm:{min_uuid}:{max_uuid}' (lexicographic)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm','group')),
  slug text unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- participants
create table if not exists public.conversation_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, profile_id)
);

-- messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_rooms_slug on public.rooms (slug);
create index if not exists idx_cp_profile on public.conversation_participants (profile_id);
create index if not exists idx_msgs_room_created on public.chat_messages (room_id, created_at desc);

-- RLS -------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.chat_messages enable row level security;

-- Only participants can see a room
drop policy if exists "rooms_select_if_participant" on public.rooms;
create policy "rooms_select_if_participant"
on public.rooms
for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.room_id = rooms.id and cp.profile_id = auth.uid()
  )
);

-- No direct inserts into rooms from client (creation happens via RPC)
drop policy if exists "rooms_insert_block" on public.rooms;
create policy "rooms_insert_block"
on public.rooms
for insert
to authenticated
with check (false);

-- Participants: members can see themselves
drop policy if exists "cp_select_if_self" on public.conversation_participants;
create policy "cp_select_if_self"
on public.conversation_participants
for select
using (profile_id = auth.uid());

-- Prevent client from inserting memberships directly (done in RPC)
drop policy if exists "cp_insert_block" on public.conversation_participants;
create policy "cp_insert_block"
on public.conversation_participants
for insert
to authenticated
with check (false);

-- Messages: only participants of the room can read
drop policy if exists "msgs_select_if_in_room" on public.chat_messages;
create policy "msgs_select_if_in_room"
on public.chat_messages
for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.room_id = chat_messages.room_id and cp.profile_id = auth.uid()
  )
);

-- Only participants can insert, and only as themselves
drop policy if exists "msgs_insert_if_self_and_member" on public.chat_messages;
create policy "msgs_insert_if_self_and_member"
on public.chat_messages
for insert
to authenticated
with check (
  author_id = auth.uid() and
  exists (
    select 1 from public.conversation_participants cp
    where cp.room_id = chat_messages.room_id and cp.profile_id = auth.uid()
  )
);

-- RPC: ensure_direct_conversation(partner uuid) --------------------------------
-- SECURITY DEFINER so it can create room + participants ignoring RLS.
-- Returns { room_id uuid, slug text }
drop function if exists public.ensure_direct_conversation(partner uuid);
create or replace function public.ensure_direct_conversation(partner uuid)
returns table(room_id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  dm_slug text;
  r_id uuid;
begin
  if partner is null then
    raise exception 'partner cannot be null';
  end if;
  if me is null then
    raise exception 'auth.uid() is null (are you authenticated?)';
  end if;
  if me = partner then
    raise exception 'cannot create a DM with yourself';
  end if;

  -- canonical ordering of uuids for slug
  if me::text < partner::text then
    a := me; b := partner;
  else
    a := partner; b := me;
  end if;
  dm_slug := 'dm:' || a::text || ':' || b::text;

  -- try to find existing
  select id into r_id from public.rooms where slug = dm_slug limit 1;
  if r_id is null then
    -- create
    insert into public.rooms(kind, slug, created_by)
    values ('dm', dm_slug, me)
    returning id into r_id;

    -- add both participants
    insert into public.conversation_participants(room_id, profile_id)
    values (r_id, a), (r_id, b)
    on conflict do nothing;
  end if;

  return query
  select r_id, dm_slug;
end;
$$;

-- Minimal grants so the client can call the RPC
revoke all on function public.ensure_direct_conversation from public;
grant execute on function public.ensure_direct_conversation to authenticated, anon;

-- Helpful view for listing available DM partners (optional; obeys RLS via join)
drop view if exists public.v_my_rooms;
create or replace view public.v_my_rooms as
select r.*
from public.rooms r
where exists (
  select 1 from public.conversation_participants cp
  where cp.room_id = r.id and cp.profile_id = auth.uid()
);

-- END
