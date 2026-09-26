-- Engagement meter DEEP (v1377, 2026-09-26) — on top of sql/engagement_meter_v1375.sql.
-- Pete: "the metrics need to be better and where it starts and where it ends, also it needs to be
-- able to break it down even deeper".
--   * journeys: each visit's entry section, exit section, start/end time and path (from → to)
--   * kind='tap': which controls inside a section get used (aggregated per visit+section+control, n = taps)
--   * ended_at: wall-clock end of each view stretch (dur_ms stays ACTIVE time)
--   * filters: role + device; drill-downs for one section and one user

alter table public.app_section_views drop constraint if exists app_section_views_kind_check;
alter table public.app_section_views add constraint app_section_views_kind_check check (kind in ('view', 'visit', 'tap'));
alter table public.app_section_views add column if not exists ended_at timestamptz;
alter table public.app_section_views add column if not exists control text check (char_length(control) <= 80);
alter table public.app_section_views add column if not exists ctl_label text check (char_length(ctl_label) <= 40);
alter table public.app_section_views add column if not exists n integer not null default 1 check (n between 1 and 5000);
create index if not exists app_section_views_visit_idx on public.app_section_views (visit_id, started_at);
create index if not exists app_section_views_section_idx on public.app_section_views (section, started_at);

-- Shared filtered base: view rows with their position inside the visit.
create or replace function public._eng_views(p_days integer, p_role text, p_device text)
returns table (visit_id text, user_id text, role text, device text, section text, started_at timestamptz,
               ended_at timestamptz, dur_ms integer, rn bigint, nv bigint, prev_s text, next_s text)
language sql stable security definer set search_path = public as $$
    select visit_id, user_id, role, device, section, started_at,
           coalesce(ended_at, started_at + make_interval(secs => dur_ms / 1000.0)),
           dur_ms,
           row_number() over w, count(*) over (partition by visit_id),
           lag(section) over w, lead(section) over w
    from app_section_views
    where kind = 'view'
      and started_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
      and section not like 'adminDashboard%'
      and (p_role is null or role = p_role)
      and (p_device is null or device = p_device)
    window w as (partition by visit_id order by started_at, id)
$$;
revoke all on function public._eng_views(integer, text, text) from public, anon, authenticated;

