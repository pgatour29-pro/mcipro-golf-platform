-- v1532 — a kitchen per venue + room ordering (Pete 2026-10-12).
-- "it needs to be the kitchen to the very location where its at and allow for that location to create
--  their own menu and pricing" + "some courses or bars will have rooms … enter that information once
--  until they checkout".
-- * food_venues: one row per kitchen (golf course = course_venues.slug, golf bar = 'bar-<slug>').
--   Public read (name, hours, how they serve). Writes ONLY through food_venue_save with a kitchen token.
-- * Kitchen identity: a golf course signs in with its OWN pro shop PIN (the desk token proshop_pin_login
--   already mints); a golf bar signs in with its venue PIN (food_venue_pins, made in Admin).
-- * menu_items.course_name / food_deals.course_name / kitchen_settings.course_name now hold the venue key.
--   NULL rows are the SAMPLE menu a kitchen can copy; golfers never see it as anyone's prices.
-- * food_stays: the guest's room at a venue (wing, floor, room) until checkout — one entry, every order.
-- Locked tables: RLS on, no policies, privileges revoked. Idempotent. No PIN values in this file.

create table if not exists public.food_venues (
  key text primary key check (key ~ '^[a-z0-9][a-z0-9_-]{1,60}$'),
  kind text not null default 'course' check (kind in ('course', 'bar')),
  name text not null,
  area text,
  kitchen_name text,
  cover_photo text,
  open_time text not null default '06:00',
  close_time text not null default '19:00',
  phone text,
  service_pct numeric not null default 10 check (service_pct >= 0 and service_pct <= 30),
  modes jsonb not null default '{"hole":{"on":true,"fee":50},"turn":{"on":true,"fee":0},"pickup":{"on":true,"fee":0},"table":{"on":true,"fee":0},"room":{"on":false,"fee":60}}',
  wings jsonb not null default '[]',
  floors text,
  charge_to_room boolean not null default false,
  lat double precision,
  lng double precision,
  open boolean not null default false,          -- listed to golfers (needs a menu)
  test boolean not null default false,          -- tester venues: hidden unless the viewer is in test mode or playing there
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.food_venues enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'food_venues' and policyname = 'food_venues_read') then
    create policy food_venues_read on public.food_venues for select using (true);
  end if;
end $$;
revoke insert, update, delete on public.food_venues from anon, authenticated;
grant select on public.food_venues to anon, authenticated;

create table if not exists public.food_venue_pins (venue_key text primary key references public.food_venues(key) on delete cascade, pin text not null unique check (pin ~ '^\d{6}$'), created_at timestamptz not null default now());
create table if not exists public.food_kitchen_tokens (token text primary key, venue_key text not null, created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '180 days');
create table if not exists public.food_admin_pins (pin text primary key check (pin ~ '^\d{6,10}$'));
create table if not exists public.food_login_misses (at timestamptz not null default now(), kind text not null default 'kitchen');
create table if not exists public.food_stays (
  golfer_id text not null, venue_key text not null,
  wing text, floor text, room text not null, checkout_on date not null,
  updated_at timestamptz not null default now(),
  primary key (golfer_id, venue_key)
);
do $$ declare t text; begin
  foreach t in array array['food_venue_pins','food_kitchen_tokens','food_admin_pins','food_login_misses','food_stays'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

alter table public.food_orders add column if not exists venue_key text;
alter table public.food_orders add column if not exists room jsonb;
create index if not exists food_orders_venue_idx on public.food_orders (venue_key, created_at desc);
create index if not exists menu_items_venue_idx on public.menu_items (course_name);

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'food_venues') then
    alter publication supabase_realtime add table public.food_venues;
  end if;
end $$;

