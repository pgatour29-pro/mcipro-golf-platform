-- =====================================================================================
-- OFFER CONSENT + SEGMENT FIXES  (2026-09-12)
-- =====================================================================================
-- WHY AN RPC: the 2026-09-06 anon lockdown (sql/security_anon_lockdown_20260906.sql) left
-- `anon` with SELECT only on notification_preferences, and the browser runs on the anon
-- key — so a client-side toggle would fail with 42501 "permission denied". Nothing in the
-- client wrote that table before, so nothing was broken; offers are the FIRST writer.
-- This grants exactly one narrow, column-scoped write instead of re-opening the table.
--
-- NOT A SECURITY BOUNDARY: the caller passes its own golfer id and the app has no per-user
-- JWT yet (see project_security_rls, Phase 2 = LINE->JWT). Checking the id here would be
-- theatre. This exists to make the toggle FUNCTION, not to authorise it.
-- =====================================================================================

create or replace function public.set_offer_consent(
  p_user_id text,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if p_user_id is null or p_user_id = '' then
    return false;
  end if;
  insert into public.notification_preferences (user_id, notify_offers)
  values (p_user_id, coalesce(p_enabled, false))
  on conflict (user_id) do update
    set notify_offers = coalesce(p_enabled, false),
        updated_at    = now();
  return true;
end; $fn$;

grant execute on function public.set_offer_consent(text, boolean) to anon, authenticated;

-- =====================================================================================
-- count_offer_segment: match "has played this course" by NAME, not by id.
-- bookings.course_id does NOT hold a courses.id slug — live values are things like
-- 'course-b' while bookings.course_name holds the real name ('Pattana Golf Resort & Spa').
-- Matching on course_id returned 0 for every venue. The caller passes the venue's full set
-- of acceptable names from CourseMatch.resolveId() (venue row + its nines/combos), so the
-- ONE course matcher stays the only place that knows how names map to a venue.
-- =====================================================================================

drop function if exists public.count_offer_segment(numeric, numeric, text, text);

create or replace function public.count_offer_segment(
  p_hcp_min       numeric  default null,
  p_hcp_max       numeric  default null,
  p_course_names  text[]   default null,   -- from CourseMatch.resolveId(): venue + nines
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
          select 1 from public.bookings b
          where b.golfer_id = p.line_user_id
            and coalesce(b.deleted, false) = false
            and b.course_name = any(p_course_names)
            and (p_played_since is null or b.date >= p_played_since)));
$fn$;

grant execute on function public.count_offer_segment(numeric, numeric, text[], text, date) to anon, authenticated;
