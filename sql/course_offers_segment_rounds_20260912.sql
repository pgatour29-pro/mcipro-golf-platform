-- =====================================================================================
-- SEGMENT "has played this course" must read `rounds`, not `bookings`  (2026-09-12)
-- =====================================================================================
-- `bookings` is unusable for this: 43 rows total, 31 of them deleted, and golfer_id holds
-- values like 'pete_park' -- ZERO of its 23 named rows match user_profiles.line_user_id.
-- `rounds` is the real record: 1055 rows, 952 matching a profile, 48 distinct course_name
-- values with genuine player counts (Pattaya Country Club = 111 golfers).
--
-- rounds.course_name is FREE TEXT and messy ('Burapha Golf Club (A+B)', 'Phoenix Gold Golf
-- CC (Mountain+Lake)', 'Khao Kheow CC (C+A)', 'Society Event'). The caller resolves those
-- to a venue with CourseMatch and passes the matching set, so the ONE course matcher stays
-- the only thing that knows how a name maps to a venue -- no normalisation is duplicated
-- in SQL.
-- =====================================================================================

drop function if exists public.count_offer_segment(numeric, numeric, text[], text, date);

create or replace function public.count_offer_segment(
  p_hcp_min       numeric  default null,
  p_hcp_max       numeric  default null,
  p_course_names  text[]   default null,   -- from CourseMatch: every rounds.course_name
                                           -- variant that resolves to the chosen venue
  p_lang          text     default null,
  p_played_since  date     default null
)
returns integer
language sql
security definer
set search_path to 'public'
as $fn$
  select count(distinct p.line_user_id)::int
  from public.user_profiles p
  where p.line_user_id is not null
    and (p_hcp_min is null or p.handicap_index >= p_hcp_min)
    and (p_hcp_max is null or p.handicap_index <= p_hcp_max)
    and (p_lang    is null or coalesce(p.profile_data->>'language','en') = p_lang)
    and (p_course_names is null or exists (
          select 1 from public.rounds r
          where r.golfer_id = p.line_user_id
            and r.course_name = any(p_course_names)
            and (p_played_since is null
                 or coalesce(r.played_at, r.completed_at, r.created_at) >= p_played_since)));
$fn$;

grant execute on function public.count_offer_segment(numeric, numeric, text[], text, date) to anon, authenticated;

-- The free-text course names actually present in round history, so the client can map them
-- to venues with CourseMatch and build a segment. PostgREST has no DISTINCT, and fetching
-- 1055 rows to find 48 names is waste.
create or replace function public.list_round_course_names()
returns table (course_name text, golfers integer, rounds integer)
language sql
security definer
set search_path to 'public'
as $fn$
  select r.course_name,
         count(distinct r.golfer_id)::int,
         count(*)::int
  from public.rounds r
  where r.course_name is not null and r.course_name <> ''
  group by r.course_name
  order by count(distinct r.golfer_id) desc;
$fn$;

grant execute on function public.list_round_course_names() to anon, authenticated;
