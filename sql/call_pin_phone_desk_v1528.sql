-- v1528 (2026-10-12) CALL PIN + PHONE DESK
-- Pete: phone-in golfers repeat name/date/time/caddy every call, and Thai staff struggle with foreign names.
-- A golfer sets a 6-digit Call PIN (unique platform-wide); the pro shop types it and the golfer comes up.
-- The PIN lives ONLY in golfer_call_pins (locked). Bookings / profiles are anon-readable, so the PIN is never
-- written there. A pro shop reads PINs only with a desk token that proshop_pin_login hands out for a course's
-- OWN PIN (the shared 000000 never reaches the server, so those courses get no token). Caddies never get one.

create table if not exists public.golfer_call_pins (
  golfer_id  text primary key,
  pin        text not null unique check (pin ~ '^\d{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.golfer_call_pins enable row level security;
revoke all on public.golfer_call_pins from anon, authenticated;

create table if not exists public.proshop_desk_tokens (
  token       text primary key,
  course_id   text not null,
  facility_id text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '180 days'
);
alter table public.proshop_desk_tokens enable row level security;
revoke all on public.proshop_desk_tokens from anon, authenticated;

create table if not exists public.desk_lookup_misses (
  token text not null,
  at    timestamptz not null default now()
);
create index if not exists desk_lookup_misses_tok on public.desk_lookup_misses (token, at);
alter table public.desk_lookup_misses enable row level security;
revoke all on public.desk_lookup_misses from anon, authenticated;

-- 111111, 123456, 654321 ... are refused
create or replace function public._call_pin_weak(p text)
returns boolean language sql immutable as $$
  select p ~ '^(\d)\1{5}$' or strpos('0123456789', p) > 0 or strpos('9876543210', p) > 0
$$;

-- ---------- golfer side ----------
create or replace function public.call_pin_get(p_golfer text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me text := public._app_golfer(p_golfer);
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'no_account'); end if;
  return jsonb_build_object('ok', true, 'pin', (select g.pin from public.golfer_call_pins g where g.golfer_id = me));
end $$;

-- p_pin null/'' = "Give me one"
create or replace function public.call_pin_set(p_pin text, p_golfer text)
returns jsonb language plpgsql security definer set search_path = public as $$
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
  insert into public.golfer_call_pins (golfer_id, pin) values (me, v_pin)
  on conflict (golfer_id) do update set pin = excluded.pin, updated_at = now();
  return jsonb_build_object('ok', true, 'pin', v_pin);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'reason', 'taken');
end $$;

-- ---------- pro shop side ----------
-- the venues a desk token speaks for: venue slugs + course ids (bookings carry either, or only a name)
create or replace function public._desk_keys(p_token text)
returns text[] language sql stable security definer set search_path = public as $$
  with t as (select * from public.proshop_desk_tokens where token = p_token and expires_at > now())
  select array_remove(array_agg(distinct k), null) from (
    select t.course_id k from t
    union select v.slug from t join public.course_venues v on v.course_ref = t.course_id or v.slug = t.course_id
    union select fc.slug from t join public.facility_courses fc on fc.facility_id = t.facility_id
    union select fc.course_ref from t join public.facility_courses fc on fc.facility_id = t.facility_id
  ) x
$$;

-- PIN -> golfer. Misses are counted per token: 20 an hour, then locked for the hour.
create or replace function public.desk_call_lookup(p_token text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  keys text[] := public._desk_keys(p_token);
  v_pin text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  g    record;
begin
  if keys is null or cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  if (select count(*) from public.desk_lookup_misses m where m.token = p_token and m.at > now() - interval '1 hour') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  select up.line_user_id id, up.name, up.handicap_index hcp, c.pin into g
    from public.golfer_call_pins c join public.user_profiles up on up.line_user_id = c.golfer_id
   where c.pin = v_pin limit 1;
  if g.id is null then
    insert into public.desk_lookup_misses (token) values (p_token);
    delete from public.desk_lookup_misses where at < now() - interval '1 day';
    return jsonb_build_object('ok', true, 'golfer', null);
  end if;
  return jsonb_build_object('ok', true, 'golfer', jsonb_build_object('id', g.id, 'name', g.name, 'hcp', g.hcp, 'pin', g.pin));
end $$;

-- golfer ids -> PIN, only for golfers with a booking at THIS course (the PIN follows their bookings there)
create or replace function public.desk_call_pins(p_token text, p_ids text[])
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare keys text[] := public._desk_keys(p_token);
begin
  if keys is null or cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  return jsonb_build_object('ok', true, 'pins', coalesce((
    select jsonb_object_agg(c.golfer_id, c.pin)
      from public.golfer_call_pins c
     where c.golfer_id = any (p_ids[1:500])
       and (exists (select 1 from public.caddy_bookings cb
                     where (cb.golfer_id = c.golfer_id or cb.user_id = c.golfer_id)
                       and (cb.course_id = any (keys) or public.venue_of(cb.course_name) = any (keys)))
         or exists (select 1 from public.bookings b
                     where b.golfer_id = c.golfer_id and coalesce(b.deleted, false) = false
                       and (b.course_id = any (keys) or public.venue_of(coalesce(b.course_name, b.tee_sheet_course)) = any (keys))))
  ), '{}'::jsonb));
end $$;

-- token check for a page that was signed in before v1528 (or whose token expired): re-enter the course PIN once
create or replace function public.desk_token_ok(p_token text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(cardinality(public._desk_keys(p_token)), 0) > 0
$$;

-- proshop_pin_login: unchanged from live (v1487) + hands out a desk token
create or replace function public.proshop_pin_login(p_pin text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
    res jsonb;
    h   jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    tok text;
begin
    select jsonb_build_object('course_id', c.id, 'course_name', c.name) into res
      from public.proshop_pins p join public.courses c on c.id = p.course_id
     where p.pin = btrim(coalesce(p_pin, '')) limit 1;
    if res is null then
        select jsonb_build_object('course_id', coalesce(fc.course_ref, c.id), 'course_name', coalesce(c.name, v.name, fc.short_name),
                                  'facility_id', f.id, 'facility_name', f.name) into res
          from public.proshop_facility_pins p
          join public.facilities f on f.id = p.facility_id
          left join public.facility_courses fc on fc.facility_id = f.id and fc.slug = f.flagship_slug
          left join public.course_venues v on v.slug = fc.slug
          left join public.courses c on c.id = fc.course_ref
         where p.pin = btrim(coalesce(p_pin, '')) limit 1;
    end if;
    if res is not null then
        insert into public.course_change_log (course_key, course_raw, tbl, op, row_id, actor, actor_name, actor_role, ip, ip_country, ua, after)
        values (public.course_key_of(res->>'course_id'), res->>'course_id', 'proshop_pins', 'PIN_LOGIN', res->>'course_id',
                coalesce(nullif(h->>'x-mcp-actor', ''), 'pin'), left(h->>'x-mcp-actor-name', 120), 'proshop',
                coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1)), h->>'cf-ipcountry',
                left(h->>'user-agent', 200), jsonb_build_object('course_name', res->>'course_name', 'facility_id', res->>'facility_id'));
        tok := encode(extensions.gen_random_bytes(24), 'hex');
        insert into public.proshop_desk_tokens (token, course_id, facility_id) values (tok, res->>'course_id', res->>'facility_id');
        delete from public.proshop_desk_tokens where expires_at < now();
        res := res || jsonb_build_object('desk_token', tok);
    end if;
    return res;
end;
$function$;

revoke all on function public._call_pin_weak(text) from public, anon, authenticated;
revoke all on function public._desk_keys(text) from public, anon, authenticated;
revoke all on function public.call_pin_get(text), public.call_pin_set(text, text), public.desk_call_lookup(text, text),
                       public.desk_call_pins(text, text[]), public.desk_token_ok(text) from public;
grant execute on function public.call_pin_get(text), public.call_pin_set(text, text), public.desk_call_lookup(text, text),
                          public.desk_call_pins(text, text[]), public.desk_token_ok(text) to anon, authenticated;

-- v1528b (security review): every course-PIN login mints a new token, so a per-TOKEN miss count could be reset by
-- logging in again. Misses now count per COURSE (or facility): 30 an hour across all of that course's tokens.
alter table public.desk_lookup_misses add column if not exists course_id text;
create index if not exists desk_lookup_misses_course on public.desk_lookup_misses (course_id, at);
create or replace function public.desk_call_lookup(p_token text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  keys  text[] := public._desk_keys(p_token);
  v_pin text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  who   text;
  g     record;
begin
  if keys is null or cardinality(keys) = 0 then return jsonb_build_object('ok', false, 'reason', 'token'); end if;
  select coalesce(t.facility_id, t.course_id) into who from public.proshop_desk_tokens t where t.token = p_token;
  if (select count(*) from public.desk_lookup_misses m where m.course_id = who and m.at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  select up.line_user_id id, up.name, up.handicap_index hcp, c.pin into g
    from public.golfer_call_pins c join public.user_profiles up on up.line_user_id = c.golfer_id
   where c.pin = v_pin limit 1;
  if g.id is null then
    insert into public.desk_lookup_misses (token, course_id) values (p_token, who);
    delete from public.desk_lookup_misses where at < now() - interval '1 day';
    return jsonb_build_object('ok', true, 'golfer', null);
  end if;
  return jsonb_build_object('ok', true, 'golfer', jsonb_build_object('id', g.id, 'name', g.name, 'hcp', g.hcp, 'pin', g.pin));
end $$;
revoke all on function public.desk_call_lookup(text, text) from public;
grant execute on function public.desk_call_lookup(text, text) to anon, authenticated;
