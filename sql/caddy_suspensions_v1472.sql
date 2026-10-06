-- v1472 CADDY SUSPENSIONS (2026-10-06)
-- Pete: "a control tab for the Caddy master for a caddy to be suspended from having any bookings for a duration
-- of time that is set by the Caddy master. This can be from hours to months."
-- Pete's rules (Telegram 9718): the golfer NEVER sees "suspended" (internal only) · a caddy who has an assignment
-- when she is suspended completes it and the suspension starts right after · caddy master only.
--
--   caddy_suspensions : one row per suspension. Active = lifted_at IS NULL AND now() < ends_at.
--   The browser may read WHEN (caddy_id, starts_at, ends_at, lifted_at) — the reason and who set it are NOT
--   granted to it; staff screens read those through caddy_suspensions_staff().
--   Writes: caddy_suspend / caddy_suspension_change / caddy_suspension_lift (SECURITY DEFINER).
--   Lock: trg_caddy_bookings_not_suspended refuses a NEW job (or moving a job / handing it to her) whose tee
--   time falls inside her suspension — whatever screen it comes from. Jobs she already holds are left alone.
-- ROLLBACK: sql/caddy_suspensions_v1472_ROLLBACK.sql

create table if not exists public.caddy_suspensions (
    id          uuid primary key default gen_random_uuid(),
    caddy_id    uuid not null references public.caddy_profiles(id) on delete cascade,
    starts_at   timestamptz not null,
    ends_at     timestamptz not null,
    asked_from  timestamptz,            -- when the caddy master pressed Suspend (starts_at is later if she had an assignment to finish)
    held_job    uuid,                   -- the caddy_bookings row she finishes first
    reason_code text,
    reason      text,
    set_by      text,
    created_at  timestamptz not null default now(),
    lifted_at   timestamptz,
    lifted_by   text,
    constraint caddy_suspensions_span check (ends_at > starts_at)
);
create index if not exists caddy_suspensions_caddy_idx on public.caddy_suspensions (caddy_id, ends_at);

alter table public.caddy_suspensions enable row level security;
drop policy if exists caddy_suspensions_select on public.caddy_suspensions;
create policy caddy_suspensions_select on public.caddy_suspensions for select to anon, authenticated using (true);
revoke all on public.caddy_suspensions from anon, authenticated;
grant select (id, caddy_id, starts_at, ends_at, lifted_at, created_at) on public.caddy_suspensions to anon, authenticated;

-- when her tee time on a job is, as a moment in time
create or replace function public.caddy_job_tee_at(p_date date, p_tee time)
returns timestamptz language sql immutable as $$
    select (p_date + p_tee) at time zone 'Asia/Bangkok'
$$;

create or replace function public.caddy_suspend(p_caddy_id uuid, p_from timestamptz, p_until timestamptz, p_keep_length boolean,
                                               p_reason_code text, p_reason text, p_by text)
returns public.caddy_suspensions
language plpgsql security definer set search_path = public as $$
declare
    v_row   public.caddy_suspensions;
    v_from  timestamptz := greatest(coalesce(p_from, now()), now());
    v_until timestamptz := p_until;
    v_block int;
    v_job   record;
    v_day   date;
begin
    select greatest(270, coalesce(block_minutes, 270)) into v_block from public.caddy_profiles where id = p_caddy_id and not coalesce(is_mock, false);
    if not found then raise exception 'CADDY_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_until is null or v_until < v_from + interval '30 minutes' then
        raise exception 'SUSPEND_SPAN: at least 30 minutes' using errcode = '22023';
    end if;
    if v_from > now() + interval '120 days' or v_until > v_from + interval '366 days' then
        raise exception 'SUSPEND_SPAN: up to 12 months, starting within 120 days' using errcode = '22023';
    end if;
    perform pg_advisory_xact_lock(hashtext('caddy-suspend:' || p_caddy_id::text));

    -- She completes the assignment she has, then the suspension starts: the job she is on at that moment,
    -- else her next job that same day.
    v_day := (v_from at time zone 'Asia/Bangkok')::date;
    select b.id, public.caddy_job_tee_at(b.booking_date, coalesce(b.tee_time, b.start_time)) as tee_at into v_job
      from public.caddy_bookings b
     where b.caddy_id = p_caddy_id and b.booking_date = v_day
       and b.status not in ('cancelled', 'completed') and b.completed_at is null
       and coalesce(b.tee_time, b.start_time) is not null
       and public.caddy_job_tee_at(b.booking_date, coalesce(b.tee_time, b.start_time)) + make_interval(mins => v_block) > v_from
     order by coalesce(b.tee_time, b.start_time)
     limit 1;
    if found then
        v_row.held_job := v_job.id;
        if coalesce(p_keep_length, true) then v_until := v_until + ((v_job.tee_at + make_interval(mins => v_block)) - v_from); end if;
        v_from := v_job.tee_at + make_interval(mins => v_block);
        if v_until < v_from + interval '30 minutes' then
            raise exception 'SUSPEND_AFTER_JOB: she finishes her assignment at % — set a later end', to_char(v_from at time zone 'Asia/Bangkok', 'HH24:MI') using errcode = '22023';
        end if;
    end if;

    if exists (select 1 from public.caddy_suspensions s where s.caddy_id = p_caddy_id and s.lifted_at is null
                  and s.ends_at > now() and s.starts_at < v_until and s.ends_at > v_from) then
        raise exception 'SUSPEND_OVERLAP: she already has a suspension in that time — change or lift it' using errcode = '23P01';
    end if;

    insert into public.caddy_suspensions (caddy_id, starts_at, ends_at, asked_from, held_job, reason_code, reason, set_by)
    values (p_caddy_id, v_from, v_until, greatest(coalesce(p_from, now()), now()), v_row.held_job,
            nullif(left(btrim(coalesce(p_reason_code, '')), 40), ''), nullif(left(btrim(coalesce(p_reason, '')), 400), ''),
            left(coalesce(nullif(btrim(p_by), ''), 'Caddy master'), 80))
    returning * into v_row;
    return v_row;
