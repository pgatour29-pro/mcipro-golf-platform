-- Persona TEST module (v1447, 2026-10-04). Pete: "i want this to be a constant reporting and just like
-- the engagement module, i want it in a TEST module next to the Engagement".
--
-- tools/personas/cron.sh runs the persona rig on a schedule (every hour + after every deploy) and
-- tools/personas/publish.mjs files each run here. Only the publisher writes (Supabase CLI, postgres
-- role): the table has RLS on and NO policies, so the browser can neither read nor write it directly.
-- Admin → Test reads it through the two SECURITY DEFINER report functions below, the same posture as
-- admin_engagement_report.
--
-- Screenshots live in the PRIVATE bucket persona-shots at <stamp>/<file>; the admin page shows them
-- through short-lived signed URLs (same shape as support-attachments). No browser upload policy.

create table if not exists public.persona_runs (
  id           bigint generated always as identity primary key,
  stamp        text not null unique,                 -- run folder name (UTC), e.g. 2026-10-04T01-00-03
  started_at   timestamptz not null,
  finished_at  timestamptz not null,
  base         text not null,                        -- site the personas used
  app_version  text,                                 -- live SW_VERSION at run time, e.g. v1446
  trigger      text not null default 'manual' check (trigger in ('schedule', 'deploy', 'manual')),
  personas     text[] not null default '{}',         -- persona ids that ran
  steps        int not null default 0,
  steps_ok     int not null default 0,
  stuck        int not null default 0,               -- personas stopped by a failed step
  issues       jsonb not null default '[]'::jsonb,   -- [{key, kind, persona, who, step, note, shot, lost}]
  results      jsonb not null default '[]'::jsonb,   -- report.json results, verbatim
  created_at   timestamptz not null default now()
);
create index if not exists persona_runs_started_idx on public.persona_runs (started_at desc);
alter table public.persona_runs enable row level security;
comment on table public.persona_runs is 'One row per persona test run (tools/personas). Written only by tools/personas/publish.mjs; read via admin_persona_report / admin_persona_run.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('persona-shots', 'persona-shots', false, 1048576, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "persona shots read" on storage.objects;
create policy "persona shots read" on storage.objects for select using (bucket_id = 'persona-shots');

