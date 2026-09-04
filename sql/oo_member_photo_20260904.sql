-- 1on1 (v1100): FACIAL PROFILE PHOTO within 24h of activation.
-- Pete 2026-09-04: "all members are required to have a profile photo within 24 hours of activation, if not the
-- account will be suspended or removed" + "it can't be a avatar or emoji, it must be a facial photo".
--
-- Model: the member uploads through the 1on1 screen → edge fn oo-face-check asks Gemini "real photograph of a human
-- face?" → on YES the fn (service role) calls oo_photo_verified(): stamps oo_members.photo_url/photo_verified_at,
-- makes it the app profile photo (profile_data.media.profilePhoto) and lifts a no-photo suspension. A member is
-- "photo ok" only while the verified URL is STILL their current profile photo (swapping back to an avatar lapses it).
-- Enforcement: oo_photo_sweep() every 15 min (pg_cron) suspends active members past approved_at + grace with no
-- verified photo (suspended_reason = 'no_photo'; admins exempt) and restores them the moment a verified photo exists.
-- Admin override: oo_admin_set_photo(user, ok) accepts the current photo by eye (AI false negative) or rejects one.
-- Functions rewritten here (oo_me, oo_admin_set_member) are based on the LIVE prosrc of 2026-09-04 (= v1099 file).

alter table public.oo_members
  add column if not exists photo_url         text,
  add column if not exists photo_verified_at timestamptz,
  add column if not exists photo_check       jsonb,
  add column if not exists suspended_reason  text;
alter table public.oo_settings add column if not exists photo_grace_hours int not null default 24;

-- the member's CURRENT app profile photo (uploaded media.profilePhoto only — OAuth avatars never count by themselves)
create or replace function public.oo_profile_photo(p_uid text) returns text
language sql stable security definer set search_path = public as $$
  select nullif(u.profile_data->'media'->>'profilePhoto', '') from public.user_profiles u where u.line_user_id = p_uid
$$;

-- verified = a face-checked URL that is still the current profile photo
create or replace function public.oo_photo_ok(p_uid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.oo_members m
                 where m.user_id = p_uid and m.photo_verified_at is not null and m.photo_url is not null
                   and m.photo_url = public.oo_profile_photo(p_uid))
$$;

create or replace function public.oo_photo_deadline(p_uid text) returns timestamptz
language sql stable security definer set search_path = public as $$
  select m.approved_at + make_interval(hours => coalesce((select s.photo_grace_hours from public.oo_settings s limit 1), 24))
  from public.oo_members m where m.user_id = p_uid
$$;

