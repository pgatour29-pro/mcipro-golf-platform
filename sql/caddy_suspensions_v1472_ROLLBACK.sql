-- ROLLBACK for sql/caddy_suspensions_v1472.sql
drop trigger if exists trg_caddy_bookings_not_suspended on public.caddy_bookings;
drop function if exists public.caddy_bookings_not_suspended();
drop function if exists public.caddy_suspensions_staff(uuid[], timestamptz);
drop function if exists public.caddy_suspension_lift(uuid, text);
drop function if exists public.caddy_suspension_change(uuid, timestamptz, text);
drop function if exists public.caddy_suspend(uuid, timestamptz, timestamptz, boolean, text, text, text);
drop function if exists public.caddy_job_tee_at(date, time);
do $$ begin
    begin alter publication supabase_realtime drop table public.caddy_suspensions; exception when others then null; end;
end $$;
drop table if exists public.caddy_suspensions;
