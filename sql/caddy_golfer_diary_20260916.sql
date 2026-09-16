-- GOLFER DIARY (v1212, 2026-09-16) — Pete: "a new tab for customers/golfers… a 'Diary' type of
-- record keeping… check box options with 10 things that a golfer likes and a barometer on the
-- golfer's profile… this data can be shared amongst the caddies network for that golf course."
--
-- ONE row per golfer per FACILITY (caddy_golfer_diary) holding the 10 preference ticks (prefs
-- jsonb, each key 'a' | 'b' | absent) + a free-text summary, and dated entries from any caddy at
-- that course (caddy_golfer_diary_notes). facility_key = the same first-two-words fold the roster
-- uses (Khao Kheow A/B/C share one diary), slugged for realtime-safe filtering.
--
-- RLS mirrors the sibling caddy tables (caddy_room_messages etc.): the browser runs on the anon
-- key and course-scoping is done by the client on facility_key. Both tables go into the realtime
-- publication so two caddies on the same golfer see each other's ticks live.

create table if not exists public.caddy_golfer_diary (
    id                uuid primary key default gen_random_uuid(),
    facility_key      text not null,
    course_name       text,
    golfer_id         text,                 -- user_profiles.line_user_id when known (directory / bookings)
    golfer_name       text not null,
    prefs             jsonb not null default '{}'::jsonb,
    summary           text,
    created_by        text,
    created_by_name   text,
    created_by_number text,
    updated_by        text,
    updated_by_name   text,
    updated_by_number text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- a golfer with an account appears ONCE per facility; name-only walk-ons are guarded client-side
create unique index if not exists caddy_golfer_diary_facility_golfer_uq
    on public.caddy_golfer_diary (facility_key, golfer_id) where golfer_id is not null;
create index if not exists caddy_golfer_diary_facility_idx
    on public.caddy_golfer_diary (facility_key, updated_at desc);

create table if not exists public.caddy_golfer_diary_notes (
    id            uuid primary key default gen_random_uuid(),
    diary_id      uuid not null references public.caddy_golfer_diary(id) on delete cascade,
    facility_key  text not null,
    note          text not null,
    round_date    date,
    author_id     text,
    author_name   text,
    author_number text,
    created_at    timestamptz not null default now()
);
create index if not exists caddy_golfer_diary_notes_diary_idx
    on public.caddy_golfer_diary_notes (diary_id, created_at desc);

alter table public.caddy_golfer_diary enable row level security;
alter table public.caddy_golfer_diary_notes enable row level security;

drop policy if exists caddy_golfer_diary_all on public.caddy_golfer_diary;
create policy caddy_golfer_diary_all on public.caddy_golfer_diary
    for all to anon, authenticated using (true) with check (true);

drop policy if exists caddy_golfer_diary_notes_all on public.caddy_golfer_diary_notes;
create policy caddy_golfer_diary_notes_all on public.caddy_golfer_diary_notes
    for all to anon, authenticated using (true) with check (true);

-- realtime: a table missing from the publication silently fires nothing (4 prior instances)
do $$
begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'caddy_golfer_diary') then
        alter publication supabase_realtime add table public.caddy_golfer_diary;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'caddy_golfer_diary_notes') then
        alter publication supabase_realtime add table public.caddy_golfer_diary_notes;
    end if;
end $$;
