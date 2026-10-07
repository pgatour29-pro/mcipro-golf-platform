-- Rollback for sql/course_change_log_20261007.sql: drops the triggers, reader, helper and table,
-- and restores proshop_pin_login to its v1431 shape (no logging).
do $$
declare t text;
begin
    foreach t in array array[
        'bookings', 'caddy_bookings', 'caddy_profiles', 'caddy_checkins', 'caddy_suspensions',
        'caddy_work_days', 'caddy_work_week', 'course_open_times', 'course_open_time_claims',
        'course_event_slots', 'course_offers', 'course_work_orders', 'golf_course_settings',
        'course_golfer_notes', 'proshop_pins', 'course_staff', 'course_admins', 'course_venues']
    loop
        if to_regclass('public.' || t) is not null then
            execute format('drop trigger if exists course_change_log_trg on public.%I', t);
        end if;
    end loop;
end $$;
drop function if exists public.course_change_log_list(text[], integer, integer, text, bigint);
drop function if exists public.course_change_log_fn();
drop function if exists public.course_change_log_redact(jsonb);
drop function if exists public.course_key_of(text);
drop table if exists public.course_change_log;

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
revoke all on function public.proshop_pin_login(text) from public;
grant execute on function public.proshop_pin_login(text) to anon, authenticated;
