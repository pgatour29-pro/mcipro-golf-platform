-- 1on1 (v1105): oo_me carries the terms state so the client can gate on it (LIVE prosrc + 3 keys).
CREATE OR REPLACE FUNCTION public.oo_me()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid text := public.oo_uid(); v_member jsonb; v_partner jsonb; v_admin boolean; v_role text;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  v_admin := public.oo_is_admin();
  select to_jsonb(m) into v_member from public.oo_members m where m.user_id = v_uid and m.status <> 'removed';
  select to_jsonb(p) into v_partner from public.oo_partners p where p.user_id = v_uid;
  select role into v_role from public.user_profiles where line_user_id = v_uid;
  return jsonb_build_object(
    'signed_in', true, 'uid', v_uid, 'admin', v_admin,
    'member', v_member, 'partner', v_partner,
    'member_active', public.oo_is_member(),
    'pin_required', (v_member is not null and not v_admin),
    'pin_ok', public.oo_pin_ok(),
    'pin_set', public.oo_pin_set(),
    'photo_ok', case when v_member is null then null else public.oo_photo_ok(v_uid) end,
    'photo_url', public.oo_profile_photo(v_uid),
    'photo_due', case when v_member is null then null else public.oo_photo_deadline(v_uid) end,
    'terms_version', public.oo_terms_version(),
    'terms_ok_member', case when v_member is null then null else public.oo_terms_ok(v_uid, 'member') end,
    'terms_ok_partner', case when v_partner is null then null else public.oo_terms_ok(v_uid, 'partner') end,
    'role', v_role,
    'standalone_partner', (v_role = 'oo_partner'),
    'is_caddie', exists (select 1 from public.caddy_profiles c where c.user_id = v_uid),
    'today', public.oo_today()
  );
end $function$;
