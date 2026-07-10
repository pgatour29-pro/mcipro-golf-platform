-- get_society_regulars: TOP 30 most-repeated players for a society's tee sheet REGULARS tray (RGV1).
-- Groups registrations by NORMALIZED player name (strips parentheticals — "Britt, Tom (Guest)" == "Britt, Tom",
-- "Wallis, Dan (17.7)" == "Wallis, Dan") so dual-ID players count as one person. Returns the person's MOST
-- RECENT registration id/name (their current identity), live profile handicap when available, play counts,
-- same-weekday count (p_event_date's day-of-week — "the Tuesday crowd"), and their top-2 weekdays for the
-- chip tooltip. Window = last 60 days of PAST events, min 2 rounds, ranked played + 1.5x day-affinity.
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
  select coalesce(p_event_date, current_date) as d
),
past_events as (
  select e.id, e.event_date
  from society_events e
  where e.society_id = p_society_id
    and e.event_date < current_date
    and e.event_date >= current_date - 60
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
  select nm, string_agg(dy, E'·' order by c desc, dw) as top_days
  from (
    select nm,
           extract(dow from event_date) as dw,
           upper(to_char(event_date, 'Dy')) as dy,
           count(distinct event_date) as c,
           row_number() over (
             partition by nm
             order by count(distinct event_date) desc, extract(dow from event_date)
           ) as rn
    from regs
    group by nm, extract(dow from event_date), upper(to_char(event_date, 'Dy'))
  ) x
  where rn <= 2
  group by nm
)
select b.player_id::text,
       b.player_name::text,
       coalesce(up.handicap_index, nullif(b.handicap::text, '')::numeric) as handicap,
       g.played,
       g.dow_played,
       (select count(*)::int from past_events) as window_events,
       g.last_played,
       d.top_days
from grouped g
join best b on b.nm = g.nm
left join user_profiles up on up.line_user_id = b.player_id
left join days d on d.nm = g.nm
order by (g.played + g.dow_played * 1.5) desc, g.last_played desc, b.player_name
limit 30
$$;

grant execute on function public.get_society_regulars(uuid, date) to anon, authenticated;