end $$;

create or replace function public.caddy_suspension_change(p_id uuid, p_until timestamptz, p_by text)
returns public.caddy_suspensions
language plpgsql security definer set search_path = public as $$
declare v_row public.caddy_suspensions;
begin
    select * into v_row from public.caddy_suspensions where id = p_id for update;
    if not found then raise exception 'SUSPENSION_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_row.lifted_at is not null or v_row.ends_at <= now() then raise exception 'SUSPENSION_OVER: it has already ended' using errcode = '22023'; end if;
    if p_until is null or p_until < greatest(v_row.starts_at, now()) + interval '30 minutes' or p_until > v_row.starts_at + interval '366 days' then
        raise exception 'SUSPEND_SPAN: the new end must be later than now and within 12 months' using errcode = '22023';
    end if;
    if exists (select 1 from public.caddy_suspensions s where s.caddy_id = v_row.caddy_id and s.id <> p_id and s.lifted_at is null
                  and s.ends_at > now() and s.starts_at < p_until and s.ends_at > v_row.starts_at) then
        raise exception 'SUSPEND_OVERLAP: that runs into her next suspension' using errcode = '23P01';
    end if;
    update public.caddy_suspensions set ends_at = p_until, set_by = left(coalesce(nullif(btrim(p_by), ''), set_by), 80) where id = p_id returning * into v_row;
    return v_row;
end $$;

create or replace function public.caddy_suspension_lift(p_id uuid, p_by text)
returns public.caddy_suspensions
language plpgsql security definer set search_path = public as $$
declare v_row public.caddy_suspensions;
begin
    update public.caddy_suspensions set lifted_at = now(), lifted_by = left(coalesce(nullif(btrim(p_by), ''), 'Caddy master'), 80)
     where id = p_id and lifted_at is null and ends_at > now() returning * into v_row;
    if not found then raise exception 'SUSPENSION_OVER: it has already ended' using errcode = '22023'; end if;
    return v_row;
end $$;

-- staff screens: the whole row (reason, who set it) for a roster, active + recent
create or replace function public.caddy_suspensions_staff(p_caddy_ids uuid[], p_since timestamptz)
returns setof public.caddy_suspensions
language sql security definer set search_path = public stable as $$
    select s.* from public.caddy_suspensions s
     where s.caddy_id = any (coalesce(p_caddy_ids, '{}'::uuid[]))
       and (s.ends_at > coalesce(p_since, now() - interval '30 days'))
     order by s.starts_at desc
     limit 500
$$;

-- THE LOCK: no new job inside her suspension, from any screen.
create or replace function public.caddy_bookings_not_suspended()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    v_t time; v_at timestamptz; v_until timestamptz;
begin
    if new.caddy_id is null or new.booking_date is null or new.status in ('cancelled', 'completed') then return new; end if;
    if new.started_at is not null or new.completed_at is not null then return new; end if;
    v_t := coalesce(new.tee_time, new.start_time);
    if v_t is null then return new; end if;
    if tg_op = 'UPDATE'
       and new.caddy_id is not distinct from old.caddy_id
       and new.booking_date is not distinct from old.booking_date
       and coalesce(new.tee_time, new.start_time) is not distinct from coalesce(old.tee_time, old.start_time)
       and not (old.status = 'cancelled') then
        return new;                                   -- a job she already holds: confirm / pay / notes go through
    end if;
    v_at := public.caddy_job_tee_at(new.booking_date, v_t);
    select s.ends_at into v_until from public.caddy_suspensions s
     where s.caddy_id = new.caddy_id and s.lifted_at is null and s.starts_at <= v_at and s.ends_at > v_at
     order by s.ends_at desc limit 1;
    if found then
        -- golfers can meet this text: it never says why
        raise exception 'CADDY_UNAVAILABLE: not taking bookings until %', to_char(v_until at time zone 'Asia/Bangkok', 'Dy DD Mon HH24:MI')
            using errcode = '23P01';
    end if;
    return new;
end $$;
drop trigger if exists trg_caddy_bookings_not_suspended on public.caddy_bookings;
create trigger trg_caddy_bookings_not_suspended before insert or update on public.caddy_bookings
    for each row execute function public.caddy_bookings_not_suspended();

revoke all on function public.caddy_suspend(uuid, timestamptz, timestamptz, boolean, text, text, text) from public;
revoke all on function public.caddy_suspension_change(uuid, timestamptz, text)                         from public;
revoke all on function public.caddy_suspension_lift(uuid, text)                                        from public;
revoke all on function public.caddy_suspensions_staff(uuid[], timestamptz)                             from public;
grant execute on function public.caddy_suspend(uuid, timestamptz, timestamptz, boolean, text, text, text) to anon, authenticated;
grant execute on function public.caddy_suspension_change(uuid, timestamptz, text)                         to anon, authenticated;
grant execute on function public.caddy_suspension_lift(uuid, text)                                        to anon, authenticated;
grant execute on function public.caddy_suspensions_staff(uuid[], timestamptz)                             to anon, authenticated;

do $$ begin
    begin alter publication supabase_realtime add table public.caddy_suspensions; exception when duplicate_object then null; end;
end $$;
