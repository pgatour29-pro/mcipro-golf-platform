-- ============================================================================
-- MyCaddiPro — Part 2: identity mapping + real RLS policies
-- ============================================================================
-- Prereq: deploy mint-supabase-jwt and set APP_JWT_SECRET first.
-- Run Section 1 once. Then run Section 3 table-by-table, testing the live app
-- after each batch. Do NOT convert all tables at once.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — identity mapping + helper (run once)
-- ============================================================================

-- Maps a LINE user to a stable internal UUID. The mint function upserts here.
create table if not exists public.app_users (
  id           uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  created_at   timestamptz not null default now(),
  last_login   timestamptz default now()
);

-- Only the mint function (service_role) writes this table. RLS on, no anon/
-- authenticated write policies => writes are service_role-only.
alter table public.app_users enable row level security;

-- Let a signed-in user read their own mapping row (optional but handy).
drop policy if exists app_users_read_own on public.app_users;
create policy app_users_read_own on public.app_users
  for select to authenticated
  using (line_user_id = (select auth.jwt() ->> 'line_id'));

-- Helper: the verified LINE id carried in the JWT. Using a function keeps
-- policies readable and lets you swap the identity source later in one place.
create or replace function public.line_id()
returns text
language sql
stable
set search_path = public
as $$ select auth.jwt() ->> 'line_id' $$;


-- ============================================================================
-- SECTION 2 — policy patterns (reference)
-- ============================================================================
-- Three shapes cover almost every table. Wrap the auth call in (select ...) so
-- it's evaluated once per query, not once per row.
--
--   USER-OWNED   : each user sees/writes only their own rows
--                  using (user_id = (select public.line_id()))
--
--   PUBLIC-BROWSE: world-readable, no client writes (writes via service_role)
--                  for select to anon, authenticated using (true)
--
--   SERVICE-ONLY : read-only to clients; only the sync/Edge Functions write
--                  (e.g. handicap tables fed by masterscoreboard)


-- ============================================================================
-- SECTION 3 — replace tmp_ policies, table by table
-- ============================================================================
-- For EACH table: drop the three tmp_ policies, then create the real ones for
-- its category. Confirm the owner column name matches your schema. Keep NO
-- delete policy anywhere — deletes stay in the Edge Functions.

-- ---- USER-OWNED example (e.g. bookings; repeat per owned table) ------------
drop policy if exists tmp_select on public.bookings;
drop policy if exists tmp_insert on public.bookings;
drop policy if exists tmp_update on public.bookings;

create policy own_select on public.bookings for select to authenticated
  using (user_id = (select public.line_id()));
create policy own_insert on public.bookings for insert to authenticated
  with check (user_id = (select public.line_id()));
create policy own_update on public.bookings for update to authenticated
  using (user_id = (select public.line_id()))
  with check (user_id = (select public.line_id()));

-- ---- PUBLIC-BROWSE example (e.g. courses, public tee schedules) ------------
drop policy if exists tmp_select on public.courses;
drop policy if exists tmp_insert on public.courses;
drop policy if exists tmp_update on public.courses;

create policy public_read on public.courses for select to anon, authenticated
  using (true);
-- no insert/update policy => only service_role writes

-- ---- SERVICE-ONLY example (e.g. universal_handicap / trgg_handicap) --------
-- These are written only by your sync Edge Function (service_role). Clients may
-- read them but never write. Replace <handicap_table> with the real name.
-- drop policy if exists tmp_select on public.<handicap_table>;
-- drop policy if exists tmp_insert on public.<handicap_table>;
-- drop policy if exists tmp_update on public.<handicap_table>;
-- create policy hcp_read on public.<handicap_table> for select to anon, authenticated
--   using (true);
-- -- no write policies => service_role only

-- After each batch, verify in the app:
--   - signed-in user can read/write ONLY their own rows
--   - logged-out browsing of public tables still works
--   - the masterscoreboard sync still writes handicaps (it uses service_role)
