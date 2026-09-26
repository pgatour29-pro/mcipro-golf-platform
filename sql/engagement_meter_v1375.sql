-- Engagement meter (v1375, 2026-09-26) — Admin → Engagement tab.
-- Pete: "where is the traffic going, what is used the most and the least, how long are they
-- staying, and how often does a user log back in within a 24 hour period".
--
-- app_section_views: written by public/engagement-meter.js on every device.
--   kind='view'  one row per stretch of time spent on one section (screen/tab or the topmost
--                full-screen overlay); dur_ms counts ACTIVE time only (visible + touched within 5 min).
--   kind='visit' one row per app open (page load, or coming back after 30+ min away).
-- INSERT-only under RLS like login_events — the browser can never read it back. The admin tab
-- reads aggregates through admin_engagement_report().

create table if not exists public.app_section_views (
    id          bigserial primary key,
    created_at  timestamptz not null default now(),
    kind        text not null default 'view' check (kind in ('view', 'visit')),
    user_id     text check (char_length(user_id) <= 80),
    role        text check (char_length(role) <= 40),
    visit_id    text not null check (char_length(visit_id) between 4 and 40),
    section     text not null check (char_length(section) between 1 and 120),
    started_at  timestamptz not null,
    dur_ms      integer not null default 0 check (dur_ms between 0 and 21600000),
    device      text check (device in ('phone', 'tablet', 'desktop'))
);
create index if not exists app_section_views_started_idx on public.app_section_views (started_at);
create index if not exists app_section_views_user_idx on public.app_section_views (user_id, started_at);

alter table public.app_section_views enable row level security;
drop policy if exists app_section_views_insert on public.app_section_views;
create policy app_section_views_insert on public.app_section_views
    for insert to anon, authenticated
    with check (started_at > now() - interval '2 days' and started_at < now() + interval '10 minutes');
grant insert on public.app_section_views to anon, authenticated;
grant usage on sequence public.app_section_views_id_seq to anon, authenticated;

-- Report. Opens ("logins") = login_events before the meter's first visit row (history back to
-- 2026-08-24), meter visits from then on — so the 24h return numbers have data on day one.
create or replace function public.admin_engagement_report(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with prm as (
    select greatest(1, least(coalesce(p_days, 7), 90)) as d
), win as (
    select now() - make_interval(days => (select d from prm)) as since
), cut as (
    select coalesce(min(created_at), now()) as c from app_section_views where kind = 'visit'
), v as (
    select * from app_section_views
    where kind = 'view' and started_at >= (select since from win)
      and section not like 'adminDashboard%'
), sec as (
    select section,
           count(*) as views,
           count(distinct coalesce(user_id, visit_id)) as users,
           round(sum(dur_ms) / 1000.0) as total_sec,
           round(avg(dur_ms) / 1000.0, 1) as avg_sec,
           round((percentile_cont(0.5) within group (order by dur_ms))::numeric / 1000.0, 1) as med_sec
    from v group by section
), visit_len as (
    select visit_id, max(user_id) as uid, sum(dur_ms) as ms from v group by visit_id
), opens as (
    select line_user_id as uid, created_at as at from login_events
    where created_at >= (select since from win) and created_at < (select c from cut)
    union all
    select user_id, started_at from app_section_views
    where kind = 'visit' and user_id is not null and started_at >= (select since from win)
), o2 as (
    select uid, at,
           (at at time zone 'Asia/Bangkok')::date as bkk_day,
           extract(hour from at at time zone 'Asia/Bangkok')::int as bkk_hour,
           lead(at) over (partition by uid order by at) as next_at
    from opens where uid is not null
), per_user as (
    select o2.uid,
           count(*) as opens,
           count(distinct bkk_day) as active_days,
           count(*) filter (where at >= now() - interval '24 hours') as opens_24h,
           round(count(*)::numeric / greatest(count(distinct bkk_day), 1), 1) as opens_per_day,
           count(*) filter (where next_at is not null and next_at - at <= interval '24 hours') as back_within_24h,
           round((extract(epoch from percentile_cont(0.5) within group (order by next_at - at)
                  filter (where next_at is not null)) / 3600.0)::numeric, 1) as med_gap_h,
           max(at) as last_open
    from o2 group by o2.uid
), per_user_named as (
    select pu.*,
           coalesce(nullif(up.name, ''), nullif(up.display_name, ''), nullif(up.username, ''), 'Unknown') as name,
           up.role,
           (select round(avg(ms) / 60000.0, 1) from visit_len vl where vl.uid = pu.uid) as avg_visit_min
    from per_user pu left join user_profiles up on up.line_user_id = pu.uid
)
select jsonb_build_object(
    'days', (select d from prm),
    'since', (select since from win),
    'meter_since', (select c from cut),
    'sections', coalesce((select jsonb_agg(to_jsonb(s) order by s.views desc, s.total_sec desc) from sec s), '[]'::jsonb),
    'totals', jsonb_build_object(
        'views', (select count(*) from v),
        'active_sec', (select coalesce(round(sum(dur_ms) / 1000.0), 0) from v),
        'visits_timed', (select count(*) from visit_len),
        'avg_visit_min', (select round(avg(ms) / 60000.0, 1) from visit_len),
        'med_visit_min', (select round((percentile_cont(0.5) within group (order by ms))::numeric / 60000.0, 1) from visit_len),
        'opens', (select count(*) from o2),
        'users', (select count(*) from per_user),
        'opens_24h', (select count(*) from o2 where at >= now() - interval '24 hours'),
        'users_24h', (select count(distinct uid) from o2 where at >= now() - interval '24 hours'),
        'returning_24h', (select count(*) from per_user where opens_24h >= 2),
        'back_within_24h_pct', (select round(100.0 * count(*) filter (where next_at is not null and next_at - at <= interval '24 hours')
                                               / nullif(count(*) filter (where next_at is not null or at < now() - interval '24 hours'), 0))
                                from o2),
        'opens_per_user_day', (select round(count(*)::numeric / nullif(count(distinct (uid, bkk_day)), 0), 1) from o2)
    ),
    'freq_buckets', (select jsonb_build_object(
        'one',   count(*) filter (where c = 1),
        'two3',  count(*) filter (where c between 2 and 3),
        'four5', count(*) filter (where c between 4 and 5),
        'six',   count(*) filter (where c >= 6))
        from (select uid, bkk_day, count(*) as c from o2 group by uid, bkk_day) x),
    'hours', (select jsonb_agg(coalesce(h.n, 0) order by g.h)
              from generate_series(0, 23) g(h)
              left join (select bkk_hour, count(*) as n from o2 group by bkk_hour) h on h.bkk_hour = g.h),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', dd, 'opens', n, 'users', u) order by dd), '[]'::jsonb)
              from (select bkk_day as dd, count(*) as n, count(distinct uid) as u from o2 group by bkk_day) x),
    'users', coalesce((select jsonb_agg(to_jsonb(p) - 'uid' order by p.opens_24h desc, p.opens desc) from per_user_named p), '[]'::jsonb)
);
$$;

revoke all on function public.admin_engagement_report(integer) from public;
grant execute on function public.admin_engagement_report(integer) to anon, authenticated;
