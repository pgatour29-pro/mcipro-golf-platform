-- Course change log (2026-10-07). Every INSERT/UPDATE/DELETE on the tables a course's pro shop,
-- caddie master or manager works on is written here by a row trigger, whichever screen or RPC made
-- the change: before/after (changed keys only on UPDATE), who (the x-mcp-actor headers the app sets
-- after login, else the JWT line_id, else 'system'), when, from which IP/country/device. PIN logins
-- to the pro shop dashboard are logged too (op PIN_LOGIN). Read back through course_change_log_list
-- (same anon posture as the tables it mirrors; gate on verified staff at Auth Phase 2).
-- Rollback: sql/course_change_log_20261007_ROLLBACK.sql

create table if not exists public.course_change_log (
    id          bigserial primary key,
    at          timestamptz not null default now(),
    course_key  text,                       -- normalised: lower, [^a-z0-9] stripped ('eastern_star' = 'eastern-star')
    course_raw  text,                       -- the value as the row carried it
    tbl         text not null,
    op          text not null,              -- INSERT | UPDATE | DELETE | PIN_LOGIN
    row_id      text,
    actor       text,                       -- LINE id, 'pin', or 'system'
    actor_name  text,                       -- URI-encoded by the client (headers are ASCII); decoded on display
    actor_role  text,                       -- golfer | organizer | caddy | proshop | manager | caddymaster | admin ...
    ip          text,
    ip_country  text,
    ua          text,
    ident       jsonb,                      -- who/when the row is about (name, date, time, caddy number) so an UPDATE diff reads on its own
    before      jsonb,
    after       jsonb
);
alter table public.course_change_log add column if not exists ident jsonb;
create index if not exists course_change_log_course_at on public.course_change_log (course_key, at desc);
create index if not exists course_change_log_row on public.course_change_log (tbl, row_id);
alter table public.course_change_log enable row level security;   -- no policies: RPC-only
revoke all on public.course_change_log from public, anon, authenticated;

create or replace function public.course_key_of(p text)
returns text language sql immutable as $$
    select nullif(lower(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]+', '', 'g')), '')
$$;

-- Any key containing 'pin' (pin, staff_pin, super_admin_pin, caddy_pin ...) is masked at write time.
create or replace function public.course_change_log_redact(p jsonb)
returns jsonb language sql immutable as $$
    select case when p is null or jsonb_typeof(p) <> 'object' then p
           else coalesce((select jsonb_object_agg(e.key, case when e.key ilike '%pin%' then '"••••"'::jsonb else e.value end)
                          from jsonb_each(p) e), '{}'::jsonb) end
$$;

-- The row trigger. Generic: finds the course from course_id / course_slug / venue / slug, or via
-- caddy_profiles for caddy-keyed tables; diffs changed keys on UPDATE; skips updates that only
-- touched housekeeping columns.
create or replace function public.course_change_log_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    h        jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    claims   jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
    o        jsonb := case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end;
    n        jsonb := case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end;
    r        jsonb := coalesce(n, o);
    c_raw    text;
    rid      text;
    b_diff   jsonb;
    a_diff   jsonb;
    k        text;
    skip     text[] := array['updated_at','last_seen','last_seen_at','views','updatedat'];
    changed  boolean := false;
    ident    jsonb;
begin
    -- a short handle on the row for the list view
    select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into ident
    from jsonb_each(r) e
    where e.key in ('golfer_name','customer_name','player_name','name','caddie_name','caddy_name','caddy_number','number',
                    'booking_date','work_date','date','tee_time','start_time','title','golfer_key','status','state','slot_date','event_date')
      and e.value is not null and e.value <> 'null'::jsonb;
    -- course scope
    c_raw := coalesce(r->>'course_id', r->>'course_slug', r->>'venue', r->>'slug');
    if c_raw is null and (r ? 'caddy_id') then
        select cp.course_id into c_raw from public.caddy_profiles cp where cp.id::text = r->>'caddy_id' limit 1;
    end if;
    rid := coalesce(r->>'id', r->>'booking_id', (r->>'caddy_id') || ':' || coalesce(r->>'work_date', ''), r->>'golfer_key');

    if TG_OP = 'UPDATE' then
        b_diff := '{}'::jsonb; a_diff := '{}'::jsonb;
        for k in select jsonb_object_keys(n) loop
            if (o->k) is distinct from (n->k) then
                if not (k = any(skip)) then changed := true; end if;
                b_diff := b_diff || jsonb_build_object(k, o->k);
                a_diff := a_diff || jsonb_build_object(k, n->k);
            end if;
        end loop;
        if not changed then return null; end if;
    else
        b_diff := o; a_diff := n;
    end if;
    -- never let a PIN into the log (the reader is browser-callable)
    b_diff := public.course_change_log_redact(b_diff);
    a_diff := public.course_change_log_redact(a_diff);

    insert into public.course_change_log
        (course_key, course_raw, tbl, op, row_id, actor, actor_name, actor_role, ip, ip_country, ua, ident, before, after)
    values (
        public.course_key_of(c_raw), c_raw, TG_TABLE_NAME, TG_OP, rid,
        coalesce(nullif(h->>'x-mcp-actor', ''), nullif(claims->>'line_id', ''), case when h = '{}'::jsonb then 'system' else 'anon' end),
        left(h->>'x-mcp-actor-name', 120),
        left(h->>'x-mcp-role', 24),
        coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1)),
        h->>'cf-ipcountry',
        left(h->>'user-agent', 200),
        ident, b_diff, a_diff);
    return null;
