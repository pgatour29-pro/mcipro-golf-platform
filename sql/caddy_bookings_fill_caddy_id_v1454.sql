-- v1454 (2026-10-04) — every caddy job that names a caddy number is LINKED to that caddy's profile.
--
-- Pete: "if the golfer books a caddy, it automatically is a job, it doesn't wait. Only thing would be if the
-- pro shop confirms or reassigns it to a different group."
-- Golfer event bookings (createCaddyBookingFromEvent, older golfer paths) store caddie_name 'Caddy #N' with
-- caddy_id NULL. Every reader keyed on caddy_id then misread them: the caddie's own dashboard never showed
-- the job, the caddy master listed it as "Unassigned — needs a caddy", the work-week grid offered it to other
-- caddies, and the app-side 4:15 guard (by caddy_id) let her be double-booked.
-- This BEFORE trigger fills caddy_id from the number + course with the SAME resolution the roster sync uses
-- (caddy_sync_from_notebook: caddy_resolve_course_id / caddy_facility_key, never a departed caddy), creating
-- the number-only roster row first when the course has never seen her (as trg_caddy_booking_name_sync does).
-- Name order: fires before trg_caddy_bookings_no_clash, so the clash gate sees the linked id.

create or replace function public.caddy_bookings_fill_caddy_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_num  text;
    v_cid  text;
    v_crs  text;
    v_name text;
    v_id   uuid;
begin
    if new.caddy_id is not null then return new; end if;
    if coalesce(new.golfer_id, '') like 'TESTQA%' or coalesce(new.special_requests, '') like 'CLAUDE-TEST%' then return new; end if;
    v_num := substring(coalesce(new.caddie_name, '') from '#\s*(\d{1,4})');
    if v_num is null then return new; end if;                    -- 'Unassigned' / no number = a real open job
    v_num := coalesce(nullif(ltrim(v_num, '0'), ''), '0');
    v_crs := nullif(btrim(coalesce(new.course_name, '')), '');
    if v_crs is null then return new; end if;
    begin
        v_cid := caddy_resolve_course_id(v_crs);
        select cp.id into v_id from public.caddy_profiles cp
         where cp.is_mock = false and cp.left_at is null and cp.is_active
           and coalesce(nullif(ltrim(cp.caddy_number, '0'), ''), '0') = v_num
           and ((v_cid is not null and cp.course_id = v_cid) or caddy_facility_key(cp.course_name) = caddy_facility_key(v_crs))
         order by (cp.course_id = v_cid) desc nulls last, cp.created_at
         limit 1;
        if v_id is null then
            -- "#21 Meen" / "Meen (#21)" carries a name; "Caddy #21" does not
            v_name := nullif(btrim(regexp_replace(regexp_replace(new.caddie_name, '\(?\s*#?\s*\d{1,4}\s*\)?', ' ', 'g'), '\s+', ' ', 'g')), '');
            if v_name is not null and v_name ~* '^caddy$' then v_name := null; end if;
            perform caddy_sync_from_notebook(v_num, v_name, v_crs, null);
            select cp.id into v_id from public.caddy_profiles cp
             where cp.is_mock = false and cp.left_at is null and cp.is_active
               and coalesce(nullif(ltrim(cp.caddy_number, '0'), ''), '0') = v_num
               and ((v_cid is not null and cp.course_id = v_cid) or caddy_facility_key(cp.course_name) = caddy_facility_key(v_crs))
             order by (cp.course_id = v_cid) desc nulls last, cp.created_at
             limit 1;
        end if;
        new.caddy_id := v_id;
    exception when others then
        raise warning '[caddy_bookings_fill_caddy_id] %', sqlerrm;
    end;
    return new;
end
$$;

drop trigger if exists caddy_bookings_fill_caddy_id on public.caddy_bookings;
create trigger caddy_bookings_fill_caddy_id
    before insert or update of caddie_name, course_name, caddy_id on public.caddy_bookings
    for each row execute function public.caddy_bookings_fill_caddy_id();

revoke all on function public.caddy_bookings_fill_caddy_id() from public, anon, authenticated;
