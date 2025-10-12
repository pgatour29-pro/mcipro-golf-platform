-- =====================================================================
-- COMPREHENSIVE CHAT SYSTEM SCHEMA FOR MYCADDYPRO
-- =====================================================================
-- Date: 2025-10-11
-- Features: 1:1 & group chats, typing indicators, presence, read receipts,
--           media uploads, message threading, admin roles, push notifications
-- =====================================================================

-- 1. Extensions (if not enabled)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Core entities
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean not null default false,
  title text, -- group title; null for 1:1
  avatar_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- 'member' | 'admin'
  joined_at timestamptz not null default now(),
  muted_until timestamptz, -- nullable; if set, suppress push until time
  blocked boolean not null default false,
  primary key (conversation_id, user_id)
);

-- prevent duplicate 1:1 conversations (optional convenience view/function later)
create unique index if not exists idx_uniq_direct_chat
on public.conversation_participants (least(conversation_id, conversation_id), greatest(conversation_id, conversation_id))
where false; -- placeholder so planner keeps index name; actual de-dup done in function below

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text,              -- cached sender display_name for performance
  type text not null default 'text', -- 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'system'
  body text,                     -- for text/system
  metadata jsonb not null default '{}'::jsonb, -- dimensions, durations, mime, etc.
  reply_to uuid references public.messages(id) on delete set null, -- threaded reply
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  -- delivery state fan-out is by receipts table; also store a server-side state for convenience
  server_state text not null default 'sent' -- 'sent' | 'delivered' | 'read'
);

create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at desc);

-- per-user receipts (delivery/read)
create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);

-- per-user read cursor per conversation (fast badge counts)
create table if not exists public.read_cursors (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch',
  primary key (conversation_id, user_id)
);

-- typing indicators (ephemeral; auto-expire cleanup job recommended)
create table if not exists public.typing_events (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 seconds')
);
create index if not exists idx_typing_expiry on public.typing_events(expires_at);

-- push tokens for notifications
create table if not exists public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null, -- 'ios' | 'android' | 'web'
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- storage references (we store files in Supabase Storage; metadata holds the path)
-- optional table if you prefer normalized attachments
create table if not exists public.attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- 3. Triggers for updated_at and last_message_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute procedure public.set_updated_at();

-- last_message_at maintenance
create or replace function public.bump_last_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        updated_at = now()
  where id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists trg_messages_bump on public.messages;
create trigger trg_messages_bump
after insert on public.messages
for each row execute procedure public.bump_last_message();

-- auto-create receipts for all participants except sender
create or replace function public.init_receipts()
returns trigger language plpgsql as $$
begin
  insert into public.message_receipts(message_id, user_id, delivered_at)
  select new.id, cp.user_id, case when cp.user_id = new.sender_id then new.created_at else null end
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists trg_messages_receipts on public.messages;
create trigger trg_messages_receipts
after insert on public.messages
for each row execute procedure public.init_receipts();

-- 4. RLS: enable and secure
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.read_cursors enable row level security;
alter table public.typing_events enable row level security;
alter table public.push_tokens enable row level security;
alter table public.attachments enable row level security;

-- profiles: user can select own; everyone can read minimal
drop policy if exists "profiles_self_rw" on public.profiles;
create policy "profiles_self_rw" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select using (true);

-- conversations: visible to participants only
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );
drop policy if exists "conversations_insert_by_member" on public.conversations;
create policy "conversations_insert_by_member" on public.conversations
  for insert with check (auth.uid() = created_by);
drop policy if exists "conversations_update_admin" on public.conversations;
create policy "conversations_update_admin" on public.conversations
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid() and cp.role in ('admin')
    )
  );

-- participants: only participant or admin can see/modify
drop policy if exists "cp_select_member" on public.conversation_participants;
create policy "cp_select_member" on public.conversation_participants
  for select using (
    user_id = auth.uid() or exists (
      select 1 from public.conversation_participants x
      where x.conversation_id = conversation_participants.conversation_id
        and x.user_id = auth.uid()
    )
  );
drop policy if exists "cp_insert_admin_or_self" on public.conversation_participants;
create policy "cp_insert_admin_or_self" on public.conversation_participants
  for insert with check (
    auth.uid() = user_id or exists (
      select 1 from public.conversation_participants x
      where x.conversation_id = conversation_id and x.user_id = auth.uid() and x.role = 'admin'
    )
  );
