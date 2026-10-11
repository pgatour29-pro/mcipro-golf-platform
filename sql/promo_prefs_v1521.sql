-- v1521 YOUR DEALS (Pete 2026-10-11): "where is the follow options and what type of promotions that i want to see, we need
-- these type of controls and filters so each golfers will get exactly what they are looking for and not just generic set
-- of promotions that wastes their time".
-- Each golfer saves what they want: deal types, areas, days, tee-off part of the day, a top price, which courses (any or
-- only the ones they follow) and whether LINE alerts them. The wall's "For you" tab and every wall alert use the SAME rule
-- (public._deal_match here, dealMatch() in promo-wall.js). Owned by the verified login (public.line_id()), like follows (v1511).
-- Re-runnable as a whole.

create table if not exists public.golfer_deal_prefs (
  golfer_id  text primary key,
  types      text[],                                   -- null/empty = every type
  regions    text[],                                   -- null/empty = every area
  days       text not null default 'any' check (days in ('any', 'weekday', 'weekend')),
  tod        text[],                                   -- early / morning / midday / afternoon (tee-times TOD buckets); null = any
  max_price  int check (max_price is null or max_price between 100 and 100000),
  scope      text not null default 'any' check (scope in ('any', 'following')),
  alerts     boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.golfer_deal_prefs enable row level security;   -- no policies: RPC only
revoke all on public.golfer_deal_prefs from anon, authenticated;

-- the venue a follow row points at (follows key on courses.id OR a venue slug)
create or replace function public._follow_venue(p_course_id text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select v.slug from public.course_venues v where v.slug = p_course_id), public.course_venue(p_course_id))
$$;

-- THE rule. Keep in step with dealMatch() in public/promo-wall.js.
create or replace function public._deal_match(g public.golfer_deal_prefs, o public.course_offers) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  d0 date; d1 date; reg text; tf text; tt text;
begin
  if g.types is not null and cardinality(g.types) > 0
     and not (o.offer_type = any(g.types)
              or ('accommodation' = any(g.types) and o.incl_room) or ('transport' = any(g.types) and o.incl_transport)   -- v1522
              or ('promotion' = any(g.types) and o.offer_type not in ('tee_time', 'society_package', 'caddy', 'food_beverage', 'accommodation', 'transport'))) then
    return false;
  end if;
  if g.regions is not null and cardinality(g.regions) > 0 then
    select v.region into reg from public.course_venues v where v.slug = o.venue_slug;
    if reg is null or not (reg = any(g.regions)) then return false; end if;
  end if;
  if g.max_price is not null and o.price is not null and o.price > g.max_price then return false; end if;
  if g.days <> 'any' then
    d0 := greatest(coalesce(o.play_from, today), today);
    d1 := least(coalesce(o.play_to, o.play_from, (o.valid_to at time zone 'Asia/Bangkok')::date), d0 + 6);
    if d1 < d0 or not exists (select 1 from generate_series(d0, d1, interval '1 day') s(d)
                              where case when g.days = 'weekend' then extract(isodow from s.d) in (6, 7)
                                         else extract(isodow from s.d) between 1 and 5 end) then
      return false;
    end if;
  end if;
  -- tee-off part of the day: only for deals played with a round, and only when the course set hours
  if g.tod is not null and cardinality(g.tod) > 0 and o.offer_type in ('tee_time', 'society_package', 'caddy')
     and (o.time_from is not null or o.time_to is not null) then
    tf := coalesce(o.time_from, '00:00'); tt := coalesce(o.time_to, '23:59');
    if not exists (select 1 from (values ('early', '00:00', '08:00'), ('morning', '08:00', '11:00'),
                                         ('midday', '11:00', '14:00'), ('afternoon', '14:00', '24:00')) b(k, s, e)
                   where b.k = any(g.tod) and tf < b.e and tt > b.s) then
      return false;
    end if;
  end if;
  return true;
