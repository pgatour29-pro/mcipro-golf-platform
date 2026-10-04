-- v1455 TEE TIMES (golfer marketplace) — Pete 2026-10-04: "revamp the entire module and make sure all of
-- the wiring and hooks are in place from the golf courses and caddy bookings ... get rid of the mock courses
-- and pricing ... some form of payment system ... a follow on QR code that the golf courses use for a deposit
-- or payment in full that is through them and the user and nothing to do with MycaddiPro" + "Wire all of the
-- other courses as well ready to go".
--
-- THE MODEL
--   course_venues                 one row per bookable venue (every course on the platform), slug = the pro
--                                 shop tee-sheet slug. Golfers browse this list.
--   golf_course_settings          teesheet_config.basic/full stay the pro shop's (grid + rates);
--     .online_booking (NEW col)   the course's online rules: on/off, hours, days ahead, show rates, how a booking
--                                 is held (none | deposit | full), its OWN QR / PromptPay, cancel window, photo.
--                                 A separate column so an old cached pro shop page (which upserts teesheet_config
--                                 whole) can never wipe it.
--   bookings                      a golfer booking IS a tee-sheet row (source 'teesheet', booking_type 'app') so the
--                                 pro shop sheet, the 4-per-slot trigger, golfer_cancel_booking, My Schedule and
--                                 caddy jobs all work unchanged. Payment state lives in booking_data.app.
--   caddy_bookings                one job per player (picked caddy = confirmed, "pro shop assigns" = Unassigned
--                                 pending), linked by teesheet_booking_id — the v1218 model; caddy_job_alert sends
--                                 the LINE alerts.
-- Money never touches MyCaddiPro: the golfer pays the course from their own bank app and sends the slip; the pro
-- shop confirms. A held booking that is not paid in time is released by cron (teetime_release_expired, every min).

