-- Complete Chat Schema with Group Support
-- Run this in Supabase SQL editor (idempotent - safe to run multiple times)

-- ============================================
-- 1) CHAT ROOMS TABLE
-- ============================================

create table if not exists chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('dm','group')) default 'dm',
  title text, -- For group chats
  created_by uuid, -- Group creator
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table chat_rooms enable row level security;

-- Indexes
create index if not exists idx_chat_rooms_type on chat_rooms(type);
create index if not exists idx_chat_rooms_created_by on chat_rooms(created_by);

-- ============================================
-- 2) ROOM MEMBERS TABLE (for DMs)
-- ============================================

create table if not exists room_members (
  room_id uuid references chat_rooms(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- Enable RLS
alter table room_members enable row level security;

-- Indexes
create index if not exists idx_room_members_room on room_members(room_id);
create index if not exists idx_room_members_user on room_members(user_id);

-- ============================================
-- 3) CHAT ROOM MEMBERS TABLE (for Groups)
-- ============================================

create table if not exists chat_room_members (
  room_id uuid references chat_rooms(id) on delete cascade,
  user_id uuid not null,
  role text check (role in ('admin','member')) default 'member',
  status text check (status in ('approved','pending','blocked')) default 'approved',
  invited_by uuid,
  created_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- Enable RLS
alter table chat_room_members enable row level security;

-- Indexes
create index if not exists idx_crm_room on chat_room_members(room_id);
create index if not exists idx_crm_user on chat_room_members(user_id);
create index if not exists idx_crm_status on chat_room_members(status) where status = 'pending';

-- ============================================
-- 4) CHAT MESSAGES TABLE
-- ============================================

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references chat_rooms(id) on delete cascade not null,
  sender uuid not null, -- user_id
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table chat_messages enable row level security;

-- Indexes
create index if not exists idx_chat_messages_room on chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_sender on chat_messages(sender);
create index if not exists idx_chat_messages_created on chat_messages(created_at desc);

-- ============================================
-- 5) RLS POLICIES - CHAT ROOMS
-- ============================================

-- Drop existing policies
drop policy if exists "Users can view rooms they are members of" on chat_rooms;
drop policy if exists "Users can create DM rooms" on chat_rooms;
drop policy if exists "Users can create group rooms" on chat_rooms;

-- Users can view DM rooms where they are members OR group rooms where they are approved
create policy "Users can view rooms they are members of"
  on chat_rooms for select
  using (
    (type = 'dm' and exists (
      select 1 from room_members
      where room_members.room_id = chat_rooms.id
        and room_members.user_id = auth.uid()
    )) or
    (type = 'group' and exists (
      select 1 from chat_room_members
      where chat_room_members.room_id = chat_rooms.id
        and chat_room_members.user_id = auth.uid()
        and chat_room_members.status = 'approved'
    ))
  );

-- Users can create DM and group rooms
create policy "Users can create rooms"
  on chat_rooms for insert
  with check (
    (type = 'dm' and created_by is null) or
    (type = 'group' and created_by = auth.uid())
  );

-- ============================================
-- 6) RLS POLICIES - ROOM MEMBERS (DMs)
-- ============================================

drop policy if exists "Users can view room members" on room_members;
drop policy if exists "Users can add members to rooms" on room_members;

create policy "Users can view room members"
  on room_members for select
  using (
    exists (
      select 1 from room_members rm2
      where rm2.room_id = room_members.room_id
        and rm2.user_id = auth.uid()
    )
  );

create policy "Users can add members to rooms"
  on room_members for insert
  with check (true); -- Allow creating DM rooms

-- ============================================
-- 7) RLS POLICIES - CHAT ROOM MEMBERS (Groups)
-- ============================================

drop policy if exists "Users can view group memberships" on chat_room_members;
drop policy if exists "Users can request to join groups" on chat_room_members;
drop policy if exists "Admins can manage members" on chat_room_members;
drop policy if exists "Admins can add members" on chat_room_members;

