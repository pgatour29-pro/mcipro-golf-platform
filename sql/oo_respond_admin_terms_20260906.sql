-- 1on1 FIX (2026-09-06): an ADMIN accepting a request on behalf of a partner was blocked by the v1105 terms guard.
-- oo_respond checks `oo_terms_ok(v_uid, 'partner')` — v_uid is the CALLER, so when Jason/Pete answered a request
-- for a partner (a path the RPC explicitly allows: `... and not public.oo_is_admin(...)`) the check asked whether
-- the ADMIN had accepted the partner terms and always raised terms_required.
-- The consent that matters is the PARTNER on the booking, so that is what is checked now. A partner answering her
-- own request is unchanged (the booking partner is her). Base: LIVE prosrc of 2026-09-06.
-- Run: npx supabase db query --linked -f sql/oo_respond_admin_terms_20260906.sql

create or replace function public.oo_respond(p_booking uuid, p_accept boolean, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare v_uid text := public.oo_uid(); v_b public.oo_bookings; v_c public.caddy_profiles; v_dayoff uuid; v_row jsonb; v_powner text;
begin
  select * into v_b from public.oo_bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'not_found'; end if;
  if v_b.partner_id is distinct from public.oo_partner_id() and not public.oo_is_admin(v_b.society_id) then
    raise exception 'not_your_booking' using errcode = '42501';
  end if;
  if v_b.status <> 'requested' then raise exception 'not_requested'; end if;

  if p_accept then
    select p.user_id into v_powner from public.oo_partners p where p.id = v_b.partner_id;   -- 2026-09-06: the PARTNER consents, not the caller
    if not public.oo_terms_ok(coalesce(v_powner, v_uid), 'partner') then raise exception 'terms_required' using errcode = '42501'; end if;   -- 1on1 (v1105)
    if not public.oo_partner_free(v_b.partner_id, v_b.date_from, v_b.date_to) then raise exception 'partner_busy'; end if;
    begin
      select c.* into v_c from public.oo_partners p join public.caddy_profiles c on c.id = p.caddy_profile_id where p.id = v_b.partner_id;
      if v_c.id is not null then
        insert into public.caddy_dayoff_requests (caddy_user_id, caddy_name, caddy_number, course_name, date_from, date_to, reason, status)
        values (v_c.user_id, v_c.name, v_c.caddy_number, v_c.course_name, v_b.date_from, v_b.date_to, '1on1 booking', 'pending')
        returning id into v_dayoff;
      end if;
    exception when others then v_dayoff := null; end;  -- day-off filing must never block the accept
    update public.oo_bookings set status = 'accepted', responded_at = now(), dayoff_request_id = v_dayoff
    where id = p_booking returning to_jsonb(oo_bookings.*) into v_row;
  else
    update public.oo_bookings set status = 'declined', responded_at = now(), decline_reason = p_reason
    where id = p_booking returning to_jsonb(oo_bookings.*) into v_row;
  end if;
  return v_row;
exception when exclusion_violation then
  raise exception 'partner_busy';
end $function$;

revoke all on function public.oo_respond(uuid, boolean, text) from public, anon;
grant execute on function public.oo_respond(uuid, boolean, text) to authenticated;
