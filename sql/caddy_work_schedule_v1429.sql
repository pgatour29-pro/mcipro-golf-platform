-- v1429 CADDY WORK SCHEDULE (2026-10-01)
-- Pete: "the Caddy masters to manage and assign caddies work schedules and assigning work assignments".
-- Three small tables, all READ-ONLY to the browser (same rule as caddy_checkins / caddy_profiles):
--   caddy_work_days  : one row per caddy per date the caddy master SET (working with hours / off / leave)
--   caddy_work_week  : her usual week (ISO weekdays she is OFF, 1 = Monday … 7 = Sunday)
--   caddy_week_posts : "week sent to caddies" receipt per course per week (drives the caddy's banner)
-- A date with no row = her usual week, and a usual week with no row = working every day, on her own
-- caddy_profiles.sheet_start/sheet_end. Approved caddy_dayoff_requests still count as leave (resolved in
-- public/caddy-work-core.js) — an explicit caddy_work_days row for that date wins.
-- Writes go through the SECURITY DEFINER functions below (same pattern as caddy_checkin_set): a real,
-- non-demo caddy, a date inside the planning window, valid hours.
-- ROLLBACK: sql/caddy_work_schedule_v1429_ROLLBACK.sql

create table if not exists public.caddy_work_days (
    caddy_id   uuid not null references public.caddy_profiles(id) on delete cascade,
    work_date  date not null,
    state      text not null check (state in ('working', 'off', 'leave')),
    start_time time,
    end_time   time,
    set_by     text,
    updated_at timestamptz not null default now(),
    primary key (caddy_id, work_date),
    constraint caddy_work_days_hours check (start_time is null or end_time is null or end_time > start_time)
);
create index if not exists caddy_work_days_date_idx on public.caddy_work_days (work_date);

create table if not exists public.caddy_work_week (
    caddy_id   uuid primary key references public.caddy_profiles(id) on delete cascade,
    off_days   smallint[] not null default '{}',
    set_by     text,
    updated_at timestamptz not null default now()
);

create table if not exists public.caddy_week_posts (
    course_key text not null,
    week_start date not null,
    sent_at    timestamptz not null default now(),
    sent_by    text,
    sent_count integer,
    primary key (course_key, week_start)
);

alter table public.caddy_work_days  enable row level security;
alter table public.caddy_work_week  enable row level security;
alter table public.caddy_week_posts enable row level security;

drop policy if exists caddy_work_days_select  on public.caddy_work_days;
drop policy if exists caddy_work_week_select  on public.caddy_work_week;
drop policy if exists caddy_week_posts_select on public.caddy_week_posts;
create policy caddy_work_days_select  on public.caddy_work_days  for select to anon, authenticated using (true);
create policy caddy_work_week_select  on public.caddy_work_week  for select to anon, authenticated using (true);
create policy caddy_week_posts_select on public.caddy_week_posts for select to anon, authenticated using (true);

revoke all on public.caddy_work_days, public.caddy_work_week, public.caddy_week_posts from anon, authenticated;
grant select on public.caddy_work_days, public.caddy_work_week, public.caddy_week_posts to anon, authenticated;

-- one day for one caddy. p_state NULL = clear the row (back to her usual week).
create or replace function public.caddy_work_day_set(p_caddy_id uuid, p_date date, p_state text, p_start time, p_end time, p_by text)
returns public.caddy_work_days
language plpgsql security definer set search_path = public as $$
declare
    v_row   public.caddy_work_days;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
    perform 1 from public.caddy_profiles where id = p_caddy_id and not coalesce(is_mock, false);
    if not found then raise exception 'CADDY_NOT_FOUND' using errcode = 'P0002'; end if;
    if p_date is null or p_date < v_today - 1 or p_date > v_today + 120 then
        raise exception 'WORK_DATE: today to 120 days ahead' using errcode = '22023';
    end if;
    if p_state is null then
        delete from public.caddy_work_days where caddy_id = p_caddy_id and work_date = p_date returning * into v_row;
        return v_row;
    end if;
    if p_state not in ('working', 'off', 'leave') then
        raise exception 'WORK_STATE: working, off or leave' using errcode = '22023';
    end if;
    if p_state = 'working' and p_start is not null and p_end is not null and p_end <= p_start then
        raise exception 'WORK_HOURS: finish must be after start' using errcode = '22023';
    end if;
    insert into public.caddy_work_days (caddy_id, work_date, state, start_time, end_time, set_by, updated_at)
    values (p_caddy_id, p_date, p_state,
            case when p_state = 'working' then p_start end, case when p_state = 'working' then p_end end,
            left(coalesce(p_by, 'Caddy master'), 80), now())
    on conflict (caddy_id, work_date) do update
        set state = excluded.state, start_time = excluded.start_time, end_time = excluded.end_time,
            set_by = excluded.set_by, updated_at = now()
    returning * into v_row;
    return v_row;
end $$;

-- her usual week: the ISO weekdays she does NOT work.
create or replace function public.caddy_work_week_set(p_caddy_id uuid, p_off_days smallint[], p_by text)
returns public.caddy_work_week
language plpgsql security definer set search_path = public as $$
declare
    v_row  public.caddy_work_week;
    v_days smallint[];
begin
    perform 1 from public.caddy_profiles where id = p_caddy_id and not coalesce(is_mock, false);
    if not found then raise exception 'CADDY_NOT_FOUND' using errcode = 'P0002'; end if;
    select coalesce(array_agg(distinct d order by d), '{}') into v_days from unnest(coalesce(p_off_days, '{}'::smallint[])) d;
    if exists (select 1 from unnest(v_days) d where d < 1 or d > 7) then
        raise exception 'WORK_WEEK: weekdays are 1 (Monday) to 7 (Sunday)' using errcode = '22023';
    end if;
    insert into public.caddy_work_week (caddy_id, off_days, set_by, updated_at)
    values (p_caddy_id, v_days, left(coalesce(p_by, 'Caddy master'), 80), now())
    on conflict (caddy_id) do update set off_days = excluded.off_days, set_by = excluded.set_by, updated_at = now()
    returning * into v_row;
    return v_row;
end $$;

-- copy one week's SET days (working hours + days off; leave is personal and never copied) onto another week.
create or replace function public.caddy_work_week_copy(p_caddy_ids uuid[], p_from date, p_to date, p_by text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
    v_n     integer := 0;
begin
    if p_caddy_ids is null or coalesce(array_length(p_caddy_ids, 1), 0) = 0 then return 0; end if;
    if array_length(p_caddy_ids, 1) > 600 then raise exception 'WORK_COPY: too many caddies' using errcode = '22023'; end if;
    if p_from is null or p_to is null or p_to = p_from or (p_to - p_from) % 7 <> 0 then
        raise exception 'WORK_COPY: weeks must be whole weeks apart' using errcode = '22023';
    end if;
    if p_to < v_today - 7 or p_to > v_today + 120 then
        raise exception 'WORK_COPY: target week out of range' using errcode = '22023';
    end if;
    delete from public.caddy_work_days
     where caddy_id = any (p_caddy_ids) and work_date between p_to and p_to + 6 and state in ('working', 'off')
       and work_date >= v_today;
    insert into public.caddy_work_days (caddy_id, work_date, state, start_time, end_time, set_by, updated_at)
    select d.caddy_id, d.work_date + (p_to - p_from), d.state, d.start_time, d.end_time, left(coalesce(p_by, 'Caddy master'), 80), now()
      from public.caddy_work_days d
      join public.caddy_profiles c on c.id = d.caddy_id and not coalesce(c.is_mock, false)
     where d.caddy_id = any (p_caddy_ids) and d.work_date between p_from and p_from + 6 and d.state in ('working', 'off')
       and d.work_date + (p_to - p_from) >= v_today
    on conflict (caddy_id, work_date) do nothing;
    get diagnostics v_n = row_count;
    return v_n;
end $$;

create or replace function public.caddy_week_post_set(p_course_key text, p_week_start date, p_by text, p_count integer)
returns public.caddy_week_posts
language plpgsql security definer set search_path = public as $$
declare
    v_row   public.caddy_week_posts;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
    if coalesce(btrim(p_course_key), '') = '' or length(p_course_key) > 80 then
        raise exception 'WEEK_POST: course' using errcode = '22023';
    end if;
    if p_week_start is null or extract(isodow from p_week_start) <> 1 or p_week_start < v_today - 7 or p_week_start > v_today + 120 then
        raise exception 'WEEK_POST: week must start on a Monday, this week or later' using errcode = '22023';
    end if;
    insert into public.caddy_week_posts (course_key, week_start, sent_at, sent_by, sent_count)
    values (lower(btrim(p_course_key)), p_week_start, now(), left(coalesce(p_by, 'Caddy master'), 80), greatest(coalesce(p_count, 0), 0))
    on conflict (course_key, week_start) do update set sent_at = now(), sent_by = excluded.sent_by, sent_count = excluded.sent_count
    returning * into v_row;
    return v_row;
end $$;

revoke all on function public.caddy_work_day_set(uuid, date, text, time, time, text)  from public;
revoke all on function public.caddy_work_week_set(uuid, smallint[], text)             from public;
revoke all on function public.caddy_work_week_copy(uuid[], date, date, text)          from public;
revoke all on function public.caddy_week_post_set(text, date, text, integer)          from public;
grant execute on function public.caddy_work_day_set(uuid, date, text, time, time, text)  to anon, authenticated;
grant execute on function public.caddy_work_week_set(uuid, smallint[], text)             to anon, authenticated;
grant execute on function public.caddy_work_week_copy(uuid[], date, date, text)          to anon, authenticated;
grant execute on function public.caddy_week_post_set(text, date, text, integer)          to anon, authenticated;

do $$ begin
    begin alter publication supabase_realtime add table public.caddy_work_days;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.caddy_work_week;  exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.caddy_week_posts; exception when duplicate_object then null; end;
end $$;
