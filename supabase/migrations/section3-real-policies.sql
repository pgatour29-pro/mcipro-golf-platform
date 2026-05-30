-- ============================================================================
-- MyCaddiPro — Section 3: real RLS policies (reviewed classification)
-- ============================================================================
-- Prereq: part2-app-users-and-policies.sql Section 1 (app_users + line_id()).
-- NOTE: app_users already has its own read-own policy from Part 2 — not redone here.
--
-- This file APPLIES policies for tables that are safe under their classification,
-- and QUARANTINES (Section Z) the ones that would open a hole or break a feature.
-- Run the apply sections in batches, testing the app after each. Do NOT run
-- Section Z blindly — those need your answers first.
--
-- All policies wrap the identity call as (select public.line_id()) for perf, and
-- NONE grant DELETE — deletes stay in the Edge Functions.
-- ============================================================================


-- ============================================================================
-- C1 — STRICT PRIVATE user-owned  (owner reads+writes own rows; no one else)
-- ============================================================================
do $$
declare t text;
  -- owner column = user_id
  uid_tables text[] := array[
    'chat_devices','chat_room_members','condition_likes','message_receipts',
    'notification_preferences','notifications','push_tokens','read_cursors',
    'room_members','saved_groups','typing_events','user_caddy_preferences',
    'user_preferences','webauthn_credentials','support_tickets',
    'announcement_reads'
  ];
