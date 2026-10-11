-- v1509 COURSE MARKET INSIGHTS (Pete 2026-10-11: "golfers data mined for the golf courses for marketing").
-- A course sees its MARKET (every golfer who played a course in its region), where it stands, the golfers who never
-- played it, the days it misses and the societies around it — COUNTS ONLY. Any count from 1 to 4 comes back as
-- "<5" so no number can point at a person. Offers to those golfers are delivered by the platform (the course never
-- holds the list): resolve_offer_segment / count_offer_segment learn three new audiences.
--
-- 1. course_name_aliases + venue_of(): ONE map from the free-text course names in rounds / society_events to a
--    course_venues slug. "Pattaya County Club", "Burapha A-B", "Phoenix Mountain+Lake" all land on their venue.
-- 2. market_insights(p_course_id, p_course_name, p_days) → jsonb (anon, same posture as marketing_audience_report).
-- 3. count_offer_segment / resolve_offer_segment: + p_audience ('never_here' | 'lapsed_elsewhere' | 'market'), p_venue,
--    p_dows (ISO 1=Mon..7=Sun), p_days. With p_audience null they behave exactly as before.

-- ---------------------------------------------------------------- 1. names → venue
create table if not exists public.course_name_aliases (
  pattern text primary key,                 -- case-insensitive regex on the free-text course name
  slug    text not null references public.course_venues(slug),
  prio    integer not null default 100      -- lower wins (specific before general)
);
alter table public.course_name_aliases enable row level security;   -- no policies: server-side only
revoke all on public.course_name_aliases from anon, authenticated;

insert into public.course_name_aliases (pattern, slug, prio) values
  ('summit', 'summit-green-valley', 10),
  ('green ?valley', 'green-valley-rayong', 50),
  ('pattaya coun', 'pattaya-golf', 50),
  ('burapha', 'burapha-ac', 50),
  ('bangpakong', 'bangpakong', 50),
  ('eastern ?star', 'eastern-star', 50),
  ('st\.?[ -]?andrews', 'st-andrews-2000', 50),
  ('phoenix', 'phoenix', 50),
  ('bangpra', 'bangpra-international', 50),
  ('khao ?kheow', 'khao-kheow', 50),
  ('laem ?chabang', 'laem-chabang', 50),
  ('siam.*bangkok', 'siam-bangkok', 20),
  ('rolling', 'siam-rolling-hills', 30),
  ('waterside', 'siam-cc-waterside', 30),
  ('plantation', 'siam-plantation', 30),
  ('siam', 'siam-cc-old', 60),
  ('plutaluang', 'plutaluang', 50),
  ('treasure', 'treasure-hill-golf', 50),
  ('pattana', 'pattana-golf-resort', 50),
  ('chee ?chan', 'cheechan', 50),
  ('greenwood', 'greenwood', 50),
  ('pleasant', 'pleasant-valley', 50),
  ('mountain shadow', 'mountain-shadow', 50),
  ('lakeside', 'royal-lakeside', 50),
  ('crystal', 'crystal-bay', 50),
  ('silky', 'silky-oak', 50),
  ('hermes', 'hermes', 50),
  ('grand ?prix', 'grand-prix', 50),
  ('pattavia', 'pattavia', 50),
  ('royal garden', 'royal-garden', 50),
  ('thai country', 'thai-country-club', 50),
  ('alpine', 'alpine-chiangmai', 50),
  ('highlands', 'highlands-chiangmai', 50),
  ('north hill', 'north-hill-chiangmai', 50),
  ('black mountain', 'black-mountain', 50),
  ('springfield', 'springfield-royal', 50),
  ('majestic', 'majestic-creek', 50),
  ('lake ?view', 'lake-view-huahin', 50),
  ('palm hills', 'palm-hills', 50),
  ('pineapple', 'pineapple-valley', 50),
  ('royal hua ?hin', 'royal-hua-hin', 50),
  ('sea pines', 'sea-pines', 50)
on conflict (pattern) do update set slug = excluded.slug, prio = excluded.prio;