-- ---------- token → venue (internal) ----------
create or replace function public._food_venue_of(p_token text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select k.venue_key from public.food_kitchen_tokens k where k.token = p_token and k.expires_at > now()),
    (select coalesce(
        (select f.flagship_slug from public.facilities f where f.id = t.facility_id),
        (select v.slug from public.course_venues v where v.slug = t.course_id limit 1),
        (select v.slug from public.course_venues v where v.course_ref = t.course_id order by v.sort nulls last limit 1))
       from public.proshop_desk_tokens t where t.token = p_token and t.expires_at > now() limit 1)
  );
$$;
revoke all on function public._food_venue_of(text) from public, anon, authenticated;

-- a course kitchen's venue row appears the first time it signs in
create or replace function public._food_venue_ensure(p_key text) returns void
language sql security definer set search_path = public as $$
  insert into public.food_venues (key, kind, name, area, test)
  select v.slug, 'course', v.name, v.area, v.slug = 'cheechan' from public.course_venues v where v.slug = p_key
  on conflict (key) do nothing;
$$;
revoke all on function public._food_venue_ensure(text) from public, anon, authenticated;

-- ---------- kitchen sign-in ----------
create or replace function public.food_kitchen_login(p_pin text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; tok text; r jsonb; v_pin text := btrim(coalesce(p_pin, ''));
begin
  if (select count(*) from public.food_login_misses where at > now() - interval '15 minutes') >= 30 then
    return jsonb_build_object('error', 'too_many');
  end if;
  select fp.venue_key into k from public.food_venue_pins fp where fp.pin = v_pin;
  if k is not null then
    tok := encode(extensions.gen_random_bytes(24), 'hex');
    insert into public.food_kitchen_tokens (token, venue_key) values (tok, k);
    delete from public.food_kitchen_tokens where expires_at < now();
  else
    r := public.proshop_pin_login(v_pin);          -- a golf course: its own pro shop PIN
    tok := r ->> 'desk_token';
    k := case when tok is null then null else public._food_venue_of(tok) end;
  end if;
  if k is null then
    insert into public.food_login_misses default values;
    delete from public.food_login_misses where at < now() - interval '1 day';
    return jsonb_build_object('error', 'wrong_pin');
  end if;
  perform public._food_venue_ensure(k);
  return jsonb_build_object('token', tok, 'venue', (select to_jsonb(v) from public.food_venues v where v.key = k));
end $$;

create or replace function public.food_kitchen_me(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public._food_venue_of(p_token);
begin
  if k is null then return null; end if;
  perform public._food_venue_ensure(k);
  return (select to_jsonb(v) || jsonb_build_object('items', (select count(*) from public.menu_items m where m.course_name = v.key and m.active))
            from public.food_venues v where v.key = k);
end $$;

-- ---------- kitchen setup ----------
create or replace function public.food_venue_save(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := public._food_venue_of(p_token); m jsonb := '{}'; mk text; w jsonb;
begin
  if k is null then return jsonb_build_object('error', 'signed_out'); end if;
  -- modes: only the five known keys, each {on, fee 0..2000}
  foreach mk in array array['hole','turn','pickup','table','room'] loop
    if p ? 'modes' and (p->'modes') ? mk then
      m := m || jsonb_build_object(mk, jsonb_build_object('on', coalesce((p->'modes'->mk->>'on')::boolean, false),
                                                           'fee', greatest(0, least(2000, coalesce((p->'modes'->mk->>'fee')::numeric, 0)))));
    end if;
  end loop;
  select coalesce(jsonb_agg(left(btrim(x), 30)), '[]') into w
    from (select jsonb_array_elements_text(coalesce(p->'wings', '[]')) x limit 12) s where btrim(x) <> '';
  update public.food_venues v set
    kitchen_name = case when p ? 'kitchen_name' then nullif(left(btrim(p->>'kitchen_name'), 40), '') else v.kitchen_name end,
    cover_photo  = case when p ? 'cover_photo' then (case when p->>'cover_photo' ~ '^images/food/[a-z0-9-]+\.(jpg|jpeg|png|webp)$' then p->>'cover_photo' end) else v.cover_photo end,
    open_time    = case when p->>'open_time' ~ '^\d{2}:\d{2}$' then p->>'open_time' else v.open_time end,
    close_time   = case when p->>'close_time' ~ '^\d{2}:\d{2}$' then p->>'close_time' else v.close_time end,
    phone        = case when p ? 'phone' then nullif(left(regexp_replace(p->>'phone', '[^+\d ]', '', 'g'), 20), '') else v.phone end,
    service_pct  = case when p ? 'service_pct' then greatest(0, least(30, coalesce((p->>'service_pct')::numeric, 10))) else v.service_pct end,
    modes        = case when p ? 'modes' then v.modes || m else v.modes end,
    wings        = case when p ? 'wings' then w else v.wings end,
    floors       = case when p ? 'floors' then nullif(left(btrim(p->>'floors'), 30), '') else v.floors end,
    charge_to_room = case when p ? 'charge_to_room' then coalesce((p->>'charge_to_room')::boolean, false) else v.charge_to_room end,
    lat = case when p ? 'lat' and (p->>'lat')::double precision between -90 and 90 then (p->>'lat')::double precision else v.lat end,
    lng = case when p ? 'lng' and (p->>'lng')::double precision between -180 and 180 then (p->>'lng')::double precision else v.lng end,
    -- a kitchen opens to golfers only with a menu of its own
    open = case when p ? 'open' then coalesce((p->>'open')::boolean, false)
                  and exists (select 1 from public.menu_items i where i.course_name = v.key and i.active) else v.open end,
    updated_at = now()
  where v.key = k;
  return (select to_jsonb(v) || jsonb_build_object('items', (select count(*) from public.menu_items i where i.course_name = v.key and i.active))
            from public.food_venues v where v.key = k);
end $$;

-- start from the sample menu: copy the shared default (course_name null) once
create or replace function public.food_menu_from_sample(p_token text) returns integer
language plpgsql security definer set search_path = public as $$
declare k text := public._food_venue_of(p_token); n integer;
begin
  if k is null then return -1; end if;
  if exists (select 1 from public.menu_items where course_name = k and active) then return 0; end if;
  insert into public.menu_items (course_name, name, description, price, category, station, prep_min, art, wash1, wash2, available, popular, spice_levels, addons, sort, active, photo)
  select k, name, description, price, category, station, prep_min, art, wash1, wash2, true, popular, spice_levels, addons, sort, true, photo
    from public.menu_items where course_name is null and active;
  get diagnostics n = row_count;
  return n;
end $$;

-- the course name of a live round → its kitchen
create or replace function public.food_venue_for_course(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select v.key from public.food_venues v where v.key = public.venue_of(p_name);
$$;

-- ---------- rooms: tell us once, until checkout ----------
create or replace function public.food_stay_get(p_golfer text, p_venue text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g text := public._app_golfer(p_golfer); r public.food_stays;
begin
  if g is null then return null; end if;
  delete from public.food_stays where golfer_id = g and checkout_on < (now() at time zone 'Asia/Bangkok')::date;
  select * into r from public.food_stays where golfer_id = g and venue_key = p_venue;
  if r is null then return null; end if;
  return jsonb_build_object('wing', r.wing, 'floor', r.floor, 'room', r.room, 'checkout_on', r.checkout_on);
end $$;

create or replace function public.food_stay_set(p_golfer text, p_venue text, p_wing text, p_floor text, p_room text, p_checkout date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g text := public._app_golfer(p_golfer); today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if g is null then return jsonb_build_object('error', 'signed_out'); end if;
  if not exists (select 1 from public.food_venues where key = p_venue and (modes->'room'->>'on')::boolean) then return jsonb_build_object('error', 'no_rooms'); end if;
  if nullif(btrim(coalesce(p_room, '')), '') is null then return jsonb_build_object('error', 'room'); end if;
  if p_checkout is null or p_checkout < today or p_checkout > today + 60 then return jsonb_build_object('error', 'checkout'); end if;
  insert into public.food_stays (golfer_id, venue_key, wing, floor, room, checkout_on, updated_at)
  values (g, p_venue, nullif(left(btrim(p_wing), 30), ''), nullif(left(btrim(p_floor), 10), ''), left(btrim(p_room), 12), p_checkout, now())
  on conflict (golfer_id, venue_key) do update set wing = excluded.wing, floor = excluded.floor, room = excluded.room,
     checkout_on = excluded.checkout_on, updated_at = now();
  return public.food_stay_get(p_golfer, p_venue);
end $$;

create or replace function public.food_stay_clear(p_golfer text, p_venue text) returns void
language sql security definer set search_path = public as $$
  delete from public.food_stays where golfer_id = public._app_golfer(p_golfer) and venue_key = p_venue;
$$;

-- ---------- Admin: golf bars + their kitchen PIN ----------
-- one gate for every Admin call: 10 wrong tries per 15 minutes, then nothing answers (v1532b, security review)
create or replace function public._food_admin_ok(p_admin text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.food_login_misses where kind = 'admin' and at > now() - interval '15 minutes') >= 10 then return false; end if;
  if exists (select 1 from public.food_admin_pins ap where ap.pin = btrim(coalesce(p_admin, ''))) then return true; end if;
  insert into public.food_login_misses (kind) values ('admin');
  return false;
end $$;
revoke all on function public._food_admin_ok(text) from public, anon, authenticated;
create or replace function public.food_admin_bars(p_admin text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public._food_admin_ok(p_admin) then return jsonb_build_object('error', 'wrong_pin'); end if;
  return jsonb_build_object('bars', coalesce((select jsonb_agg(jsonb_build_object('key', v.key, 'name', v.name, 'area', v.area, 'open', v.open,
            'pin', p.pin, 'items', (select count(*) from public.menu_items i where i.course_name = v.key and i.active)) order by v.name)
     from public.food_venues v left join public.food_venue_pins p on p.venue_key = v.key where v.kind = 'bar'), '[]'));
end $$;

create or replace function public.food_admin_bar_create(p_admin text, p_name text, p_area text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; base text; n int := 0; v_pin text;
begin
  if not public._food_admin_ok(p_admin) then return jsonb_build_object('error', 'wrong_pin'); end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null then return jsonb_build_object('error', 'name'); end if;
  base := 'bar-' || left(trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g')), 40);
  k := base;
  while exists (select 1 from public.food_venues where key = k) loop n := n + 1; k := base || '-' || n; end loop;
  loop
    v_pin := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');   -- CSPRNG
    exit when v_pin !~ '^(\d)\1{5}$' and v_pin not in ('123456', '654321')
      and not exists (select 1 from public.food_venue_pins x where x.pin = v_pin)
      and not exists (select 1 from public.proshop_pins x where x.pin = v_pin)
      and not exists (select 1 from public.proshop_facility_pins x where x.pin = v_pin);
  end loop;
  insert into public.food_venues (key, kind, name, area) values (k, 'bar', left(btrim(p_name), 60), nullif(left(btrim(coalesce(p_area, '')), 40), ''));
  insert into public.food_venue_pins (venue_key, pin) values (k, v_pin);
  return jsonb_build_object('key', k, 'pin', v_pin);
end $$;

create or replace function public.food_admin_bar_delete(p_admin text, p_key text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public._food_admin_ok(p_admin) then return jsonb_build_object('error', 'wrong_pin'); end if;
  delete from public.menu_items where course_name = p_key and exists (select 1 from public.food_venues where key = p_key and kind = 'bar');
  delete from public.food_venues where key = p_key and kind = 'bar';
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.food_kitchen_login(text), public.food_kitchen_me(text), public.food_venue_save(text, jsonb),
  public.food_menu_from_sample(text), public.food_venue_for_course(text), public.food_stay_get(text, text),
  public.food_stay_set(text, text, text, text, text, date), public.food_stay_clear(text, text),
  public.food_admin_bars(text), public.food_admin_bar_create(text, text, text), public.food_admin_bar_delete(text, text)
  to anon, authenticated;