-- ---------------------------------------------------------------- registry
create table if not exists public.course_venues (
  slug        text primary key,
  name        text not null,
  short_name  text,
  area        text,
  region      text not null default 'Pattaya',
  holes       integer not null default 18,
  par         integer default 72,
  nines       jsonb,                 -- {"A":"Andreas","B":"Brookei","C":"Calypso"} when the nines have names
  course_ref  text,                  -- courses.id (scorecards)
  photo_url   text,
  sort        integer not null default 100,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.course_venues enable row level security;
drop policy if exists course_venues_read on public.course_venues;
create policy course_venues_read on public.course_venues for select to anon, authenticated using (true);
grant select on public.course_venues to anon, authenticated;

insert into public.course_venues (slug, name, short_name, area, region, holes, par, nines, course_ref, sort) values
 ('bangpakong',          'Bangpakong Riverside Country Club',       'Bangpakong Riverside', 'Chachoengsao',          'Pattaya', 18, 72, null, 'bangpakong', 10),
 ('pattaya-golf',        'Pattaya Country Club',                    'Pattaya CC',           'Pattaya, Chonburi',     'Pattaya', 18, 72, null, 'pattaya_county', 12),
 ('treasure-hill-golf',  'Treasure Hill Golf & Country Club',       'Treasure Hill',        'Chonburi',              'Pattaya', 18, 72, null, 'treasure_hill', 14),
 ('khao-kheow',          'Khao Kheow Country Club',                 'Khao Kheow',           'Sri Racha, Chonburi',   'Pattaya', 27, 72, '{"A":"A","B":"B","C":"C"}', 'khao_kheow', 16),
 ('bangpra-international','Bangpra International Golf Club',        'Bangpra',              'Sri Racha, Chonburi',   'Pattaya', 18, 72, null, 'bangpra', 18),
 ('burapha-ac',          'Burapha Golf Club',                       'Burapha',              'Sri Racha, Chonburi',   'Pattaya', 36, 72, '{"A":"A","B":"B","C":"C","D":"D"}', 'burapha', 20),
 ('pattana-golf-resort', 'Pattana Golf Resort & Spa',               'Pattana',              'Sri Racha, Chonburi',   'Pattaya', 27, 72, '{"A":"Andreas","B":"Brookei","C":"Calypso"}', null, 22),
 ('phoenix',             'Phoenix Gold Golf & Country Club',        'Phoenix Gold',         'Pattaya, Chonburi',     'Pattaya', 27, 72, '{"A":"Lake","B":"Mountain","C":"Ocean"}', null, 24),
 ('laem-chabang',        'Laem Chabang International Country Club', 'Laem Chabang',         'Sri Racha, Chonburi',   'Pattaya', 27, 72, '{"A":"Mountain","B":"Lake","C":"Valley"}', null, 26),
 ('greenwood',           'Greenwood Golf & Resort',                 'Greenwood',            'Chonburi',              'Pattaya', 27, 72, '{"A":"A","B":"B","C":"C"}', null, 28),
 ('siam-plantation',     'Siam Country Club Plantation',            'Siam CC Plantation',   'Pattaya, Chonburi',     'Pattaya', 27, 72, '{"A":"Pineapple","B":"Sugar Cane","C":"Tapioca"}', null, 30),
 ('siam-cc-old',         'Siam Country Club Old Course',            'Siam CC Old Course',   'Pattaya, Chonburi',     'Pattaya', 18, 72, null, null, 32),
 ('siam-cc-waterside',   'Siam Country Club Waterside',             'Siam CC Waterside',    'Pattaya, Chonburi',     'Pattaya', 18, 72, null, null, 34),
 ('pleasant-valley',     'Pleasant Valley Golf Club',               'Pleasant Valley',      'Chonburi',              'Pattaya', 18, 72, null, null, 36),
 ('eastern-star',        'Eastern Star Country Club',               'Eastern Star',         'Ban Chang, Rayong',     'Pattaya', 18, 72, null, null, 38),
 ('green-valley-rayong', 'Green Valley Rayong Country Club',        'Green Valley Rayong',  'Rayong',                'Pattaya', 18, 72, null, null, 40),
 ('st-andrews-2000',     'St. Andrews 2000 Golf Club',              'St Andrews 2000',      'Rayong',                'Pattaya', 18, 72, null, null, 42),
 ('crystal-bay',         'Crystal Bay Golf Club',                   'Crystal Bay',          'Bang Lamung, Chonburi', 'Pattaya', 18, 72, null, null, 44),
 ('cheechan',            'Chee Chan Golf Resort',                   'Chee Chan',            'Bang Lamung, Chonburi', 'Pattaya', 18, 72, null, null, 46),
 ('mountain-shadow',     'Mountain Shadow Golf Club',               'Mountain Shadow',      'Bang Lamung, Chonburi', 'Pattaya', 18, 72, null, null, 48),
 ('pattavia',            'Pattavia Century Golf Club',              'Pattavia',             'Pattaya, Chonburi',     'Pattaya', 18, 72, null, null, 50),
 ('grand-prix',          'Grand Prix Golf Club',                    'Grand Prix',           'Pattaya, Chonburi',     'Pattaya', 18, 72, null, null, 52),
 ('hermes',              'Hermes Golf Club',                        'Hermes',               'Chonburi',              'Pattaya', 18, 72, null, null, 54),
 ('plutaluang',          'Plutaluang Royal Thai Navy Golf Course',  'Plutaluang',           'Sattahip, Chonburi',    'Pattaya', 18, 72, null, null, 56),
 ('royal-lakeside',      'Royal Lakeside Golf Club',                'Royal Lakeside',       'Chachoengsao',          'Pattaya', 18, 72, null, null, 58),
 ('royal-garden',        'Royal Garden Golf Club',                  'Royal Garden',         'Pattaya, Chonburi',     'Pattaya', 18, 72, null, null, 60),
 ('thai-country-club',   'Thai Country Club',                       'Thai CC',              'Chachoengsao',          'Pattaya', 18, 72, null, null, 62),
 ('siam-rolling-hills',  'Siam Country Club Rolling Hills',         'Siam CC Rolling Hills','Pattaya, Chonburi',     'Pattaya', 18, 72, null, null, 64),
 ('siam-bangkok',        'Siam Country Club Bangkok',               'Siam CC Bangkok',      'Bangkok',               'Bangkok', 18, 72, null, null, 70),
 ('black-mountain',      'Black Mountain Golf Club',                'Black Mountain',       'Hua Hin',               'Hua Hin', 27, 72, '{"A":"East","B":"North","C":"West"}', null, 80),
 ('springfield-royal',   'Springfield Royal Country Club',          'Springfield Royal',    'Hua Hin',               'Hua Hin', 27, 72, '{"A":"Lake","B":"Mountain","C":"Valley"}', null, 82),
 ('majestic-creek',      'Majestic Creek Golf Club',                'Majestic Creek',       'Hua Hin',               'Hua Hin', 27, 72, '{"A":"Creek","B":"Lake","C":"Waterfall"}', null, 84),
 ('lake-view-huahin',    'Lake View Resort and Golf Club',          'Lake View',            'Hua Hin',               'Hua Hin', 36, 72, '{"A":"Desert","B":"Lake","C":"Link","D":"Mountain"}', null, 86),
 ('palm-hills',          'Palm Hills Golf Resort & Country Club',   'Palm Hills',           'Hua Hin',               'Hua Hin', 18, 72, null, null, 88),
 ('pineapple-valley',    'Pineapple Valley Golf Club',              'Pineapple Valley',     'Hua Hin',               'Hua Hin', 18, 72, null, null, 90),
 ('royal-hua-hin',       'Royal Hua Hin Golf Course',               'Royal Hua Hin',        'Hua Hin',               'Hua Hin', 18, 72, null, null, 92),
 ('sea-pines',           'Sea Pines Golf Course',                   'Sea Pines',            'Hua Hin',               'Hua Hin', 18, 72, null, null, 94),
 ('alpine-chiangmai',    'Alpine Golf Club & Resort',               'Alpine',               'Chiang Mai',            'Chiang Mai', 27, 72, '{"A":"A","B":"B","C":"C"}', null, 100),
 ('highlands-chiangmai', 'Highlands Golf & Spa Resort',             'Highlands',            'Chiang Mai',            'Chiang Mai', 27, 72, '{"A":"Highlands","B":"Mountain","C":"Valley"}', null, 102),
 ('north-hill-chiangmai','North Hill Golf Club',                    'North Hill',           'Chiang Mai',            'Chiang Mai', 18, 72, null, null, 104),
 ('summit-green-valley', 'Summit Green Valley Country Club',        'Summit Green Valley',  'Chiang Mai',            'Chiang Mai', 18, 72, null, null, 106)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- course settings: online rules column
alter table public.golf_course_settings add column if not exists online_booking jsonb not null default '{}'::jsonb;

-- every venue gets a settings row; a venue with no sheet grid yet gets the pro shop's own defaults
-- (06:00-18:00, 5 min, one tee per nine) with its real number of nines. Configured courses are untouched.
insert into public.golf_course_settings (course_id, course_name, teesheet_config)
select v.slug, v.name, jsonb_build_object('basic', jsonb_build_object(
         'startTime','06:00','endTime','18:00','interval','5','teesPerCourse','1',
         'courseLayout', case when v.holes >= 36 then '36' when v.holes >= 27 then '27' else '18' end,
         'golfCourse', v.slug), 'updatedAt', now())
  from public.course_venues v
 where not exists (select 1 from public.golf_course_settings s where s.course_id = v.slug);

update public.golf_course_settings s
   set teesheet_config = coalesce(s.teesheet_config, '{}'::jsonb) || jsonb_build_object('basic', jsonb_build_object(
         'startTime','06:00','endTime','18:00','interval','5','teesPerCourse','1',
         'courseLayout', case when v.holes >= 36 then '36' when v.holes >= 27 then '27' else '18' end,
         'golfCourse', v.slug))
  from public.course_venues v
 where v.slug = s.course_id
   and (s.teesheet_config is null or s.teesheet_config->'basic' is null or s.teesheet_config->'basic' = '{}'::jsonb);

-- ---------------------------------------------------------------- helpers
create or replace function public.teetime_min(p text) returns integer
language sql immutable as $$
  select case when p ~ '^\d{1,2}:\d{2}' then split_part(p, ':', 1)::int * 60 + left(split_part(p, ':', 2), 2)::int else null end
$$;
create or replace function public.teetime_hhmm(m integer) returns text
language sql immutable as $$ select lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0') $$;

-- CourseLink.slugFor ported (course-society-link.js KEYS): a free-text course name -> sheet slug by whole tokens.
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
    ["siam-cc-waterside",[["siam","waterside"]]],["st-andrews-2000",[["andrews"]]],["thai-country-club",[["thai","country"]]],
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

-- venueOf(slug) — the first token set; two slugs are the same venue when these match
create or replace function public.teetime_venue_of(p_slug text) returns text
language sql immutable as $$
  select case
    when p_slug in ('burapha-ac','burapha-cd','burapha-east') then 'burapha'
    when p_slug in ('siam-plantation','siam-cc-plantation') then 'siam plantation'
    else p_slug end
$$;

-- the effective settings of a venue (pro shop grid + rates + online rules, with defaults)
create or replace function public.teetime_cfg(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v public.course_venues; s record; b jsonb; f jsonb; o jsonb;
  lay text; nines text[]; tees int; rule text; has_pay boolean; has_rates boolean; show_r boolean;
begin
  select * into v from public.course_venues where slug = p_slug;
  if not found then return null; end if;
  select teesheet_config, online_booking into s from public.golf_course_settings where course_id = p_slug;
  b := coalesce(s.teesheet_config->'basic', '{}'::jsonb);
  f := coalesce(s.teesheet_config->'full', '{}'::jsonb);
  o := coalesce(s.online_booking, '{}'::jsonb);
  lay := coalesce(nullif(b->>'courseLayout', ''), case when v.holes >= 36 then '36' when v.holes >= 27 then '27' else '18' end);
  nines := case lay when '18' then array['A','B'] when '27' then array['A','B','C'] else array['A','B','C','D'] end;
  tees := greatest(1, least(2, coalesce(nullif(b->>'teesPerCourse', '')::int, 1)));
  has_pay := coalesce(nullif(o->>'qr_url', ''), nullif(o->>'promptpay', '')) is not null;
  has_rates := jsonb_typeof(f->'weekdayPeriods') = 'array' and jsonb_array_length(f->'weekdayPeriods') > 0;
  -- the settings form ships template prices (2500/1800/1200 …): rates count only once the course PUBLISHES them
  show_r := coalesce((o->>'show_rates')::boolean, false) and has_rates;
  rule := coalesce(nullif(o->>'rule', ''), 'none');
  -- a course can only ask for money it can be paid: no QR/PromptPay = pay at the course
  if rule in ('deposit', 'full') and not has_pay then rule := 'none'; end if;
  if rule = 'full' and not show_r then rule := case when has_pay then 'deposit' else 'none' end; end if;
  return jsonb_build_object(
    'slug', v.slug, 'name', v.name, 'short', coalesce(v.short_name, v.name), 'area', v.area, 'region', v.region,
    'holes', v.holes, 'par', v.par, 'nine_names', v.nines,
    'photo', coalesce(nullif(o->>'photo_url', ''), v.photo_url),
    'start', coalesce(nullif(b->>'startTime', ''), '06:00'), 'end', coalesce(nullif(b->>'endTime', ''), '18:00'),
    'interval', greatest(5, coalesce(nullif(b->>'interval', '')::int, 5)),
    'nines', to_jsonb(nines), 'tees', tees,
    'enabled', coalesce((o->>'enabled')::boolean, true) and v.active,
    'open_from', coalesce(nullif(o->>'from', ''), nullif(b->>'startTime', ''), '06:00'),
    'open_until', coalesce(nullif(o->>'until', ''), '16:00'),
    'days', greatest(1, least(60, coalesce(nullif(o->>'days', '')::int, 14))),
    'lead_min', greatest(0, least(720, coalesce(nullif(o->>'lead_min', '')::int, 60))),
    'show_rates', show_r,
    'rule', rule,
    'deposit_pp', greatest(0, coalesce(nullif(o->>'deposit_pp', '')::int, 500)),
    'pay_min', greatest(10, least(240, coalesce(nullif(o->>'pay_min', '')::int, 30))),
    'allow_full', coalesce((o->>'allow_full')::boolean, true) and show_r and has_pay,
    'cancel_h', greatest(0, least(168, coalesce(nullif(o->>'cancel_h', '')::int, 24))),
    'pay_to', case when has_pay then jsonb_build_object('qr_url', nullif(o->>'qr_url', ''), 'promptpay', nullif(o->>'promptpay', ''),
                     'payee', coalesce(nullif(o->>'payee', ''), v.name)) else null end,
    'rates', case when show_r then jsonb_build_object(
        'weekday', f->'weekdayPeriods', 'weekend', coalesce(f->'weekendPeriods', f->'weekdayPeriods'),
        'caddy18', coalesce(nullif(f->>'caddyFee18', '')::int, 400), 'cart18', coalesce(nullif(f->>'cartFee18', '')::int, 700),
        'cart_sharing', coalesce(nullif(f->>'cartSharing', ''), 'shared')) else null end,
    'round_min', greatest(120, coalesce(nullif(f->>'roundDuration', '')::int, 270))
  );
end $$;

-- the green fee for one player at (date, HH:MM) from the course's own periods; null when the course has no rates
create or replace function public.teetime_green_fee(p_cfg jsonb, p_date date, p_time text) returns jsonb
language plpgsql immutable as $$
declare per jsonb; p jsonb; m int := public.teetime_min(p_time);
begin
  if p_cfg->'rates' is null or jsonb_typeof(p_cfg->'rates') <> 'object' then return null; end if;
  per := case when extract(isodow from p_date) in (6, 7) then p_cfg->'rates'->'weekend' else p_cfg->'rates'->'weekday' end;
  if jsonb_typeof(per) <> 'array' then return null; end if;
  for p in select value from jsonb_array_elements(per) loop
    if public.teetime_min(p->>'start') <= m and m < public.teetime_min(p->>'end') then
      return jsonb_build_object('label', p->>'label', 'price', coalesce(nullif(p->>'price', '')::int, 0), 'start', p->>'start', 'end', p->>'end');
    end if;
  end loop;
  return null;
end $$;

-- the day's tee-sheet grid for one venue: every (time, column) with golfers booked and whether it is held for
-- a society (event block / open time) — the same footprint proshop-teesheet.html draws.
create or replace function public.teetime_grid(p_slug text, p_date date)
returns table (t text, col integer, nine text, tee integer, booked integer, blocked boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  c jsonb; v_start int; v_end int; v_step int; v_tees int; v_nines text[];
begin
  c := public.teetime_cfg(p_slug);
  if c is null then return; end if;
  v_start := public.teetime_min(c->>'start'); v_end := public.teetime_min(c->>'end'); v_step := (c->>'interval')::int;
  v_tees := (c->>'tees')::int;
  select array_agg(x order by o) into v_nines from jsonb_array_elements_text(c->'nines') with ordinality as a(x, o);
  return query
  with rows_ as (
    select m, (m - v_start) / v_step as ri from generate_series(v_start, v_end, v_step) m
  ), cols as (
    select ((n.o - 1) * v_tees + (tt - 1))::int as ci, n.x as nine, tt::int as tee
      from unnest(v_nines) with ordinality as n(x, o) cross join generate_series(1, v_tees) tt
  ), bk as (
    select ((public.teetime_min(b.time) - v_start) / v_step) as ri,
           coalesce(
             case when b.tee_sheet_course is not null
                  then (array_position(v_nines, b.tee_sheet_course) - 1) * v_tees + (coalesce(b.tee_number, 1) - 1) end,
             nullif(b.booking_data->>'col', '')::int, 0) as ci,
           greatest(coalesce(b.players, 1), 1) as n
      from public.bookings b
     where b.date = p_date and b.kind = 'tee' and not coalesce(b.deleted, false)
       and coalesce(b.source, '') in ('teesheet', 'hotdeal')
       and (b.course_id = p_slug or public.teetime_venue_of(b.course_id) = public.teetime_venue_of(p_slug))
       and public.teetime_min(b.time) is not null
  ), soc as (
    -- society events at this venue: first tee (course's, else the society's) + N slots on the first column
    select e.id, coalesce(public.teetime_min(ces.first_tee), public.teetime_min(left(e.start_time::text, 5)), 480) as m0,
           coalesce(ces.slots_given,
             greatest(1,
               (select count(*) from jsonb_array_elements(coalesce(ep.groups, '[]'::jsonb)) g
                 where jsonb_typeof(g->'players') = 'array' and jsonb_array_length(g->'players') > 0)::int,
               ceil((select count(*) from public.event_registrations r
                      where r.event_id = e.id and coalesce(r.status, '') !~* 'cancel|withdraw') / 4.0)::int)) as n
      from public.society_events e
      left join public.course_event_slots ces on ces.event_id = e.id
      left join public.event_pairings ep on ep.event_id = e.id::text
     where e.event_date = p_date and coalesce(e.status, '') <> 'cancelled'
       and public.teetime_venue_of(public.teetime_slug_for(e.course_name)) = public.teetime_venue_of(p_slug)
  ), socrows as (
    select ((s.m0 + i * v_step - v_start) / v_step) as ri from soc s cross join lateral generate_series(0, greatest(s.n, 1) - 1) i
  ), ot as (
    select ((public.teetime_min(o.first_tee) + i * o.interval_min - v_start) / v_step) as ri
      from public.course_open_times o cross join lateral generate_series(0, greatest(o.groups, 1) - 1) i
     where o.play_date = p_date and o.status = 'open'
       and public.teetime_venue_of(o.course_slug) = public.teetime_venue_of(p_slug)
    union all
    select ((public.teetime_min(o.first_tee) + (cl.slot_index + i) * o.interval_min - v_start) / v_step)
      from public.course_open_time_claims cl join public.course_open_times o on o.id = cl.open_id
      cross join lateral generate_series(0, greatest(cl.groups, 1) - 1) i
     where cl.play_date = p_date and cl.status = 'held' and not coalesce(cl.on_event_block, false)
       and public.teetime_venue_of(cl.course_slug) = public.teetime_venue_of(p_slug)
  )
  select public.teetime_hhmm(r.m), c2.ci, c2.nine, c2.tee,
         coalesce((select sum(bk.n) from bk where bk.ri = r.ri and bk.ci = c2.ci), 0)::int,
         (c2.ci = 0 and (exists (select 1 from socrows s where s.ri = r.ri) or exists (select 1 from ot where ot.ri = r.ri)))
    from rows_ r cross join cols c2
   order by r.m, c2.ci;
end $$;

-- the times a golfer can book: open, inside the course's online window, far enough ahead, room for p_players
create or replace function public.teetime_slots(p_slug text, p_date date, p_players integer default 1)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c jsonb; now_bkk timestamp := (now() at time zone 'Asia/Bangkok'); res jsonb; v_today date;
begin
  c := public.teetime_cfg(p_slug);
  if c is null or not (c->>'enabled')::boolean then return '[]'::jsonb; end if;
  v_today := now_bkk::date;
  if p_date < v_today or p_date > v_today + ((c->>'days')::int) then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', g.t, 'col', g.col, 'nine', g.nine, 'tee', g.tee, 'left', 4 - g.booked,
           'fee', public.teetime_green_fee(c, p_date, g.t)) order by g.t, g.col), '[]'::jsonb)
    into res
    from public.teetime_grid(p_slug, p_date) g
   where not g.blocked and 4 - g.booked >= greatest(1, least(4, coalesce(p_players, 1)))
     and public.teetime_min(g.t) >= public.teetime_min(c->>'open_from')
     and public.teetime_min(g.t) <= public.teetime_min(c->>'open_until')
     and (p_date + make_interval(mins => public.teetime_min(g.t))) >= now_bkk + make_interval(mins => (c->>'lead_min')::int);
  return res;