create or replace function public.venue_of(p_name text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select a.slug from public.course_name_aliases a where coalesce(p_name, '') ~* a.pattern order by a.prio, length(a.pattern) desc limit 1),
    (select v.slug from public.course_venues v where lower(v.name) = lower(btrim(p_name)) or lower(v.short_name) = lower(btrim(p_name)) limit 1))
$$;
revoke execute on function public.venue_of(text) from public, anon, authenticated;

-- the marketing dashboard's course (courses.id + name) → its venue slug
create or replace function public.venue_for_course(p_course_id text, p_course_name text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select v.slug from public.course_venues v where v.course_ref = p_course_id limit 1),
    (select v.slug from public.course_venues v where v.slug = replace(lower(coalesce(p_course_id, '')), '_', '-') limit 1),
    public.venue_of(p_course_name))
$$;
revoke execute on function public.venue_for_course(text, text) from public, anon, authenticated;

-- 1..4 never leaves the server as a number
create or replace function public.k5(n bigint) returns jsonb
language sql immutable as $$ select case when n between 1 and 4 then to_jsonb('<5'::text) else to_jsonb(coalesce(n, 0)) end $$;

-- ---------------------------------------------------------------- 2. the Market tab
create or replace function public.market_insights(p_course_id text, p_course_name text, p_days integer default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me text := public.venue_for_course(p_course_id, p_course_name);
  reg text;
  d0 date := (now() at time zone 'Asia/Bangkok')::date - greatest(7, least(coalesce(p_days, 90), 366));
  today date := (now() at time zone 'Asia/Bangkok')::date;
  out jsonb;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'unknown_course'); end if;
  select region into reg from public.course_venues where slug = me;

  with nm as (select z.n, public.venue_of(z.n) v from (select distinct course_name n from public.rounds) z),   -- each name mapped once
  r as (
    select x.golfer_id, (x.played_at at time zone 'Asia/Bangkok')::date d, x.handicap_used h, nm.v
    from public.rounds x join nm on nm.n = x.course_name
    where x.golfer_id is not null and x.golfer_id <> '' and x.played_at is not null and coalesce(x.status, '') <> 'deleted'
  ), rv as (   -- every round with its venue, limited to the course's region
    select r.* from r join public.course_venues cv on cv.slug = r.v where reg is null or cv.region = reg
  ), win as (select * from rv where d >= d0),
  ever_me as (select distinct golfer_id from rv where v = me),
  per_venue as (select v, count(distinct golfer_id) g, count(*) n from win group by v),
  ranked as (select v, g, n, row_number() over (order by g desc, n desc, v) rk from per_venue),
  pool as (select golfer_id, count(*) n, avg(h) h from win where golfer_id not in (select golfer_id from ever_me) group by golfer_id),
  mine_365 as (select distinct golfer_id from rv where v = me and d >= today - 365),
  last_me as (select golfer_id, max(d) ld from rv where v = me group by golfer_id),
  elsewhere as (select distinct golfer_id from win where v <> me),
  app as (select line_user_id from public.user_profiles where last_login_at is not null)
  select jsonb_build_object(
    'ok', true, 'venue', me, 'venue_name', (select name from public.course_venues where slug = me), 'region', reg,
    'days', (today - d0), 'from', d0, 'to', today,
    'market', jsonb_build_object('golfers', (select count(distinct golfer_id) from win), 'rounds', (select count(*) from win),
                                 'venues', (select count(*) from per_venue)),
    'you', jsonb_build_object('golfers', coalesce((select g from per_venue where v = me), 0), 'rounds', coalesce((select n from per_venue where v = me), 0),
                              'rank', (select rk from ranked where v = me)),
    -- other courses stay unnamed: the course sees its place, not their numbers by name
    'share', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'golfers', public.k5(g), 'you', v = me) order by rk)
                       from ranked where rk <= 6 or v = me), '[]'::jsonb),
    'dow', (select jsonb_agg(jsonb_build_object('dow', dw, 'market', public.k5(coalesce(m, 0)), 'you', public.k5(coalesce(y, 0))) order by dw)
            from (select g.dw, (select count(*) from win where extract(isodow from d) = g.dw) m,
                         (select count(*) from win where v = me and extract(isodow from d) = g.dw) y
                  from generate_series(1, 7) g(dw)) q),
    'pool', jsonb_build_object(
       'golfers', public.k5((select count(*) from pool)),
       'regular', public.k5((select count(*) from pool where n >= 3)),
       'app', public.k5((select count(*) from pool where golfer_id in (select line_user_id from app))),
       'hcp', (select jsonb_agg(jsonb_build_object('band', b, 'n', public.k5(c)) order by o) from (
                select case when h is null then 'unknown' when h < 10 then '0-9' when h < 20 then '10-19' when h < 30 then '20-29' else '30+' end b,
                       case when h is null then 5 when h < 10 then 1 when h < 20 then 2 when h < 30 then 3 else 4 end o, count(*) c
                from pool group by 1, 2) hb),
       'dow', (select jsonb_agg(jsonb_build_object('dow', dw, 'n', public.k5(c)) order by dw) from (
                select extract(isodow from w.d)::int dw, count(*) c from win w join pool p using (golfer_id) group by 1) pd)),
    'also', jsonb_build_object('base', public.k5((select count(*) from mine_365)),
       'venues', coalesce((select jsonb_agg(jsonb_build_object('name', cv.name, 'n', public.k5(q.c)) order by q.c desc)
                           from (select w.v, count(distinct w.golfer_id) c from win w join mine_365 m using (golfer_id)
                                 where w.v <> me group by w.v order by 2 desc limit 6) q join public.course_venues cv on cv.slug = q.v), '[]'::jsonb)),
    'winback', jsonb_build_object(
       'lapsed', public.k5((select count(*) from last_me where ld < today - 90)),
       'elsewhere', public.k5((select count(*) from last_me where ld < today - 90 and golfer_id in (select golfer_id from elsewhere)))),
    -- society golf days are the society's business listing; member lists never cross
    'societies', coalesce((select jsonb_agg(s order by (s->>'days')::int desc) from (
        select jsonb_build_object('name', soc, 'days', count(*) filter (where event_date < today), 'upcoming', count(*) filter (where event_date >= today),
               'avg_players', round(avg(regs) filter (where regs > 0)), 'at_you', count(*) filter (where ev = me and event_date < today),
               'last_at_you', max(event_date) filter (where ev = me and event_date < today), 'next_at_you', min(event_date) filter (where ev = me and event_date >= today),
               'weekdays', jsonb_agg(distinct extract(isodow from event_date)::int)) s
        from (select coalesce(sp.society_name, se.organizer_name, 'Society') soc, se.event_date, cv.slug ev,
                     (select count(*) from public.event_registrations er where er.event_id = se.id) regs
              from public.society_events se
              left join public.society_profiles sp on sp.id = se.society_id
              join public.course_venues cv on cv.slug = public.venue_of(se.course_name)
              where se.event_date between d0 and today + 60 and coalesce(se.status, '') not in ('cancelled', 'deleted')
                and (reg is null or cv.region = reg)) e
        group by soc having count(*) >= 3) z), '[]'::jsonb),
    'reach', jsonb_build_object(
       'followers', (select count(distinct f.golfer_line_id) from public.course_follows f where f.course_id = p_course_id or public.course_venue(f.course_id) = me),
       'opt_in', (select count(distinct f.golfer_line_id) from public.course_follows f join public.notification_preferences np on np.user_id = f.golfer_line_id
                  where (f.course_id = p_course_id or public.course_venue(f.course_id) = me) and np.notify_offers))
  ) into out;
  return out;
