-- 2026-09-18 (v1256) Marketing dashboard — Pete: "i want marketing and everything a marketing
-- department needs". New staff role `marketing` + aggregate-only reporting RPCs.
--
-- PRIVACY RULE carried over from the Course Offers inbox (v1169): the course builds a SEGMENT and
-- sees a COUNT, never a list of golfers. Every function here returns aggregates only — no names,
-- no ids — so granting them to anon exposes nothing a course could not already infer.
-- Run: npx supabase db query --linked -f sql/marketing_dashboard_20260918.sql
--
-- SECURITY NOTE (automated review 2026-09-18): both functions are SECURITY DEFINER and granted to anon because
-- ~95% of real sessions are LINE logins without a Supabase JWT (see project_security_rls, Auth Phase 2). They
-- return aggregates only; course_offers / course_offer_reads / rounds are already anon-readable tables, so the
-- functions add no exposure beyond a count. created_by is NOT returned; p_like must carry >= 3 letters.
-- At Auth Phase 2: revoke anon and gate on the caller's role/course.

-- 1. the role
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check check (role = any (array[
  'golfer','guest','organizer','society_organizer','admin','caddy','caddie','caddymaster','manager',
  'golf_course_manager','proshop','maintenance','restaurant','oo_partner','marketing']));

-- 2. audience + satisfaction + events, one call
-- p_course_id = courses.id (rounds / caddy_reviews / course_follows / course_offers namespace)
-- p_like      = the manager's stem pattern, e.g. '%pattaya%country%' (rounds without a slug carry a name)
-- p_names     = exact course_name variants (optional, from list_round_course_names)
create or replace function public.marketing_audience_report(p_course_id text, p_like text, p_names text[] default null, p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_now   timestamptz := now();
  v_from  timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
  v_prev  timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1) * 2);
  v_names text[] := coalesce(p_names, array[]::text[]);
  v_like  text := coalesce(nullif(p_like, ''), '%__none__%');
  v_alpha text := regexp_replace(coalesce(p_like, ''), '[^a-zA-Z0-9]', '', 'g');
  r jsonb := '{}'::jsonb;
  t1 jsonb; t2 jsonb; t3 jsonb; t4 jsonb; t5 jsonb; t6 jsonb; t7 jsonb; t8 jsonb; t9 jsonb; t10 jsonb;
