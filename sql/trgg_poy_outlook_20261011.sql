-- TRGG POY "Path to #1" (poy.html): the two inputs the page cannot compute from trgg_poy_cache.
--   venues   = how the TRGG field scores at each course (in-app TRGG rounds: completed, 18 holes,
--              individual, singles events only, 5-60 pts). Aggregates only, never a player row, so the page can say
--              "the field averages 34.6 at Burapha" without anon read access to rounds.
--   upcoming = the next 21 days of TRGG events (Bangkok date), cancelled excluded.
-- Read-only, SECURITY DEFINER so anon gets aggregates without a rounds SELECT policy.
-- Venue matching (event name -> course) happens client-side with CourseLink, the same token
-- table the pro shop tee sheet uses; course names stay raw here.

create or replace function public.trgg_poy_outlook()
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select jsonb_build_object(
    'venues', coalesce((
      select jsonb_agg(v order by v.n desc)
      from (
        select r.course_id, r.course_name, count(*)::int as n,
               round(avg(r.total_stableford), 1) as avg,
               max(r.total_stableford)::int as best
        from rounds r
        left join society_events se on se.id::text = r.society_event_id::text
        where r.primary_society_id::text = '7c0e4b72-d925-44bc-afda-38259a7ba346'
          -- only SINGLES events count toward POY (Pete 2026-10-11): drop rounds from team days
          and coalesce(se.course_name, '') !~* 'scramble|waltz|team|ambrose|texas|pairs|four ?ball|better ?ball|foursome|greensome|(two|three|four|2|3|4) ?-?(man|men|person|ball)'
          and r.status = 'completed'
          and coalesce(r.holes_played, 18) = 18
          and coalesce(r.team_size, 1) <= 1
          and r.total_stableford between 5 and 60
        group by r.course_id, r.course_name
      ) v
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(e order by e.event_date, e.start_time)
      from (
        select se.event_date, se.start_time, se.course_name
        from society_events se
        where (se.society_id::text = '7c0e4b72-d925-44bc-afda-38259a7ba346' or se.title ilike 'TRGG%')
          and se.event_date >= (now() at time zone 'Asia/Bangkok')::date
          and se.event_date <  (now() at time zone 'Asia/Bangkok')::date + 21
          and coalesce(se.status, '') <> 'cancelled'
      ) e
    ), '[]'::jsonb)
  );
$fn$;

revoke all on function public.trgg_poy_outlook() from public;
grant execute on function public.trgg_poy_outlook() to anon, authenticated;
