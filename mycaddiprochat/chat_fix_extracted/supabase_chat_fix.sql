-- ===============================================
-- Supabase Chat Fix Bundle
-- Creates correct RLS + RPC for direct messages
-- ===============================================

-- 0) PREREQS -------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create unique index if not exists uq_conv_participant on public.conversation_participants(conversation_id, user_id);
create index if not exists idx_messages_conv on public.messages(conversation_id);

-- 1) RLS POLICIES -------------------------------------------

-- CONVERSATIONS: I can see conversations I participate in
drop policy if exists conv_select_mine on public.conversations;
create policy conv_select_mine
on public.conversations
for select
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversations.id
      and cp.user_id = auth.uid()
  )
);

-- Allow creating conversations where I’m the creator (optional if you always use the RPC)
drop policy if exists conv_insert_creator on public.conversations;
create policy conv_insert_creator
on public.conversations
for insert
with check (created_by = auth.uid());

-- PARTICIPANTS: I can see rows in conversations I’m in (and the other people in those convs)
drop policy if exists convp_select_mine on public.conversation_participants;
create policy convp_select_mine
on public.conversation_participants
for select
using (
  exists (
    select 1
    from public.conversation_participants me
    where me.conversation_id = conversation_participants.conversation_id
      and me.user_id = auth.uid()
  )
);

-- Allow me to insert *my* participant row
drop policy if exists convp_insert_self on public.conversation_participants;
create policy convp_insert_self
on public.conversation_participants
for insert
with check (user_id = auth.uid());

-- MESSAGES: read messages in my conversations
drop policy if exists msg_select_mine on public.messages;
create policy msg_select_mine
on public.messages
for select
using (
  exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

-- MESSAGES: post messages to convs I’m in; message.user_id must be me
drop policy if exists msg_insert_self_in_conv on public.messages;
create policy msg_insert_self_in_conv
on public.messages
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = auth.uid()
  )
);

-- 2) RPC: ensure_direct_conversation ------------------------

drop function if exists public.ensure_direct_conversation(p_user_id uuid, p_other_user_id uuid);

create or replace function public.ensure_direct_conversation(p_user_id uuid, p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_conv_id uuid;
begin
  -- Safety: caller must be the same as p_user_id
  if v_me is null or v_me <> p_user_id then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_user_id = p_other_user_id then
    raise exception 'cannot DM yourself' using errcode = '22023';
  end if;

  -- Try to find existing direct conversation between the two users
  select c.id
    into v_conv_id
  from conversations c
  where c.type = 'direct'
    and exists (select 1 from conversation_participants cp where cp.conversation_id = c.id and cp.user_id = p_user_id)
    and exists (select 1 from conversation_participants cp where cp.conversation_id = c.id and cp.user_id = p_other_user_id)
  limit 1;

  if v_conv_id is null then
    -- Create conversation
    insert into conversations (id, type, created_by, created_at)
    values (gen_random_uuid(), 'direct', p_user_id, now())
    returning id into v_conv_id;

    -- Add both participants (idempotent)
    insert into conversation_participants (conversation_id, user_id, joined_at)
    values (v_conv_id, p_user_id, now())
    on conflict do nothing;

    insert into conversation_participants (conversation_id, user_id, joined_at)
    values (v_conv_id, p_other_user_id, now())
    on conflict do nothing;
  end if;

  return v_conv_id;
end;
$$;

revoke all on function public.ensure_direct_conversation(uuid, uuid) from public;
grant execute on function public.ensure_direct_conversation(uuid, uuid) to authenticated;

-- END OF FILE