begin
  foreach t in array uid_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy own_select on public.%I for select to authenticated using (user_id = (select public.line_id()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (user_id = (select public.line_id()))', t);
    execute format('create policy own_update on public.%I for update to authenticated using (user_id = (select public.line_id())) with check (user_id = (select public.line_id()))', t);
  end loop;
end $$;

-- owner column = golfer_id
do $$
declare t text;
  gid_tables text[] := array['caddy_notebook'];
begin
  foreach t in array gid_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy own_select on public.%I for select to authenticated using (golfer_id = (select public.line_id()))', t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check (golfer_id = (select public.line_id()))', t);
    execute format('create policy own_update on public.%I for update to authenticated using (golfer_id = (select public.line_id())) with check (golfer_id = (select public.line_id()))', t);
  end loop;
end $$;


-- ============================================================================
-- C2 — PUBLIC-BROWSE read-only  (world-readable reference data; writes service-only)
-- Sensitive tables REMOVED from Hal's public list and moved to Section Z.
-- ============================================================================
do $$
declare t text;
  pub_tables text[] := array[
    'announcements','caddies','caddy_profiles','chat_rooms','course_admins',
    'course_gps_data','course_holes','course_nine','courses','event_pairings',
    'event_results','event_waitlist','golf_course_settings','golf_courses',
    'leaderboard_periods','leaderboard_snapshots','nine_hole','pace_notifications',
    'period_standings','pin_change_audit','pin_locations','pin_positions',
    'playoff_brackets','points_config','pool_entrants','pool_leaderboards',
    'round_societies','season_points','series_events','societies','society_events',
    'society_organizer_access','society_organizer_roles','society_profiles',
    'sponsored_ads','tournament_days','tournament_series','tournaments'
  ];
begin
  foreach t in array pub_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy public_read on public.%I for select to anon, authenticated using (true)', t);
    -- no write policy => writes are service_role only
  end loop;
end $$;


-- ============================================================================
-- C3 — SERVICE-LOCKED  (no client access at all; only service_role, which
-- bypasses RLS). Logs, identity-linkage, pending queues, migration artifacts.
-- ============================================================================
do $$
declare t text;
  locked_tables text[] := array[
    'debug_log','performance_logs','notification_log',
    'trgg_user_map','trgg_pending','trgg_pending_matches','trgg_sync_runs',
    'pending_member_links','pending_messaging_ids',
    '_room_map_migration','_user_map_migration'
  ];
begin
  foreach t in array locked_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    -- create NO policies => RLS denies all client (anon + authenticated) access
  end loop;
end $$;


-- ============================================================================
-- C4 — SERVICE-WRITTEN, client-readable  (scores/leaderboard/stat data the app
-- displays; only Edge Functions/sync write them)
-- ============================================================================
do $$
declare t text;
  sread_tables text[] := array[
    'round_holes','round_scores','scorecard_holes','scorecards','scores',
    'live_progress','trgg_rounds','trgg_players','trgg_poy_cache',
    'caddy_completed_rounds'
  ];
begin
  foreach t in array sread_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy client_read on public.%I for select to anon, authenticated using (true)', t);
    -- no write policy => service_role only
  end loop;
end $$;


-- ============================================================================
-- C5 — AUTHENTICATED-READ, owner-write  (profiles: others see display info)
-- ============================================================================
do $$
declare t text;
  prof_tables text[] := array['profiles','user_profiles'];  -- owner = line_user_id
begin
  foreach t in array prof_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy profile_read on public.%I for select to authenticated using (true)', t);
    execute format('create policy profile_insert on public.%I for insert to authenticated with check (line_user_id = (select public.line_id()))', t);
    execute format('create policy profile_update on public.%I for update to authenticated using (line_user_id = (select public.line_id())) with check (line_user_id = (select public.line_id()))', t);
  end loop;
end $$;


-- ============================================================================
-- C6 — PUBLIC-READ, owner-write  (caddy_reviews: everyone sees, author edits)
-- ============================================================================
drop policy if exists tmp_select on public.caddy_reviews;
drop policy if exists tmp_insert on public.caddy_reviews;
drop policy if exists tmp_update on public.caddy_reviews;
create policy review_read on public.caddy_reviews for select to anon, authenticated using (true);
create policy review_insert on public.caddy_reviews for insert to authenticated with check (user_id = (select public.line_id()));
create policy review_update on public.caddy_reviews for update to authenticated using (user_id = (select public.line_id())) with check (user_id = (select public.line_id()));


-- ============================================================================
-- C7 — SERVICE-WRITE, user-read-own  (tamper-proof: user sees, cannot modify)
-- activity_logs and user_sanctions. NO insert/update for clients => only the
-- service_role writes them. A sanctioned user can read but not lift their sanction.
-- ============================================================================
do $$
declare t text;
  rdown_tables text[] := array['activity_logs','user_sanctions'];  -- owner = user_id
begin
  foreach t in array rdown_tables loop
    execute format('drop policy if exists tmp_select on public.%I', t);
    execute format('drop policy if exists tmp_insert on public.%I', t);
    execute format('drop policy if exists tmp_update on public.%I', t);
    execute format('create policy read_own on public.%I for select to authenticated using (user_id = (select public.line_id()))', t);
    -- no insert/update policy => service_role only
  end loop;
end $$;


-- ============================================================================
-- C8 — TWO-PARTY relationships  (PATTERN — confirm the second column name)
-- friendships / golf_buddies: each row links two users; both must see it.
-- Replace friend_id with the real second-party column from your schema.
-- ============================================================================
-- drop policy if exists tmp_select on public.friendships;
-- drop policy if exists tmp_insert on public.friendships;
-- drop policy if exists tmp_update on public.friendships;
-- create policy rel_read on public.friendships for select to authenticated
--   using (user_id = (select public.line_id()) OR friend_id = (select public.line_id()));
-- create policy rel_insert on public.friendships for insert to authenticated
--   with check (user_id = (select public.line_id()));
-- create policy rel_update on public.friendships for update to authenticated
--   using (user_id = (select public.line_id()) OR friend_id = (select public.line_id()));
-- -- repeat for golf_buddies with its second-party column


-- ============================================================================
-- C9 — CHAT membership-scoped  (PATTERN — confirm room/membership FK names)
-- A user can read a message if they belong to its room/conversation. Example for
-- chat_messages joined to room_members(room_id, user_id):
-- ============================================================================
-- drop policy if exists tmp_select on public.chat_messages;
-- create policy chat_read on public.chat_messages for select to authenticated
--   using (exists (
--     select 1 from public.room_members m
--     where m.room_id = chat_messages.room_id
--       and m.user_id = (select public.line_id())
--   ));
-- create policy chat_insert on public.chat_messages for insert to authenticated
--   with check (
--     sender_id = (select public.line_id())
--     and exists (select 1 from public.room_members m
--                 where m.room_id = chat_messages.room_id
--                   and m.user_id = (select public.line_id())));
-- Apply the same shape to: direct_messages (sender/recipient pair),
-- event_group_messages, group_chat_messages, group_chats, group_chat_members,
-- group_chat_reads, event_message_reads, rooms, conversation_participants.


-- ============================================================================
-- SECTION Z — QUARANTINE: resolve before applying (still on tmp_ until then)
-- These were classified in a way that opens a hole or breaks a feature. I have
-- NOT emitted policies for them. Each needs your answer; the recommended fix is
-- noted. The ones marked [EXPOSED] are currently still allow-all — prioritize.
-- ============================================================================
-- [EXPOSED] event_payments        -> financial. Likely service-only read + service write,
--                                     or owner-scoped if a golfer sees their own payments.
-- [EXPOSED] gps_positions          -> live location. Scope to playing group / authenticated,
--                                     not public. Who legitimately needs to read it?
-- [EXPOSED] caddy_tracking         -> same as gps_positions.
-- [EXPOSED] attachments            -> may hold private chat/ticket files. Scope to the
--                                     owner of the parent message/ticket (join pattern).
-- [EXPOSED] society_budgets        -> financial. Society organizers only, not public.
-- [EXPOSED] tournament_registrations -> PII (who registered). Society/organizer read?
-- booking_access_keys              -> if access tokens: SERVICE-LOCKED (no client read).
-- content_reports                  -> reporter + admin only. Lock client, or read-own-reports.
-- bookings, caddy_bookings, caddy_waitlist
--                                  -> multi-party: golfer + assigned caddy + course admin.
--                                     Need the caddy_id / course_id columns to write it.
-- society_members, society_handicaps, golfer_society_subscriptions,
-- event_registrations, event_join_requests
--                                  -> member sees own row AND organizer sees all in their
--                                     society/event. Need the organizer-link path.
-- handicap_history, user_handicaps, society_handicaps
--                                  -> visibility? private, society-wide, or leaderboard-public?
-- event_payments / event_results / event_waitlist / event_pairings
--                                  -> confirm which are public vs organizer-only.
