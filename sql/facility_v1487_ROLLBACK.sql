-- Rollback for sql/facility_v1487.sql. Restores proshop_pin_login / proshop_pin_courses to their
-- v1477 shape (course PINs only) and drops the facility objects. Silky Oak's courses / course_venues /
-- golf_course_settings rows are left in place (harmless registry rows); delete by hand if wanted.
drop function if exists public.facility_insights(text, integer);
drop function if exists public.facility_of(text);
drop table if exists public.course_memberships;
drop table if exists public.proshop_facility_pins;

create or replace function public.proshop_pin_courses()
returns jsonb language sql stable security definer set search_path = public as $$
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name), '[]'::jsonb)
    from public.proshop_pins p
    join public.courses c on c.id = p.course_id
$$;
create or replace function public.proshop_pin_login(p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    res jsonb;
    h   jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
    select jsonb_build_object('course_id', c.id, 'course_name', c.name) into res
    from public.proshop_pins p
    join public.courses c on c.id = p.course_id
    where p.pin = btrim(coalesce(p_pin, ''))
    limit 1;
    if res is not null then
        insert into public.course_change_log (course_key, course_raw, tbl, op, row_id, actor, actor_name, actor_role, ip, ip_country, ua, after)
        values (public.course_key_of(res->>'course_id'), res->>'course_id', 'proshop_pins', 'PIN_LOGIN', res->>'course_id',
                coalesce(nullif(h->>'x-mcp-actor', ''), 'pin'), left(h->>'x-mcp-actor-name', 120), 'proshop',
                coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1)), h->>'cf-ipcountry',
                left(h->>'user-agent', 200), jsonb_build_object('course_name', res->>'course_name'));
    end if;
    return res;
end;
$$;
revoke all on function public.proshop_pin_login(text) from public;
grant execute on function public.proshop_pin_login(text) to anon, authenticated;
revoke all on function public.proshop_pin_courses() from public;
grant execute on function public.proshop_pin_courses() to anon, authenticated;

drop table if exists public.facility_courses;
drop table if exists public.facilities;