exception when others then
    -- the log must never block the change it records
    return null;
end;
$$;
revoke all on function public.course_change_log_fn() from public, anon, authenticated;

do $$
declare t text;
begin
    foreach t in array array[
        'bookings', 'caddy_bookings', 'caddy_profiles', 'caddy_checkins', 'caddy_suspensions',
        'caddy_work_days', 'caddy_work_week', 'course_open_times', 'course_open_time_claims',
        'course_event_slots', 'course_offers', 'course_work_orders', 'golf_course_settings',
        'course_golfer_notes', 'proshop_pins', 'course_staff', 'course_admins', 'course_venues']
    loop
        if to_regclass('public.' || t) is not null then
            execute format('drop trigger if exists course_change_log_trg on public.%I', t);
            execute format('create trigger course_change_log_trg after insert or update or delete on public.%I for each row execute function public.course_change_log_fn()', t);
        end if;
    end loop;
end $$;

-- PIN login to the pro shop dashboard is now a logged event (op PIN_LOGIN, actor 'pin').
create or replace function public.proshop_pin_login(p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    res jsonb;
    h   jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
begin
    select jsonb_build_object('course_id', c.id, 'course_name', c.name) into res
    from public.proshop_pins p
    join public.courses c on c.id = p.course_id
    where p.pin = btrim(coalesce(p_pin, ''))
    limit 1;
    if res is not null then
        insert into public.course_change_log (course_key, course_raw, tbl, op, row_id, actor, actor_name, actor_role, ip, ip_country, ua, after)
        values (public.course_key_of(res->>'course_id'), res->>'course_id', 'proshop_pins', 'PIN_LOGIN', res->>'course_id',
                coalesce(nullif(h->>'x-mcp-actor', ''), 'pin'), left(h->>'x-mcp-actor-name', 120), 'proshop',
                coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1)), h->>'cf-ipcountry',
                left(h->>'user-agent', 200), jsonb_build_object('course_name', res->>'course_name'));
    end if;
    return res;
end;
$$;
revoke all on function public.proshop_pin_login(text) from public;
grant execute on function public.proshop_pin_login(text) to anon, authenticated;

-- Reader. p_courses = the id/slug aliases the dashboard knows for its course (courses.id + tee-sheet
-- slug). Keys are normalised and matched by PREFIX so the venue's scorecard spellings fall in too
-- ('burapha' covers burapha-golf / burapha-ac / burapha_west; 'khaokheow' covers khao_kheow_a/ab/ac).
-- Newest first, capped at 2000 rows per call; p_before pages further back.
create or replace function public.course_change_log_list(
    p_courses text[], p_days integer default 30, p_limit integer default 300,
    p_tbl text default null, p_before bigint default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    with keys as (select distinct public.course_key_of(x) k from unnest(coalesce(p_courses, '{}'::text[])) x)
    select coalesce(jsonb_agg(to_jsonb(l) order by l.id desc), '[]'::jsonb)
    from (
        select id, at, course_raw, tbl, op, row_id, actor, actor_name, actor_role, ip_country, ua, ident, before, after
        from public.course_change_log c
        where exists (select 1 from keys where keys.k is not null and length(keys.k) >= 4
                      and (c.course_key = keys.k or c.course_key like keys.k || '%'))
          and c.at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3660)))
          and (p_tbl is null or c.tbl = p_tbl)
          and (p_before is null or c.id < p_before)
        order by c.id desc
        limit greatest(1, least(coalesce(p_limit, 300), 2000))
    ) l
$$;
revoke all on function public.course_change_log_list(text[], integer, integer, text, bigint) from public;
grant execute on function public.course_change_log_list(text[], integer, integer, text, bigint) to anon, authenticated;

