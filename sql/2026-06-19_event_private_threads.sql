-- Event private threads (2026-06-19)
-- A private 1:1 thread per (event, player) between that player and the event's
-- organizer — for questions, kept OFF the public notice board. Both sides post
-- (sender_line_id distinguishes). A thread is keyed by (event_id, player_line_id);
-- the organizer side is "whoever manages the event" (no organizer id stored).
-- Access mirrors event_group_messages (permissive RLS; UI scopes who sees what.
-- True RLS-enforced privacy lands with the broader Phase-2 lockdown).

create table if not exists public.event_private_messages (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null,
  player_line_id text not null,   -- the player who owns this thread
  sender_line_id text not null,   -- who sent THIS message (the player, or an organizer)
  sender_name    text,
  message        text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_epm_thread on public.event_private_messages(event_id, player_line_id, created_at);
create index if not exists idx_epm_event  on public.event_private_messages(event_id);

create table if not exists public.event_private_reads (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null,
  player_line_id text not null,
  reader_line_id text not null,   -- the viewer (the player, or an organizer)
  last_read_at   timestamptz not null default now(),
  unique (event_id, player_line_id, reader_line_id)
);
create index if not exists idx_epr_reader on public.event_private_reads(reader_line_id);
create index if not exists idx_epr_thread on public.event_private_reads(event_id, player_line_id);

alter table public.event_private_messages enable row level security;
alter table public.event_private_reads    enable row level security;

drop policy if exists epm_select on public.event_private_messages;
drop policy if exists epm_insert on public.event_private_messages;
drop policy if exists epm_update on public.event_private_messages;
create policy epm_select on public.event_private_messages for select to anon, authenticated using (true);
create policy epm_insert on public.event_private_messages for insert to anon, authenticated with check (true);
create policy epm_update on public.event_private_messages for update to anon, authenticated using (true) with check (true);

drop policy if exists epr_select on public.event_private_reads;
drop policy if exists epr_insert on public.event_private_reads;
drop policy if exists epr_update on public.event_private_reads;
create policy epr_select on public.event_private_reads for select to anon, authenticated using (true);
create policy epr_insert on public.event_private_reads for insert to anon, authenticated with check (true);
create policy epr_update on public.event_private_reads for update to anon, authenticated using (true) with check (true);