end $$;
revoke all on function public.market_insights(text, text, integer) from public;
grant execute on function public.market_insights(text, text, integer) to anon, authenticated;

-- ---------------------------------------------------------------- 3. offer audiences
-- shared golfer filter: one definition for the count (composer) and the resolve (delivery)
create or replace function public.offer_segment_ids(
  p_hcp_min numeric, p_hcp_max numeric, p_course_names text[], p_lang text, p_played_since date,
  p_audience text, p_venue text, p_dows integer[], p_days integer)
returns setof text language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d0 date := today - greatest(7, least(coalesce(p_days, 90), 366));
  reg text := (select region from public.course_venues where slug = p_venue);
begin
  if p_audience in ('never_here', 'lapsed_elsewhere', 'market') and p_venue is null then return; end if;
  if p_audience is not null and p_audience not in ('never_here', 'lapsed_elsewhere', 'market') then return; end if;
  return query
  with nm as (select z.n, public.venue_of(z.n) v from (select distinct course_name n from public.rounds) z),
  rv as (
    select x.golfer_id, (x.played_at at time zone 'Asia/Bangkok')::date d, nm.v
    from public.rounds x join nm on nm.n = x.course_name join public.course_venues cv on cv.slug = nm.v
    where x.golfer_id is not null and x.golfer_id <> '' and x.played_at is not null
      and (p_audience is not null or p_dows is not null or p_venue is not null) and (reg is null or cv.region = reg)
  ),
  here as (   -- the original audience: played here (name list or venue), optionally since a date
    select x.golfer_id from public.rounds x
    where p_audience is null and p_course_names is not null
      and (x.course_name = any(p_course_names) or x.course_name in (select n from nm where nm.v = p_venue))
      and (p_played_since is null or coalesce(x.played_at, x.completed_at, x.created_at) >= p_played_since)
  ),
  never_here as (   -- played the region in the window, never this venue
    select golfer_id from rv where d >= d0 and p_audience = 'never_here'
    except select golfer_id from rv where v = p_venue
  ),
  lapsed as (   -- last round here 90+ days ago, a round elsewhere in the window
    select golfer_id from rv where v = p_venue and p_audience = 'lapsed_elsewhere' group by golfer_id having max(d) < today - 90
    intersect select golfer_id from rv where v <> p_venue and d >= d0
  ),
  in_market as (select distinct golfer_id from rv where d >= d0 and p_audience = 'market'),   -- anyone who played the region
  on_days as (select golfer_id from rv where p_dows is not null and d >= d0 and extract(isodow from d)::int = any(p_dows))
  select distinct p.line_user_id
  from public.user_profiles p
  where p.line_user_id is not null and p.line_user_id <> ''
    and (p_hcp_min is null or p.handicap_index >= p_hcp_min)
    and (p_hcp_max is null or p.handicap_index <= p_hcp_max)
    and (p_lang is null or lower(coalesce(p.language, p.preferred_language, 'en')) = lower(p_lang))
    and (p_audience is not null or p_course_names is null or p.line_user_id in (select golfer_id from here))
    and (p_audience is distinct from 'never_here' or p.line_user_id in (select golfer_id from never_here))
    and (p_audience is distinct from 'lapsed_elsewhere' or p.line_user_id in (select golfer_id from lapsed))
    and (p_audience is distinct from 'market' or p.line_user_id in (select golfer_id from in_market))
    and (p_dows is null or p.line_user_id in (select golfer_id from on_days));
