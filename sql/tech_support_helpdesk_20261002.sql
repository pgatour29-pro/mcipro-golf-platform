-- Tech Support help desk (Pete 2026-10-02): "we need to setup a help desk for user support …
-- i want something upfront on the hamburger menu section that says Tech Support".
--
-- The ticket itself is a public.support_reports row with source = 'app' (the table the
-- Messages > Reports queue already triages). This file adds what a help desk needs on top:
--   1. context        — app version / role / screen / device, captured for the user
--   2. a reply thread — public.support_report_messages (user <-> support, append-only)
--   3. last_reply_*   — who spoke last, so each side can see "new reply" without reading threads
--   4. user_seen_at   — when the reporter last opened the thread (drives their badge)
--
-- STILL NO TRIGGERS on either table, on purpose (see support_reports_20260914.sql): a LINE
-- push is sent by the client for ONE real ticket at a time (source = 'app' only). A seeded
-- batch carries real directory players as reporters and must never push at them.

alter table public.support_reports
  add column if not exists context       jsonb,
  add column if not exists last_reply_at timestamptz,
  add column if not exists last_reply_by text,
  add column if not exists user_seen_at  timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'support_reports_last_reply_by_ck') then
    alter table public.support_reports
      add constraint support_reports_last_reply_by_ck
      check (last_reply_by is null or last_reply_by in ('user','support'));
  end if;
end $$;

create table if not exists public.support_report_messages (
  id         uuid primary key default gen_random_uuid(),
  report_id  uuid        not null references public.support_reports(id) on delete cascade,
  author     text        not null,               -- 'user' = the reporter, 'support' = the help desk
  author_id  text,                               -- who typed it (line_user_id / device id)
  body       text        not null,
  created_at timestamptz not null default now(),
  constraint support_report_messages_author_ck check (author in ('user','support')),
  constraint support_report_messages_body_ck   check (char_length(body) between 1 and 4000)
);

create index if not exists support_report_messages_report_idx
  on public.support_report_messages (report_id, created_at);

alter table public.support_report_messages enable row level security;

-- RLS matches support_reports today (anon key + client-side gating; Auth Phase 2 tightens both
-- together). The thread is append-only: no UPDATE / DELETE policy, so a reply cannot be edited
-- or removed from the browser. Deleting the ticket removes its thread (FK cascade).
do $$
begin
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='support_report_messages' and p.polname='support_report_messages_select') then
    create policy support_report_messages_select on public.support_report_messages for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='support_report_messages' and p.polname='support_report_messages_insert') then
    create policy support_report_messages_insert on public.support_report_messages for insert to anon, authenticated with check (true);
  end if;
end $$;

grant select, insert on public.support_report_messages to anon, authenticated;

comment on table  public.support_report_messages      is 'Reply thread of a Tech Support ticket (support_reports). Append-only. No LINE-notification trigger, on purpose.';
comment on column public.support_reports.context      is 'Captured by the app when the ticket is sent: app version, role, screen, device. Never typed by the user.';
comment on column public.support_reports.user_seen_at is 'When the reporter last opened the thread. A support reply newer than this = unread for them.';
