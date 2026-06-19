-- Event Notice Board (2026-06-19)
-- Organizer-posted, read-only-for-players announcements per society event,
-- with per-notice read tracking (so players dismiss each notice individually).
-- Access mirrors event_group_messages: RLS on + permissive anon/authenticated
-- SELECT/INSERT/UPDATE, no DELETE (consistent with the deletes-blocked posture).

create table if not exists public.event_announcements (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,
  author_line_id text,
  author_name text,
  message     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_event_announcements_event   on public.event_announcements(event_id);
create index if not exists idx_event_announcements_created on public.event_announcements(created_at);

create table if not exists public.event_announcement_reads (
  id             uuid primary key default gen_random_uuid(),
  announcement_id uuid not null,
  reader_line_id text not null,
  read_at        timestamptz not null default now(),
  unique (announcement_id, reader_line_id)
);
create index if not exists idx_event_ann_reads_reader on public.event_announcement_reads(reader_line_id);
create index if not exists idx_event_ann_reads_ann    on public.event_announcement_reads(announcement_id);

alter table public.event_announcements      enable row level security;
alter table public.event_announcement_reads enable row level security;

drop policy if exists ann_select  on public.event_announcements;
drop policy if exists ann_insert  on public.event_announcements;
drop policy if exists ann_update  on public.event_announcements;
create policy ann_select on public.event_announcements for select to anon, authenticated using (true);
create policy ann_insert on public.event_announcements for insert to anon, authenticated with check (true);
create policy ann_update on public.event_announcements for update to anon, authenticated using (true) with check (true);

drop policy if exists annr_select on public.event_announcement_reads;
drop policy if exists annr_insert on public.event_announcement_reads;
drop policy if exists annr_update on public.event_announcement_reads;
create policy annr_select on public.event_announcement_reads for select to anon, authenticated using (true);
create policy annr_insert on public.event_announcement_reads for insert to anon, authenticated with check (true);
create policy annr_update on public.event_announcement_reads for update to anon, authenticated using (true) with check (true);
