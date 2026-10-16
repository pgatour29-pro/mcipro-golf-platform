-- =====================================================================================
-- v1599 (Pete 2026-10-16): "Pro shop: insight section: why is the review list and other tabs not working"
-- The Insights tab's Promotion targets had buttons with nothing behind them (v1487 pointed them at a CourseOffers
-- composer that was never built). Now:
--   facility_acts(facility, days)            the rounds / tee-sheet bookings / caddy jobs facility_insights reads
--   facility_segment_rows(facility, seg, d)  WHO is in each Insights group — same rules as facility_insights' counts
--   facility_segment_list(token, ...)        the pro shop's Review list: needs that facility's own desk token
--                                            (PIN login), so the facility only ever sees golfers of its own book
--   offer_segment_ids + fx_* audiences       Send offer: the platform resolves + delivers (inbox, LINE push for
--                                            followers), the browser never holds the recipient list
-- Rollback: facility_segments_v1599_ROLLBACK.sql
-- =====================================================================================
begin;

create or replace function public.facility_acts(p_facility text, p_days integer)
returns table (gkey text, gname text, slug text, kind text, d date, dow integer)
language sql stable security definer set search_path = public as $$
  with w as (select current_date - greatest(7, least(730, coalesce(p_days, 90))) d0)
  select coalesce(r.golfer_id, r.user_id::text, lower(btrim(r.player_name))), coalesce(r.player_name, ''), fc.slug, 'round',
         coalesce(r.played_at, r.created_at)::date, extract(isodow from coalesce(r.played_at, r.created_at))::int
    from public.rounds r cross join w
    join public.facility_courses fc on fc.facility_id = p_facility
   where coalesce(r.played_at, r.created_at) >= w.d0
     and lower(coalesce(r.course_name, '')) like '%' || fc.match_token || '%'
     and (fc.veto_token is null or lower(coalesce(r.course_name, '')) not like '%' || fc.veto_token || '%')
     and coalesce(r.golfer_id, r.user_id::text, r.player_name) is not null
  union all
  select coalesce(g->>'odoo_id', b.golfer_id, lower(btrim(g->>'name'))), coalesce(g->>'name', b.golfer_name, ''), fc.slug, 'booking', b.date, extract(isodow from b.date)::int
    from public.bookings b cross join w
    join public.facility_courses fc on fc.facility_id = p_facility and fc.slug = b.course_id
    cross join lateral jsonb_array_elements(coalesce(b.booking_data->'golfers', '[]'::jsonb)) g
   where b.date >= w.d0 and b.deleted is not true and b.source in ('teesheet', 'hotdeal', 'app')
     and coalesce(g->>'odoo_id', g->>'name') is not null
  union all
  select coalesce(cb.golfer_id, cb.user_id, lower(btrim(cb.golfer_name))), coalesce(cb.golfer_name, ''), fc.slug, 'caddy', cb.booking_date, extract(isodow from cb.booking_date)::int
    from public.caddy_bookings cb cross join w
    join public.facility_courses fc on fc.facility_id = p_facility
   where cb.booking_date >= w.d0 and cb.status <> 'cancelled'
     and (fc.slug = cb.course_id or (lower(coalesce(cb.course_name, '')) like '%' || fc.match_token || '%'
          and (fc.veto_token is null or lower(coalesce(cb.course_name, '')) not like '%' || fc.veto_token || '%')))
     and coalesce(cb.golfer_id, cb.user_id, cb.golfer_name) is not null
$$;
revoke all on function public.facility_acts(text, integer) from public, anon, authenticated;

-- the four Promotion targets, rule for rule as facility_insights counts them
create or replace function public.facility_segment_rows(p_facility text, p_segment text, p_days integer)
returns table (gkey text, name text, visits integer, last_d date, slugs text[], member boolean)
language sql stable security definer set search_path = public as $$
  with a as (select * from public.facility_acts(p_facility, p_days)),
  per_golfer as (
    select a.gkey, max(a.gname) gname, count(distinct a.slug) n_courses, count(*) n_acts, max(a.d) last_d, array_agg(distinct a.slug) slugs
      from a group by a.gkey),
  members as (
    select coalesce(m.golfer_id, lower(btrim(m.golfer_name))) gkey, max(m.golfer_name) gname
      from public.course_memberships m where m.facility_id = p_facility and m.status = 'active'
       and (m.valid_to is null or m.valid_to >= current_date) group by 1),
  flag as (select coalesce(f.flagship_slug, (select slug from public.facility_courses where facility_id = p_facility order by sort limit 1)) slug
             from public.facilities f where f.id = p_facility)
  select g.gkey, g.gname, g.n_acts::int, g.last_d, g.slugs, exists (select 1 from members m where m.gkey = g.gkey)
    from per_golfer g, flag
   where (p_segment = 'flagship_only' and g.n_courses = 1 and (select count(*) from a where a.gkey = g.gkey and a.slug = flag.slug) >= 3)
      or (p_segment = 'weekend_only' and g.n_acts >= 3 and not exists (select 1 from a where a.gkey = g.gkey and a.dow < 6))
      or (p_segment = 'guests_3plus' and g.n_acts >= 3 and not exists (select 1 from members m where m.gkey = g.gkey))
  union all
  select m.gkey, coalesce(nullif(m.gname, ''), pg.gname, m.gkey), coalesce(pg.n_acts, 0)::int, pg.last_d, pg.slugs, true
    from members m left join per_golfer pg on pg.gkey = m.gkey
   where p_segment = 'members_idle_30' and not exists (select 1 from a where a.gkey = m.gkey and a.d >= current_date - 30)
