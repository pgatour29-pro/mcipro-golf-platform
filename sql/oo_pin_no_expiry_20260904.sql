-- 1on1 (v1098, 2026-09-04) — Pete: "i don't want a 24hr pin". A member enters the PIN ONCE and stays unlocked
-- until an admin changes the PIN (rotation still clears every member's pin_ok_at). pin_ttl_hours NULL = no expiry.
alter table public.oo_settings drop constraint if exists oo_settings_pin_ttl_hours_check;
alter table public.oo_settings alter column pin_ttl_hours drop not null;
alter table public.oo_settings alter column pin_ttl_hours drop default;
alter table public.oo_settings add constraint oo_settings_pin_ttl_hours_check check (pin_ttl_hours is null or pin_ttl_hours between 1 and 720);
update public.oo_settings set pin_ttl_hours = null;

create or replace function public.oo_pin_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select public.oo_is_admin() or exists (
    select 1 from public.oo_members m
    join public.oo_settings s on s.society_id = m.society_id
    where m.user_id = public.oo_uid()
      and s.pin_hash is not null
      and m.pin_ok_at is not null
      and (s.pin_ttl_hours is null or m.pin_ok_at > now() - make_interval(hours => s.pin_ttl_hours))
  )
$$;

create or replace function public.oo_admin_set_pin(p_pin text, p_ttl_hours int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_salt text; v_soc uuid := public.oo_default_society(); v_row public.oo_settings;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if trim(coalesce(p_pin, '')) !~ '^[0-9]{4,8}$' then raise exception 'bad_pin'; end if;
  v_salt := gen_random_uuid()::text;
  insert into public.oo_settings (society_id, pin_hash, pin_salt, pin_set_at, pin_set_by, pin_ttl_hours)
  values (v_soc, encode(sha256(convert_to(v_salt || trim(p_pin), 'UTF8')), 'hex'), v_salt, now(), public.oo_uid(), p_ttl_hours)
  on conflict (society_id) do update set
    pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, pin_set_at = now(), pin_set_by = public.oo_uid(),
    pin_ttl_hours = p_ttl_hours
  returning * into v_row;
  update public.oo_members set pin_ok_at = null where society_id = v_soc;
  return public.oo_admin_pin_info();
end $$;

create or replace function public.oo_admin_pin_info() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_s public.oo_settings; v_name text;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  select * into v_s from public.oo_settings where society_id = public.oo_default_society();
  select coalesce(display_name, name) into v_name from public.user_profiles where line_user_id = v_s.pin_set_by;
  return jsonb_build_object('is_set', v_s.pin_hash is not null, 'set_at', v_s.pin_set_at, 'set_by', coalesce(v_name, v_s.pin_set_by),
                            'ttl_hours', v_s.pin_ttl_hours);
end $$;