drop function if exists public.admin_engagement_report(integer);
create or replace function public.admin_engagement_report(p_days integer default 7, p_role text default null, p_device text default null)
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
    select * from _eng_views(p_days, p_role, p_device)
), tp as (
    select section, sum(n) as taps from app_section_views
    where kind = 'tap' and started_at >= (select since from win)
      and (p_role is null or role = p_role) and (p_device is null or device = p_device)
    group by section
), sec as (
    select v.section,
           count(*) as views,
           count(distinct coalesce(user_id, visit_id)) as users,
           count(distinct visit_id) as visits,
           round(sum(dur_ms) / 1000.0) as total_sec,
           round(avg(dur_ms) / 1000.0, 1) as avg_sec,
           round((percentile_cont(0.5) within group (order by dur_ms))::numeric / 1000.0, 1) as med_sec,
           count(*) filter (where rn = 1) as entries,
           count(*) filter (where rn = nv) as exits,
           coalesce(max(tp.taps), 0) as taps
    from v left join tp on tp.section = v.section
    group by v.section
), visit_len as (
    select visit_id, max(user_id) as uid, sum(dur_ms) as ms, count(*) as pages,
           min(started_at) as st, max(ended_at) as en
    from v group by visit_id
), flows as (
    select section as from_s, next_s as to_s, count(*) as n, count(distinct coalesce(user_id, visit_id)) as users
    from v where next_s is not null and next_s <> section
    group by 1, 2 order by n desc limit 25
), opens as (
    select le.line_user_id as uid, le.created_at as at from login_events le
    where le.created_at >= (select since from win) and le.created_at < (select c from cut)
      and p_device is null
    union all
    select user_id, started_at from app_section_views
    where kind = 'visit' and user_id is not null and started_at >= (select since from win)
      and (p_device is null or device = p_device)
), o2 as (
    select o.uid, o.at,
           (o.at at time zone 'Asia/Bangkok')::date as bkk_day,
           extract(hour from o.at at time zone 'Asia/Bangkok')::int as bkk_hour,
           lead(o.at) over (partition by o.uid order by o.at) as next_at
    from opens o left join user_profiles up on up.line_user_id = o.uid
    where o.uid is not null and (p_role is null or up.role = p_role)
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
           (select round(avg(ms) / 60000.0, 1) from visit_len vl where vl.uid = pu.uid) as avg_visit_min,
           (select count(*) from visit_len vl where vl.uid = pu.uid) as visits_tracked
    from per_user pu left join user_profiles up on up.line_user_id = pu.uid
)
select jsonb_build_object(
    'days', (select d from prm),
    'role', p_role, 'device', p_device,
    'since', (select since from win),
    'meter_since', (select c from cut),
    'sections', coalesce((select jsonb_agg(to_jsonb(s) order by s.views desc, s.total_sec desc) from sec s), '[]'::jsonb),
    'flows', coalesce((select jsonb_agg(to_jsonb(f) order by f.n desc) from flows f), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', r, 'users', u, 'views', n, 'sec', s) order by n desc)
              from (select coalesce(role, 'unknown') as r, count(distinct coalesce(user_id, visit_id)) as u, count(*) as n,
                           round(sum(dur_ms) / 1000.0) as s from v group by 1) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('device', dv, 'users', u, 'views', n, 'sec', s) order by n desc)
              from (select coalesce(device, 'unknown') as dv, count(distinct coalesce(user_id, visit_id)) as u, count(*) as n,
                           round(sum(dur_ms) / 1000.0) as s from v group by 1) x), '[]'::jsonb),
    'role_options', coalesce((select jsonb_agg(distinct role) from app_section_views
                              where role is not null and started_at >= (select since from win)), '[]'::jsonb),
    'totals', jsonb_build_object(
        'views', (select count(*) from v),
        'active_sec', (select coalesce(round(sum(dur_ms) / 1000.0), 0) from v),
        'taps', (select coalesce(sum(taps), 0) from tp),
        'visits_timed', (select count(*) from visit_len),
        'avg_visit_min', (select round(avg(ms) / 60000.0, 1) from visit_len),
        'med_visit_min', (select round((percentile_cont(0.5) within group (order by ms))::numeric / 60000.0, 1) from visit_len),
        'pages_per_visit', (select round(avg(pages), 1) from visit_len),
        'bounce_pct', (select round(100.0 * count(*) filter (where pages = 1) / nullif(count(*), 0)) from visit_len),
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
    'users', coalesce((select jsonb_agg(to_jsonb(p) order by p.opens_24h desc, p.opens desc) from per_user_named p), '[]'::jsonb)
);
$$;
revoke all on function public.admin_engagement_report(integer, text, text) from public;
grant execute on function public.admin_engagement_report(integer, text, text) to anon, authenticated;

-- One section, all the way down.
create or replace function public.admin_engagement_section(p_section text, p_days integer default 7, p_role text default null, p_device text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with v as (
    select * from _eng_views(p_days, p_role, p_device)
), s as (
    select * from v where section = p_section
), t as (
    select control, max(ctl_label) as label, sum(n) as n, count(distinct coalesce(user_id, visit_id)) as users
    from app_section_views
    where kind = 'tap' and section = p_section
      and started_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
      and (p_role is null or role = p_role) and (p_device is null or device = p_device)
    group by control
)
select jsonb_build_object(
    'section', p_section,
    'summary', (select jsonb_build_object(
        'views', count(*), 'users', count(distinct coalesce(user_id, visit_id)), 'visits', count(distinct visit_id),
        'total_sec', round(coalesce(sum(dur_ms), 0) / 1000.0), 'avg_sec', round(avg(dur_ms) / 1000.0, 1),
        'med_sec', round((percentile_cont(0.5) within group (order by dur_ms))::numeric / 1000.0, 1),
        'entries', count(*) filter (where rn = 1), 'exits', count(*) filter (where rn = nv),
        'taps', (select coalesce(sum(n), 0) from t),
        'first_at', min(started_at), 'last_at', max(started_at)) from s),
    'came_from', coalesce((select jsonb_agg(jsonb_build_object('section', k, 'n', n) order by n desc)
        from (select coalesce(prev_s, '__start') as k, count(*) as n from s where prev_s is distinct from section group by 1 order by 2 desc limit 10) x), '[]'::jsonb),
    'went_to', coalesce((select jsonb_agg(jsonb_build_object('section', k, 'n', n) order by n desc)
        from (select coalesce(next_s, '__end') as k, count(*) as n from s where next_s is distinct from section group by 1 order by 2 desc limit 10) x), '[]'::jsonb),
    'controls', coalesce((select jsonb_agg(to_jsonb(t) order by t.n desc) from (select * from t order by n desc limit 40) t), '[]'::jsonb),
    'users', coalesce((select jsonb_agg(to_jsonb(x) order by x.sec desc) from (
        select s.user_id as uid,
               coalesce(nullif(up.name, ''), nullif(up.display_name, ''), 'Guest / not signed in') as name,
               max(s.role) as role, count(*) as views, round(sum(s.dur_ms) / 1000.0) as sec, max(s.started_at) as last_at
        from s left join user_profiles up on up.line_user_id = s.user_id
        group by s.user_id, up.name, up.display_name order by sec desc limit 60) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'views', n, 'users', u, 'sec', sec) order by d) from (
        select (started_at at time zone 'Asia/Bangkok')::date as d, count(*) as n,
               count(distinct coalesce(user_id, visit_id)) as u, round(sum(dur_ms) / 1000.0) as sec
        from s group by 1) x), '[]'::jsonb),
    'hours', (select jsonb_agg(coalesce(h.n, 0) order by g.h) from generate_series(0, 23) g(h)
        left join (select extract(hour from started_at at time zone 'Asia/Bangkok')::int as hh, count(*) as n from s group by 1) h on h.hh = g.h),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'views', n, 'sec', sec) order by n desc) from (
        select coalesce(role, 'unknown') as k, count(*) as n, round(sum(dur_ms) / 1000.0) as sec from s group by 1) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'views', n, 'sec', sec) order by n desc) from (
        select coalesce(device, 'unknown') as k, count(*) as n, round(sum(dur_ms) / 1000.0) as sec from s group by 1) x), '[]'::jsonb)
);
$$;
revoke all on function public.admin_engagement_section(text, integer, text, text) from public;
grant execute on function public.admin_engagement_section(text, integer, text, text) to anon, authenticated;