end $$;
revoke execute on function public.offer_segment_ids(numeric, numeric, text[], text, date, text, text, integer[], integer) from public, anon, authenticated;

drop function if exists public.count_offer_segment(numeric, numeric, text[], text, date);
drop function if exists public.count_offer_segment(numeric, numeric, text[], text, date, text, text, integer[], integer);   -- re-runnable
create function public.count_offer_segment(p_hcp_min numeric default null, p_hcp_max numeric default null, p_course_names text[] default null,
  p_lang text default null, p_played_since date default null, p_audience text default null, p_venue text default null,
  p_dows integer[] default null, p_days integer default 90)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.offer_segment_ids(p_hcp_min, p_hcp_max, p_course_names, p_lang, p_played_since, p_audience, p_venue, p_dows, p_days)
$$;
grant execute on function public.count_offer_segment(numeric, numeric, text[], text, date, text, text, integer[], integer) to anon, authenticated;

drop function if exists public.resolve_offer_segment(numeric, numeric, text[], text, date, integer);
drop function if exists public.resolve_offer_segment(numeric, numeric, text[], text, date, integer, text, text, integer[], integer);   -- re-runnable
create function public.resolve_offer_segment(p_hcp_min numeric default null, p_hcp_max numeric default null, p_course_names text[] default null,
  p_lang text default null, p_played_since date default null, p_limit integer default 5000, p_audience text default null, p_venue text default null,
  p_dows integer[] default null, p_days integer default 90)