end $$;

-- is this wall deal for this golfer? no saved prefs = the old behaviour (followers get their courses' deals)
create or replace function public._deal_for(p_golfer text, o public.course_offers) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare g public.golfer_deal_prefs; f boolean;
begin
  f := exists (select 1 from public.course_follows cf where cf.golfer_line_id = p_golfer
               and (cf.course_id = o.venue_slug or public.course_venue(cf.course_id) = o.venue_slug));
  select * into g from public.golfer_deal_prefs where golfer_id = p_golfer;
  if not found then return f; end if;
  return (g.scope = 'any' or f) and public._deal_match(g, o);
end $$;

-- does it earn a LINE push? saved prefs decide (their Alerts switch); no prefs = follower + offers consent (v1169)
create or replace function public._deal_push(p_golfer text, o public.course_offers) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare g public.golfer_deal_prefs;
begin
  select * into g from public.golfer_deal_prefs where golfer_id = p_golfer;
  if not found then
    return public._deal_for(p_golfer, o)
       and exists (select 1 from public.notification_preferences np where np.user_id = p_golfer and np.notify_offers is true);
  end if;
  return g.alerts and public._deal_for(p_golfer, o);
end $$;
revoke execute on function public._follow_venue(text) from public, anon, authenticated;
revoke execute on function public._deal_match(public.golfer_deal_prefs, public.course_offers) from public, anon, authenticated;
revoke execute on function public._deal_for(text, public.course_offers) from public, anon, authenticated;
revoke execute on function public._deal_push(text, public.course_offers) from public, anon, authenticated;

-- the golfer's settings + follows + the venue list for the "Your deals" sheet
create or replace function public.promo_prefs_get(p_test boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me text := public.line_id(); g public.golfer_deal_prefs; ven jsonb; fol jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('slug', v.slug, 'name', v.name, 'short', coalesce(v.short_name, v.name), 'region', v.region)
                            order by v.region = 'Pattaya' desc, v.region, v.name), '[]'::jsonb)
    into ven from public.course_venues v where v.active is not false and (v.slug <> 'cheechan' or p_test);
  if me is null or me = '' then return jsonb_build_object('signed_in', false, 'venues', ven); end if;
  select coalesce(jsonb_agg(distinct x.s), '[]'::jsonb) into fol
    from (select public._follow_venue(cf.course_id) s from public.course_follows cf where cf.golfer_line_id = me) x where x.s is not null;
  select * into g from public.golfer_deal_prefs where golfer_id = me;
  return jsonb_build_object('signed_in', true, 'venues', ven, 'follows', fol,
    'prefs', case when found then jsonb_build_object('types', to_jsonb(g.types), 'regions', to_jsonb(g.regions), 'days', g.days,
                                                     'tod', to_jsonb(g.tod), 'max_price', g.max_price, 'scope', g.scope, 'alerts', g.alerts)
             end);
end $$;
grant execute on function public.promo_prefs_get(boolean) to anon, authenticated;

