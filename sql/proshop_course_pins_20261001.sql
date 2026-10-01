-- v1431 (2026-10-01) Pro shop course PINs.
-- Pete: a course gets its OWN pro shop PIN; that PIN opens THAT course and nothing else, and the
-- venue cannot be changed from inside a session opened with it. Courses without a PIN keep the
-- shared demo PIN and the pick-once course chooser (v1351).
--
-- The repo is PUBLIC: the PIN values are NOT in this file and never in client code. Rows are
-- written straight to prod (see the vault session catalog). The table is RLS-locked with zero
-- policies; the only way in is the two SECURITY DEFINER functions below.

create table if not exists public.proshop_pins (
    course_id  text primary key references public.courses(id) on update cascade on delete cascade,
    pin        text not null unique check (pin ~ '^[0-9]{6}$' and pin <> '000000'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.proshop_pins enable row level security;
revoke all on public.proshop_pins from public, anon, authenticated;

-- PIN -> the one course it opens. NULL when the PIN belongs to no course.
create or replace function public.proshop_pin_login(p_pin text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object('course_id', c.id, 'course_name', c.name)
    from public.proshop_pins p
    join public.courses c on c.id = p.course_id
    where p.pin = btrim(coalesce(p_pin, ''))
    limit 1
$$;

-- Which courses have their own PIN (ids + names only, never the PINs). The shared-PIN session
-- uses this to keep those venues out of its course chooser.
create or replace function public.proshop_pin_courses()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::jsonb)
    from public.proshop_pins p
    join public.courses c on c.id = p.course_id
$$;

revoke all on function public.proshop_pin_login(text) from public;
revoke all on function public.proshop_pin_courses() from public;
grant execute on function public.proshop_pin_login(text) to anon, authenticated;
grant execute on function public.proshop_pin_courses() to anon, authenticated;
