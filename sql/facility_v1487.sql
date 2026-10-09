-- v1487 (2026-10-09) FACILITIES — several courses run by one pro shop.
-- Pete: Green Valley Rayong (flagship), St Andrews 2000 and Silky Oak are one company's courses at one
-- site; the caddies are one pool working all three; memberships are valid at all three. The pro shop
-- wants one tee sheet that shows all three courses at once, switches to any one of them, books on any
-- of them from one place, never double-books a caddy across courses, and sees the golfers and caddies
-- of the whole facility for marketing.
--
-- Nothing here changes what a single course does: a course outside a facility keeps its sheet exactly
-- as before. A facility is a registry row + its member courses; everything else reads it.
-- PIN VALUES ARE NEVER IN THIS FILE (public repo) — see proshop_course_pins_20261001.sql.
-- Rollback: sql/facility_v1487_ROLLBACK.sql

-- ---------------------------------------------------------------- registry
create table if not exists public.facilities (
  id            text primary key,                 -- 'barcelona-golf'
  name          text not null,
  flagship_slug text,                             -- tee-sheet slug of the flagship course
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create table if not exists public.facility_courses (
  slug         text primary key,                                  -- tee-sheet slug (course_venues.slug)
  facility_id  text not null references public.facilities(id) on delete cascade,
  course_ref   text,                                              -- courses.id (POS, messages, pins)
  short_name   text not null,
  match_token  text not null,                                     -- free-text course names contain this (lower)
  veto_token   text,                                              -- ...and never this ("summit" for Green Valley)
  sort         integer not null default 100
);
create index if not exists idx_facility_courses_facility on public.facility_courses(facility_id);
alter table public.facilities enable row level security;
alter table public.facility_courses enable row level security;
drop policy if exists facilities_read on public.facilities;
drop policy if exists facility_courses_read on public.facility_courses;
create policy facilities_read on public.facilities for select to anon, authenticated using (true);
create policy facility_courses_read on public.facility_courses for select to anon, authenticated using (true);
grant select on public.facilities, public.facility_courses to anon, authenticated;

-- ---------------------------------------------------------------- Silky Oak (new to the platform)
insert into public.courses (id, name, location, total_holes, par, country)
values ('silky_oak', 'Silky Oak Country Club', 'Rayong', 18, 72, 'Thailand')
on conflict (id) do nothing;
insert into public.course_venues (slug, name, short_name, area, region, holes, par, nines, course_ref, photo_url, sort)
values ('silky-oak', 'Silky Oak Country Club', 'Silky Oak', 'Rayong', 'Pattaya', 18, 72, null, 'silky_oak', null, 43)
on conflict (slug) do nothing;
update public.course_venues set course_ref = 'green_valley_rayong' where slug = 'green-valley-rayong' and course_ref is null;
update public.course_venues set course_ref = 'st-andrews-2000'     where slug = 'st-andrews-2000'     and course_ref is null;
insert into public.golf_course_settings (course_id, course_name, teesheet_config)
values ('silky-oak', 'Silky Oak Country Club',
        '{"basic": {"endTime": "18:00", "interval": "10", "startTime": "06:00", "golfCourse": "silky-oak", "courseLayout": "18", "teesPerCourse": "1"}}'::jsonb)
on conflict (course_id) do nothing;

-- ---------------------------------------------------------------- the facility
insert into public.facilities (id, name, flagship_slug) values ('barcelona-golf', 'Barcelona Golf', 'green-valley-rayong')
on conflict (id) do update set name = excluded.name, flagship_slug = excluded.flagship_slug, updated_at = now();
insert into public.facility_courses (slug, facility_id, course_ref, short_name, match_token, veto_token, sort) values
  ('green-valley-rayong', 'barcelona-golf', 'green_valley_rayong', 'Green Valley', 'green valley', 'summit', 1),
  ('st-andrews-2000',     'barcelona-golf', 'st-andrews-2000',     'St Andrews',   'andrews',      null,     2),
  ('silky-oak',           'barcelona-golf', 'silky_oak',           'Silky Oak',    'silky',        null,     3)
on conflict (slug) do update set facility_id = excluded.facility_id, course_ref = excluded.course_ref,
  short_name = excluded.short_name, match_token = excluded.match_token, veto_token = excluded.veto_token, sort = excluded.sort;

-- which facility (if any) a tee-sheet slug or courses.id belongs to — the client asks this once per load
create or replace function public.facility_of(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'id', f.id, 'name', f.name, 'flagship', f.flagship_slug,
           'courses', (select jsonb_agg(jsonb_build_object('slug', c.slug, 'course_ref', c.course_ref, 'short', c.short_name,
                                                           'name', coalesce(v.name, c.short_name), 'token', c.match_token, 'veto', c.veto_token)
                                        order by c.sort)
                         from public.facility_courses c left join public.course_venues v on v.slug = c.slug
                        where c.facility_id = f.id))
    from public.facilities f
   where f.id = p_key
      or exists (select 1 from public.facility_courses x where x.facility_id = f.id and (x.slug = p_key or x.course_ref = p_key))
   limit 1
$$;
revoke all on function public.facility_of(text) from public;
grant execute on function public.facility_of(text) to anon, authenticated;

-- ---------------------------------------------------------------- facility PIN (master control)
-- One PIN opens the whole facility: dashboard on the flagship course, tee sheet in facility mode.
-- Same rules as proshop_pins: RLS on, zero policies, value only in the DB.
create table if not exists public.proshop_facility_pins (
  facility_id text primary key references public.facilities(id) on update cascade on delete cascade,
  pin         text not null unique check (pin ~ '^[0-9]{6}$' and pin <> '000000'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.proshop_facility_pins enable row level security;
revoke all on public.proshop_facility_pins from public, anon, authenticated;

-- PIN -> what it opens. A course PIN wins; then a facility PIN (lands on the flagship course, carries the
-- facility). NULL when the PIN belongs to nothing. Logs the login like v1477.
create or replace function public.proshop_pin_login(p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    res jsonb;
    h   jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
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
    end if;
    return res;
end;
$$;
revoke all on function public.proshop_pin_login(text) from public;
grant execute on function public.proshop_pin_login(text) to anon, authenticated;

-- courses that open with their own PIN — a facility PIN covers every course in the facility
create or replace function public.proshop_pin_courses()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name) order by x.name), '[]'::jsonb)
    from (
      select c.id, c.name from public.proshop_pins p join public.courses c on c.id = p.course_id
      union
      select c.id, c.name from public.proshop_facility_pins p
        join public.facility_courses fc on fc.facility_id = p.facility_id
        join public.courses c on c.id = fc.course_ref
    ) x
$$;
revoke all on function public.proshop_pin_courses() from public;
grant execute on function public.proshop_pin_courses() to anon, authenticated;

-- ---------------------------------------------------------------- memberships (valid at every course of the facility)
create table if not exists public.course_memberships (
  id           uuid primary key default gen_random_uuid(),
  facility_id  text not null references public.facilities(id) on delete cascade,
  golfer_id    text,                              -- LINE id / app id when known
  golfer_name  text not null,
  member_no    text,
  tier         text not null default 'facility' check (tier in ('facility', 'single', 'corporate', 'family')),
  home_slug    text,                              -- the member's home course (flagship by default)
  valid_from   date not null default current_date,
  valid_to     date,
  status       text not null default 'active' check (status in ('active', 'expired', 'suspended')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_course_memberships_fac on public.course_memberships(facility_id, status);
create index if not exists idx_course_memberships_golfer on public.course_memberships(golfer_id);
create index if not exists idx_course_memberships_name on public.course_memberships(lower(golfer_name));
alter table public.course_memberships enable row level security;
drop policy if exists course_memberships_select on public.course_memberships;
drop policy if exists course_memberships_insert on public.course_memberships;
drop policy if exists course_memberships_update on public.course_memberships;
create policy course_memberships_select on public.course_memberships for select to anon, authenticated using (true);
create policy course_memberships_insert on public.course_memberships for insert to anon, authenticated with check (true);
create policy course_memberships_update on public.course_memberships for update to anon, authenticated using (true) with check (true);
grant select, insert, update on public.course_memberships to anon, authenticated;

-- ---------------------------------------------------------------- insights (marketing) — one call, one facility
-- Golfers are keyed by their app id when present, else their lowercased name. Rounds + tee-sheet bookings +
-- caddy jobs + society days at the facility's courses, matched by the course's token in free-text course names.
create or replace function public.facility_insights(p_facility text, p_days integer default 90)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d0  date := current_date - greatest(7, least(730, coalesce(p_days, 90)));
  res jsonb;
begin
  create temp table if not exists _fx_act (gkey text, gname text, slug text, kind text, d date, dow int) on commit drop;
  truncate _fx_act;   -- (not DELETE: the API role runs with safeupdate on)
  -- rounds (played)
  insert into _fx_act
  select coalesce(r.golfer_id, r.user_id::text, lower(btrim(r.player_name))), coalesce(r.player_name, ''), fc.slug, 'round',
         coalesce(r.played_at, r.created_at)::date, extract(isodow from coalesce(r.played_at, r.created_at))::int
    from public.rounds r
    join public.facility_courses fc on fc.facility_id = p_facility
   where coalesce(r.played_at, r.created_at) >= d0
     and lower(coalesce(r.course_name, '')) like '%' || fc.match_token || '%'
     and (fc.veto_token is null or lower(coalesce(r.course_name, '')) not like '%' || fc.veto_token || '%')
     and coalesce(r.golfer_id, r.user_id::text, r.player_name) is not null;
  -- tee-sheet bookings (the course's own book)
  insert into _fx_act
  select coalesce(g->>'odoo_id', b.golfer_id, lower(btrim(g->>'name'))), coalesce(g->>'name', b.golfer_name, ''), fc.slug, 'booking', b.date, extract(isodow from b.date)::int
    from public.bookings b
    join public.facility_courses fc on fc.facility_id = p_facility and fc.slug = b.course_id
    cross join lateral jsonb_array_elements(coalesce(b.booking_data->'golfers', '[]'::jsonb)) g
   where b.date >= d0 and b.deleted is not true and b.source in ('teesheet', 'hotdeal', 'app')
     and coalesce(g->>'odoo_id', g->>'name') is not null;
  -- caddy jobs
  insert into _fx_act
  select coalesce(cb.golfer_id, cb.user_id, lower(btrim(cb.golfer_name))), coalesce(cb.golfer_name, ''), fc.slug, 'caddy', cb.booking_date, extract(isodow from cb.booking_date)::int
    from public.caddy_bookings cb
    join public.facility_courses fc on fc.facility_id = p_facility
   where cb.booking_date >= d0 and cb.status <> 'cancelled'
     and (fc.slug = cb.course_id or (lower(coalesce(cb.course_name, '')) like '%' || fc.match_token || '%'
          and (fc.veto_token is null or lower(coalesce(cb.course_name, '')) not like '%' || fc.veto_token || '%')))
     and coalesce(cb.golfer_id, cb.user_id, cb.golfer_name) is not null;

  with
  per_golfer as (
    select gkey, max(gname) gname, count(distinct slug) n_courses, count(*) n_acts, max(d) last_d,
           array_agg(distinct slug) slugs
      from _fx_act group by gkey),
  members as (
    select m.*, coalesce(m.golfer_id, lower(btrim(m.golfer_name))) gkey
      from public.course_memberships m where m.facility_id = p_facility and m.status = 'active'
       and (m.valid_to is null or m.valid_to >= current_date)),
  by_course as (
    select fc.slug, fc.short_name, fc.sort,
           (select count(*) from _fx_act a where a.slug = fc.slug and a.kind = 'round') rounds,
           (select count(*) from _fx_act a where a.slug = fc.slug and a.kind = 'booking') tee_golfers,
           (select count(*) from _fx_act a where a.slug = fc.slug and a.kind = 'caddy') caddy_loops,
           (select count(distinct gkey) from _fx_act a where a.slug = fc.slug) golfers,
           (select count(distinct a.gkey) from _fx_act a join members m on m.gkey = a.gkey where a.slug = fc.slug) member_golfers,
           (select jsonb_agg(coalesce(z.n, 0) order by g) from generate_series(1, 7) g
              left join (select dow, count(*) n from _fx_act a where a.slug = fc.slug group by dow) z on z.dow = g) heat
      from public.facility_courses fc where fc.facility_id = p_facility),
  pairs as (
    select a.slug s1, b.slug s2, count(distinct a.gkey) n
      from (select distinct gkey, slug from _fx_act) a
      join (select distinct gkey, slug from _fx_act) b on b.gkey = a.gkey and b.slug > a.slug
     group by 1, 2),
  flag as (select coalesce(f.flagship_slug, (select slug from public.facility_courses where facility_id = p_facility order by sort limit 1)) slug
             from public.facilities f where f.id = p_facility),
  cj as (
    select cb.caddy_id, fc.slug, coalesce(cb.golfer_id, cb.user_id, lower(cb.golfer_name)) gk
      from public.caddy_bookings cb join public.facility_courses fc on fc.facility_id = p_facility
     where cb.booking_date >= d0 and cb.status <> 'cancelled' and cb.caddy_id is not null
       and (fc.slug = cb.course_id or (lower(coalesce(cb.course_name, '')) like '%' || fc.match_token || '%'
            and (fc.veto_token is null or lower(coalesce(cb.course_name, '')) not like '%' || fc.veto_token || '%')))),
  caddies as (
    select cp.id, cp.caddy_number, cp.name, cp.rating, count(*) loops, count(distinct cj.gk) golfers,
           (select jsonb_object_agg(q.slug, q.n) from (select z.slug, count(*) n from cj z where z.caddy_id = cp.id group by z.slug) q) per_course
      from cj join public.caddy_profiles cp on cp.id = cj.caddy_id
     group by cp.id, cp.caddy_number, cp.name, cp.rating
     order by loops desc limit 8)
  select jsonb_build_object(
    'days', current_date - d0,
    'golfers', (select count(*) from per_golfer),
    'multi_course', (select count(*) from per_golfer where n_courses >= 2),
    'all_courses', (select count(*) from per_golfer where n_courses >= (select count(*) from public.facility_courses where facility_id = p_facility)),
    'members', (select count(*) from members),
    'members_idle_30', (select count(*) from members m where not exists (select 1 from _fx_act a where a.gkey = m.gkey and a.d >= current_date - 30)),
    'rounds', (select count(*) from _fx_act where kind = 'round'),
    'caddy_loops', (select count(*) from _fx_act where kind = 'caddy'),
    'caddy_fees', (select coalesce(sum(cb.payment_amount), 0) from public.caddy_bookings cb join public.facility_courses fc on fc.facility_id = p_facility
                    where cb.booking_date >= d0 and cb.status <> 'cancelled' and (fc.slug = cb.course_id or lower(coalesce(cb.course_name,'')) like '%' || fc.match_token || '%')),
    'caddy_unpaid', (select coalesce(sum(cb.payment_amount), 0) from public.caddy_bookings cb join public.facility_courses fc on fc.facility_id = p_facility
                    where cb.booking_date >= d0 and cb.status = 'completed' and coalesce(cb.payment_status, '') <> 'paid'
                      and (fc.slug = cb.course_id or lower(coalesce(cb.course_name,'')) like '%' || fc.match_token || '%')),
    'by_course', (select jsonb_agg(to_jsonb(b) order by b.sort) from by_course b),
    'pairs', (select coalesce(jsonb_agg(to_jsonb(p) order by p.n desc), '[]'::jsonb) from pairs p),
    'segments', jsonb_build_object(
       'flagship_only', (select count(*) from per_golfer g, flag where (select count(*) from _fx_act a where a.gkey = g.gkey and a.slug = flag.slug) >= 3
                                                                      and g.n_courses = 1),
       'members_idle_30', (select count(*) from members m where not exists (select 1 from _fx_act a where a.gkey = m.gkey and a.d >= current_date - 30)),
       'weekend_only', (select count(*) from per_golfer g where g.n_acts >= 3 and not exists (select 1 from _fx_act a where a.gkey = g.gkey and a.dow < 6)),
       'guests_3plus', (select count(*) from per_golfer g where g.n_acts >= 3 and not exists (select 1 from members m where m.gkey = g.gkey))),
    'caddies', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from caddies c)
  ) into res;
  return res;
end;
$$;
revoke all on function public.facility_insights(text, integer) from public;
grant execute on function public.facility_insights(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------- Tee Times slug matcher knows Silky Oak
-- (teetime_slug_for is the SQL port of CourseLink KEYS — sql/teetimes_v1455.sql; one new key, nothing else moves)
create or replace function public.teetime_slug_for(p_name text) returns text
language plpgsql immutable as $$
declare
  keys jsonb := '[
    ["bangpakong",[["bangpakong"]]],["bangpra-international",[["bangpra"]]],["burapha-ac",[["burapha"]]],
    ["burapha-cd",[["burapha"]]],["burapha-east",[["burapha"]]],["cheechan",[["chee","chan"],["cheechan"]]],
    ["crystal-bay",[["crystal","bay"]]],["eastern-star",[["eastern","star"]]],["grand-prix",[["grand","prix"]]],
    ["green-valley-rayong",[["green","valley"]],["summit","chiang","mai"]],["greenwood",[["greenwood"]]],
    ["hermes",[["hermes"]]],["khao-kheow",[["khao","kheow"],["khaokheow"]]],["laem-chabang",[["laem","chabang"]]],
    ["mountain-shadow",[["mountain","shadow"]]],["pattana-golf-resort",[["pattana"]]],["pattavia",[["pattavia"]]],
    ["pattaya-golf",[["pattaya","country"],["pattaya","cc"]]],["phoenix",[["phoenix"]]],["pleasant-valley",[["pleasant","valley"]]],
    ["plutaluang",[["plutaluang"]]],["royal-garden",[["royal","garden"]]],["royal-lakeside",[["royal","lakeside"],["lakeside"]]],
    ["siam-plantation",[["siam","plantation"]]],["siam-cc-plantation",[["siam","plantation"]]],["siam-cc-old",[["siam","old"]]],
    ["siam-cc-waterside",[["siam","waterside"]]],["st-andrews-2000",[["andrews"]]],["silky-oak",[["silky"]]],["thai-country-club",[["thai","country"]]],
    ["treasure-hill-golf",[["treasure","hill"]]],
    ["siam-rolling-hills",[["rolling","hills"]]],["siam-bangkok",[["siam","bangkok"]]],["black-mountain",[["black","mountain"]]],
    ["springfield-royal",[["springfield"]]],["majestic-creek",[["majestic"]]],["lake-view-huahin",[["lake","view"]]],
    ["palm-hills",[["palm","hills"]]],["pineapple-valley",[["pineapple","valley"]]],["royal-hua-hin",[["royal","hua","hin"]]],
    ["sea-pines",[["sea","pines"]]],["alpine-chiangmai",[["alpine"]]],["highlands-chiangmai",[["highlands"]]],
    ["north-hill-chiangmai",[["north","hill"]]],["summit-green-valley",[["summit"]]]
  ]';
  toks text[];
  k jsonb; s jsonb; ok boolean;
begin
  toks := regexp_split_to_array(trim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', ' ', 'g')), ' ');
  for k in select value from jsonb_array_elements(keys) loop
    if jsonb_array_length(k) > 2 and exists (select 1 from jsonb_array_elements_text(k->2) w where w = any(toks)) then continue; end if;
    for s in select value from jsonb_array_elements(k->1) loop
      select bool_and(w = any(toks)) into ok from jsonb_array_elements_text(s) w;
      if ok then return k->>0; end if;
    end loop;
  end loop;
  return null;
end $$;
