-- Support Reports inbox (Pete 2026-09-14): "create a reports tab … messages from various
-- users from the directory of players korean and English asking why the tee sheet isnt up
-- and running or what about registrations issues and various society questions."
--
-- DELIBERATELY NOT direct_messages: that table carries
-- trigger_new_message_notification -> trigger_line_notification, so every row inserted
-- there fires a LINE push at a real person. A reports queue must never do that, and a
-- seeded test set REALLY must never do that. This table has NO triggers.

create table if not exists public.support_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   text        not null,               -- user_profiles.line_user_id
  reporter_name text        not null,               -- snapshot: directory names change, accounts get deleted
  lang          text        not null default 'en',  -- 'en' | 'ko' — what they wrote in
  category      text        not null default 'other',
  subject       text        not null,
  body          text        not null,
  society_name  text,
  status        text        not null default 'open',
  priority      text        not null default 'normal',
  admin_note    text,
  resolved_at   timestamptz,
  resolved_by   text,
  source        text        not null default 'app', -- seeded rows carry a marker so they can be removed in one statement
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint support_reports_status_ck   check (status   in ('open','in_progress','resolved')),
  constraint support_reports_priority_ck check (priority in ('low','normal','high','urgent')),
  constraint support_reports_category_ck check (category in ('tee_sheet','registration','society','scoring','account','other')),
  constraint support_reports_lang_ck     check (lang     in ('en','ko','th','ja'))
);

create index if not exists support_reports_status_created_idx on public.support_reports (status, created_at desc);
create index if not exists support_reports_created_idx        on public.support_reports (created_at desc);
create index if not exists support_reports_reporter_idx       on public.support_reports (reporter_id);
create index if not exists support_reports_source_idx         on public.support_reports (source);

alter table public.support_reports enable row level security;

-- RLS matches the rest of the app today (anon key + client-side gating; Auth Phase 2 will
-- tighten this along with everything else). Reads/writes are open to the anon role, and the
-- Reports tab itself is admin-only in the client.
do $$
begin
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='support_reports' and p.polname='support_reports_select') then
    create policy support_reports_select on public.support_reports for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='support_reports' and p.polname='support_reports_insert') then
    create policy support_reports_insert on public.support_reports for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='support_reports' and p.polname='support_reports_update') then
    create policy support_reports_update on public.support_reports for update to anon, authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='support_reports' and p.polname='support_reports_delete') then
    create policy support_reports_delete on public.support_reports for delete to anon, authenticated using (true);
  end if;
end $$;

comment on table  public.support_reports        is 'User-reported issues and questions shown in Messages > Reports (admin only). No LINE-notification trigger, on purpose.';
comment on column public.support_reports.source is 'app = a real report. Anything else is a marker for a seeded/imported batch, so it can be deleted in one statement.';
