-- Migration: Add Group Chat Support
-- Run this in Supabase SQL editor (idempotent - safe to run multiple times)

-- 1) Add columns to chat_rooms for group support
alter table chat_rooms
  add column if not exists type text check (type in ('dm','group')) default 'dm',
  add column if not exists title text,
  add column if not exists created_by uuid;

-- 2) Create chat_room_members table for memberships
create table if not exists chat_room_members (
  room_id uuid references chat_rooms(id) on delete cascade,
  user_id uuid not null,
  role text check (role in ('admin','member')) default 'member',
  status text check (status in ('approved','pending','blocked')) default 'approved',
  invited_by uuid,
  created_at timestamptz default now(),
  primary key (room_id, user_id)
);

-- 3) Create indexes for performance
create index if not exists idx_crm_room on chat_room_members(room_id);
create index if not exists idx_crm_user on chat_room_members(user_id);
create index if not exists idx_crm_status on chat_room_members(status) where status = 'pending';

-- 4) RLS Policies for chat_room_members
alter table chat_room_members enable row level security;

-- Allow users to view memberships in rooms they're part of
create policy if not exists "Users can view room memberships where they are members"
  on chat_room_members for select
  using (
    exists (
      select 1 from chat_room_members crm2
      where crm2.room_id = chat_room_members.room_id
        and crm2.user_id = auth.uid()
        and crm2.status = 'approved'
    )
  );

-- Allow users to request to join a room (insert pending)
create policy if not exists "Users can request to join rooms"
  on chat_room_members for insert
  with check (
    user_id = auth.uid() and
    status = 'pending' and
    role = 'member'
  );

-- Allow room admins to update member status and role
create policy if not exists "Admins can manage room members"
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

-- Allow room creators/admins to add members directly
create policy if not exists "Admins can add members to rooms"
  on chat_room_members for insert
  with check (
    exists (
      select 1 from chat_room_members crm_admin
      where crm_admin.room_id = room_id
        and crm_admin.user_id = auth.uid()
        and crm_admin.role = 'admin'
        and crm_admin.status = 'approved'
    )
    or
    -- Allow creator to add initial members when creating group
    exists (
      select 1 from chat_rooms
      where chat_rooms.id = room_id
        and chat_rooms.created_by = auth.uid()
        and chat_rooms.created_at > now() - interval '5 minutes'
    )
  );

-- 5) Update existing chat_rooms RLS to handle group permissions
-- Users can view rooms where they are approved members
drop policy if exists "Users can view rooms they are members of" on chat_rooms;
create policy "Users can view rooms they are members of"
  on chat_rooms for select
  using (
    -- DM rooms: existing logic using room_members or direct participants
    (type = 'dm' and (
      exists (
        select 1 from room_members
        where room_members.room_id = chat_rooms.id
          and room_members.user_id = auth.uid()
      )
    )) or
    -- Group rooms: check chat_room_members
    (type = 'group' and (
      exists (
        select 1 from chat_room_members
        where chat_room_members.room_id = chat_rooms.id
          and chat_room_members.user_id = auth.uid()
          and chat_room_members.status = 'approved'
      )
    ))
  );

-- 6) Allow users to create group rooms
create policy if not exists "Users can create group rooms"
  on chat_rooms for insert
  with check (
    type = 'group' and
    created_by = auth.uid()
  );

-- Success message
do $$
begin
  raise notice '✅ Group chat migration completed successfully';
end $$;