begin
  -- a pattern with no real letters would aggregate every course; the name arm needs a stem (e.g. %pattaya%country%)
  if length(v_alpha) < 3 then v_like := '%__none__%'; end if;
  if p_course_id is null or p_course_id = '' then return jsonb_build_object('ok', false, 'reason', 'course'); end if;
  -- rounds at this facility, one row per (golfer, round)
  create temp table if not exists _mk_rounds (gid text, played timestamptz, society uuid, app boolean) on commit drop;
  truncate _mk_rounds;
  insert into _mk_rounds
    select coalesce(nullif(r.golfer_id, ''), 'name:' || coalesce(r.player_name, '')),
           coalesce(r.played_at, r.completed_at, r.created_at),
           r.primary_society_id,
           coalesce(r.golfer_id, '') ~ '^(U|KAKAO-|GOOGLE-)'
      from public.rounds r
     where coalesce(r.status, 'completed') not in ('abandoned', 'deleted', 'cancelled')
       and (r.course_id = p_course_id or r.course_name ilike v_like or lower(coalesce(r.course_name, '')) = any(select lower(x) from unnest(v_names) x));

  -- period headline
  select jsonb_build_object(
      'golfers',   (select count(distinct gid) from _mk_rounds where played >= v_from),
      'app_users', (select count(distinct gid) from _mk_rounds where played >= v_from and app),
      'rounds',    (select count(*) from _mk_rounds where played >= v_from),
      'golfers_prev', (select count(distinct gid) from _mk_rounds where played >= v_prev and played < v_from),
      'rounds_prev',  (select count(*) from _mk_rounds where played >= v_prev and played < v_from),
      'new_golfers', (select count(*) from (select gid, min(played) f from _mk_rounds group by gid) x where f >= v_from),
      'frequent',  (select count(*) from (select gid from _mk_rounds where played >= v_from group by gid having count(*) >= 3) x),
      'lapsed',    (select count(*) from (select gid, max(played) l from _mk_rounds group by gid) x where l < v_now - interval '90 days' and l >= v_now - interval '365 days'),
      'all_time',  (select count(distinct gid) from _mk_rounds),
      'all_time_rounds', (select count(*) from _mk_rounds))
    into t1;

  -- rounds per day (Bangkok)
  select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) into t2
    from (select (played at time zone 'Asia/Bangkok')::date d, count(*) n from _mk_rounds where played >= v_from group by 1) x;

  -- society mix (who brings the players)
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'golfers', golfers, 'rounds', rounds) order by golfers desc, rounds desc), '[]'::jsonb) into t3
    from (select coalesce(s.name, 'Independent') name, count(distinct m.gid) golfers, count(*) rounds
            from _mk_rounds m left join public.societies s on s.id = m.society
           where m.played >= v_from group by 1 order by 2 desc limit 8) x;

  -- where app golfers come from (registration geo → nationality), and their app language
  select coalesce(jsonb_agg(jsonb_build_object('name', c, 'n', n) order by n desc), '[]'::jsonb) into t4
    from (select coalesce(nullif(u.registration_geo->>'country', ''), nullif(u.nationality, ''), 'Unknown') c, count(*) n
            from (select distinct gid from _mk_rounds where played >= v_from and app) g
            join public.user_profiles u on u.line_user_id = g.gid
           group by 1 order by 2 desc limit 8) x;
  select coalesce(jsonb_agg(jsonb_build_object('name', l, 'n', n) order by n desc), '[]'::jsonb) into t5
    from (select coalesce(nullif(u.language, ''), 'en') l, count(*) n
            from (select distinct gid from _mk_rounds where played >= v_from and app) g
            join public.user_profiles u on u.line_user_id = g.gid
           group by 1 order by 2 desc limit 6) x;

  -- reach: followers + opt-ins (push is earned by a follow AND notify_offers on)
  select jsonb_build_object(
      'followers', (select count(*) from public.course_follows f where f.course_id = p_course_id),
      'opt_in',    (select count(*) from public.course_follows f join public.notification_preferences n on n.user_id = f.golfer_line_id and n.notify_offers where f.course_id = p_course_id),
      'played_app_users_365', (select count(distinct gid) from _mk_rounds where played >= v_now - interval '365 days' and app))
    into t6;

  -- satisfaction: caddy reviews + course condition reports in the period
  select jsonb_build_object(
      'caddy_avg', (select round(avg(rating)::numeric, 2) from public.caddy_reviews c where c.created_at >= v_from and (c.course_id = p_course_id or c.course_name ilike v_like)),
      'caddy_n',   (select count(*) from public.caddy_reviews c where c.created_at >= v_from and (c.course_id = p_course_id or c.course_name ilike v_like)),
      'caddy_again', (select round(100.0 * count(*) filter (where book_again >= 3) / nullif(count(*) filter (where book_again is not null), 0)) from public.caddy_reviews c where c.created_at >= v_from and (c.course_id = p_course_id or c.course_name ilike v_like)),
      'cond_avg',  (select round(avg(rating)::numeric, 2) from public.course_conditions k where k.created_at >= v_from and k.course_name ilike v_like),
      'cond_n',    (select count(*) from public.course_conditions k where k.created_at >= v_from and k.course_name ilike v_like))
    into t7;

  -- events: society events at the facility — upcoming demand and the period's attendance
  select jsonb_build_object(
      'upcoming', (select count(*) from public.society_events e where e.event_date >= (v_now at time zone 'Asia/Bangkok')::date and e.event_date < (v_now at time zone 'Asia/Bangkok')::date + 60
                    and coalesce(e.status, '') not in ('cancelled') and (e.course_name ilike v_like or lower(coalesce(e.course_name, '')) = any(select lower(x) from unnest(v_names) x))),
      'upcoming_regs', (select count(*) from public.event_registrations g join public.society_events e on e.id = g.event_id
                         where e.event_date >= (v_now at time zone 'Asia/Bangkok')::date and e.event_date < (v_now at time zone 'Asia/Bangkok')::date + 60
                           and coalesce(g.status, '') not in ('cancelled') and (e.course_name ilike v_like or lower(coalesce(e.course_name, '')) = any(select lower(x) from unnest(v_names) x))),
      'past', (select count(*) from public.society_events e where e.event_date >= (v_from at time zone 'Asia/Bangkok')::date and e.event_date < (v_now at time zone 'Asia/Bangkok')::date
                and (e.course_name ilike v_like or lower(coalesce(e.course_name, '')) = any(select lower(x) from unnest(v_names) x))),
      'past_regs', (select count(*) from public.event_registrations g join public.society_events e on e.id = g.event_id
                     where e.event_date >= (v_from at time zone 'Asia/Bangkok')::date and e.event_date < (v_now at time zone 'Asia/Bangkok')::date
                       and coalesce(g.status, '') not in ('cancelled') and (e.course_name ilike v_like or lower(coalesce(e.course_name, '')) = any(select lower(x) from unnest(v_names) x))))
    into t8;
  -- upcoming events list (public society calendar facts only)
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'date', event_date, 'time', start_time, 'society', organizer_name, 'max', max_participants, 'regs', regs) order by event_date, start_time), '[]'::jsonb) into t9
    from (select e.id, e.title, e.event_date, e.start_time, e.organizer_name, e.max_participants,
                 (select count(*) from public.event_registrations g where g.event_id = e.id and coalesce(g.status, '') not in ('cancelled')) regs
            from public.society_events e
           where e.event_date >= (v_now at time zone 'Asia/Bangkok')::date and e.event_date < (v_now at time zone 'Asia/Bangkok')::date + 60
             and coalesce(e.status, '') not in ('cancelled') and (e.course_name ilike v_like or lower(coalesce(e.course_name, '')) = any(select lower(x) from unnest(v_names) x))
           order by e.event_date, e.start_time limit 20) x;

  -- societies seen here in the last 365 days (for the audience picker) — names + sizes only
  select coalesce(jsonb_agg(jsonb_build_object('id', sid, 'name', name, 'golfers', golfers) order by golfers desc), '[]'::jsonb) into t10
    from (select m.society sid, s.name, count(distinct m.gid) golfers
            from _mk_rounds m join public.societies s on s.id = m.society
           where m.played >= v_now - interval '365 days' group by 1, 2 order by 3 desc limit 12) x;

  r := jsonb_build_object('ok', true, 'days', greatest(coalesce(p_days, 30), 1), 'period', t1, 'per_day', t2, 'societies', t3,
                          'countries', t4, 'languages', t5, 'reach', t6, 'satisfaction', t7, 'events', t8,
                          'upcoming', t9, 'society_list', t10, 'generated_at', v_now);
  return r;