-- One user: every visit with where it started, the path, where it ended, and the taps.
create or replace function public.admin_engagement_user(p_uid text, p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with d as (
    select greatest(1, least(coalesce(p_days, 7), 90)) as d
), u as (
    select * from app_section_views
    where user_id = p_uid and started_at >= now() - make_interval(days => (select d from d))
), vw as (
    select *, coalesce(ended_at, started_at + make_interval(secs => dur_ms / 1000.0)) as en
    from u where kind = 'view' and section not like 'adminDashboard%'
), visits as (
    select x.visit_id, min(x.st) as st, max(x.en) as en, max(x.device) as device
    from (select visit_id, started_at as st, en, device from vw
          union all select visit_id, started_at, started_at, device from u where kind = 'visit') x
    group by x.visit_id
)
select jsonb_build_object(
    'uid', p_uid,
    'name', (select coalesce(nullif(name, ''), nullif(display_name, ''), 'Unknown') from user_profiles where line_user_id = p_uid),
    'role', (select role from user_profiles where line_user_id = p_uid),
    'visits', coalesce((select jsonb_agg(jsonb_build_object(
            'st', vi.st, 'en', vi.en, 'device', vi.device,
            'active_ms', (select coalesce(sum(dur_ms), 0) from vw where vw.visit_id = vi.visit_id),
            'taps', (select coalesce(sum(n), 0) from u where u.kind = 'tap' and u.visit_id = vi.visit_id),
            'path', coalesce((select jsonb_agg(jsonb_build_object('s', section, 'ms', dur_ms, 'at', started_at) order by started_at, id)
                              from vw where vw.visit_id = vi.visit_id), '[]'::jsonb))
            order by vi.st desc)
        from (select * from visits order by st desc limit 40) vi), '[]'::jsonb),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('section', section, 'views', n, 'sec', sec) order by sec desc) from (
        select section, count(*) as n, round(sum(dur_ms) / 1000.0) as sec from vw group by section) x), '[]'::jsonb),
    'controls', coalesce((select jsonb_agg(jsonb_build_object('section', section, 'control', control, 'label', label, 'n', n) order by n desc) from (
        select section, control, max(ctl_label) as label, sum(n) as n from u where kind = 'tap' group by section, control order by 4 desc limit 30) x), '[]'::jsonb),
    'opens', coalesce((select jsonb_agg(at order by at desc) from (
        select created_at as at from login_events
        where line_user_id = p_uid and created_at >= now() - make_interval(days => (select d from d))
          and created_at < (select coalesce(min(created_at), now()) from app_section_views where kind = 'visit')
        union all select started_at from u where kind = 'visit') o), '[]'::jsonb)
);
$$;
revoke all on function public.admin_engagement_user(text, integer) from public;
grant execute on function public.admin_engagement_user(text, integer) to anon, authenticated;
