-- v1454 (2026-10-04) — caddy job LINE alerts, driven by the database.
--
-- Pete: "if the golfer books a caddy, it automatically is a job" → then "Fix" (the caddy alerts).
-- notify-caddy-booking had never sent a single alert (payload shape + non-existent LINE-id columns), and most
-- jobs are now born in the database or on screens that never called it (Book a Caddy, CourseLink, the
-- registration trigger caddy_jobs_ensure). So the alert rides the row itself: every path that creates,
-- reassigns, retimes or cancels an upcoming caddy job posts {action, booking_id} to the edge function, which
-- reads the row with the service role and pushes to the caddy's LINE (caddy_profiles.user_id → user_profiles).
-- The function is deployed verify_jwt = false (pinned in supabase/config.toml) and trusts only the booking id,
-- so no key lives in this file. pg_net sends after COMMIT — a rolled-back write never alerts anyone.
-- caddy_job_alerts = the sent log; its unique key (booking, recipient, kind, time) is claimed BEFORE each push,
-- so a retry or a second caller can never push twice. RLS on with no policies = service role only.

create table if not exists public.caddy_job_alerts (
    booking_id uuid        not null,
    recipient  text        not null,
    kind       text        not null,
    at         text        not null default '',
    sent       boolean,
    sent_at    timestamptz,
    created_at timestamptz not null default now(),
    primary key (booking_id, recipient, kind, at)
);
alter table public.caddy_job_alerts enable row level security;

create or replace function public.caddy_job_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_url   text := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/notify-caddy-booking';
    v_hdr   jsonb := '{"Content-Type": "application/json"}'::jsonb;
    v_today date := (now() at time zone 'Asia/Bangkok')::date;
    v_tnew  time;
    v_told  time;
begin
    if coalesce(new.golfer_id, '') like 'TESTQA%' or coalesce(new.special_requests, '') like 'CLAUDE-TEST%' then return null; end if;
    if new.booking_date is null or new.booking_date < v_today then return null; end if;
    v_tnew := coalesce(new.tee_time, new.start_time);

    if tg_op = 'INSERT' then
        if new.status not in ('cancelled', 'completed') and new.caddy_id is not null then
            perform net.http_post(url := v_url, headers := v_hdr, body := jsonb_build_object('action', 'new_job', 'booking_id', new.id));
        end if;
        return null;
    end if;

    v_told := coalesce(old.tee_time, old.start_time);
    if new.status = 'cancelled' then
        if old.status <> 'cancelled' and old.caddy_id is not null then
            perform net.http_post(url := v_url, headers := v_hdr,
                body := jsonb_build_object('action', 'job_cancelled', 'booking_id', new.id, 'caddy_id', old.caddy_id));
        end if;
        return null;
    end if;
    if new.status = 'completed' then return null; end if;

    if new.caddy_id is distinct from old.caddy_id then               -- reassigned: the old caddy loses it, the new one gets it
        if old.caddy_id is not null and old.status <> 'cancelled' then
            perform net.http_post(url := v_url, headers := v_hdr,
                body := jsonb_build_object('action', 'job_cancelled', 'booking_id', new.id, 'caddy_id', old.caddy_id));
        end if;
        if new.caddy_id is not null then
            perform net.http_post(url := v_url, headers := v_hdr, body := jsonb_build_object('action', 'new_job', 'booking_id', new.id));
        end if;
        return null;
    end if;

    if old.status = 'cancelled' and new.caddy_id is not null then    -- re-opened
        perform net.http_post(url := v_url, headers := v_hdr, body := jsonb_build_object('action', 'new_job', 'booking_id', new.id));
        return null;
    end if;

    if new.caddy_id is not null and (v_tnew is distinct from v_told or new.booking_date is distinct from old.booking_date) then
        perform net.http_post(url := v_url, headers := v_hdr,
            body := jsonb_build_object('action', 'job_moved', 'booking_id', new.id, 'old_time', to_char(v_told, 'HH24:MI')));
    end if;
    return null;
exception when others then
    raise warning '[caddy_job_alert] %', sqlerrm;
    return null;
end
$$;

drop trigger if exists caddy_job_alert on public.caddy_bookings;
create trigger caddy_job_alert
    after insert or update on public.caddy_bookings
    for each row execute function public.caddy_job_alert();

revoke all on function public.caddy_job_alert() from public, anon, authenticated;