end $$;

-- every venue for one date: settings summary + count + the first open times (discover list)
create or replace function public.teetime_open_day(p_date date, p_players integer default 1)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v record; out_ jsonb := '[]'::jsonb; c jsonb; s jsonb; firsts jsonb;
begin
  for v in select slug from public.course_venues where active order by sort, name loop
    c := public.teetime_cfg(v.slug);
    s := public.teetime_slots(v.slug, p_date, p_players);
    -- one chip per time (the earliest column that has room), first 12
    select coalesce(jsonb_agg(x order by x->>'t'), '[]'::jsonb) into firsts from (
      select distinct on (e->>'t') e as x from jsonb_array_elements(s) e order by e->>'t', (e->>'col')::int
    ) q;
    out_ := out_ || jsonb_build_array(jsonb_build_object(
      'slug', v.slug, 'cfg', c - 'pay_to',
      'count', (select count(distinct e->>'t') from jsonb_array_elements(s) e),
      'times', (select coalesce(jsonb_agg(z), '[]'::jsonb) from (select z from jsonb_array_elements(firsts) z limit 12) q2)));
  end loop;
  return out_;
end $$;

-- ---------------------------------------------------------------- book
create or replace function public.teetime_book(
  p_slug text, p_date date, p_time text, p_col integer,
  p_golfer_id text, p_golfer_name text, p_players jsonb, p_carts integer default 0,
  p_pay text default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c jsonb; v_nines text[]; v_tees int; v_nine text; v_tee int; n int; key_ text; booked int; blocked boolean;
  now_bkk timestamp := (now() at time zone 'Asia/Bangkok'); m int; v_start int; v_step int;
  bid text; ref text; gname text; golfers jsonb := '[]'::jsonb; pl jsonb; i int;
  cp record; prefix text; blk int; clash_t time; picks int := 0; want_any int := 0; nums text[] := '{}';
  first_pick jsonb := null; tee time; rmin int; fee jsonb; green int; caddy_fee int; cart_fee int;
  carts int; total int; rule text; amount int := 0; due timestamptz; state text; app jsonb; cancel_until timestamp;
  cad jsonb; job_rows jsonb := '[]'::jsonb;
begin
  if coalesce(p_golfer_id, '') = '' then return jsonb_build_object('ok', false, 'reason', 'no_golfer'); end if;
  if jsonb_typeof(p_players) <> 'array' or jsonb_array_length(p_players) < 1 or jsonb_array_length(p_players) > 4 then
    return jsonb_build_object('ok', false, 'reason', 'players');
  end if;
  n := jsonb_array_length(p_players);
  c := public.teetime_cfg(p_slug);
  if c is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not (c->>'enabled')::boolean then return jsonb_build_object('ok', false, 'reason', 'closed'); end if;
  m := public.teetime_min(p_time);
  v_start := public.teetime_min(c->>'start'); v_step := (c->>'interval')::int;
  if m is null or (m - v_start) % v_step <> 0 or m < public.teetime_min(c->>'open_from') or m > public.teetime_min(c->>'open_until') then
    return jsonb_build_object('ok', false, 'reason', 'off_grid');
  end if;
  if p_date > now_bkk::date + (c->>'days')::int then return jsonb_build_object('ok', false, 'reason', 'too_far'); end if;
  if (p_date + make_interval(mins => m)) < now_bkk + make_interval(mins => (c->>'lead_min')::int) then
    return jsonb_build_object('ok', false, 'reason', 'past');
  end if;
  select array_agg(x order by o) into v_nines from jsonb_array_elements_text(c->'nines') with ordinality as a(x, o);
  v_tees := (c->>'tees')::int;
  if p_col is null or p_col < 0 or p_col >= array_length(v_nines, 1) * v_tees then return jsonb_build_object('ok', false, 'reason', 'off_grid'); end if;
  v_nine := v_nines[(p_col / v_tees) + 1]; v_tee := (p_col % v_tees) + 1;
  -- names and notes land in the pro shop sheet's markup: no HTML characters, ever
  gname := coalesce(nullif(left(regexp_replace(trim(coalesce(p_golfer_name, '')), '[<>"''`&]', '', 'g'), 60), ''), 'Golfer');
  p_time := public.teetime_hhmm(m);

  -- the same lock the 4-per-slot trigger takes: two golfers racing for the last spots queue here
  key_ := p_slug || '|' || p_date::text || '|' || p_time || '|' || v_nine || '|' || v_tee::text;
  perform pg_advisory_xact_lock(hashtext('teeslot:' || key_));
  select g.booked, g.blocked into booked, blocked from public.teetime_grid(p_slug, p_date) g where g.t = p_time and g.col = p_col;
  if blocked then return jsonb_build_object('ok', false, 'reason', 'blocked'); end if;
  if coalesce(booked, 0) + n > 4 then return jsonb_build_object('ok', false, 'reason', 'full', 'left', greatest(0, 4 - coalesce(booked, 0))); end if;
  -- a double tap is not a second booking
  if exists (select 1 from public.bookings b where b.golfer_id = p_golfer_id and b.date = p_date and left(b.time, 5) = p_time
               and b.course_id = p_slug and b.booking_type = 'app' and not coalesce(b.deleted, false)) then
    return jsonb_build_object('ok', false, 'reason', 'already');
  end if;

  tee := p_time::time;
  rmin := (c->>'round_min')::int;
  prefix := lower(split_part(coalesce(c->>'name', ''), ' ', 1));
  caddy_fee := coalesce((c->'rates'->>'caddy18')::int, 0);

  -- players + their caddies, every pick validated BEFORE any write
  i := 0;
  for pl in select value from jsonb_array_elements(p_players) loop
    i := i + 1;
    cad := null;
    if coalesce(pl->>'caddy', 'any') ~* '^[0-9a-f]{8}-[0-9a-f-]{27}$' then
      select * into cp from public.caddy_profiles x
       where x.id = (pl->>'caddy')::uuid and coalesce(x.is_active, false) and not coalesce(x.is_mock, false)
         and (x.course_id = p_slug or (prefix <> '' and lower(coalesce(x.course_name, '')) like prefix || '%'));
      if not found then return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', '?'); end if;
      if exists (select 1 from jsonb_array_elements(golfers) gx where gx->>'caddyId' = cp.id::text) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      perform pg_advisory_xact_lock(hashtext('caddy:' || cp.id::text));
      blk := greatest(255, coalesce(cp.block_minutes, 255));
      select coalesce(cb.tee_time, cb.start_time) into clash_t from public.caddy_bookings cb
       where cb.booking_date = p_date and coalesce(cb.status, '') <> 'cancelled'
         and (cb.caddy_id = cp.id or (cb.caddy_id is null and cb.caddie_name = 'Caddy #' || trim(cp.caddy_number)
              and (cb.course_id = p_slug or (prefix <> '' and lower(coalesce(cb.course_name, '')) like prefix || '%'))))
         and coalesce(cb.tee_time, cb.start_time) is not null
         and abs(extract(epoch from (coalesce(cb.tee_time, cb.start_time) - tee)) / 60) < blk
       limit 1;
      if found then return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number, 'at', to_char(clash_t, 'HH24:MI')); end if;
      if exists (select 1 from public.caddy_dayoff_requests r where r.status = 'approved'
                  and trim(coalesce(r.caddy_number, '')) = trim(cp.caddy_number) and r.date_from <= p_date and r.date_to >= p_date
                  and (r.course_name is null or prefix = '' or lower(r.course_name) like prefix || '%')) then
        return jsonb_build_object('ok', false, 'reason', 'caddy_taken', 'caddy', cp.caddy_number);
      end if;
      cad := jsonb_build_object('id', cp.id::text, 'number', trim(cp.caddy_number), 'name', coalesce(nullif(trim(cp.name), ''), 'Caddy #' || trim(cp.caddy_number)));
      picks := picks + 1; nums := nums || trim(cp.caddy_number);
      if first_pick is null then first_pick := cad; end if;
    elsif coalesce(pl->>'caddy', 'any') = 'any' then
      want_any := want_any + 1;
    end if;
    golfers := golfers || jsonb_build_array(jsonb_build_object(
      'name', coalesce(nullif(left(regexp_replace(trim(coalesce(pl->>'name', '')), '[<>"''`&]', '', 'g'), 60), ''), case when i = 1 then gname else gname || ' +' || (i - 1) end),
      'odoo_id', case when i = 1 then p_golfer_id else nullif(trim(coalesce(pl->>'id', '')), '') end,
      'caddyId', cad->>'id', 'caddyNumber', coalesce(cad->>'number', ''), 'caddyName', coalesce(cad->>'name', ''),
      'caddyWanted', case when cad is not null then 'picked' when coalesce(pl->>'caddy', 'any') = 'any' then 'any' else 'none' end));
  end loop;

  -- the bill, from the course's own rates (null when the course shows none)
  fee := public.teetime_green_fee(c, p_date, p_time);
  green := coalesce((fee->>'price')::int, 0);
  carts := greatest(0, least(n, coalesce(p_carts, 0)));
  cart_fee := coalesce((c->'rates'->>'cart18')::int, 0);
  total := case when fee is null then null else green * n + caddy_fee * (picks + want_any) + cart_fee * carts end;
  rule := c->>'rule';
  if rule = 'deposit' and p_pay = 'full' and (c->>'allow_full')::boolean and total is not null then rule := 'full'; end if;
  amount := case rule when 'deposit' then (c->>'deposit_pp')::int * n when 'full' then coalesce(total, 0) else 0 end;
  if rule in ('deposit', 'full') and amount <= 0 then rule := 'none'; amount := 0; end if;
  state := case when rule = 'none' then 'booked' else 'due' end;
  due := case when state = 'due' then now() + make_interval(mins => (c->>'pay_min')::int) else null end;
  cancel_until := (p_date + make_interval(mins => m)) - make_interval(hours => (c->>'cancel_h')::int);
  bid := gen_random_uuid()::text;
  ref := 'MCP-' || upper(substr(translate(encode(decode(md5(bid), 'hex'), 'base64'), '+/=0O1Il', 'XYZ'), 1, 5));
  app := jsonb_build_object('v', 1, 'ref', ref, 'rule', rule, 'amount', amount, 'deposit_pp', case when rule = 'deposit' then (c->>'deposit_pp')::int else null end,
    'state', state, 'due_at', due, 'cancel_until', to_char(cancel_until, 'YYYY-MM-DD"T"HH24:MI'), 'carts', carts,
    'quote', case when fee is null then null else jsonb_build_object('period', fee->>'label', 'green_pp', green, 'caddy_pp', caddy_fee,
                 'caddies', picks + want_any, 'cart_each', cart_fee, 'total', total) end,
    'pay_to', c->'pay_to', 'allow_full', coalesce((c->>'allow_full')::boolean, false) and fee is not null, 'created_at', now(), 'booker', p_golfer_id);

  insert into public.bookings (
    id, date, time, tee_time, name, golfer_name, golfer_id, players, group_id, kind, booking_type,
    tee_sheet_course, tee_number, course_id, course_name, notes, status, source, is_vip, deleted,
    caddie_id, caddy_number, caddie_name, caddie_status, created_at, updated_at, booking_data)
  values (
    bid, p_date, p_time, p_date::text || 'T' || p_time || ':00', gname, gname, p_golfer_id, n, bid, 'tee', 'app',
    v_nine, v_tee, p_slug, c->>'name',
    left(regexp_replace(coalesce(nullif(trim(p_notes), ''), ''), '[<>"`]', '', 'g'), 300),
    'confirmed', 'teesheet', false, false,
    first_pick->>'id', coalesce(first_pick->>'number', ''), coalesce(first_pick->>'name', ''),
    case when picks > 0 then 'confirmed' when want_any > 0 then 'pending' else null end,
    now(), now(),
    jsonb_build_object('golfers', golfers, 'groupName', null, 'groupIndex', null, 'groupTotal', null, 'col', p_col,
      'recurringGroupId', null, 'caddiesNeeded', want_any, 'app', app));

  -- caddy jobs: picked = confirmed with her id; "pro shop assigns" = Unassigned pending (caddy master assigns)
  for pl in select value from jsonb_array_elements(golfers) loop
    if pl->>'caddyWanted' = 'picked' then
      insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, confirmed_at, confirmed_by, golfer_id, user_id, golfer_name,
        booking_source, teesheet_booking_id, special_requests)
      values ((pl->>'caddyId')::uuid, 'Caddy #' || (pl->>'caddyNumber'), p_date, tee, tee, tee + make_interval(mins => rmin), p_slug, c->>'name',
        18, caddy_fee, 'pending', 'confirmed', now(), 'Golfer app', coalesce(pl->>'odoo_id', p_golfer_id), coalesce(pl->>'odoo_id', p_golfer_id),
        pl->>'name', 'app_teetime', bid, 'Tee time ' || ref);
    elsif pl->>'caddyWanted' = 'any' then
      insert into public.caddy_bookings (caddy_id, caddie_name, booking_date, tee_time, start_time, end_time, course_id, course_name,
        holes, payment_amount, payment_status, status, golfer_id, user_id, golfer_name, booking_source, teesheet_booking_id, special_requests)
      values (null, 'Unassigned', p_date, tee, tee, tee + make_interval(mins => rmin), p_slug, c->>'name',
        18, caddy_fee, 'pending', 'pending', coalesce(pl->>'odoo_id', p_golfer_id), coalesce(pl->>'odoo_id', p_golfer_id), pl->>'name',
        'app_teetime', bid, 'Tee time ' || ref);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'booking_id', bid, 'ref', ref, 'state', state, 'rule', rule, 'amount', amount,
    'due_at', due, 'date', p_date, 'time', p_time, 'nine', v_nine, 'course', c->>'name', 'caddies', to_jsonb(nums));
