-- TRGG Handicap Sync
-- Pulls handicaps from masterscoreboard.co.uk into MyCaddiPro user_profiles.
-- Adapted for MyCaddiPro schema: user_profiles table with line_user_id (text PK),
-- name (text), role (text), is_manager (bool).
-- Adds trgg_handicap and universal_handicap columns to user_profiles.

-- =============================================================
-- 1. Extensions
-- =============================================================
create extension if not exists pg_trgm;
-- pg_cron and pg_net should already be enabled on Supabase

-- =============================================================
-- 2. Add handicap columns to user_profiles
-- =============================================================
alter table public.user_profiles
  add column if not exists trgg_handicap numeric(4,1),
  add column if not exists universal_handicap numeric(4,1);

-- =============================================================
-- 3. Tables
-- =============================================================

-- Audit log: one row per sync run
create table if not exists public.trgg_sync_runs (
  id                uuid primary key default gen_random_uuid(),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  status            text not null check (status in ('running','success','failed','partial')),
  source            text not null default 'scrape' check (source in ('scrape','csv')),
  rows_fetched      int default 0,
  rows_matched      int default 0,
  rows_suggested    int default 0,
  rows_review       int default 0,
  rows_updated      int default 0,
  error_message     text,
  raw_snapshot      jsonb
);

create index if not exists trgg_sync_runs_started_at_idx
  on public.trgg_sync_runs (started_at desc);

-- Confirmed mappings: TRGG name -> MyCaddiPro user_profile
create table if not exists public.trgg_user_map (
  id               uuid primary key default gen_random_uuid(),
  trgg_name        text not null unique,
  trgg_name_norm   text not null unique,
  profile_id       text not null references public.user_profiles(line_user_id) on delete cascade,
  confirmed_by     text,
  confirmed_at     timestamptz not null default now(),
  last_handicap    numeric(4,1),
  last_synced_at   timestamptz
);

create index if not exists trgg_user_map_profile_id_idx
  on public.trgg_user_map (profile_id);

-- Review queue: rows that couldn't be auto-matched
create table if not exists public.trgg_pending_matches (
  id                uuid primary key default gen_random_uuid(),
  sync_run_id       uuid references public.trgg_sync_runs(id) on delete cascade,
  trgg_name         text not null,
  trgg_name_norm    text not null,
  trgg_handicap     numeric(4,1) not null,
  suggested_profile_id text references public.user_profiles(line_user_id) on delete set null,
  suggested_name    text,
  similarity        numeric(4,3),
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected','manual')),
  resolved_by       text,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists trgg_pending_status_idx
  on public.trgg_pending_matches (status, created_at desc);

create unique index if not exists trgg_pending_unique_pending
  on public.trgg_pending_matches (trgg_name_norm)
  where status = 'pending';

-- =============================================================
-- 4. Helper: normalize names for fuzzy matching
-- =============================================================
create or replace function public.trgg_normalize_name(input text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    case
      when input like '%,%' then
        lower(trim(split_part(input, ',', 2)) || ' ' || trim(split_part(input, ',', 1)))
      else
        lower(input)
    end,
    '[^a-z0-9 ]', '', 'g'
  ));
$$;

-- =============================================================
-- 5. Fuzzy match RPC used by the edge function
-- =============================================================
create or replace function public.trgg_find_best_match(search_name text)
returns table (
  id text,
  full_name text,
  similarity numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.line_user_id as id,
    p.name as full_name,
    similarity(public.trgg_normalize_name(p.name), search_name)::numeric as similarity
  from public.user_profiles p
  where p.name is not null
  order by similarity(public.trgg_normalize_name(p.name), search_name) desc
  limit 1;
$$;

grant execute on function public.trgg_find_best_match(text) to service_role;

-- =============================================================
-- 6. RLS — service_role bypasses RLS, so these are for
--    authenticated admin access from the frontend.
--    MyCaddiPro uses is_manager column for admin checks.
-- =============================================================
alter table public.trgg_sync_runs        enable row level security;
alter table public.trgg_user_map         enable row level security;
alter table public.trgg_pending_matches  enable row level security;

-- Service role (edge functions) bypasses RLS automatically.
-- For frontend admin access, grant full access since the app
-- manages auth via LINE OAuth, not Supabase Auth.
-- The admin UI checks is_manager client-side.

create policy "allow all trgg_sync_runs"
  on public.trgg_sync_runs for all
  using (true) with check (true);

create policy "allow all trgg_user_map"
  on public.trgg_user_map for all
  using (true) with check (true);

create policy "allow all trgg_pending_matches"
  on public.trgg_pending_matches for all
  using (true) with check (true);

-- =============================================================
-- 7. Cron schedule: weekly Monday 06:00 Bangkok (= 23:00 UTC Sun)
-- =============================================================
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> after deploy.
-- Run this once manually in the SQL editor after deploying the edge function.
/*
select cron.schedule(
  'trgg-handicap-sync-weekly',
  '0 23 * * 0',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-trgg-handicaps',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
  $$
);
*/
