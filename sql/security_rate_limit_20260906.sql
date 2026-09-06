-- SECURITY (2026-09-06): a shared rate limiter for the public edge functions.
-- Pete's checklist #11 (rate limiting) + #12 (spend cap). Several functions are deployed verify_jwt=false and call
-- paid APIs (Gemini) or push to LINE, so anyone could hammer them: ai-coach, ai-caddie, analyze-pinsheet,
-- analyze-scorecard, translate-text, image-screen, secure-dm, line-push-notification.
-- Fixed window counter, service_role only. Callers FAIL OPEN on an error — a limiter blip must not take a feature
-- down — but a real overrun returns 429.
-- Run: npx supabase db query --linked -f sql/security_rate_limit_20260906.sql

create table if not exists public.rate_limit_hits (
  bucket_key   text        not null,
  window_start timestamptz not null,
  hits         int         not null default 0,
  primary key (bucket_key, window_start)
);
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated, public;

-- one call = one hit. Returns {allowed, hits, limit, retry_after}.
create or replace function public.rl_hit(p_key text, p_limit int, p_window_secs int default 60) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_win timestamptz; v_hits int;
begin
  if p_key is null or p_key = '' then return jsonb_build_object('allowed', true, 'hits', 0); end if;
  v_win := to_timestamp(floor(extract(epoch from now()) / greatest(p_window_secs, 1)) * greatest(p_window_secs, 1));
  insert into public.rate_limit_hits (bucket_key, window_start, hits)
  values (p_key, v_win, 1)
  on conflict (bucket_key, window_start) do update set hits = rate_limit_hits.hits + 1
  returning hits into v_hits;
  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'hits', v_hits,
    'limit', p_limit,
    'retry_after', greatest(1, ceil(extract(epoch from (v_win + make_interval(secs => p_window_secs)) - now()))::int));
end $$;
revoke all on function public.rl_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rl_hit(text, int, int) to service_role;

-- keep the table small (pg_cron already runs in this project)
create or replace function public.rl_sweep() returns int
language sql security definer set search_path = public as $$
  with d as (delete from public.rate_limit_hits where window_start < now() - interval '2 hours' returning 1)
  select count(*)::int from d
$$;
revoke all on function public.rl_sweep() from public, anon, authenticated;
grant execute on function public.rl_sweep() to service_role;

do $$ begin
  perform 1 from pg_extension where extname = 'pg_cron';
  if found and not exists (select 1 from cron.job where jobname = 'rl_sweep') then
    perform cron.schedule('rl_sweep', '17 * * * *', 'select public.rl_sweep()');
  end if;
exception when others then raise notice 'cron not scheduled: %', sqlerrm; end $$;

select (select count(*) from public.rate_limit_hits) as rows,
       (public.rl_hit('selftest', 2, 60)) ->> 'allowed' as first_call_allowed,
       (public.rl_hit('selftest', 2, 60)) ->> 'allowed' as second_call_allowed,
       (public.rl_hit('selftest', 2, 60)) ->> 'allowed' as third_call_blocked;
