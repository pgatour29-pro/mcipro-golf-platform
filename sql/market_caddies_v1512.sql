-- v1512 MARKET › CADDIES (Pete 2026-10-11: "Don't wait. Do that now to be ready to go for the caddies").
-- Caddies register as soon as a course signs up, so this fills first. COUNTS ONLY, 1–4 → "<5" (k5), averages hidden
-- under 5 reviews. Chee Chan is the TESTER course (fake caddies + test jobs): it is left out of every market total and
-- only shows its own numbers when Chee Chan itself looks.
-- + offer audience 'caddy_users': golfers who booked a caddy anywhere in the region in the window.

create or replace function public.market_caddies(p_course_id text, p_course_name text, p_days integer default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me text := public.venue_for_course(p_course_id, p_course_name);
  reg text;
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d0 date := (now() at time zone 'Asia/Bangkok')::date - greatest(7, least(coalesce(p_days, 90), 366));
  out jsonb;
begin
  if me is null then return jsonb_build_object('ok', false, 'reason', 'unknown_course'); end if;
  select region into reg from public.course_venues where slug = me;

  with cv as (select slug, region from public.course_venues where (reg is null or region = reg) and (slug <> 'cheechan' or me = 'cheechan')),
  caddies as (
    select p.id, cv.slug v from public.caddy_profiles p
    join cv on cv.slug = public.venue_for_course(p.course_id, p.course_name)
    where p.is_active and not coalesce(p.is_mock, false) and p.left_at is null
  ),
  jobs as (
    select b.id, cv.slug v, b.booking_date d, coalesce(nullif(b.golfer_id, ''), nullif(b.user_id, '')) g,
           coalesce(b.caddy_id::text, nullif(substring(b.caddie_name from '#\s*(\d+)'), '')) c
    from public.caddy_bookings b
    join cv on cv.slug = public.venue_for_course(b.course_id, b.course_name)
    where coalesce(b.status, '') <> 'cancelled'
  ),
  win as (select * from jobs where d between d0 and today),
  nm as (select z.n, public.venue_of(z.n) v from (select distinct course_name n from public.rounds) z),
  rds as (
    select nm.v from public.rounds x join nm on nm.n = x.course_name join cv on cv.slug = nm.v
    where x.played_at is not null and (x.played_at at time zone 'Asia/Bangkok')::date between d0 and today
  ),
  rev as (
    select r.rating, cv.slug v from public.caddy_reviews r
    join cv on cv.slug = public.venue_for_course(r.course_id, r.course_name)
    where r.rating is not null and coalesce(r.round_date, r.created_at::date) between d0 and today
  )
  select jsonb_build_object(
    'ok', true, 'venue', me, 'days', today - d0,
    'roster', jsonb_build_object('you', (select count(*) from caddies where v = me), 'market', (select count(*) from caddies),
                                 'courses', (select count(distinct v) from caddies)),
    'jobs', jsonb_build_object(
       'you', public.k5((select count(*) from win where v = me)), 'market', public.k5((select count(*) from win)),
       'golfers_you', public.k5((select count(distinct g) from win where v = me)), 'golfers_market', public.k5((select count(distinct g) from win)),
       'ahead_you', public.k5((select count(*) from jobs where v = me and d > today and d <= today + 30)),
       'no_caddy_you', public.k5((select count(*) from win where v = me and c is null))),
    -- caddy jobs per 100 rounds (how often a round here comes with a caddy booked in the app)
    'per100', jsonb_build_object(
       'you', case when (select count(*) from rds where v = me) >= 5 then round(100.0 * (select count(*) from win where v = me) / (select count(*) from rds where v = me)) end,
       'market', case when (select count(*) from rds) >= 5 then round(100.0 * (select count(*) from win) / (select count(*) from rds)) end),
    'dow', (select jsonb_agg(jsonb_build_object('dow', g.dw,
              'market', public.k5((select count(*) from win where extract(isodow from d) = g.dw)),
              'you', public.k5((select count(*) from win where v = me and extract(isodow from d) = g.dw))) order by g.dw)
            from generate_series(1, 7) g(dw)),
    -- golfers who came back to the same caddy here (the loyalty a caddy brings)
    'repeat_you', public.k5((select count(*) from (select g, c from win where v = me and g is not null and c is not null group by g, c having count(*) >= 2) q)),
    'rating', jsonb_build_object(
       'you', case when (select count(*) from rev where v = me) >= 5 then round((select avg(rating) from rev where v = me), 1) end,
       'you_n', public.k5((select count(*) from rev where v = me)),
       'market', case when (select count(*) from rev) >= 5 then round((select avg(rating) from rev), 1) end,
       'market_n', public.k5((select count(*) from rev)))
  ) into out;
  return out;
end $$;
revoke all on function public.market_caddies(text, text, integer) from public;
grant execute on function public.market_caddies(text, text, integer) to anon, authenticated;

-- offer audience 'caddy_users' — live definition from v1509 + the one new audience
create or replace function public.offer_segment_ids(
  p_hcp_min numeric, p_hcp_max numeric, p_course_names text[], p_lang text, p_played_since date,
  p_audience text, p_venue text, p_dows integer[], p_days integer)
returns setof text language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d0 date := today - greatest(7, least(coalesce(p_days, 90), 366));
  reg text := (select region from public.course_venues where slug = p_venue);
begin
  if p_audience in ('never_here', 'lapsed_elsewhere', 'market', 'caddy_users') and p_venue is null then return; end if;
  if p_audience is not null and p_audience not in ('never_here', 'lapsed_elsewhere', 'market', 'caddy_users') then return; end if;
  return query
  with nm as (select z.n, public.venue_of(z.n) v from (select distinct course_name n from public.rounds) z),
  rv as (
    select x.golfer_id, (x.played_at at time zone 'Asia/Bangkok')::date d, nm.v
    from public.rounds x join nm on nm.n = x.course_name join public.course_venues cv on cv.slug = nm.v
    where x.golfer_id is not null and x.golfer_id <> '' and x.played_at is not null
      and (p_audience is not null or p_dows is not null or p_venue is not null) and (reg is null or cv.region = reg)
  ),
  here as (
    select x.golfer_id from public.rounds x
    where p_audience is null and p_course_names is not null
      and (x.course_name = any(p_course_names) or x.course_name in (select n from nm where nm.v = p_venue))
      and (p_played_since is null or coalesce(x.played_at, x.completed_at, x.created_at) >= p_played_since)
  ),
  never_here as (
    select golfer_id from rv where d >= d0 and p_audience = 'never_here'
    except select golfer_id from rv where v = p_venue
  ),
  lapsed as (
    select golfer_id from rv where v = p_venue and p_audience = 'lapsed_elsewhere' group by golfer_id having max(d) < today - 90
    intersect select golfer_id from rv where v <> p_venue and d >= d0
  ),
  in_market as (select distinct golfer_id from rv where d >= d0 and p_audience = 'market'),
  caddy_users as (   -- booked a caddy in the region in the window (Chee Chan = tester course, left out)
    select distinct coalesce(nullif(b.golfer_id, ''), nullif(b.user_id, '')) golfer_id
    from public.caddy_bookings b join public.course_venues cv on cv.slug = public.venue_for_course(b.course_id, b.course_name)
    where p_audience = 'caddy_users' and coalesce(b.status, '') <> 'cancelled' and b.booking_date between d0 and today
      and (reg is null or cv.region = reg) and (cv.slug <> 'cheechan' or p_venue = 'cheechan')
  ),
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
    and (p_audience is distinct from 'caddy_users' or p.line_user_id in (select golfer_id from caddy_users))
    and (p_dows is null or p.line_user_id in (select golfer_id from on_days));
end $$;
revoke execute on function public.offer_segment_ids(numeric, numeric, text[], text, date, text, text, integer[], integer) from public, anon, authenticated;
