-- 1on1 access PIN + admin-granted privilege (v1094, 2026-09-03).
-- Pete: "No regular users can access this cube. Needs a special pin for now and access privilege set by JOA or me."
-- The gate is enforced HERE, not just in the UI: oo_is_member() (used by every member RPC + RLS policy + the
-- storage policy) now also requires a fresh PIN check. With NO PIN configured, no member gets in at all —
-- admins (oo_admins = Jason/JOA + Pete) always bypass. PIN is stored salted + sha256 (core pg, no pgcrypto).

create table if not exists public.oo_settings (
  society_id     uuid primary key default public.oo_default_society(),
  pin_hash       text,
  pin_salt       text,
  pin_set_at     timestamptz,
  pin_set_by     text,
  pin_ttl_hours  int not null default 24 check (pin_ttl_hours between 1 and 720)
);
alter table public.oo_settings enable row level security;
revoke all on public.oo_settings from anon, authenticated;

create table if not exists public.oo_pin_attempts (
  id       bigserial primary key,
  user_id  text not null,
  ok       boolean not null,
  at       timestamptz not null default now()
);
create index if not exists oo_pin_attempts_user_idx on public.oo_pin_attempts(user_id, at desc);
alter table public.oo_pin_attempts enable row level security;
revoke all on public.oo_pin_attempts from anon, authenticated;

alter table public.oo_members add column if not exists pin_ok_at timestamptz;

-- is a PIN configured for the (single) society?
create or replace function public.oo_pin_set() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.oo_settings s where s.society_id = public.oo_default_society() and s.pin_hash is not null)
$$;

-- has THIS member entered the PIN recently? admins bypass; no PIN configured = nobody passes
create or replace function public.oo_pin_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select public.oo_is_admin() or exists (
    select 1 from public.oo_members m
    join public.oo_settings s on s.society_id = m.society_id
    where m.user_id = public.oo_uid()
      and s.pin_hash is not null
      and m.pin_ok_at is not null
      and m.pin_ok_at > now() - make_interval(hours => s.pin_ttl_hours)
  )
$$;

-- membership = active row + not expired + fresh PIN (or admin)
create or replace function public.oo_is_member(p_society uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.oo_members m
    where m.user_id = public.oo_uid()
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at >= public.oo_today())
      and (p_society is null or m.society_id = p_society)
  ) and public.oo_pin_ok()
$$;

-- member enters the PIN: 8 wrong tries in 15 minutes locks that user for 15 minutes
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
    delete from public.oo_pin_attempts where user_id = v_uid and not ok;   -- clean slate after success
    return jsonb_build_object('ok', true);
  end if;
  insert into public.oo_pin_attempts (user_id, ok) values (v_uid, false);
  return jsonb_build_object('ok', false, 'remaining', greatest(0, 8 - v_fail - 1));
end $$;

-- admin sets / rotates the PIN (4–8 digits). Rotating clears every member's pin_ok_at → all re-enter.
create or replace function public.oo_admin_set_pin(p_pin text, p_ttl_hours int default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_salt text; v_soc uuid := public.oo_default_society(); v_row public.oo_settings;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  if trim(coalesce(p_pin, '')) !~ '^[0-9]{4,8}$' then raise exception 'bad_pin'; end if;
  v_salt := gen_random_uuid()::text;
  insert into public.oo_settings (society_id, pin_hash, pin_salt, pin_set_at, pin_set_by, pin_ttl_hours)
  values (v_soc, encode(sha256(convert_to(v_salt || trim(p_pin), 'UTF8')), 'hex'), v_salt, now(), public.oo_uid(), coalesce(p_ttl_hours, 24))
  on conflict (society_id) do update set
    pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt, pin_set_at = now(), pin_set_by = public.oo_uid(),
    pin_ttl_hours = coalesce(p_ttl_hours, oo_settings.pin_ttl_hours)
  returning * into v_row;
  update public.oo_members set pin_ok_at = null where society_id = v_soc;
  return public.oo_admin_pin_info();
end $$;

-- admin reads PIN status (never the PIN itself)
create or replace function public.oo_admin_pin_info() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_s public.oo_settings; v_name text;
begin
  if not public.oo_is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  select * into v_s from public.oo_settings where society_id = public.oo_default_society();
  select coalesce(display_name, name) into v_name from public.user_profiles where line_user_id = v_s.pin_set_by;
  return jsonb_build_object('is_set', v_s.pin_hash is not null, 'set_at', v_s.pin_set_at, 'set_by', coalesce(v_name, v_s.pin_set_by),
                            'ttl_hours', coalesce(v_s.pin_ttl_hours, 24));
end $$;

-- oo_me: same shape as v1089 + pin_required / pin_ok / pin_set so the client can show the PIN sheet
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

revoke all on function public.oo_pin_set() from public;
revoke all on function public.oo_pin_ok() from public;
revoke all on function public.oo_verify_pin(text) from public;
revoke all on function public.oo_admin_set_pin(text, int) from public;
revoke all on function public.oo_admin_pin_info() from public;
grant execute on function public.oo_pin_set() to authenticated;
grant execute on function public.oo_pin_ok() to authenticated;
grant execute on function public.oo_verify_pin(text) to authenticated;
grant execute on function public.oo_admin_set_pin(text, int) to authenticated;
grant execute on function public.oo_admin_pin_info() to authenticated;
grant execute on function public.oo_me() to authenticated;
grant execute on function public.oo_is_member(uuid) to authenticated;
