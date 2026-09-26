-- THE 4:15 GATE, enforced by the DATABASE (2026-09-26). CaddyBookingGuard.check() in the app is a
-- read-then-write on the phone: two bookers passing the check in the same moment both got the
-- caddy. This trigger runs the same rule inside the write, under a per-caddy-per-day lock, so the
-- second booking is refused (errcode 23P01, message starts CADDY_CLASH).
-- Rule mirrors the client: same caddy (caddy_id, else caddie_name on the same course), same date,
-- status <> 'cancelled', tee times closer than the caddy's block (max(255, block_minutes)).
-- UPDATEs only re-check when who/when changes or a cancelled job is revived, so legacy rows can
-- still be confirmed/completed.

create or replace function public.caddy_bookings_no_clash()
returns trigger language plpgsql as $$
declare
    v_t time; v_block int; v_name text; v_hit record;
begin
    if new.status = 'cancelled' or new.booking_date is null then return new; end if;
    v_t := coalesce(new.tee_time, new.start_time);
    if v_t is null then return new; end if;
    v_name := nullif(btrim(coalesce(new.caddie_name, '')), '');
    if new.caddy_id is null and (v_name is null or lower(v_name) = 'unassigned') then return new; end if;

    if tg_op = 'UPDATE'
       and new.caddy_id is not distinct from old.caddy_id
       and new.caddie_name is not distinct from old.caddie_name
       and new.booking_date is not distinct from old.booking_date
       and coalesce(new.tee_time, new.start_time) is not distinct from coalesce(old.tee_time, old.start_time)
       and not (old.status = 'cancelled') then
        return new;
    end if;

    perform pg_advisory_xact_lock(hashtext('caddy:' ||
        coalesce(new.caddy_id::text, lower(coalesce(new.course_name, '')) || '|' || lower(v_name)) || ':' || new.booking_date::text));

    select greatest(255, coalesce(block_minutes, 255)) into v_block from public.caddy_profiles where id = new.caddy_id;
    v_block := coalesce(v_block, 255);

    select b.id, coalesce(b.tee_time, b.start_time) t into v_hit
      from public.caddy_bookings b
     where b.id <> new.id
       and b.booking_date = new.booking_date
       and b.status <> 'cancelled'
       and coalesce(b.tee_time, b.start_time) is not null
       and ( (new.caddy_id is not null and b.caddy_id = new.caddy_id)
          or (new.caddy_id is null and b.caddy_id is null and lower(btrim(b.caddie_name)) = lower(v_name)
              and lower(coalesce(b.course_name, '')) = lower(coalesce(new.course_name, ''))) )
       and abs(extract(epoch from (coalesce(b.tee_time, b.start_time) - v_t)) / 60) < v_block
     limit 1;

    if found then
        raise exception 'CADDY_CLASH: already out at % — blocked until % (% min per round)',
            to_char(v_hit.t, 'HH24:MI'), to_char(v_hit.t + make_interval(mins => v_block), 'HH24:MI'), v_block
            using errcode = '23P01';
    end if;
    return new;
end $$;

drop trigger if exists trg_caddy_bookings_no_clash on public.caddy_bookings;
create trigger trg_caddy_bookings_no_clash before insert or update on public.caddy_bookings
    for each row execute function public.caddy_bookings_no_clash();
