
-- MciPro Chat: Permanent Fix Pack (Rooms/Participants/Messages + RLS + RPC)
-- Run this whole file in Supabase SQL editor.

-- =========
-- PREREQS
-- =========
-- Assumes profiles.id = auth.users.id (UUID)
-- profiles has unique line_user_id already (optional but recommended)

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm','group')),
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rooms_slug on public.rooms(slug);
create index if not exists idx_msgs_room_created on public.chat_messages(room_id, created_at desc);

alter table public.rooms enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.chat_messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.rooms, public.conversation_participants, public.chat_messages to authenticated;

drop policy if exists cp_select on public.conversation_participants;
create policy cp_select on public.conversation_participants
for select to authenticated
using (profile_id = auth.uid());

drop policy if exists cp_insert on public.conversation_participants;
create policy cp_insert on public.conversation_participants
for insert to authenticated
with check (profile_id = auth.uid());

drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
for select to authenticated
using (exists (
  select 1 from public.conversation_participants cp
  where cp.room_id = rooms.id and cp.profile_id = auth.uid()
));

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists msgs_select on public.chat_messages;
create policy msgs_select on public.chat_messages
for select to authenticated
using (exists (
  select 1 from public.conversation_participants cp
  where cp.room_id = chat_messages.room_id and cp.profile_id = auth.uid()
));

drop policy if exists msgs_insert on public.chat_messages;
create policy msgs_insert on public.chat_messages
for insert to authenticated
with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversation_participants cp
    where cp.room_id = chat_messages.room_id and cp.profile_id = auth.uid()
  )
);

create or replace function public.ensure_direct_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  a uuid;
  b uuid;
  s text;
  r_id uuid;
begin
  if caller is null then
    raise exception 'auth.uid() is null';
  end if;

  if not exists (select 1 from public.profiles p where p.id = caller) then
    raise exception 'caller profile missing';
  end if;
  if not exists (select 1 from public.profiles p where p.id = other_user) then
    raise exception 'other profile missing';
  end if;

  if caller < other_user then
    a := caller; b := other_user;
  else
    a := other_user; b := caller;
  end if;
  s := 'dm:' || a::text || ':' || b::text;

  select id into r_id from public.rooms where slug = s;
  if r_id is null then
    insert into public.rooms(kind, slug, created_by)
    values ('dm', s, caller)
    returning id into r_id;

    insert into public.conversation_participants(room_id, profile_id)
    values (r_id, caller)
    on conflict do nothing;

    insert into public.conversation_participants(room_id, profile_id)
    values (r_id, other_user)
    on conflict do nothing;
  else
    insert into public.conversation_participants(room_id, profile_id)
    values (r_id, caller)
    on conflict do nothing;

    insert into public.conversation_participants(room_id, profile_id)
    values (r_id, other_user)
    on conflict do nothing;
  end if;

  return r_id;
end;
$$;

grant execute on function public.ensure_direct_conversation(uuid) to authenticated;

-- OPTIONAL clean-up of bogus placeholder rooms from earlier attempts:
-- delete from public.rooms where slug like 'dm:a1111111-1111-1111-1111-111111111111:%'
--   or slug like 'dm:%:a1111111-1111-1111-1111-111111111111';
