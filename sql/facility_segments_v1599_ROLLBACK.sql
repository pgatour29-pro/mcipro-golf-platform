-- ROLLBACK for facility_segments_v1599.sql: restores offer_segment_ids as it was live on 2026-10-16, drops the new functions
begin;
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
end $function$

;
revoke execute on function public.offer_segment_ids(numeric, numeric, text[], text, date, text, text, integer[], integer) from public, anon, authenticated;
drop function if exists public.facility_segment_list(text, text, text, integer);
drop function if exists public.facility_segment_rows(text, text, integer);
drop function if exists public.facility_acts(text, integer);
commit;