-- The whole Test page in one call: latest run in full, the run list, a status grid per persona,
-- every issue with first seen / still open / cleared, and step timings over the period.
create or replace function public.admin_persona_report(p_days int default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d      int := greatest(1, least(coalesce(p_days, 7), 90));
  since  timestamptz := now() - make_interval(days => d);
  res    jsonb;
begin
  with w as (
    select * from persona_runs where started_at >= since
  ),
  -- one row per run × persona that ran
  rp as (
    select r.stamp, r.started_at, r.app_version, x->>'id' as pid, x->>'title' as title, x->'device' as device,
           coalesce((select bool_or(not (s->>'ok')::boolean and not (s ? 'skipped')) from jsonb_array_elements(x->'steps') s), false) as failed,
           -- slow = app time over 4s (the persona's pauses and the tool's own time taken out; runs before
           -- that was recorded have no 'app' and are never called slow)
           coalesce((select bool_or((s->>'ok')::boolean and (s->>'app')::int > 4000) from jsonb_array_elements(x->'steps') s), false) as slow,
           jsonb_array_length(coalesce(x->'blocked', '[]'::jsonb)) > 0 as guarded,
           jsonb_array_length(coalesce(x->'lint', '[]'::jsonb)) > 0 as linted,
           (x ? 'fatal') as fatal,
           (select count(*) from jsonb_array_elements(x->'steps') s where (s->>'ok')::boolean) as ok_n,
           jsonb_array_length(coalesce(x->'steps', '[]'::jsonb)) as n
    from w r cross join lateral jsonb_array_elements(r.results) x
    where not (x ? 'skipped')
  ),
  -- one row per run × issue
  iss as (
    select r.stamp, r.started_at, r.app_version, i->>'key' as key, i->>'persona' as pid, i
    from w r cross join lateral jsonb_array_elements(r.issues) i
  ),
  ik as (
    select key, pid, min(started_at) as first_seen, max(started_at) as last_seen, count(distinct stamp) as runs_seen,
           (array_agg(i order by started_at desc))[1] as latest,
           (array_agg(stamp order by started_at desc))[1] as latest_stamp,
           (array_agg(app_version order by started_at asc))[1] as first_version
    from iss group by key, pid
  ),
  issues as (
    select ik.*,
           (select count(*) from rp where rp.pid = ik.pid and rp.started_at >= ik.first_seen) as runs_since_first,
           (ik.last_seen = (select max(started_at) from rp where rp.pid = ik.pid)) as is_open,
           -- the run that no longer showed it (the persona ran and the issue was gone)
           (select jsonb_build_object('at', rp.started_at, 'version', rp.app_version, 'stamp', rp.stamp)
              from rp where rp.pid = ik.pid and rp.started_at > ik.last_seen order by rp.started_at limit 1) as cleared,
           -- start of the current unbroken streak
           (select min(x.started_at) from iss x where x.key = ik.key and x.started_at > coalesce(
              (select max(rp.started_at) from rp where rp.pid = ik.pid and rp.started_at < ik.last_seen
                 and not exists (select 1 from iss y where y.key = ik.key and y.stamp = rp.stamp)), '-infinity'::timestamptz)) as streak_since
    from ik
  ),
  -- app time of completed steps only: a failed step waits out its timeout and would skew the timings
  sp as (
    select x->>'id' as pid, s.v->>'name' as step, s.ord, (s.v->>'app')::int as ms, r.started_at
    from w r cross join lateral jsonb_array_elements(r.results) x
         cross join lateral jsonb_array_elements(x->'steps') with ordinality as s(v, ord)
    where (s.v->>'ok')::boolean and s.v ? 'app'
  ),
  speed as (
    select pid, step, min(ord) as ord, count(*) as n,
           round(percentile_cont(0.5) within group (order by ms))::int as med,
           round(percentile_cont(0.9) within group (order by ms))::int as p90,
           max(ms) as max_ms,
           (array_agg(ms order by started_at desc))[1:30] as recent
    from sp group by pid, step
  ),
  grid as (
    select pid, (array_agg(title order by started_at desc))[1] as title, (array_agg(device order by started_at desc))[1] as device,
           (array_agg(jsonb_build_object('stamp', stamp, 'at', started_at, 'v', app_version, 'ok', ok_n, 'n', n,
              's', case when fatal or failed then 'fail' when guarded or linted or slow then 'warn' else 'ok' end)
              order by started_at desc))[1:48] as cells
    from rp group by pid
  )
  select jsonb_build_object(
    'days', d,
    'now', now(),
    'latest', (select to_jsonb(l) - 'id' - 'created_at' from (select * from persona_runs order by started_at desc limit 1) l),
    'total_runs', (select count(*) from persona_runs),
    'runs', coalesce((select jsonb_agg(jsonb_build_object('stamp', stamp, 'at', started_at, 'end', finished_at, 'v', app_version,
               'trigger', trigger, 'personas', personas, 'steps', steps, 'ok', steps_ok, 'stuck', stuck,
               'issues', jsonb_array_length(z.issues)) order by z.started_at desc)
             from (select * from w order by started_at desc limit 200) z), '[]'::jsonb),
    'grid', coalesce((select jsonb_agg(jsonb_build_object('pid', pid, 'title', title, 'device', device, 'cells', to_jsonb(cells)) order by pid) from grid), '[]'::jsonb),
    'issues', coalesce((select jsonb_agg(jsonb_build_object('key', key, 'persona', pid, 'first_seen', first_seen, 'last_seen', last_seen,
               'runs_seen', runs_seen, 'runs_since_first', runs_since_first, 'open', is_open, 'cleared', cleared,
               'streak_since', streak_since, 'first_version', first_version, 'latest', latest, 'latest_stamp', latest_stamp)
               order by is_open desc, last_seen desc) from issues), '[]'::jsonb),
    'speed', coalesce((select jsonb_agg(jsonb_build_object('pid', pid, 'step', step, 'ord', ord, 'n', n, 'med', med, 'p90', p90,
               'max', max_ms, 'recent', to_jsonb(recent)) order by pid, ord) from speed), '[]'::jsonb)
  ) into res;
  return res;
end;
$$;

-- One run in full, for the drill-down sheet.
create or replace function public.admin_persona_run(p_stamp text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(r) - 'id' - 'created_at' from persona_runs r where r.stamp = p_stamp;
$$;

revoke all on function public.admin_persona_report(int) from public;
revoke all on function public.admin_persona_run(text) from public;
grant execute on function public.admin_persona_report(int) to anon, authenticated;
grant execute on function public.admin_persona_run(text) to anon, authenticated;