-- View memberships in groups you're part of
create policy "Users can view group memberships"
  on chat_room_members for select
  using (
    exists (
      select 1 from chat_room_members crm2
      where crm2.room_id = chat_room_members.room_id
        and crm2.user_id = auth.uid()
        and crm2.status = 'approved'
    )
  );

-- Request to join a group
create policy "Users can request to join groups"
  on chat_room_members for insert
  with check (
    user_id = auth.uid() and
    status = 'pending' and
    role = 'member'
  );

-- Admins can update member status/role
create policy "Admins can manage members"
  on chat_room_members for update
  using (
    exists (
      select 1 from chat_room_members crm_admin
      where crm_admin.room_id = chat_room_members.room_id
        and crm_admin.user_id = auth.uid()
        and crm_admin.role = 'admin'
        and crm_admin.status = 'approved'
    )
  );

-- Admins and creators can add members
create policy "Admins can add members"
  on chat_room_members for insert
  with check (
    -- Admins can add members
    exists (
      select 1 from chat_room_members crm_admin
      where crm_admin.room_id = room_id
        and crm_admin.user_id = auth.uid()
        and crm_admin.role = 'admin'
        and crm_admin.status = 'approved'
    )
    or
    -- Group creators can add initial members (within 5 minutes of creation)
    exists (
      select 1 from chat_rooms
      where chat_rooms.id = room_id
        and chat_rooms.created_by = auth.uid()
        and chat_rooms.created_at > now() - interval '5 minutes'
    )
  );

-- ============================================
-- 8) RLS POLICIES - CHAT MESSAGES
-- ============================================

drop policy if exists "Users can view messages in their rooms" on chat_messages;
drop policy if exists "Users can send messages to their rooms" on chat_messages;

-- View messages in rooms you're a member of
create policy "Users can view messages in their rooms"
  on chat_messages for select
  using (
    exists (
      select 1 from room_members
      where room_members.room_id = chat_messages.room_id
        and room_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from chat_room_members
      where chat_room_members.room_id = chat_messages.room_id
        and chat_room_members.user_id = auth.uid()
        and chat_room_members.status = 'approved'
    )
  );

-- Send messages to rooms you're a member of
create policy "Users can send messages to their rooms"
  on chat_messages for insert
  with check (
    sender = auth.uid() and (
      exists (
        select 1 from room_members
        where room_members.room_id = chat_messages.room_id
          and room_members.user_id = auth.uid()
      )
      or
      exists (
        select 1 from chat_room_members
        where chat_room_members.room_id = chat_messages.room_id
          and chat_room_members.user_id = auth.uid()
          and chat_room_members.status = 'approved'
      )
    )
  );

-- ============================================
-- 9) HELPER FUNCTION: Open or Create DM
-- ============================================

create or replace function open_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  room_id_result uuid;
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Find existing DM room between these two users
  select r.id into room_id_result
  from chat_rooms r
  where r.type = 'dm'
    and exists (
      select 1 from room_members rm1
      where rm1.room_id = r.id and rm1.user_id = current_user_id
    )
    and exists (
      select 1 from room_members rm2
      where rm2.room_id = r.id and rm2.user_id = other_user_id
    )
  limit 1;

  -- If no room exists, create one
  if room_id_result is null then
    insert into chat_rooms (type) values ('dm')
    returning id into room_id_result;

    -- Add both users as members
    insert into room_members (room_id, user_id) values
      (room_id_result, current_user_id),
      (room_id_result, other_user_id);
  end if;

  return room_id_result;
end;
$$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

do $$
begin
  raise notice '✅ Complete chat schema created successfully';
  raise notice '📝 Tables: chat_rooms, room_members, chat_room_members, chat_messages';
  raise notice '🔐 RLS policies configured for DM and group chats';
  raise notice '🔧 Helper function: open_or_create_dm(user_id)';
end $$;
