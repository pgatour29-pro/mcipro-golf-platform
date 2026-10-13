-- v1545 EVERY registered golfer gets a Call PIN (Pete 2026-10-13): "give everyone who is registered a Call Pin, they can
-- keep the assigned call pin or generate their own … if they already have a PIN do not replace them".
--   · golfers who can sign in (LINE U…, KAKAO-…, GOOGLE-…; golfer / organizer) get a random PIN — ONLY when they have
--     none: the insert is ON CONFLICT DO NOTHING, an existing PIN is never touched. assigned = true until they change it.
--   · new sign-ups get one on insert; call_pin_get assigns one to anyone still missing it
--   · call_pin_check: the live "taken / available" while they type
--   · pin_lookup: PIN → name for EVERY course (no own-PIN token needed) and for societies — name + handicap only,
--     rate-limited per device/IP. Showing a golfer's PIN next to their bookings (desk_call_pins) still needs the
--     course's own-PIN desk token.

begin;

alter table public.golfer_call_pins add column if not exists assigned boolean not null default false;

create or replace function public._call_pin_account(p_id text, p_role text)
returns boolean language sql immutable as $fn$
  select (p_id ~ '^U[0-9a-f]{32}$' or p_id ~ '^(KAKAO|GOOGLE)-.+') and coalesce(p_role, 'golfer') in ('golfer', 'organizer');
$fn$;

-- a fresh PIN for a golfer who has none (never replaces one)
create or replace function public._call_pin_assign(p_golfer text)
returns text language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_pin text;
  i     int := 0;
begin
  select pin into v_pin from public.golfer_call_pins where golfer_id = p_golfer;
  if v_pin is not null then return v_pin; end if;
  loop
    i := i + 1;
    if i > 200 then return null; end if;
    v_pin := (100000 + floor(random() * 900000))::int::text;
    continue when public._call_pin_weak(v_pin) or exists (select 1 from public.golfer_call_pins g where g.pin = v_pin);
    begin
      insert into public.golfer_call_pins (golfer_id, pin, assigned) values (p_golfer, v_pin, true)
      on conflict (golfer_id) do nothing;
      exit;
    exception when unique_violation then
      -- someone took that number a moment ago: draw again
    end;
  end loop;
  return (select pin from public.golfer_call_pins where golfer_id = p_golfer);
end $fn$;

-- every registered golfer, now
select count(public._call_pin_assign(u.line_user_id))
  from public.user_profiles u
 where public._call_pin_account(u.line_user_id, u.role)
   and not exists (select 1 from public.golfer_call_pins g where g.golfer_id = u.line_user_id);

-- every new sign-up
create or replace function public.user_profiles_call_pin()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
begin
  if public._call_pin_account(new.line_user_id, new.role) then perform public._call_pin_assign(new.line_user_id); end if;
  return null;
exception when others then
  raise warning 'user_profiles_call_pin: %', sqlerrm;
  return null;
end $fn$;
drop trigger if exists trg_user_profiles_call_pin on public.user_profiles;
create trigger trg_user_profiles_call_pin after insert or update of role on public.user_profiles
  for each row execute function public.user_profiles_call_pin();

-- the golfer's own PIN (assigns one if they still have none)
create or replace function public.call_pin_get(p_golfer text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  me text := public._app_golfer(p_golfer);
  r  record;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'no_account'); end if;
  select pin, assigned into r from public.golfer_call_pins where golfer_id = me;
  if r.pin is null and exists (select 1 from public.user_profiles u where u.line_user_id = me and public._call_pin_account(u.line_user_id, u.role)) then
    perform public._call_pin_assign(me);
    select pin, assigned into r from public.golfer_call_pins where golfer_id = me;
  end if;
  return jsonb_build_object('ok', true, 'pin', r.pin, 'assigned', coalesce(r.assigned, false));
end $fn$;

-- their own choice (or Give me one) = no longer "assigned"
create or replace function public.call_pin_set(p_pin text, p_golfer text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  me  text := public._app_golfer(p_golfer);
  v_pin text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  i   int := 0;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'no_account'); end if;
  if v_pin = '' then
    loop
      i := i + 1;
      v_pin := (100000 + floor(random() * 900000))::int::text;
      exit when not public._call_pin_weak(v_pin)
            and not exists (select 1 from public.golfer_call_pins g where g.pin = v_pin and g.golfer_id <> me);
      if i > 60 then return jsonb_build_object('ok', false, 'reason', 'busy'); end if;
    end loop;
  elsif v_pin !~ '^\d{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'format');
  elsif public._call_pin_weak(v_pin) then
    return jsonb_build_object('ok', false, 'reason', 'weak');
  elsif exists (select 1 from public.golfer_call_pins g where g.pin = v_pin and g.golfer_id <> me) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;
  insert into public.golfer_call_pins (golfer_id, pin, assigned) values (me, v_pin, false)
  on conflict (golfer_id) do update set pin = excluded.pin, assigned = false, updated_at = now();
  return jsonb_build_object('ok', true, 'pin', v_pin);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'reason', 'taken');
end $fn$;

-- the live checker while they type
create or replace function public.call_pin_check(p_pin text, p_golfer text)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  me  text := public._app_golfer(p_golfer);
  v   text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  own text;
begin
  if v !~ '^\d{6}$' then return jsonb_build_object('state', 'format'); end if;
  if public._call_pin_weak(v) then return jsonb_build_object('state', 'weak'); end if;
  select golfer_id into own from public.golfer_call_pins where pin = v;
  if own is null then return jsonb_build_object('state', 'available'); end if;
  if own = me then return jsonb_build_object('state', 'yours'); end if;
  return jsonb_build_object('state', 'taken');
end $fn$;
grant execute on function public.call_pin_check(text, text) to anon, authenticated;

-- PIN → golfer for every course and every society: name + handicap, nothing else; rate-limited per device / IP
create table if not exists public.pin_lookup_log (
  who text not null,
  at  timestamptz not null default now(),
  hit boolean not null default false
);
create index if not exists pin_lookup_log_who on public.pin_lookup_log (who, at);
alter table public.pin_lookup_log enable row level security;
revoke all on public.pin_lookup_log from anon, authenticated;

create or replace function public.pin_lookup(p_pin text, p_by text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  h   jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  ip  text := coalesce(nullif(h->>'cf-connecting-ip', ''), nullif(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1), ''), 'unknown');
  v   text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  g   record;
begin
  if v !~ '^\d{6}$' then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  if (select count(*) from public.pin_lookup_log l where l.who = ip and l.at > now() - interval '10 minutes') >= 60
     or (select count(*) from public.pin_lookup_log l where l.who = ip and not l.hit and l.at > now() - interval '10 minutes') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  select up.line_user_id id, up.name, up.handicap_index hcp into g
    from public.golfer_call_pins c join public.user_profiles up on up.line_user_id = c.golfer_id
   where c.pin = v limit 1;
  insert into public.pin_lookup_log (who, hit) values (ip, g.id is not null);
  delete from public.pin_lookup_log where at < now() - interval '1 day';
  if g.id is null then return jsonb_build_object('ok', true, 'golfer', null); end if;
  return jsonb_build_object('ok', true, 'golfer', jsonb_build_object('id', g.id, 'name', g.name, 'hcp', g.hcp));
end $fn$;
grant execute on function public.pin_lookup(text, text) to anon, authenticated;

commit;
