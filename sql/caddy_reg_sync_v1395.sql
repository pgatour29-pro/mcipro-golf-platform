-- v1395 (2026-09-27) — a registration's caddy number and its caddy_bookings job can never disagree.
--
-- Pete: removed caddy #109 on his phone (TRGG Pattaya CC, 28 Sep) — the pro shop tee sheet kept showing #109.
-- Root cause: the golfer app's BookedCaddiesView.remove (and every other golfer path — 6+ writers) only
-- blanks event_registrations.caddy_numbers; the caddy_bookings row the course/caddy master/caddie read
-- (CourseLink: job wins over reg number) stayed 'confirmed'. Same on Change: the old caddy's job stayed live.
--
-- Fix in the DATABASE so no client path can leave a phantom booking: when a registration's caddy_numbers
-- changes, or the golfer unregisters (status → cancelled / row deleted), cancel that golfer's event caddy
-- jobs on the event date whose caddy number is no longer on the registration.
-- CourseLink.setCaddy writes the job BEFORE the reg number, so pro shop edits pass through untouched.

create or replace function public.caddy_jobs_follow_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    r        record;
    v_title  text;
    v_date   date;
    v_keep   text[];
    v_reason text;
begin
    r := case when tg_op = 'DELETE' then old else new end;
    if r.player_id is null then return null; end if;

    select e.title, e.event_date into v_title, v_date from public.society_events e where e.id = r.event_id;
    if v_date is null then return null; end if;

    if tg_op = 'DELETE' or new.status = 'cancelled' then
        v_keep := '{}';
        v_reason := 'Golfer left the event';
    else
        select coalesce(array_agg(distinct (n::int)::text), '{}') into v_keep
          from regexp_split_to_table(coalesce(new.caddy_numbers, ''), '\D+') n where n <> '';
        v_reason := 'Golfer removed the caddy';
    end if;

    update public.caddy_bookings b
       set status = 'cancelled', cancelled_at = now(), cancellation_reason = v_reason, updated_at = now()
      from (select b2.id,
                   coalesce(substring(b2.caddie_name from '#\s*0*(\d+)'),
                            (select nullif(ltrim(regexp_replace(cp.caddy_number, '\D', '', 'g'), '0'), '')
                               from public.caddy_profiles cp where cp.id = b2.caddy_id)) num
              from public.caddy_bookings b2
             where b2.booking_date = v_date
               and b2.status <> 'cancelled'
               and (b2.golfer_id = r.player_id or b2.user_id = r.player_id)
               and (b2.booking_source in ('event_registration', 'proshop_event') or b2.special_requests = v_title)) j
     where b.id = j.id
       and j.num is not null
       and not (j.num = any (v_keep));
    return null;
end $$;

drop trigger if exists trg_caddy_jobs_follow_reg on public.event_registrations;
create trigger trg_caddy_jobs_follow_reg
    after update of caddy_numbers, status on public.event_registrations
    for each row
    when (old.caddy_numbers is distinct from new.caddy_numbers
          or (new.status = 'cancelled' and old.status is distinct from new.status))
    execute function public.caddy_jobs_follow_registration();

drop trigger if exists trg_caddy_jobs_follow_reg_del on public.event_registrations;
create trigger trg_caddy_jobs_follow_reg_del
    after delete on public.event_registrations
    for each row
    execute function public.caddy_jobs_follow_registration();