end $$;

-- ---------------------------------------------------------------- golfer: my tee times
create or replace function public.teetime_mine(p_golfer_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'date', b.date, 'time', left(b.time, 5), 'players', b.players, 'slug', b.course_id,
      'course', coalesce(v.name, b.course_name), 'short', coalesce(v.short_name, v.name, b.course_name), 'photo', coalesce(nullif(s.online_booking->>'photo_url', ''), v.photo_url),
      'nine', b.tee_sheet_course, 'nine_names', v.nines, 'type', b.booking_type, 'source', b.source, 'deleted', coalesce(b.deleted, false),
      'golfers', b.booking_data->'golfers', 'caddies_needed', b.booking_data->'caddiesNeeded', 'app', b.booking_data->'app',
      'deal_price', b.booking_data->'hotDealPrice', 'mine', b.golfer_id = p_golfer_id, 'notes', b.notes)
    order by b.date, b.time), '[]'::jsonb)
    from public.bookings b
    left join public.course_venues v on v.slug = b.course_id
    left join public.golf_course_settings s on s.course_id = b.course_id
   where coalesce(p_golfer_id, '') <> '' and b.kind = 'tee' and coalesce(b.source, '') in ('teesheet', 'hotdeal')
     and b.date >= (now() at time zone 'Asia/Bangkok')::date - 1
     and (b.golfer_id = p_golfer_id or coalesce(b.booking_data->'golfers', '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('odoo_id', p_golfer_id)))
     and (not coalesce(b.deleted, false)
          or (b.booking_type = 'app' and b.updated_at > now() - interval '2 days' and b.booking_data->'app'->>'state' in ('expired', 'released')))
$$;

-- ---------------------------------------------------------------- golfer: payment slip sent
create or replace function public.teetime_slip(p_booking_id text, p_golfer_id text, p_url text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.bookings; a jsonb;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or coalesce(b.deleted, false) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if b.golfer_id is distinct from p_golfer_id then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  a := b.booking_data->'app';
  if a is null or a->>'state' not in ('due', 'slip') then return jsonb_build_object('ok', false, 'reason', 'state', 'state', a->>'state'); end if;
  if coalesce(p_url, '') !~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/teetime-slips/' then
    return jsonb_build_object('ok', false, 'reason', 'url');
  end if;
  a := a || jsonb_build_object('state', 'slip', 'slip_url', p_url, 'slip_at', now());
  update public.bookings set booking_data = jsonb_set(booking_data, '{app}', a), updated_at = now() where id = b.id;
  return jsonb_build_object('ok', true, 'state', 'slip');
end $$;

-- ---------------------------------------------------------------- pro shop: confirm / paid / not received / release
create or replace function public.teetime_proshop(p_booking_id text, p_action text, p_by text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.bookings; a jsonb; c jsonb; who text := coalesce(nullif(trim(p_by), ''), 'Pro shop');
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  a := b.booking_data->'app';
  if a is null then return jsonb_build_object('ok', false, 'reason', 'not_app'); end if;
  if coalesce(b.deleted, false) then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if p_action in ('paid', 'confirm') then
    a := a || jsonb_build_object('state', 'confirmed', 'confirmed_at', now(), 'confirmed_by', who)
            || case when p_action = 'paid' then jsonb_build_object('paid_at', now()) else '{}'::jsonb end;
  elsif p_action = 'not_received' then
    c := public.teetime_cfg(b.course_id);
    a := a || jsonb_build_object('state', 'due', 'due_at', now() + make_interval(mins => coalesce((c->>'pay_min')::int, 30)),
                                 'not_received_at', now(), 'slip_url', null);
  elsif p_action = 'release' then
    a := a || jsonb_build_object('state', 'released', 'released_at', now(), 'released_by', who);
    update public.bookings set deleted = true, booking_data = jsonb_set(booking_data, '{app}', a), updated_at = now() where id = b.id;
    update public.caddy_bookings set status = 'cancelled', cancellation_reason = 'Tee time released by the pro shop', updated_at = now()
     where teesheet_booking_id = b.id and coalesce(status, '') <> 'cancelled';
    return jsonb_build_object('ok', true, 'state', 'released');
  else
    return jsonb_build_object('ok', false, 'reason', 'action');
  end if;
  update public.bookings set booking_data = jsonb_set(booking_data, '{app}', a), updated_at = now() where id = b.id;
  return jsonb_build_object('ok', true, 'state', a->>'state');
end $$;

-- ---------------------------------------------------------------- pro shop: online booking settings + photo
create or replace function public.teetime_save_online(p_slug text, p_cfg jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o jsonb; clean jsonb;
begin
  if not exists (select 1 from public.course_venues where slug = p_slug) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if jsonb_typeof(p_cfg) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'cfg'); end if;
  clean := jsonb_strip_nulls(jsonb_build_object(
    'enabled',    case when p_cfg ? 'enabled' then to_jsonb((p_cfg->>'enabled')::boolean) end,
    'from',       case when p_cfg->>'from' ~ '^\d{2}:\d{2}$' then p_cfg->'from' end,
    'until',      case when p_cfg->>'until' ~ '^\d{2}:\d{2}$' then p_cfg->'until' end,
    'days',       case when p_cfg->>'days' ~ '^\d{1,2}$' then to_jsonb((p_cfg->>'days')::int) end,
    'lead_min',   case when p_cfg->>'lead_min' ~ '^\d{1,3}$' then to_jsonb((p_cfg->>'lead_min')::int) end,
    'show_rates', case when p_cfg ? 'show_rates' then to_jsonb((p_cfg->>'show_rates')::boolean) end,
    'rule',       case when p_cfg->>'rule' in ('none', 'deposit', 'full') then p_cfg->'rule' end,
    'deposit_pp', case when p_cfg->>'deposit_pp' ~ '^\d{1,6}$' then to_jsonb((p_cfg->>'deposit_pp')::int) end,
    'pay_min',    case when p_cfg->>'pay_min' ~ '^\d{1,3}$' then to_jsonb((p_cfg->>'pay_min')::int) end,
    'allow_full', case when p_cfg ? 'allow_full' then to_jsonb((p_cfg->>'allow_full')::boolean) end,
    'cancel_h',   case when p_cfg->>'cancel_h' ~ '^\d{1,3}$' then to_jsonb((p_cfg->>'cancel_h')::int) end,
    'promptpay',  case when p_cfg ? 'promptpay' then to_jsonb(left(regexp_replace(coalesce(p_cfg->>'promptpay', ''), '[^0-9]', '', 'g'), 15)) end,
    'payee',      case when p_cfg ? 'payee' then to_jsonb(left(trim(coalesce(p_cfg->>'payee', '')), 120)) end,
    'qr_url',     case when p_cfg ? 'qr_url' then to_jsonb(case when coalesce(p_cfg->>'qr_url', '') ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/course-media/' then p_cfg->>'qr_url' else '' end) end,
    'photo_url',  case when p_cfg ? 'photo_url' then to_jsonb(case when coalesce(p_cfg->>'photo_url', '') ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/course-media/' then p_cfg->>'photo_url' else '' end) end,
    'updated_by', case when p_cfg ? 'by' then to_jsonb(left(coalesce(p_cfg->>'by', ''), 80)) end,
    'updated_at', to_jsonb(now())));
  insert into public.golf_course_settings (course_id, course_name, online_booking)
  values (p_slug, (select name from public.course_venues where slug = p_slug), clean)
  on conflict (course_id) do update set online_booking = coalesce(public.golf_course_settings.online_booking, '{}'::jsonb) || clean, updated_at = now()
  returning online_booking into o;
  return jsonb_build_object('ok', true, 'online', o, 'cfg', public.teetime_cfg(p_slug));
end $$;

-- ---------------------------------------------------------------- holds that were never paid
create or replace function public.teetime_release_expired()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.bookings
            where booking_type = 'app' and not coalesce(deleted, false)
              and booking_data->'app'->>'state' = 'due'
              and (booking_data->'app'->>'due_at')::timestamptz < now()
            for update skip locked loop
    update public.bookings
       set deleted = true, updated_at = now(),
           booking_data = jsonb_set(booking_data, '{app}', (booking_data->'app') || jsonb_build_object('state', 'expired', 'expired_at', now()))
     where id = r.id;
    update public.caddy_bookings set status = 'cancelled', cancellation_reason = 'Tee time not paid in time', updated_at = now()
     where teesheet_booking_id = r.id and coalesce(status, '') <> 'cancelled';
    n := n + 1;
  end loop;
  return n;
end $$;

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'teetime-release-expired';
  perform cron.schedule('teetime-release-expired', '* * * * *', 'select public.teetime_release_expired()');
end $$;

-- ---------------------------------------------------------------- storage: payment slips + course QR/photo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teetime-slips', 'teetime-slips', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-media', 'course-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "teetime slip upload" on storage.objects;
create policy "teetime slip upload" on storage.objects for insert to public
  with check (bucket_id = 'teetime-slips' and coalesce((metadata->>'size')::integer, 0) <= 5242880
              and coalesce(metadata->>'mimetype', '') = any (array['image/jpeg','image/png','image/webp']));
drop policy if exists "course media upload" on storage.objects;
create policy "course media upload" on storage.objects for insert to public
  with check (bucket_id = 'course-media' and coalesce((metadata->>'size')::integer, 0) <= 5242880
              and coalesce(metadata->>'mimetype', '') = any (array['image/jpeg','image/png','image/webp']));

-- ---------------------------------------------------------------- grants
grant execute on function public.teetime_cfg(text), public.teetime_slots(text, date, integer), public.teetime_open_day(date, integer),
  public.teetime_book(text, date, text, integer, text, text, jsonb, integer, text, text),
  public.teetime_mine(text), public.teetime_slip(text, text, text), public.teetime_proshop(text, text, text),
  public.teetime_save_online(text, jsonb), public.teetime_grid(text, date), public.teetime_slug_for(text)
  to anon, authenticated;
revoke execute on function public.teetime_release_expired() from anon, authenticated, public;
