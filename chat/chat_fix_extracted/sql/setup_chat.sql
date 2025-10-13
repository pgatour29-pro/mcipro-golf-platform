-- setup_chat.sql
-- 1) Core tables
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('dm','group')),
  slug text unique,
  title text,
  created_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  room_id uuid not null references rooms(id) on delete cascade,
  participant_id uuid not null,
  inserted_at timestamptz not null default now(),
  primary key (room_id, participant_id)
);

create table if not exists chat_messages (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- 2) Speed indexes
create index if not exists chat_messages_room_created_idx
  on chat_messages (room_id, created_at desc);

create index if not exists conv_part_participant_idx
  on conversation_participants (participant_id);

-- 3) Profiles linkage
alter table if exists profiles
  add column if not exists line_user_id text;

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='profiles_line_user_id_key'
  ) then
    begin
      create unique index profiles_line_user_id_key on profiles(line_user_id);
    exception when unique_violation then
      raise notice 'Skipped unique index on profiles(line_user_id) due to existing duplicates.';
    end;
  end if;
end$$;

-- 4) Row Level Security
alter table rooms enable row level security;
alter table conversation_participants enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "select rooms I am in" on rooms;
create policy "select rooms I am in" on rooms
  for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.room_id = rooms.id and cp.participant_id = auth.uid()
    )
  );

drop policy if exists "insert rooms" on rooms;
create policy "insert rooms" on rooms
  for insert with check (true);

drop policy if exists "select my participation" on conversation_participants;
create policy "select my participation" on conversation_participants
  for select using (participant_id = auth.uid());

drop policy if exists "insert myself into room" on conversation_participants;
create policy "insert myself into room" on conversation_participants
  for insert with check (participant_id = auth.uid());

drop policy if exists "select msgs in my rooms" on chat_messages;
create policy "select msgs in my rooms" on chat_messages
  for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.room_id = chat_messages.room_id
      and cp.participant_id = auth.uid()
    )
  );

drop policy if exists "insert msgs as me in my rooms" on chat_messages;
create policy "insert msgs as me in my rooms" on chat_messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from conversation_participants cp
      where cp.room_id = chat_messages.room_id
      and cp.participant_id = auth.uid()
    )
  );
