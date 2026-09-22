-- v1334 COURSE <-> SOCIETY LINK (2026-09-23)
-- A society event at a course needs tee-time slots held on the course's tee sheet. The course and the
-- society agree the number here and talk about it in one thread per event.
--   course_event_slots     — how many slots the course holds for the event (+ first tee). One row per event.
--   event_course_messages  — the thread: text, plus structured slot requests / offers and their answers.
-- Sender ids are the SOCIETY id or 'course:<slug>' — never a person's LINE id — so no personal data lands here.
-- Permissive tmp_ posture like the rest of the app (anon select/insert[/update], no delete) until Auth Phase 2.

create table if not exists public.course_event_slots (
  event_id        uuid primary key references public.society_events(id) on delete cascade,
  course_slug     text not null,
  slots_given     integer check (slots_given between 0 and 60),
  first_tee       text check (first_tee ~ '^[0-2][0-9]:[0-5][0-9]$'),
  updated_side    text check (updated_side in ('course','society')),
  updated_by      text,
  updated_by_name text,
  updated_at      timestamptz not null default now()
);

create table if not exists public.event_course_messages (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.society_events(id) on delete cascade,
  course_slug text not null,
  side        text not null check (side in ('course','society')),
  sender_id   text,
  sender_name text,
  kind        text not null default 'text' check (kind in ('text','request','offer','approve','decline','accept','system')),
  qty         integer check (qty between -60 and 60),
  ref_id      uuid,
  body        text check (char_length(body) <= 2000),
  created_at  timestamptz not null default now()
);
create index if not exists event_course_messages_event_idx  on public.event_course_messages (event_id, created_at);
create index if not exists event_course_messages_course_idx on public.event_course_messages (course_slug, created_at);

alter table public.course_event_slots    enable row level security;
alter table public.event_course_messages enable row level security;

drop policy if exists tmp_select on public.course_event_slots;
drop policy if exists tmp_insert on public.course_event_slots;
drop policy if exists tmp_update on public.course_event_slots;
create policy tmp_select on public.course_event_slots for select to anon, authenticated using (true);
create policy tmp_insert on public.course_event_slots for insert to anon, authenticated with check (true);
create policy tmp_update on public.course_event_slots for update to anon, authenticated using (true) with check (true);

drop policy if exists tmp_select on public.event_course_messages;
drop policy if exists tmp_insert on public.event_course_messages;
create policy tmp_select on public.event_course_messages for select to anon, authenticated using (true);
create policy tmp_insert on public.event_course_messages for insert to anon, authenticated with check (true);
-- messages are immutable: no update, no delete

grant select, insert, update on public.course_event_slots to anon, authenticated;
grant select, insert on public.event_course_messages to anon, authenticated;

do $$ begin
  begin alter publication supabase_realtime add table public.course_event_slots; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.event_course_messages; exception when duplicate_object then null; end;
end $$;
