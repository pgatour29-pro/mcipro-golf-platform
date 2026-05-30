-- ============================================================================
-- Section Z resolutions — part 1 (no extra schema info required)
-- ============================================================================
-- Apply WITH the rest of Section 3, in the post-Phase-C window (these use
-- authenticated/lock semantics that assume tokens are flowing). The LOCK blocks
-- are safe anytime, but if the app reads a locked table client-side it will lose
-- access — see notes. Tables needing column names are still held (see prose).
-- ============================================================================

-- ---- LOCK: sensitive, no client access (service_role only) -----------------
-- Conservative default. If the app has a legitimate per-user client read path,
-- tell me the owner column and I'll switch that table to owner-scoped read.
do $$
declare t text;
  locked text[] := array[
    'booking_access_keys',   -- access tokens: never client-readable
    'event_payments',        -- financial; loosen to owner-read only if a golfer
                             -- views their own payments in-app
    'society_budgets',       -- financial; organizers manage via admin/service
    'content_reports'        -- reporter + admin only; loosen to reporter-read if
                             -- users see their own reports (need reporter column)
  ];
begin
  foreach t in array locked loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    -- no policies => only service_role
  end loop;
end $$;

-- ---- AUTHENTICATED-READ, service-write  (handicaps: visible in competition) -
-- Handicaps drive leaderboards/pairings, so logged-in users can read; only the
-- sync (service_role) writes. If logged-OUT public leaderboards must show them,
-- tell me and I'll add anon to the read.
do $$
declare t text;
  hcp text[] := array['handicap_history','user_handicaps','society_handicaps'];
begin
  foreach t in array hcp loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy hcp_read on public.%I for select to authenticated using (true)', t);
    -- no write policy => service_role only
  end loop;
end $$;

-- ---- AUTHENTICATED-READ + owner-write  (tournament_registrations) ----------
-- Participants can see who's registered; a user creates/edits their own row.
-- Owner column assumed user_id — change if different.
drop policy if exists tmp_select on public.tournament_registrations;
drop policy if exists tmp_insert on public.tournament_registrations;
drop policy if exists tmp_update on public.tournament_registrations;
create policy treg_read on public.tournament_registrations for select to authenticated using (true);
create policy treg_insert on public.tournament_registrations for insert to authenticated with check (user_id = (select public.line_id()));
create policy treg_update on public.tournament_registrations for update to authenticated using (user_id = (select public.line_id())) with check (user_id = (select public.line_id()));

-- ---- LIVE LOCATION: remove world access (interim) --------------------------
-- gps_positions / caddy_tracking were world-readable. Interim: authenticated
-- read + write (kills anon/public exposure, keeps the feature for logged-in
-- users). TIGHTEN later to "same playing group/round only" once you give me the
-- round/group + subject columns. This is a meaningful reduction, not the final
-- shape.
do $$
declare t text;
  loc text[] := array['gps_positions','caddy_tracking'];
begin
  foreach t in array loc loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy loc_read on public.%I for select to authenticated using (true)', t);
    execute format('create policy loc_insert on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy loc_update on public.%I for update to authenticated using (true) with check (true)', t);
  end loop;
end $$;