drop policy if exists "cp_update_self_or_admin" on public.conversation_participants;
create policy "cp_update_self_or_admin" on public.conversation_participants
  for update using (
    auth.uid() = user_id or exists (
      select 1 from public.conversation_participants x
      where x.conversation_id = conversation_id and x.user_id = auth.uid() and x.role = 'admin'
    )
  );

-- messages: participant can read; sender can insert; sender or admin can soft-delete/edit
drop policy if exists "msg_select_participants" on public.messages;
create policy "msg_select_participants" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );
drop policy if exists "msg_insert_sender_is_participant" on public.messages;
create policy "msg_insert_sender_is_participant" on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid() and cp.blocked = false
    )
  );
drop policy if exists "msg_update_edit_delete" on public.messages;
create policy "msg_update_edit_delete" on public.messages
  for update using (
    sender_id = auth.uid() or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid() and cp.role = 'admin'
    )
  );

-- receipts: each user can see/update their row
drop policy if exists "rcpt_self_rw" on public.message_receipts;
drop policy if exists "rcpt_self_select" on public.message_receipts;
create policy "rcpt_self_select" on public.message_receipts
  for select using (user_id = auth.uid());
drop policy if exists "rcpt_self_update" on public.message_receipts;
create policy "rcpt_self_update" on public.message_receipts
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- read cursors: each user manages own
drop policy if exists "cursor_self_rw" on public.read_cursors;
create policy "cursor_self_rw" on public.read_cursors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- typing events: user can upsert own; visible to convo participants
drop policy if exists "typing_select_participants" on public.typing_events;
create policy "typing_select_participants" on public.typing_events
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = typing_events.conversation_id and cp.user_id = auth.uid()
    )
  );
drop policy if exists "typing_self_write" on public.typing_events;
create policy "typing_self_write" on public.typing_events
  for insert with check (user_id = auth.uid())
  ;
drop policy if exists "typing_delete_self" on public.typing_events;
create policy "typing_delete_self" on public.typing_events
  for delete using (user_id = auth.uid());

-- push tokens: each user manages their own tokens
drop policy if exists "push_tokens_self" on public.push_tokens;
create policy "push_tokens_self" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- attachments: participant read; uploader write
drop policy if exists "att_select_participants" on public.attachments;
create policy "att_select_participants" on public.attachments
  for select using (
    exists (
      select 1 from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = attachments.message_id and cp.user_id = auth.uid()
    )
  );
drop policy if exists "att_insert_sender" on public.attachments;
create policy "att_insert_sender" on public.attachments
  for insert with check (
    exists (
      select 1 from public.messages m where m.id = attachments.message_id and m.sender_id = auth.uid()
    )
  );

-- 5. Helper function: ensure a direct 1:1 conversation (idempotent)
create or replace function public.ensure_direct_conversation(a uuid, b uuid)
returns uuid language plpgsql as $$
declare convo uuid;
begin
  if a = b then raise exception 'Cannot create direct conversation with self'; end if;
  -- try find existing conversation with exactly two participants a & b and is_group=false
  select c.id into convo
  from public.conversations c
  join public.conversation_participants p1 on p1.conversation_id = c.id and p1.user_id = a
  join public.conversation_participants p2 on p2.conversation_id = c.id and p2.user_id = b
  where c.is_group = false
  group by c.id
  having count(*) = 2
  limit 1;

  if convo is not null then return convo; end if;

  insert into public.conversations(is_group, created_by)
  values(false, a)
  returning id into convo;

  insert into public.conversation_participants(conversation_id, user_id, role)
  values (convo, a, 'admin'), (convo, b, 'member');

  return convo;
end; $$;

-- 6. Cleanup job suggestion: typing expiry (run via pg_cron or external)
-- delete from public.typing_events where expires_at < now();

-- =====================================================================
-- MIGRATION NOTE: Sync existing user_profiles to profiles table
-- =====================================================================
-- Run after schema creation:
-- insert into public.profiles (id, display_name, avatar_url)
-- select id, name as display_name, profile_data->>'linePictureUrl' as avatar_url
-- from auth.users u
-- left join user_profiles up on up.line_user_id = u.id
-- on conflict (id) do nothing;

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