-- the face check passed (edge fn oo-face-check, service role ONLY)
create or replace function public.oo_photo_verified(p_user text, p_url text, p_check jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row jsonb;
begin
  if p_user is null or p_url is null then raise exception 'bad_args'; end if;
  update public.user_profiles
     set profile_data = jsonb_set(coalesce(profile_data, '{}'::jsonb), '{media}',
                                  coalesce(profile_data->'media', '{}'::jsonb) || jsonb_build_object('profilePhoto', p_url), true)
   where line_user_id = p_user;
  update public.oo_members
     set photo_url = p_url, photo_verified_at = now(), photo_check = coalesce(p_check, photo_check),
         status = case when status = 'suspended' and suspended_reason = 'no_photo' then 'active' else status end,
         suspended_reason = case when suspended_reason = 'no_photo' then null else suspended_reason end
   where user_id = p_user
  returning to_jsonb(oo_members.*) into v_row;
  if v_row is null then raise exception 'not_a_member'; end if;
  return v_row;
end $$;
revoke all on function public.oo_photo_verified(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.oo_photo_verified(text, text, jsonb) to service_role;

-- admin override: accept the member's current profile photo by eye, or reject a verified one
create or replace function public.oo_admin_set_photo(p_user text, p_ok boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row jsonb; v_url text;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_ok then
    v_url := public.oo_profile_photo(p_user);
    if v_url is null then raise exception 'no_photo'; end if;
    update public.oo_members
       set photo_url = v_url, photo_verified_at = now(), photo_check = jsonb_build_object('by', 'admin', 'admin', public.oo_uid(), 'at', now()),
           status = case when status = 'suspended' and suspended_reason = 'no_photo' then 'active' else status end,
           suspended_reason = case when suspended_reason = 'no_photo' then null else suspended_reason end
     where user_id = p_user returning to_jsonb(oo_members.*) into v_row;
  else
    update public.oo_members
       set photo_verified_at = null, photo_check = jsonb_build_object('by', 'admin', 'rejected', true, 'admin', public.oo_uid(), 'at', now())
     where user_id = p_user returning to_jsonb(oo_members.*) into v_row;
  end if;
  if v_row is null then raise exception 'not_found'; end if;
  return v_row;
end $$;
revoke all on function public.oo_admin_set_photo(text, boolean) from public;
grant execute on function public.oo_admin_set_photo(text, boolean) to authenticated;

-- the sweep (pg_cron, every 15 min): suspend past-deadline members without a verified photo; restore once they have one
create or replace function public.oo_photo_sweep() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_susp int := 0; v_rest int := 0;
begin
  with due as (
    select m.user_id from public.oo_members m
    where m.status = 'active' and m.approved_at is not null
      and public.oo_photo_deadline(m.user_id) < now()
      and not public.oo_photo_ok(m.user_id)
      and not exists (select 1 from public.oo_admins a where a.user_id = m.user_id)
  )
  update public.oo_members m set status = 'suspended', suspended_reason = 'no_photo'
  from due where m.user_id = due.user_id;
  get diagnostics v_susp = row_count;
  update public.oo_members m set status = 'active', suspended_reason = null
  where m.status = 'suspended' and m.suspended_reason = 'no_photo' and public.oo_photo_ok(m.user_id);
  get diagnostics v_rest = row_count;
  return jsonb_build_object('suspended', v_susp, 'restored', v_rest, 'at', now());
end $$;
revoke all on function public.oo_photo_sweep() from public, anon, authenticated;

-- identity: photo state for the member UI (cube pill, banner, gate)
create or replace function public.oo_me() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_uid text := public.oo_uid(); v_member jsonb; v_partner jsonb; v_admin boolean;
begin
  if v_uid is null then return jsonb_build_object('signed_in', false); end if;
  v_admin := public.oo_is_admin();
  select to_jsonb(m) into v_member from public.oo_members m where m.user_id = v_uid and m.status <> 'removed';
  select to_jsonb(p) into v_partner from public.oo_partners p where p.user_id = v_uid;
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
    'is_caddie', exists (select 1 from public.caddy_profiles c where c.user_id = v_uid),
    'today', public.oo_today()
  );
end $$;

-- admin status writes clear the automatic no-photo flag (a manual Reactivate restarts the 24h clock via approved_at)
create or replace function public.oo_admin_set_member(p_user text, p_status text, p_expires date default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row jsonb; v_b record;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_status not in ('pending','active','suspended','expired','removed') then raise exception 'bad_status'; end if;
  insert into public.oo_members (user_id, status, expires_at, notes, approved_by, approved_at,
                                 display_name)
  values (p_user, p_status, p_expires, p_notes,
          case when p_status = 'active' then public.oo_uid() end, case when p_status = 'active' then now() end,
          (select coalesce(display_name, name) from public.user_profiles where line_user_id = p_user))
  on conflict (user_id) do update set
    status = excluded.status, expires_at = excluded.expires_at, notes = coalesce(excluded.notes, oo_members.notes),
    suspended_reason = null,
    approved_by = case when excluded.status = 'active' then public.oo_uid() else oo_members.approved_by end,
    approved_at = case when excluded.status = 'active' then now() else oo_members.approved_at end
  returning to_jsonb(oo_members.*) into v_row;
  if p_status = 'removed' then
    for v_b in select id, dayoff_request_id from public.oo_bookings
               where member_id = p_user and status in ('requested','accepted') and date_to >= public.oo_today() for update
    loop
      if v_b.dayoff_request_id is not null then
        delete from public.caddy_dayoff_requests where id = v_b.dayoff_request_id and status = 'pending';
      end if;
      update public.oo_bookings set status = 'cancelled', cancelled_by = 'admin', cancel_reason = 'member_removed', cancelled_at = now()
      where id = v_b.id;
    end loop;
  end if;
  return v_row;
end $$;

-- schedule the sweep (idempotent)
do $$ begin perform cron.unschedule('oo_photo_sweep'); exception when others then null; end $$;
select cron.schedule('oo_photo_sweep', '*/15 * * * *', 'select public.oo_photo_sweep()');
