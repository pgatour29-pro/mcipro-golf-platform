-- waltz_schema.sql — persistence for Waltz teams + cached results, RLS-COMPLETE.
-- ⚠️ TEMPLATE: the FK columns marked "WIRE" must be reconciled against MyCaddiPro's
--    actual event/round/profile tables BEFORE running. Do not create as-is blind.
--    profiles.auth_user_id is assumed to exist (it does per prior identity work).

-- ── Teams ────────────────────────────────────────────────────────────────────
create table if not exists public.waltz_teams (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,               -- WIRE: references your events/rounds table
  name        text not null,
  created_by  uuid not null default auth.uid(),  -- auth.users.id
  created_at  timestamptz not null default now()
);

create table if not exists public.waltz_team_members (
  team_id            uuid not null references public.waltz_teams(id) on delete cascade,
  profile_id         uuid not null,        -- WIRE: references profiles(id)
  auth_user_id       uuid,                 -- denormalised for RLS; = profiles.auth_user_id
  course_handicap    int  not null,        -- allowance ALREADY applied, rounded to int
  position           smallint,             -- 1..3, display order only
  primary key (team_id, profile_id)
);

-- Optional cache of a computed round (output of waltz.score_round). Recompute is cheap,
-- so this is purely to avoid recompute on read; safe to drop if you prefer live compute.
create table if not exists public.waltz_results (
  team_id     uuid primary key references public.waltz_teams(id) on delete cascade,
  result      jsonb not null,              -- {total, byHole:[...]}
  computed_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.waltz_teams        enable row level security;
alter table public.waltz_team_members enable row level security;
alter table public.waltz_results      enable row level security;

-- Helper: is the current user a member of this team?
create or replace function public.is_waltz_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.waltz_team_members m
    where m.team_id = p_team and m.auth_user_id = auth.uid()
  );
$$;

-- teams: a member or the creator may read; only the creator may write/delete.
create policy waltz_teams_read on public.waltz_teams
  for select using (created_by = auth.uid() or public.is_waltz_team_member(id));
create policy waltz_teams_insert on public.waltz_teams
  for insert with check (created_by = auth.uid());
create policy waltz_teams_update on public.waltz_teams
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy waltz_teams_delete on public.waltz_teams
  for delete using (created_by = auth.uid());

-- members: readable by anyone on the team or the team creator; writable by the creator.
create policy waltz_members_read on public.waltz_team_members
  for select using (
    public.is_waltz_team_member(team_id)
    or exists (select 1 from public.waltz_teams t where t.id = team_id and t.created_by = auth.uid())
  );
create policy waltz_members_write on public.waltz_team_members
  for all using (
    exists (select 1 from public.waltz_teams t where t.id = team_id and t.created_by = auth.uid())
  ) with check (
    exists (select 1 from public.waltz_teams t where t.id = team_id and t.created_by = auth.uid())
  );

-- results: readable by team members/creator; written server-side only (service_role bypasses RLS).
create policy waltz_results_read on public.waltz_results
  for select using (
    public.is_waltz_team_member(team_id)
    or exists (select 1 from public.waltz_teams t where t.id = team_id and t.created_by = auth.uid())
  );

-- NOTE: if MyCaddiPro has society/course-admin roles that should also read/manage these,
-- add matching admin policies here to mirror the pattern used elsewhere in the schema.
-- Do NOT grant blanket access; keep the default-deny posture.