returns setof text language sql stable security definer set search_path = public as $$
  select id from public.offer_segment_ids(p_hcp_min, p_hcp_max, p_course_names, p_lang, p_played_since, p_audience, p_venue, p_dows, p_days) id limit p_limit
$$;
revoke execute on function public.resolve_offer_segment(numeric, numeric, text[], text, date, integer, text, text, integer[], integer) from public, anon, authenticated;

-- ---------------------------------------------------------------- 4. follows are per VENUE
-- courses has several rows per venue (burapha / burapha_east / burapha_west). A follow saved under one id must earn
-- the push for an offer sent under another, and the Market tab counts followers of the venue.
create or replace function public.course_venue(p_course_id text) returns text
language sql stable security definer set search_path = public as $$
  select public.venue_for_course(p_course_id, (select c.name from public.courses c where c.id = p_course_id))
$$;
revoke execute on function public.course_venue(text) from public, anon, authenticated;

-- deliver_course_offer: live definition (pulled 2026-10-11) with ONE change — the follow check is venue-aware
create or replace function public.deliver_course_offer(p_offer_id uuid, p_recipients text[], p_daily_cap integer default 2)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  v_course text; v_status text; v_valid_to timestamptz;
  v_delivered int := 0;
  v_push text[]; v_inbox text[]; v_capped text[]; v_quiet text[];
  v_venue text;
begin
  select course_id, status, valid_to into v_course, v_status, v_valid_to
  from public.course_offers where id = p_offer_id;

  if v_course is null then return jsonb_build_object('error','offer not found'); end if;
  if v_status <> 'active' then return jsonb_build_object('error','offer is not active','status',v_status); end if;
  if v_valid_to is not null and v_valid_to < now() then
    return jsonb_build_object('error','offer already expired','valid_to',v_valid_to);
  end if;
  v_venue := public.course_venue(v_course);

  insert into public.course_offer_reads (offer_id, reader_line_id)
  select p_offer_id, r from unnest(p_recipients) as r where r is not null and r <> ''
  on conflict (offer_id, reader_line_id) do nothing;
  get diagnostics v_delivered = row_count;

  select coalesce(array_agg(r),'{}') into v_capped
  from unnest(p_recipients) as r
  where (select count(*) from public.course_offer_reads x
         where x.reader_line_id = r and x.pushed_at > now() - interval '24 hours') >= p_daily_cap;

  select coalesce(array_agg(r),'{}') into v_quiet
  from unnest(p_recipients) as r
  join public.notification_preferences np on np.user_id = r
  where np.quiet_hours_start is not null and np.quiet_hours_end is not null
    and ( (np.quiet_hours_start <= np.quiet_hours_end
           and (now() at time zone 'Asia/Bangkok')::time between np.quiet_hours_start and np.quiet_hours_end)
       or (np.quiet_hours_start >  np.quiet_hours_end
           and ((now() at time zone 'Asia/Bangkok')::time >= np.quiet_hours_start
             or (now() at time zone 'Asia/Bangkok')::time <= np.quiet_hours_end)) );

  -- EARNED a push: follows this course (any id of the same venue) AND opted in AND not capped AND not in quiet hours
  select coalesce(array_agg(r),'{}') into v_push
  from unnest(p_recipients) as r
  where exists (select 1 from public.course_follows cf
                where cf.golfer_line_id = r
                  and (cf.course_id = v_course or (v_venue is not null and public.course_venue(cf.course_id) = v_venue)))
    and exists (select 1 from public.notification_preferences np
                where np.user_id = r and np.notify_offers is true)
    and not (r = any(v_capped)) and not (r = any(v_quiet));

  select coalesce(array_agg(r),'{}') into v_inbox
  from unnest(p_recipients) as r where not (r = any(v_push));

  update public.course_offer_reads
  set pushed_at = now()
  where offer_id = p_offer_id and reader_line_id = any(v_push);

  update public.course_offers
  set push_recipients = coalesce(array_length(v_push,1),0),
      push_sent_at = case when coalesce(array_length(v_push,1),0) > 0 then now() else push_sent_at end,
      updated_at = now()
  where id = p_offer_id;

  insert into public.notification_log (notification_type, recipient_count, successful_count,
                                       source_table, source_id, payload)
  values ('course_offer', coalesce(array_length(p_recipients,1),0),
          coalesce(array_length(v_push,1),0), 'course_offers', p_offer_id,
          jsonb_build_object('course_id', v_course, 'capped', coalesce(array_length(v_capped,1),0),
                             'quiet_hours', coalesce(array_length(v_quiet,1),0)));

  return jsonb_build_object(
    'offer_id', p_offer_id, 'course_id', v_course,
    'targeted', coalesce(array_length(p_recipients,1),0),
    'newly_delivered', v_delivered,
    'push', v_push, 'inbox_only', v_inbox,
    'suppressed_cap', v_capped, 'suppressed_quiet_hours', v_quiet);
