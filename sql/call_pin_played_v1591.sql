-- v1591 (2026-10-16) Pete: "everyone who has a registered account has a Call Pin … as long as they are on the system
-- and have played at that course the call pin always next to the players name."
-- desk_call_pins only released a PIN when the golfer had a caddy_bookings / bookings row at the course. Pro shop
-- bookings are mostly name-only, so a golfer who PLAYED here (rounds) or was on a society day here (event_registrations)
-- showed no PIN: Pattaya Golf 2 of 40, Green Valley 2 of 31, Burapha 1 of 31. Now any link to the course counts:
-- a round, a society registration, a caddy job, a tee-time booking, the course's own customer or member list.
-- Still gated by the course's OWN desk token, and only for golfers tied to that course.
create or replace function public.desk_call_pins(p_token text, p_ids text[])
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare keys text[] := public._desk_keys(p_token);
begin
  if keys is null or cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  return jsonb_build_object('ok', true, 'pins', coalesce((
    select jsonb_object_agg(c.golfer_id, c.pin)
      from public.golfer_call_pins c
     where c.golfer_id = any (p_ids[1:500])
       and (exists (select 1 from public.rounds r
                     where (r.golfer_id = c.golfer_id or r.user_id::text = c.golfer_id)
                       and (r.course_id::text = any (keys) or public.venue_of(r.course_name) = any (keys)))
         or exists (select 1 from public.event_registrations er join public.society_events e on e.id = er.event_id
                     where (er.player_id = c.golfer_id or er.user_id::text = c.golfer_id)
                       and (e.course_id::text = any (keys) or public.venue_of(e.course_name) = any (keys)))
         or exists (select 1 from public.caddy_bookings cb
                     where (cb.golfer_id = c.golfer_id or cb.user_id = c.golfer_id)
                       and (cb.course_id = any (keys) or public.venue_of(cb.course_name) = any (keys)))
         or exists (select 1 from public.bookings b
                     where b.golfer_id = c.golfer_id and coalesce(b.deleted, false) = false
                       and (b.course_id = any (keys) or public.venue_of(coalesce(b.course_name, b.tee_sheet_course)) = any (keys)))
         or exists (select 1 from public.course_customers cc where cc.golfer_id = c.golfer_id and cc.venue = any (keys))
         or exists (select 1 from public.course_memberships m where m.golfer_id = c.golfer_id
                     and (m.facility_id::text = any (keys) or m.home_slug = any (keys))))
  ), '{}'::jsonb));
end $$;
revoke all on function public.desk_call_pins(text, text[]) from public;
grant execute on function public.desk_call_pins(text, text[]) to anon, authenticated;