$$;
revoke all on function public.facility_segment_rows(text, text, integer) from public, anon, authenticated;

-- the Review list: names for the facility's own pro shop only (its PIN's desk token), never anon by facility id
create or replace function public.facility_segment_list(p_token text, p_facility text, p_segment text, p_days integer default 90)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.proshop_desk_tokens t where t.token = p_token and t.expires_at > now() and t.facility_id = p_facility) then
    raise exception 'FACILITY_TOKEN: sign in with this facility''s pro shop PIN' using errcode = '42501';
  end if;
  if p_segment not in ('flagship_only', 'members_idle_30', 'weekend_only', 'guests_3plus') then
    raise exception 'FACILITY_SEGMENT' using errcode = '22023';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', s.gkey, 'name', coalesce(nullif(p.name, ''), nullif(p.display_name, ''), s.name), 'visits', s.visits,
             'last', s.last_d, 'courses', s.slugs, 'member', s.member, 'app', p.line_user_id is not null)
             order by s.visits desc, s.last_d desc nulls last, s.name)
      from (select * from public.facility_segment_rows(p_facility, p_segment, p_days) limit 1000) s
      left join public.user_profiles p on p.line_user_id = s.gkey), '[]'::jsonb);
end $$;
revoke all on function public.facility_segment_list(text, text, text, integer) from public;
grant execute on function public.facility_segment_list(text, text, text, integer) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.offer_segment_ids(p_hcp_min numeric, p_hcp_max numeric, p_course_names text[], p_lang text, p_played_since date, p_audience text, p_venue text, p_dows integer[], p_days integer)
 RETURNS SETOF text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d0 date := today - greatest(7, least(coalesce(p_days, 90), 366));
  reg text := (select region from public.course_venues where slug = p_venue);
begin
  -- v1599: the pro shop Insights groups of a FACILITY (p_venue = facilities.id). One definition with the Insights
  -- counts and the Review list: facility_segment_rows. Only golfers with an app account can be reached.
  if p_audience in ('fx_flagship_only', 'fx_members_idle_30', 'fx_weekend_only', 'fx_guests_3plus') then
    if p_venue is null then return; end if;
    return query
    select distinct p.line_user_id
    from public.facility_segment_rows(p_venue, substr(p_audience, 4), p_days) s
    join public.user_profiles p on p.line_user_id = s.gkey
    where p.line_user_id <> ''
      and (p_hcp_min is null or p.handicap_index >= p_hcp_min)
      and (p_hcp_max is null or p.handicap_index <= p_hcp_max)
      and (p_lang is null or lower(coalesce(p.language, p.preferred_language, 'en')) = lower(p_lang));
    return;
  end if;
  if p_audience in ('never_here', 'lapsed_elsewhere', 'market', 'caddy_users', 'followers') and p_venue is null then return; end if;
  if p_audience is not null and p_audience not in ('never_here', 'lapsed_elsewhere', 'market', 'caddy_users', 'followers') then return; end if;
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
  followers as (   -- v1513: everyone following this venue (any course id of it); a wall promotion reaches them
    select cf.golfer_line_id golfer_id from public.course_follows cf
    where p_audience = 'followers' and (cf.course_id = p_venue or public.course_venue(cf.course_id) = p_venue)
    union   -- v1521: golfers who asked for matching deals from ANY course in this area (deliver_course_offer checks the rest)
    select g.golfer_id from public.golfer_deal_prefs g
    where p_audience = 'followers' and g.scope = 'any' and (g.regions is null or cardinality(g.regions) = 0 or reg = any(g.regions))
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
    and (p_audience is distinct from 'followers' or p.line_user_id in (select golfer_id from followers))
    and (p_dows is null or p.line_user_id in (select golfer_id from on_days));
end $function$;
revoke execute on function public.offer_segment_ids(numeric, numeric, text[], text, date, text, text, integer[], integer) from public, anon, authenticated;

commit;
