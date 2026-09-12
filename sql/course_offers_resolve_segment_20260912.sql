-- =====================================================================================
-- SEGMENT RESOLUTION — SERVICE ROLE ONLY  (2026-09-12)
-- =====================================================================================
-- count_offer_segment() is granted to anon so a course can see HOW MANY golfers a segment
-- reaches. This function returns WHO, and is deliberately NOT granted to anon: only the
-- line-push-notification edge function (service role) may call it. That is what keeps the
-- rule true -- the course builds a segment and sees a count, the platform delivers, and the
-- course never holds a list of golfers.
-- =====================================================================================

create or replace function public.resolve_offer_segment(
  p_hcp_min      numeric default null,
  p_hcp_max      numeric default null,
  p_course_names text[]  default null,
  p_lang         text    default null,
  p_played_since date    default null,
  p_limit        integer default 5000
)
returns setof text
language sql
security definer
set search_path to 'public'
as $fn$
  select distinct p.line_user_id
  from public.user_profiles p
  where p.line_user_id is not null
    and p.line_user_id <> ''
    and (p_hcp_min is null or p.handicap_index >= p_hcp_min)
    and (p_hcp_max is null or p.handicap_index <= p_hcp_max)
    and (p_lang    is null or lower(coalesce(p.language, p.preferred_language, 'en')) = lower(p_lang))
    and (p_course_names is null or exists (
          select 1 from public.rounds r
          where r.golfer_id = p.line_user_id
            and r.course_name = any(p_course_names)
            and (p_played_since is null
                 or coalesce(r.played_at, r.completed_at, r.created_at) >= p_played_since)))
  limit p_limit;
$fn$;

revoke all on function public.resolve_offer_segment(numeric, numeric, text[], text, date, integer) from public, anon, authenticated;
grant execute on function public.resolve_offer_segment(numeric, numeric, text[], text, date, integer) to service_role;