end; $function$;

-- ---------------------------------------------------------------- 5. "Follow this course for offers?" — asked once
-- After a round at a course, the golfer is asked ONCE per course. Yes = follow + offer pushes on (the same consent
-- as the Offers inbox follow). Not now = remembered, never asked again for that course.
create table if not exists public.course_follow_prompts (
  golfer_line_id text not null,
  course_id      text not null,
  answer         text not null check (answer in ('yes', 'no')),
  asked_at       timestamptz not null default now(),
  primary key (golfer_line_id, course_id)
);
alter table public.course_follow_prompts enable row level security;   -- RPC only
revoke all on public.course_follow_prompts from anon, authenticated;

-- the course to ask about: the golfer's latest round in the last 14 days at a venue they neither follow nor were asked about
create or replace function public.follow_prompt_next(p_user text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v text; cid text; nm text;
begin
  if coalesce(p_user, '') = '' then return null; end if;
  for v in
    select public.venue_of(x.course_name) from public.rounds x
    where x.golfer_id = p_user and x.played_at >= now() - interval '14 days' and x.course_name is not null
    group by 1 order by max(x.played_at) desc
  loop
    continue when v is null;
    select coalesce(cv.course_ref, (select c.id from public.courses c where public.course_venue(c.id) = v order by length(c.id), c.id limit 1)), cv.name
      into cid, nm from public.course_venues cv where cv.slug = v;
    continue when cid is null;
    continue when exists (select 1 from public.course_follows f where f.golfer_line_id = p_user and (f.course_id = cid or public.course_venue(f.course_id) = v));
    continue when exists (select 1 from public.course_follow_prompts q where q.golfer_line_id = p_user and (q.course_id = cid or public.course_venue(q.course_id) = v));
    return jsonb_build_object('course_id', cid, 'course_name', nm);
  end loop;
  return null;
end $$;
revoke all on function public.follow_prompt_next(text) from public;
grant execute on function public.follow_prompt_next(text) to anon, authenticated;

create or replace function public.follow_prompt_answer(p_user text, p_course_id text, p_yes boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_user, '') = '' or coalesce(p_course_id, '') = '' then return false; end if;
  if not exists (select 1 from public.courses where id = p_course_id) then return false; end if;
  insert into public.course_follow_prompts (golfer_line_id, course_id, answer) values (p_user, p_course_id, case when p_yes then 'yes' else 'no' end)
  on conflict (golfer_line_id, course_id) do update set answer = excluded.answer, asked_at = now();
  if p_yes then
    insert into public.course_follows (golfer_line_id, course_id, source) values (p_user, p_course_id, 'round_prompt')
    on conflict (golfer_line_id, course_id) do nothing;
    perform public.set_offer_consent(p_user, true);
  end if;
  return true;
end $$;
revoke all on function public.follow_prompt_answer(text, text, boolean) from public;
grant execute on function public.follow_prompt_answer(text, text, boolean) to anon, authenticated;
