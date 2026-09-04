-- 1on1 (v1101): STANDALONE PARTNERS — Pete 2026-09-04: "for the 1on1 female golfers i do not want them as part of the
-- public directory, we need to keep them separate and a separate initation process".
--
-- Before: a partner had to be a caddie (caddy_profiles row) and opted in from the caddie dashboard — which put her in
-- the public caddie directory / rosters. After: a partner is her OWN user type. `user_profiles.role = 'oo_partner'`:
--   • she logs in with LINE/Kakao/Google like anyone, but lands ONLY on the 1on1 partner screen (client routing);
--   • no caddy_profiles row, no golfer dashboard, and every public directory / search excludes role 'oo_partner';
--   • the ONLY way in is an admin PARTNER INVITE (?oo=CODE, Admin → Invites, kind = partner) — redeeming it flips the
--     profile role to 'oo_partner' and creates the oo_partners row (pending, or approved when the invite auto-approves).
-- Existing behaviour kept: a caddie can still be a partner (caddy_profile_id stays optional); prod has zero partners.
-- Functions rewritten here (oo_partner_optin, oo_redeem_invite, oo_me) are based on LIVE prosrc of 2026-09-04.

-- 1. the role itself
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check
  check (role = any (array['golfer','guest','organizer','society_organizer','admin','caddy','caddie','caddymaster','manager',
                           'golf_course_manager','proshop','maintenance','restaurant','oo_partner']));

-- 2. pre-login peek at a stashed invite: kind only (anon-callable, leaks nothing else) — registration uses it to
--    create the profile with role 'oo_partner' so the invited woman never passes through the golfer dashboard
create or replace function public.oo_invite_kind(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case when i.code is null then jsonb_build_object('valid', false)
         else jsonb_build_object('valid', (i.expires_at is null or i.expires_at > now()) and i.used < i.max_uses, 'kind', i.kind) end
  from (select 1) x left join public.oo_invites i on i.code = upper(trim(p_code))
$$;
revoke all on function public.oo_invite_kind(text) from public;
grant execute on function public.oo_invite_kind(text) to anon, authenticated;

-- 3. partner opt-in no longer requires a caddie: role 'oo_partner' (or a valid partner invite in p.invite_code) is enough.
--    Defaults come from the caddie row when there is one, else from user_profiles.
create or replace function public.oo_partner_optin(p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_c public.caddy_profiles; v_u public.user_profiles; v_row jsonb; v_hcp numeric; v_ok boolean;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select * into v_c from public.caddy_profiles where user_id = v_uid and coalesce(is_mock,false) = false
    order by created_at limit 1;
  select * into v_u from public.user_profiles where line_user_id = v_uid;
  v_ok := v_c.id is not null
       or v_u.role = 'oo_partner'
       or exists (select 1 from public.oo_partners op where op.user_id = v_uid)
       or exists (select 1 from public.oo_invites i where i.code = upper(trim(coalesce(p->>'invite_code',''))) and i.kind = 'partner'
                    and (i.expires_at is null or i.expires_at > now()));
  if not v_ok then raise exception 'not_invited' using errcode = '42501'; end if;
  v_hcp := v_u.handicap_index;

  insert into public.oo_partners (caddy_profile_id, user_id, display_name, bio, languages, handicap,
                                  home_course_name, courses_known, area_tips, availability_days, day_rate)
  values (v_c.id, v_uid,
          coalesce(p->>'display_name', v_c.name, v_u.display_name, v_u.name, 'Partner'),
          coalesce(p->>'bio', v_c.bio),
          coalesce((select array_agg(x) from jsonb_array_elements_text(p->'languages') x), v_c.languages, '{}'),
          coalesce((p->>'handicap')::numeric, v_hcp),
          coalesce(p->>'home_course_name', v_c.course_name),
          coalesce((select array_agg(x) from jsonb_array_elements_text(p->'courses_known') x),
                   case when v_c.course_name is not null then array[v_c.course_name] else '{}' end),
          p->>'area_tips',
          coalesce((select array_agg(x) from jsonb_array_elements_text(p->'availability_days') x), '{mon,tue,wed,thu,fri,sat,sun}'),
          (p->>'day_rate')::numeric)
  on conflict (user_id) do update set
    display_name      = coalesce(p->>'display_name', oo_partners.display_name),
    bio               = coalesce(p->>'bio', oo_partners.bio),
    languages         = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'languages') x), oo_partners.languages),
    handicap          = coalesce((p->>'handicap')::numeric, oo_partners.handicap),
    home_course_name  = coalesce(p->>'home_course_name', oo_partners.home_course_name),
    courses_known     = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'courses_known') x), oo_partners.courses_known),
    area_tips         = coalesce(p->>'area_tips', oo_partners.area_tips),
    availability_days = coalesce((select array_agg(x) from jsonb_array_elements_text(p->'availability_days') x), oo_partners.availability_days),
    day_rate          = coalesce((p->>'day_rate')::numeric, oo_partners.day_rate),
    caddy_profile_id  = coalesce(oo_partners.caddy_profile_id, excluded.caddy_profile_id)
  returning to_jsonb(oo_partners.*) into v_row;
  return v_row;
end $$;

-- 4. redeeming a PARTNER invite flips the profile to the hidden role (the separate initiation process), then opts in
create or replace function public.oo_redeem_invite(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_inv public.oo_invites; v_name text; v_row jsonb;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  select * into v_inv from public.oo_invites where code = upper(trim(p_code)) for update;
  if v_inv.code is null then raise exception 'invite_invalid'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then raise exception 'invite_expired'; end if;
  if v_inv.used >= v_inv.max_uses then raise exception 'invite_used_up'; end if;
  select coalesce(display_name, name) into v_name from public.user_profiles where line_user_id = v_uid;

  if v_inv.kind = 'member' then
    insert into public.oo_members (user_id, society_id, status, invite_code, display_name, approved_by, approved_at)
    values (v_uid, v_inv.society_id, case when v_inv.auto_approve then 'active' else 'pending' end,
            v_inv.code, v_name, case when v_inv.auto_approve then 'invite:'||v_inv.code end,
            case when v_inv.auto_approve then now() end)
    on conflict (user_id) do update
      set status = case when oo_members.status in ('suspended','removed') then oo_members.status
                        when v_inv.auto_approve then 'active' else oo_members.status end,
          invite_code = excluded.invite_code
    returning to_jsonb(oo_members.*) into v_row;
  else
    -- separate population: hidden role, never a caddie row, never in a public directory
    update public.user_profiles set role = 'oo_partner' where line_user_id = v_uid and role is distinct from 'oo_partner';
    v_row := public.oo_partner_optin(jsonb_build_object('invite_code', v_inv.code));
    if v_inv.auto_approve then
      update public.oo_partners set status = 'approved', approved_by = 'invite:'||v_inv.code, approved_at = now()
      where user_id = v_uid and status = 'pending' returning to_jsonb(oo_partners.*) into v_row;
    end if;
  end if;
  update public.oo_invites set used = used + 1 where code = v_inv.code;
  return v_row;
end $$;

-- 5. identity tells the client it is a standalone partner (lands on the 1on1 screen, no dashboard behind it)
create or replace function public.oo_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
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
    'role', v_role,
    'standalone_partner', (v_role = 'oo_partner'),
    'is_caddie', exists (select 1 from public.caddy_profiles c where c.user_id = v_uid),
    'today', public.oo_today()
  );
end $$;