end
$fn$;
grant execute on function public.marketing_audience_report(text, text, text[], int) to anon, authenticated;

-- 3. campaign performance: every offer of the course (last 365 days) with its delivery funnel
create or replace function public.marketing_offer_stats(p_course_id text)
returns jsonb
language sql
security definer
set search_path to 'public'
as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'title', o.title, 'body', o.body, 'offer_type', o.offer_type, 'status', o.status, 'priority', o.priority,
      'audience', o.audience, 'segment', o.segment, 'lang', o.lang, 'cta_label', o.cta_label, 'cta_target', o.cta_target,
      'valid_from', o.valid_from, 'valid_to', o.valid_to, 'created_at', o.created_at,
      'push_sent_at', o.push_sent_at, 'push_recipients', o.push_recipients,
      'deal', case when o.deal is null then null else jsonb_build_object('date', o.deal->>'date', 'time', o.deal->>'time', 'price', o.deal->>'price', 'spots_total', o.deal->>'spots_total', 'spots_taken', o.deal->>'spots_taken') end,
      'delivered', s.delivered, 'pushed', s.pushed, 'opened', s.opened, 'clicked', s.clicked, 'dismissed', s.dismissed
    ) order by o.created_at desc), '[]'::jsonb)
  from public.course_offers o
  left join lateral (
    select count(*) delivered,
           count(*) filter (where pushed_at is not null) pushed,
           count(*) filter (where read_at is not null) opened,
           count(*) filter (where clicked_at is not null) clicked,
           count(*) filter (where dismissed_at is not null) dismissed
      from public.course_offer_reads x where x.offer_id = o.id) s on true
  where o.course_id = p_course_id and o.created_at >= now() - interval '365 days';
$fn$;
grant execute on function public.marketing_offer_stats(text) to anon, authenticated;
