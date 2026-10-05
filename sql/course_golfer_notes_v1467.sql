-- v1467 (2026-10-05) Course CRM: the course's own note + VIP flag about one golfer (public/course-crm.js).
-- venue = CourseLink venue key ('burapha', 'pattaya-country'); golfer_key = 'id:<account id>' or 'n:<normalised name>'.
-- Same browser posture as the other pro shop tables (tmp_ policies, no DELETE). Rollback: drop table public.course_golfer_notes;
create table if not exists public.course_golfer_notes (
    venue        text not null,
    golfer_key   text not null,
    golfer_name  text,
    note         text not null default '' check (char_length(note) <= 2000),
    vip          boolean not null default false,
    updated_at   timestamptz not null default now(),
    primary key (venue, golfer_key)
);
alter table public.course_golfer_notes enable row level security;
drop policy if exists tmp_select on public.course_golfer_notes;
drop policy if exists tmp_insert on public.course_golfer_notes;
drop policy if exists tmp_update on public.course_golfer_notes;
create policy tmp_select on public.course_golfer_notes for select to anon, authenticated using (true);
create policy tmp_insert on public.course_golfer_notes for insert to anon, authenticated with check (true);
create policy tmp_update on public.course_golfer_notes for update to anon, authenticated using (true) with check (true);
grant select, insert, update on public.course_golfer_notes to anon, authenticated;
