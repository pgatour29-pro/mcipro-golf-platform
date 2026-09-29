-- v1408 CADDY DESK (pro shop tee sheet) — Pete 2026-09-29: "more tools and data along with controls for
-- caddy management in the tee sheet module".
--
-- 1. caddy_bookings.started_at / paid_at: "Sent out" and "Paid" timestamps. The status CHECK has no
--    'in_progress' (pending|confirmed|completed|cancelled|no_show), so the caddy master's old Start button
--    (status 'in_progress') was refused by the database every time. Out on course = started_at set and the
--    job not completed; status stays 'confirmed' so every existing confirmed-filter keeps seeing the job.
-- 2. caddy_checkins: one row per caddy per day when she arrives at the course. Read-only to the browser;
--    written only through caddy_checkin_set() (unique caddy+day enforced by the table).

alter table public.caddy_bookings add column if not exists started_at timestamptz;
alter table public.caddy_bookings add column if not exists paid_at timestamptz;

create table if not exists public.caddy_checkins (
    id             uuid primary key default gen_random_uuid(),
    caddy_id       uuid not null references public.caddy_profiles(id) on delete cascade,
    check_date     date not null,
    course_id      text,
    course_name    text,
    checked_in_at  timestamptz not null default now(),
    by_label       text,
    unique (caddy_id, check_date)
);
create index if not exists caddy_checkins_date_idx on public.caddy_checkins (check_date);

alter table public.caddy_checkins enable row level security;
drop policy if exists caddy_checkins_select on public.caddy_checkins;
create policy caddy_checkins_select on public.caddy_checkins for select to anon, authenticated using (true);

-- p_in true = checked in (idempotent: the first arrival time is kept), false = undo (row removed).
create or replace function public.caddy_checkin_set(p_caddy_id uuid, p_date date, p_in boolean, p_by text default null)
returns public.caddy_checkins
language plpgsql security definer set search_path = public as $$
declare
    v_row public.caddy_checkins;
    v_c   public.caddy_profiles;
begin
    select * into v_c from public.caddy_profiles where id = p_caddy_id and is_active and not coalesce(is_mock, false);
    if not found then raise exception 'CADDY_NOT_FOUND' using errcode = 'P0002'; end if;
    if p_date is null or p_date < (now() at time zone 'Asia/Bangkok')::date - 1
       or p_date > (now() at time zone 'Asia/Bangkok')::date + 1 then
        raise exception 'CHECKIN_DATE: only today' using errcode = '22023';
    end if;
    if p_in then
        insert into public.caddy_checkins (caddy_id, check_date, course_id, course_name, by_label)
        values (p_caddy_id, p_date, v_c.course_id, v_c.course_name, left(coalesce(p_by, 'Pro shop'), 80))
        on conflict (caddy_id, check_date) do update set by_label = public.caddy_checkins.by_label
        returning * into v_row;
    else
        delete from public.caddy_checkins where caddy_id = p_caddy_id and check_date = p_date returning * into v_row;
    end if;
    return v_row;
end $$;

revoke all on function public.caddy_checkin_set(uuid, date, boolean, text) from public;
grant execute on function public.caddy_checkin_set(uuid, date, boolean, text) to anon, authenticated;

do $$ begin
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'caddy_checkins') then
        alter publication supabase_realtime add table public.caddy_checkins;
    end if;
end $$;
