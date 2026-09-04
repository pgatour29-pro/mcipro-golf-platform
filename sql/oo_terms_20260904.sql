-- 1on1 (v1105): DISCLAIMERS + recorded consent. Pete 2026-09-04: "create disclaimers for this 1on1 section. This is
-- not a dating site nor offering any other services other having golf playing partners only. Also create other
-- disclaimers making sure this is a peer to peer consent and that the organizer nor the platform is providing any
-- services". Every member AND every partner must accept the current terms version before they can use the section;
-- the acceptance (version + timestamp) is stored on their row, and the DB refuses a booking request / a booking
-- acceptance without it -- not just the UI. Bumping oo_settings.terms_version re-asks everyone.
-- oo_book / oo_respond below are the LIVE prosrc of 2026-09-04 with ONE guard line added.

alter table public.oo_settings add column if not exists terms_version int not null default 1;
alter table public.oo_members  add column if not exists terms_version int, add column if not exists terms_accepted_at timestamptz;
alter table public.oo_partners add column if not exists terms_version int, add column if not exists terms_accepted_at timestamptz;

create or replace function public.oo_terms_version() returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select s.terms_version from public.oo_settings s limit 1), 1)
$$;

-- has this person accepted the CURRENT version, for that side?
create or replace function public.oo_terms_ok(p_uid text, p_side text) returns boolean
language sql stable security definer set search_path = public as $$
  select case when p_side = 'partner'
    then exists (select 1 from public.oo_partners p where p.user_id = p_uid and p.terms_version >= public.oo_terms_version())
    else exists (select 1 from public.oo_members m where m.user_id = p_uid and m.terms_version >= public.oo_terms_version())
  end
$$;

-- the caller accepts: stamps whichever rows they have (member and/or partner)
create or replace function public.oo_accept_terms(p_version int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_v int := public.oo_terms_version(); v_m int := 0; v_p int := 0;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if p_version is not null and p_version <> v_v then raise exception 'terms_changed'; end if;
  update public.oo_members  set terms_version = v_v, terms_accepted_at = now() where user_id = v_uid;
  get diagnostics v_m = row_count;
  update public.oo_partners set terms_version = v_v, terms_accepted_at = now() where user_id = v_uid;
  get diagnostics v_p = row_count;
  if v_m = 0 and v_p = 0 then raise exception 'not_a_member' using errcode = '42501'; end if;
  return jsonb_build_object('version', v_v, 'member', v_m > 0, 'partner', v_p > 0, 'at', now());
end $$;
revoke all on function public.oo_accept_terms(int) from public;
grant execute on function public.oo_accept_terms(int) to authenticated;
revoke all on function public.oo_terms_ok(text, text) from public;
grant execute on function public.oo_terms_ok(text, text) to authenticated;
grant execute on function public.oo_terms_version() to anon, authenticated;

CREATE OR REPLACE FUNCTION public.oo_book(p_partner uuid, p_from date, p_to date, p_course_name text DEFAULT NULL::text, p_course_id text DEFAULT NULL::text, p_event uuid DEFAULT NULL::uuid, p_holes integer DEFAULT 18, p_tee time without time zone DEFAULT NULL::time without time zone, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid text := public.oo_uid(); v_p public.oo_partners; v_row jsonb; v_days int;
begin
  if not public.oo_is_member() then raise exception 'not_a_member' using errcode = '42501'; end if;
  if not public.oo_terms_ok(v_uid, 'member') then raise exception 'terms_required' using errcode = '42501'; end if;   -- 1on1 (v1105)
  if p_from is null or p_to is null or p_to < p_from or p_from < public.oo_today() or p_to - p_from >= 90 then
    raise exception 'bad_range';
  end if;
  select * into v_p from public.oo_partners where id = p_partner;
  if v_p.id is null or v_p.status <> 'approved' or not v_p.is_active then raise exception 'partner_unavailable'; end if;
  if not public.oo_partner_free(p_partner, p_from, p_to) then raise exception 'partner_busy'; end if;
  if exists (select 1 from public.oo_bookings b where b.member_id = v_uid and b.partner_id = p_partner
             and b.status = 'requested' and daterange(b.date_from, b.date_to, '[]') && daterange(p_from, p_to, '[]')) then
    raise exception 'already_requested';
  end if;
  v_days := p_to - p_from + 1;
  insert into public.oo_bookings (society_id, partner_id, member_id, date_from, date_to, course_name, course_id,
                                  society_event_id, holes, tee_time, notes, fee_quoted, currency)
  values (v_p.society_id, p_partner, v_uid, p_from, p_to, p_course_name, p_course_id, p_event,
          coalesce(p_holes, 18), p_tee, p_notes,
          case when v_p.day_rate is not null then v_p.day_rate * v_days end, v_p.currency)
  returning to_jsonb(oo_bookings.*) into v_row;
  return v_row;
end $function$;

CREATE OR REPLACE FUNCTION public.oo_respond(p_booking uuid, p_accept boolean, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid text := public.oo_uid(); v_b public.oo_bookings; v_c public.caddy_profiles; v_dayoff uuid; v_row jsonb;
begin
  select * into v_b from public.oo_bookings where id = p_booking for update;
  if v_b.id is null then raise exception 'not_found'; end if;
  if v_b.partner_id is distinct from public.oo_partner_id() and not public.oo_is_admin(v_b.society_id) then
    raise exception 'not_your_booking' using errcode = '42501';
  end if;
  if v_b.status <> 'requested' then raise exception 'not_requested'; end if;

  if p_accept then
    if not public.oo_terms_ok(v_uid, 'partner') then raise exception 'terms_required' using errcode = '42501'; end if;   -- 1on1 (v1105)
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
