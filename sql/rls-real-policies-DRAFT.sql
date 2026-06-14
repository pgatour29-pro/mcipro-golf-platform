-- ============================================================================
-- MyCaddiPro — Real RLS policies (DRAFT for review) — generated 2026-06-13
-- ============================================================================
-- Replaces the permissive tmp_select/tmp_insert/tmp_update (USING(true) for anon)
-- with enforcing policies. DELETE stays blocked (handled by edge functions).
--
-- *** DO NOT APPLY UNTIL ALL LOGIN PATHS ISSUE A REAL `authenticated` SESSION ***
-- The LIFF in-app login still uses the dead password function and leaves users
-- as `anon`. Dropping anon access before the LIFF→v2 migration will lock in-app
-- users out. Sequence: (1) migrate LIFF login, (2) confirm every client gets an
-- authenticated session, (3) apply in BATCHES below with agent-browser feature
-- checks + impersonation re-test after each, with rollback ready.
--
-- Identity in policies: line_id() = caller LINE id (TEXT); current_profile_id()
-- = caller profiles.id (UUID). Both NULL for anon -> scoped policies target
-- role `authenticated` only.
-- ============================================================================

-- ===========================================================================
-- BATCH A — SELF_PRIVATE (owner key verified = LINE id). Full enforcement.
-- ===========================================================================
-- caddy_notebook (golfer_id), notification_preferences (user_id=line id),
-- user_caddy_preferences (user_id=line id), saved_groups (user_id=line id),
-- golf_buddies (user_id=line id), marketplace_favorites (user_line_id),
-- announcement_reads (reader_line_id), golfer_society_subscriptions (golfer_id)

-- Template per table (example: caddy_notebook):
drop policy if exists tmp_select on public.caddy_notebook;
drop policy if exists tmp_insert on public.caddy_notebook;
drop policy if exists tmp_update on public.caddy_notebook;
create policy cn_select_own on public.caddy_notebook for select to authenticated using (golfer_id = line_id());
create policy cn_insert_own on public.caddy_notebook for insert to authenticated with check (golfer_id = line_id());
create policy cn_update_own on public.caddy_notebook for update to authenticated using (golfer_id = line_id()) with check (golfer_id = line_id());
-- (repeat the same shape for the other BATCH A tables, swapping the owner column:
--  notification_preferences.user_id, user_caddy_preferences.user_id,
--  saved_groups.user_id, golf_buddies.user_id  -> all = line_id()
--  marketplace_favorites.user_line_id, announcement_reads.reader_line_id,
--  golfer_society_subscriptions.golfer_id -> = line_id() )

-- ===========================================================================
-- BATCH B — empty/unused, owner = profile UUID. Safe (no data), verify later.
-- ===========================================================================
-- user_preferences.user_id, push_tokens.user_id, support_tickets.user_id
--   -> select/insert/update to authenticated using/with check (user_id = current_profile_id())

-- ===========================================================================
-- BATCH C — CROSS_READ + owner-write (logged-in read all; owner writes).
-- ===========================================================================
-- marketplace_listings (seller_line_id)  [CAVEAT: views++ done by viewers -> move to RPC or accept loss]
-- course_conditions (user_id=line id), condition_likes (user_id=line id)
-- society_profiles (organizer_id=line id), announcements (sender_line_id)
-- event_join_requests (INSERT gated golfer_id=line_id(); organizer UPDATE open)
-- direct_messages (sender/recipient_line_id) [defense-in-depth; app uses secure-dm edge fn]
-- group_chat_messages, group_chats (membership EXISTS into group_chat_members)
-- event_leaderboard, leaderboard_periods, leaderboard_snapshots, period_standings,
-- season_points, tournaments (SELECT all; writes authenticated)
-- tournament_registrations (INSERT player_id=line_id(); organizer UPDATE open)

-- ===========================================================================
-- BATCH D — PUBLIC_REF (SELECT open incl anon; writes restricted/none).
-- ===========================================================================
-- caddies, golf_courses, golfcourse_scorecards (read-only; no client writes)
-- caddy_profiles (read-only; created_by 100% NULL -> no owner write)
-- courses, course_holes, pin_positions (read open; writes authenticated-only,
--   no owner column -> true admin gating DEFERRED, needs role claim)

-- ===========================================================================
-- DEFER — keep tmp_ for now. Each would BREAK the app or needs schema/role work.
-- ===========================================================================
-- SHARED-SCORING WRITES (read tightened to authenticated; writes DEFER):
--   rounds, round_holes, scorecards, scores, shots, live_progress, handicap_history
--   -> host/organizer writes rows for OTHER players (group/marker model); no column
--      ties a write to the caller. Fix = route writes via edge fn OR add marker model.
--      Safe partial win: change SELECT from anon to authenticated (still cross-read).
-- user_profiles: SELECT must stay row-open (cross-read everywhere); writes done by
--   organizers/guests/claim flow. PII (email/phone/dob) needs a SECURITY DEFINER view
--   (self + society organizer) + app refactor. Near-term: drop anon from SELECT/writes.
-- chat_messages, chat_rooms, chat_room_members: write-path uses auth.uid() not
--   profile_id; self-referential membership needs SECURITY DEFINER is_room_member().
-- group_chat_members, group_chat_reads: self-referential -> needs is_group_member() helper.
-- side_game_pools, pool_entrants, game_presses: intentional ANON guest play.
-- bookings, caddy_bookings: multi-party (golfer/caddy/course); legacy usernames/NULL ids.
-- emergency_alerts: role-based SOS broadcast; no role claim yet; SOS model pending.
-- webauthn_credentials: exercised PRE-AUTH via anon key -> locking breaks biometric login.
-- client_errors: INSERT must stay anon (pre-auth crash capture); SELECT needs admin claim.
-- event_payments, points_config, society_budgets: no app refs / legacy slug ids / sentinels.
-- society_organizer_roles: governs organizer authority; empty; wrong policy cascades. Own pass.
-- caddy_reviews, conversation_participants, notifications, friendships,
--   round_scores, user_handicaps, scorecard_holes, hole_history, activity_logs,
--   user_sanctions: empty/dormant or uuid owner unverifiable -> confirm with data first.

-- ===========================================================================
-- URGENT (separate track) — course_admins holds PLAINTEXT super_admin_pin/staff_pin
-- and is currently anon-readable (USING true) -> anyone can read every course's PINs.
-- BUT the client admin panel (index.html:97090 select *, :97143/:97181/:97229 update)
-- reads/writes it directly, so it cannot just be locked. Fix = move that panel's
-- read+update into an edge function (service role) like verify-admin-pin, THEN
-- remove all client policies on course_admins. Highest priority.
-- ===========================================================================
