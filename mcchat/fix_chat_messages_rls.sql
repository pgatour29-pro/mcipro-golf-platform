
-- Replacement RLS fixes for chat tables (safe & strict)
-- Updated: 2025-10-11T14:17:30.398912Z

-- Ensure RLS is enabled (idempotent)
alter table public.messages enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

-- Messages: only participants of the conversation can SELECT; only participants can INSERT; sender must be auth.uid()
drop policy if exists msg_select_participants on public.messages;
drop policy if exists msg_insert_sender_is_participant on public.messages;

create policy msg_select_participants on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy msg_insert_sender_is_participant on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid() and cp.blocked = false
    )
  );