-- save them (verified login only). p.follows, when present, is the complete list of venue slugs the golfer follows.
create or replace function public.promo_prefs_set(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me text := public.line_id();
  v_types text[]; v_regions text[]; v_tod text[]; v_days text; v_max int; v_scope text; v_alerts boolean; want text[];
begin
  if me is null or me = '' then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  if p is null or jsonb_typeof(p) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'bad'); end if;
  select array_agg(distinct x) into v_types from jsonb_array_elements_text(case when jsonb_typeof(p->'types') = 'array' then p->'types' else '[]' end) x
    where x in ('tee_time', 'society_package', 'caddy', 'food_beverage', 'accommodation', 'transport', 'promotion');
  select array_agg(distinct x) into v_regions from jsonb_array_elements_text(case when jsonb_typeof(p->'regions') = 'array' then p->'regions' else '[]' end) x
    where x in (select distinct region from public.course_venues where region is not null);
  select array_agg(distinct x) into v_tod from jsonb_array_elements_text(case when jsonb_typeof(p->'tod') = 'array' then p->'tod' else '[]' end) x
    where x in ('early', 'morning', 'midday', 'afternoon');
  v_days := case when p->>'days' in ('weekday', 'weekend') then p->>'days' else 'any' end;
  v_max := case when coalesce(p->>'max_price', '') ~ '^\d{3,6}$' and (p->>'max_price')::int between 100 and 100000 then (p->>'max_price')::int end;
  v_scope := case when p->>'scope' = 'following' then 'following' else 'any' end;
  v_alerts := coalesce((p->>'alerts')::boolean, true);
  insert into public.golfer_deal_prefs (golfer_id, types, regions, days, tod, max_price, scope, alerts, updated_at)
  values (me, v_types, v_regions, v_days, v_tod, v_max, v_scope, v_alerts, now())
  on conflict (golfer_id) do update set types = excluded.types, regions = excluded.regions, days = excluded.days, tod = excluded.tod,
    max_price = excluded.max_price, scope = excluded.scope, alerts = excluded.alerts, updated_at = now();
  if jsonb_typeof(p->'follows') = 'array' then
    select coalesce(array_agg(distinct x), '{}') into want from (select x from jsonb_array_elements_text(p->'follows') x
      where x in (select slug from public.course_venues) limit 80) z;
    -- unfollow the venues taken off the list (rows that point at no venue are left alone)
    delete from public.course_follows cf where cf.golfer_line_id = me
      and public._follow_venue(cf.course_id) is not null and not (public._follow_venue(cf.course_id) = any(want));
    insert into public.course_follows (golfer_line_id, course_id, source)
    select me, public._promo_course_id(s), 'deal_prefs' from unnest(want) s
    where not exists (select 1 from public.course_follows cf where cf.golfer_line_id = me and public._follow_venue(cf.course_id) = s)
    on conflict (golfer_line_id, course_id) do nothing;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.promo_prefs_set(jsonb) to anon, authenticated;

-- v1521: wall alerts follow the golfer's saved choices (live definitions pulled 2026-10-11, two changes each, marked v1521)
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
end $function$;

CREATE OR REPLACE FUNCTION public.deliver_course_offer(p_offer_id uuid, p_recipients text[], p_daily_cap integer DEFAULT 2)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_course text; v_status text; v_valid_to timestamptz;
  v_delivered int := 0;
  v_push text[]; v_inbox text[]; v_capped text[]; v_quiet text[];
  v_venue text;
  v_offer public.course_offers;
begin
  select course_id, status, valid_to into v_course, v_status, v_valid_to
  from public.course_offers where id = p_offer_id;

  if v_course is null then return jsonb_build_object('error','offer not found'); end if;
  if v_status <> 'active' then return jsonb_build_object('error','offer is not active','status',v_status); end if;
  if v_valid_to is not null and v_valid_to < now() then
    return jsonb_build_object('error','offer already expired','valid_to',v_valid_to);
  end if;
  v_venue := public.course_venue(v_course);
  -- v1521: a wall deal reaches only the golfers it is FOR (their saved types / areas / days / tee-off / price / courses)
  select * into v_offer from public.course_offers where id = p_offer_id;
  if v_offer.on_wall then
    p_recipients := coalesce(array(select r from unnest(p_recipients) r where public._deal_for(r, v_offer)), '{}');
  end if;

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
  where case when v_offer.on_wall then public._deal_push(r, v_offer)   -- v1521: their Alerts switch + the same rule
             else exists (select 1 from public.course_follows cf
                where cf.golfer_line_id = r
                  and (cf.course_id = v_course or (v_venue is not null and public.course_venue(cf.course_id) = v_venue)))
              and exists (select 1 from public.notification_preferences np
                where np.user_id = r and np.notify_offers is true) end
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

notify pgrst, 'reload schema';
