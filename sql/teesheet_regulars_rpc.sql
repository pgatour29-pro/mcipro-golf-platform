-- get_society_regulars: TOP 30 most-repeated players for a society's tee sheet REGULARS tray (RGV1).
-- Groups registrations by NORMALIZED player name (strips parentheticals — "Britt, Tom (Guest)" == "Britt, Tom",
-- "Wallis, Dan (17.7)" == "Wallis, Dan") so dual-ID players count as one person. Returns the person's MOST
-- RECENT registration id/name (their current identity), live profile handicap when available, play counts,
-- same-weekday count (p_event_date's day-of-week — "the Tuesday crowd"), and their played-days list for the
-- chip tooltip. Window = last 60 days of PAST events, min 2 rounds, ranked played + 1.5x day-affinity.
-- top_days (Pete 2026-07-11, one week of real data): UNCAPPED — a weekday shows if played in the last
-- 14 days (captures the current week's full pattern) OR played 2+ times in the window (what "usually"
-- means once history accumulates). One-off days age out after a fortnight. window_events counts only
-- events that HAVE registrations, so "4 OF LAST 15" reads honestly during adoption.
-- SECURITY DEFINER: browser runs on the ANON key (same model as sync_event_reg_handicaps).
create or replace function public.get_society_regulars(
  p_society_id uuid,
  p_event_date date default null
)
returns table (
  player_id text,
  player_name text,
  handicap numeric,
  played integer,
  dow_played integer,
  window_events integer,
  last_played date,
  top_days text
)
language sql
security definer
set search_path = public
as $$
with target as (
  -- Cutoff = the event being built (client passes its LOCAL date). Fallback = Bangkok today, NEVER
  -- UTC current_date: Thai mornings are still "yesterday" in UTC, which dropped the newest event
  -- (Pete: Jul 10 rounds missing from "last played" on the Jul 11 sheet).
  select coalesce(p_event_date, (now() at time zone 'Asia/Bangkok')::date) as d
),
past_events as (
  select e.id, e.event_date
  from society_events e, target t
  where e.society_id = p_society_id
    and e.event_date < t.d
    and e.event_date >= t.d - 60
),
regs as (
  select r.player_id, r.player_name, r.handicap, e.event_date, r.created_at,
         lower(trim(regexp_replace(regexp_replace(r.player_name, '\(.*?\)', ' ', 'g'), '[^a-zA-Z ]', '', 'g'))) as nm
  from event_registrations r
  join past_events e on e.id = r.event_id
  where coalesce(r.player_name, '') <> ''
),
grouped as (
  select nm,
         count(distinct event_date)::int as played,
         count(distinct event_date) filter (
           where extract(dow from event_date) = extract(dow from (select d from target))
         )::int as dow_played,
         max(event_date) as last_played
  from regs
  group by nm
  having count(distinct event_date) >= 2
),
best as (
  -- most recent registration row per person = their current id / display name / last-known handicap
  select distinct on (nm) nm, player_id, player_name, handicap
  from regs
  order by nm, event_date desc, created_at desc
),
days as (
  select nm, string_agg(dy, E'·' order by mod(dw::int + 6, 7)) as top_days   -- MON-first week order
  from (
    select nm,
           extract(dow from event_date) as dw,
           upper(to_char(event_date, 'Dy')) as dy,
           count(distinct event_date) as c,
           max(event_date) as last_dw
    from regs
    group by nm, extract(dow from event_date), upper(to_char(event_date, 'Dy'))
  ) x
  where c >= 2 or last_dw >= (select d - 14 from target)   -- recent fortnight OR genuinely recurring
  group by nm
),
top30 as (
  select b.player_id, b.player_name, b.handicap as reg_h,
         g.played, g.dow_played, g.last_played, d.top_days,
         (g.played + g.dow_played * 1.5) as score
  from grouped g
  join best b on b.nm = g.nm
  left join days d on d.nm = g.nm
  order by (g.played + g.dow_played * 1.5) desc, g.last_played desc, b.player_name
  limit 30
)
-- Handicap = ALWAYS the current pulled value (user_profiles.handicap_index — the TRGG master import's
-- target, refreshed on every pull), resolved by id then by TOKEN-SORTED normalized name (the EXACT
-- matching sync_event_reg_handicaps uses, so tray chips == sheet == badges). Stale registration
-- handicap is last-resort only. Revisit source when TRGG manages handicaps natively via publish.
select t.player_id::text,
       t.player_name::text,
       coalesce(pid.h, pnm.h, nullif(t.reg_h::text, '')::numeric) as handicap,
       t.played,
       t.dow_played,
       (select count(*)::int from past_events pe where exists (select 1 from event_registrations er where er.event_id = pe.id)) as window_events,
       t.last_played,
       t.top_days
from top30 t
left join lateral (
  select p.handicap_index as h from user_profiles p
  where p.line_user_id = t.player_id and p.handicap_index is not null
  order by p.updated_at desc nulls last limit 1
) pid on true
left join lateral (
  select p.handicap_index as h from user_profiles p
  where (select string_agg(w,' ' order by w) from regexp_split_to_table(regexp_replace(lower(regexp_replace(coalesce(p.name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') w where w<>'')
      = (select string_agg(w,' ' order by w) from regexp_split_to_table(regexp_replace(lower(regexp_replace(t.player_name,'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') w where w<>'')
    and p.handicap_index is not null
  order by p.updated_at desc nulls last limit 1
) pnm on true
order by t.score desc, t.last_played desc, t.player_name
$$;

grant execute on function public.get_society_regulars(uuid, date) to anon, authenticated;
