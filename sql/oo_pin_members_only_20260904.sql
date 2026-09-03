-- 1on1 (2026-09-04) — Pete: "so is it the only ones who have been given access by JOA or Pete that the cube appears?
-- if so then keep it that way." Restores the v1094/v1098 rule after a short-lived experiment: the PIN NEVER creates a
-- member row. Only an admin grant / approval (or an admin-created invite link) makes someone a member; then the PIN.
create or replace function public.oo_verify_pin(p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_s public.oo_settings; v_fail int; v_soc uuid;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select society_id into v_soc from public.oo_members where user_id = v_uid;
  if v_soc is null then raise exception 'not_a_member'; end if;
  select count(*) into v_fail from public.oo_pin_attempts where user_id = v_uid and not ok and at > now() - interval '15 minutes';
  if v_fail >= 8 then raise exception 'pin_locked'; end if;
  select * into v_s from public.oo_settings where society_id = v_soc;
  if v_s.pin_hash is null then raise exception 'pin_not_set'; end if;
  if encode(sha256(convert_to(v_s.pin_salt || trim(coalesce(p_pin, '')), 'UTF8')), 'hex') = v_s.pin_hash then
    update public.oo_members set pin_ok_at = now() where user_id = v_uid;
    insert into public.oo_pin_attempts (user_id, ok) values (v_uid, true);
    delete from public.oo_pin_attempts where user_id = v_uid and not ok;
    return jsonb_build_object('ok', true);
  end if;
  insert into public.oo_pin_attempts (user_id, ok) values (v_uid, false);
  return jsonb_build_object('ok', false, 'remaining', greatest(0, 8 - v_fail - 1));
end $$;

create or replace function public.oo_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_member jsonb; v_partner jsonb; v_admin boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  v_admin := public.oo_is_admin();
  select to_jsonb(m) into v_member from public.oo_members m where m.user_id = v_uid;
  select to_jsonb(p) into v_partner from public.oo_partners p where p.user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true, 'uid', v_uid, 'admin', v_admin,
    'member', v_member, 'partner', v_partner,
    'member_active', public.oo_is_member(),
    'pin_required', (v_member is not null and not v_admin),
    'pin_ok', public.oo_pin_ok(),
    'pin_set', public.oo_pin_set(),
    'is_caddie', exists (select 1 from public.caddy_profiles c where c.user_id = v_uid),
    'today', public.oo_today()
  );
end $$;
