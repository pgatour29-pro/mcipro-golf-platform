-- Admin › User Activity report — ONE server-side aggregate call.
-- Replaces the browser downloading user_profiles + ALL rounds + ALL event_registrations
-- (~400KB, 3 sequential round trips, and event_registrations silently capped at 1000 rows
-- by PostgREST — per-user event counts were wrong once the table passed 1000 rows).
-- Real app users = LINE ('U…'), Kakao ('KAKAO-…'), Google ('GOOGLE-…') ids; the old U%-only
-- filter hid every Kakao/Google registration from the report.
-- Month boundaries are Asia/Bangkok, matching what an admin in Thailand expects.
-- SECURITY INVOKER (default): runs under the caller's RLS — adds no new exposure beyond
-- what the anon key can already read today.

CREATE OR REPLACE FUNCTION admin_user_activity_report()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH bkk AS (
  SELECT date_trunc('month', now() AT TIME ZONE 'Asia/Bangkok')                      AS this_month,
         date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok') - interval '1 month') AS last_month
),
r AS (
  SELECT golfer_id,
         count(*)::int                                   AS n,
         max(coalesce(completed_at, played_at))          AS last_round,
         count(*) FILTER (
           WHERE (coalesce(completed_at, played_at) AT TIME ZONE 'Asia/Bangkok')
                 >= (SELECT this_month FROM bkk))::int   AS n_this_month,
         count(*) FILTER (
           WHERE (coalesce(completed_at, played_at) AT TIME ZONE 'Asia/Bangkok')
                 >= (SELECT last_month FROM bkk)
             AND (coalesce(completed_at, played_at) AT TIME ZONE 'Asia/Bangkok')
                 <  (SELECT this_month FROM bkk))::int   AS n_last_month
  FROM rounds
  WHERE golfer_id IS NOT NULL
  GROUP BY golfer_id
),
e AS (
  SELECT player_id,
         count(*)::int   AS n,
         max(created_at) AS last_event
  FROM event_registrations
  WHERE player_id IS NOT NULL
  GROUP BY player_id
)
SELECT jsonb_build_object(
  'users', coalesce((
      SELECT jsonb_agg(to_jsonb(u) ORDER BY u.created_at DESC) FROM (
        SELECT line_user_id, name, display_name, username, role, created_at, last_login_at,
               handicap_index, profile_data, home_course_name, society_name
        FROM user_profiles
        WHERE line_user_id LIKE 'U%'
           OR line_user_id LIKE 'KAKAO-%'
           OR line_user_id LIKE 'GOOGLE-%'
      ) u), '[]'::jsonb),
  'rounds_by_user', coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM r), '[]'::jsonb),
  'events_by_user', coalesce((SELECT jsonb_agg(to_jsonb(e)) FROM e), '[]'::jsonb),
  'total_rounds', (SELECT count(*) FROM rounds),
  'total_events', (SELECT count(*) FROM event_registrations)
)
$$;
