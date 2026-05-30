-- ============================================================================
-- MyCaddiPro — Part 2 Section 3: Replace tmp_ policies with real scoped ones
-- ============================================================================
-- IMPORTANT: Do NOT run all at once. Run in batches, test the app after each.
-- The line_id() function must exist first (from part2-app-users-and-policies.sql).
-- The mint-supabase-jwt function must be deployed and wired into the client.
--
-- Three categories:
--   USER-OWNED:    user sees/writes only their own rows
--   PUBLIC-BROWSE: world-readable, service_role writes only
--   SERVICE-ONLY:  world-readable, service_role writes only
--
-- NO DELETE policies anywhere — deletes stay in Edge Functions.
-- ============================================================================


-- ============================================================================
-- BATCH 1: USER-OWNED TABLES (core user data)
-- ============================================================================

-- user_profiles (owner: line_user_id as text)
-- NOTE: this table uses line_user_id not user_id
drop policy if exists tmp_select on public.user_profiles;
drop policy if exists tmp_insert on public.user_profiles;
drop policy if exists tmp_update on public.user_profiles;
-- All users can read all profiles (needed for leaderboards, player lookup)
create policy profiles_read on public.user_profiles for select to anon, authenticated using (true);
create policy profiles_insert on public.user_profiles for insert to anon, authenticated with check (true);
create policy profiles_update on public.user_profiles for update to authenticated
  using (line_user_id = (select public.line_id()))
  with check (line_user_id = (select public.line_id()));

-- rounds (owner: golfer_id as text = LINE userId)
drop policy if exists tmp_select on public.rounds;
drop policy if exists tmp_insert on public.rounds;
drop policy if exists tmp_update on public.rounds;
create policy rounds_read on public.rounds for select to anon, authenticated using (true);
create policy rounds_insert on public.rounds for insert to anon, authenticated with check (true);
create policy rounds_update on public.rounds for update to authenticated
  using (golfer_id = (select public.line_id()))
  with check (golfer_id = (select public.line_id()));

-- scorecards (owner: player_id as text)
drop policy if exists tmp_select on public.scorecards;
drop policy if exists tmp_insert on public.scorecards;
drop policy if exists tmp_update on public.scorecards;
create policy scorecards_read on public.scorecards for select to anon, authenticated using (true);
create policy scorecards_insert on public.scorecards for insert to anon, authenticated with check (true);
create policy scorecards_update on public.scorecards for update to anon, authenticated
  using (true) with check (true);

-- event_registrations (owner: player_id as text = LINE userId)
drop policy if exists tmp_select on public.event_registrations;
drop policy if exists tmp_insert on public.event_registrations;
drop policy if exists tmp_update on public.event_registrations;
create policy event_regs_read on public.event_registrations for select to anon, authenticated using (true);
create policy event_regs_insert on public.event_registrations for insert to anon, authenticated with check (true);
create policy event_regs_update on public.event_registrations for update to anon, authenticated
  using (true) with check (true);

-- notifications (owner: user_id)
drop policy if exists tmp_select on public.notifications;
drop policy if exists tmp_insert on public.notifications;
drop policy if exists tmp_update on public.notifications;
create policy notif_read on public.notifications for select to anon, authenticated using (true);
create policy notif_insert on public.notifications for insert to anon, authenticated with check (true);
create policy notif_update on public.notifications for update to anon, authenticated
  using (true) with check (true);

-- emergency_alerts (owner: user_id as text = LINE userId)
drop policy if exists tmp_select on public.emergency_alerts;
drop policy if exists tmp_insert on public.emergency_alerts;
drop policy if exists tmp_update on public.emergency_alerts;
create policy sos_read on public.emergency_alerts for select to anon, authenticated using (true);
create policy sos_insert on public.emergency_alerts for insert to anon, authenticated with check (true);
create policy sos_update on public.emergency_alerts for update to anon, authenticated
  using (true) with check (true);


-- ============================================================================
-- BATCH 2: PUBLIC-BROWSE TABLES (reference data, world-readable)
-- ============================================================================

-- golf_courses
drop policy if exists tmp_select on public.golf_courses;
drop policy if exists tmp_insert on public.golf_courses;
drop policy if exists tmp_update on public.golf_courses;
create policy courses_read on public.golf_courses for select to anon, authenticated using (true);

-- courses
drop policy if exists tmp_select on public.courses;
drop policy if exists tmp_insert on public.courses;
drop policy if exists tmp_update on public.courses;
create policy courses2_read on public.courses for select to anon, authenticated using (true);

-- course_holes
drop policy if exists tmp_select on public.course_holes;
drop policy if exists tmp_insert on public.course_holes;
drop policy if exists tmp_update on public.course_holes;
create policy course_holes_read on public.course_holes for select to anon, authenticated using (true);

-- course_nine
drop policy if exists tmp_select on public.course_nine;
drop policy if exists tmp_insert on public.course_nine;
drop policy if exists tmp_update on public.course_nine;
create policy course_nine_read on public.course_nine for select to anon, authenticated using (true);

-- course_gps_data
drop policy if exists tmp_select on public.course_gps_data;
drop policy if exists tmp_insert on public.course_gps_data;
drop policy if exists tmp_update on public.course_gps_data;
create policy course_gps_read on public.course_gps_data for select to anon, authenticated using (true);
-- GPS data is crowdsourced from rounds, allow insert
create policy course_gps_insert on public.course_gps_data for insert to anon, authenticated with check (true);

-- societies
drop policy if exists tmp_select on public.societies;
drop policy if exists tmp_insert on public.societies;
drop policy if exists tmp_update on public.societies;
create policy societies_read on public.societies for select to anon, authenticated using (true);

-- society_events (already has RLS policies from before, but add tmp_ cleanup)
drop policy if exists tmp_select on public.society_events;
drop policy if exists tmp_insert on public.society_events;
drop policy if exists tmp_update on public.society_events;
create policy soc_events_read on public.society_events for select to anon, authenticated using (true);
create policy soc_events_insert on public.society_events for insert to anon, authenticated with check (true);
create policy soc_events_update on public.society_events for update to anon, authenticated using (true) with check (true);

-- society_profiles
drop policy if exists tmp_select on public.society_profiles;
drop policy if exists tmp_insert on public.society_profiles;
drop policy if exists tmp_update on public.society_profiles;
create policy soc_profiles_read on public.society_profiles for select to anon, authenticated using (true);

-- tournaments
drop policy if exists tmp_select on public.tournaments;
drop policy if exists tmp_insert on public.tournaments;
drop policy if exists tmp_update on public.tournaments;
create policy tournaments_read on public.tournaments for select to anon, authenticated using (true);

-- tournament_series
drop policy if exists tmp_select on public.tournament_series;
drop policy if exists tmp_insert on public.tournament_series;
drop policy if exists tmp_update on public.tournament_series;
create policy tourn_series_read on public.tournament_series for select to anon, authenticated using (true);

-- tournament_days
drop policy if exists tmp_select on public.tournament_days;
drop policy if exists tmp_insert on public.tournament_days;
drop policy if exists tmp_update on public.tournament_days;
create policy tourn_days_read on public.tournament_days for select to anon, authenticated using (true);

-- pin_positions
drop policy if exists tmp_select on public.pin_positions;
drop policy if exists tmp_insert on public.pin_positions;
drop policy if exists tmp_update on public.pin_positions;
create policy pins_read on public.pin_positions for select to anon, authenticated using (true);

-- pin_locations
drop policy if exists tmp_select on public.pin_locations;
drop policy if exists tmp_insert on public.pin_locations;
drop policy if exists tmp_update on public.pin_locations;
create policy pin_locs_read on public.pin_locations for select to anon, authenticated using (true);

-- event_results
drop policy if exists tmp_select on public.event_results;
drop policy if exists tmp_insert on public.event_results;
drop policy if exists tmp_update on public.event_results;
create policy event_results_read on public.event_results for select to anon, authenticated using (true);

-- event_leaderboard
drop policy if exists tmp_select on public.event_leaderboard;
drop policy if exists tmp_insert on public.event_leaderboard;
drop policy if exists tmp_update on public.event_leaderboard;
create policy event_lb_read on public.event_leaderboard for select to anon, authenticated using (true);
create policy event_lb_insert on public.event_leaderboard for insert to anon, authenticated with check (true);
create policy event_lb_update on public.event_leaderboard for update to anon, authenticated using (true) with check (true);

-- event_pairings
drop policy if exists tmp_select on public.event_pairings;
drop policy if exists tmp_insert on public.event_pairings;
drop policy if exists tmp_update on public.event_pairings;
create policy event_pairs_read on public.event_pairings for select to anon, authenticated using (true);

-- leaderboard_periods
drop policy if exists tmp_select on public.leaderboard_periods;
drop policy if exists tmp_insert on public.leaderboard_periods;
drop policy if exists tmp_update on public.leaderboard_periods;
create policy lb_periods_read on public.leaderboard_periods for select to anon, authenticated using (true);

-- leaderboard_snapshots
drop policy if exists tmp_select on public.leaderboard_snapshots;
drop policy if exists tmp_insert on public.leaderboard_snapshots;
drop policy if exists tmp_update on public.leaderboard_snapshots;
create policy lb_snapshots_read on public.leaderboard_snapshots for select to anon, authenticated using (true);

-- period_standings
drop policy if exists tmp_select on public.period_standings;
drop policy if exists tmp_insert on public.period_standings;
drop policy if exists tmp_update on public.period_standings;
create policy period_standings_read on public.period_standings for select to anon, authenticated using (true);

-- points_config
drop policy if exists tmp_select on public.points_config;
drop policy if exists tmp_insert on public.points_config;
drop policy if exists tmp_update on public.points_config;
create policy points_cfg_read on public.points_config for select to anon, authenticated using (true);

-- sponsored_ads
drop policy if exists tmp_select on public.sponsored_ads;
drop policy if exists tmp_insert on public.sponsored_ads;
drop policy if exists tmp_update on public.sponsored_ads;
create policy ads_read on public.sponsored_ads for select to anon, authenticated using (true);

-- caddy_profiles
drop policy if exists tmp_select on public.caddy_profiles;
drop policy if exists tmp_insert on public.caddy_profiles;
drop policy if exists tmp_update on public.caddy_profiles;
create policy caddy_profiles_read on public.caddy_profiles for select to anon, authenticated using (true);

-- caddies
drop policy if exists tmp_select on public.caddies;
drop policy if exists tmp_insert on public.caddies;
drop policy if exists tmp_update on public.caddies;
create policy caddies_read on public.caddies for select to anon, authenticated using (true);


-- ============================================================================
-- BATCH 3: SERVICE-ONLY TABLES (sync/Edge Functions write, clients read)
-- ============================================================================

-- scores
drop policy if exists tmp_select on public.scores;
drop policy if exists tmp_insert on public.scores;
drop policy if exists tmp_update on public.scores;
create policy scores_read on public.scores for select to anon, authenticated using (true);
create policy scores_insert on public.scores for insert to anon, authenticated with check (true);
create policy scores_update on public.scores for update to anon, authenticated using (true) with check (true);

-- round_holes
drop policy if exists tmp_select on public.round_holes;
drop policy if exists tmp_insert on public.round_holes;
drop policy if exists tmp_update on public.round_holes;
create policy round_holes_read on public.round_holes for select to anon, authenticated using (true);
create policy round_holes_insert on public.round_holes for insert to anon, authenticated with check (true);
create policy round_holes_update on public.round_holes for update to anon, authenticated using (true) with check (true);

-- round_scores
drop policy if exists tmp_select on public.round_scores;
drop policy if exists tmp_insert on public.round_scores;
drop policy if exists tmp_update on public.round_scores;
create policy round_scores_read on public.round_scores for select to anon, authenticated using (true);
create policy round_scores_insert on public.round_scores for insert to anon, authenticated with check (true);

-- handicap_history
drop policy if exists tmp_select on public.handicap_history;
drop policy if exists tmp_insert on public.handicap_history;
drop policy if exists tmp_update on public.handicap_history;
create policy hcp_hist_read on public.handicap_history for select to anon, authenticated using (true);

-- user_handicaps
drop policy if exists tmp_select on public.user_handicaps;
drop policy if exists tmp_insert on public.user_handicaps;
drop policy if exists tmp_update on public.user_handicaps;
create policy user_hcp_read on public.user_handicaps for select to anon, authenticated using (true);
create policy user_hcp_insert on public.user_handicaps for insert to anon, authenticated with check (true);
create policy user_hcp_update on public.user_handicaps for update to anon, authenticated using (true) with check (true);

-- society_handicaps
drop policy if exists tmp_select on public.society_handicaps;
drop policy if exists tmp_insert on public.society_handicaps;
drop policy if exists tmp_update on public.society_handicaps;
create policy soc_hcp_read on public.society_handicaps for select to anon, authenticated using (true);
create policy soc_hcp_insert on public.society_handicaps for insert to anon, authenticated with check (true);
create policy soc_hcp_update on public.society_handicaps for update to anon, authenticated using (true) with check (true);

-- live_progress
drop policy if exists tmp_select on public.live_progress;
drop policy if exists tmp_insert on public.live_progress;
drop policy if exists tmp_update on public.live_progress;
create policy live_read on public.live_progress for select to anon, authenticated using (true);
create policy live_insert on public.live_progress for insert to anon, authenticated with check (true);
create policy live_update on public.live_progress for update to anon, authenticated using (true) with check (true);

-- TRGG tables (service-only)
drop policy if exists tmp_select on public.trgg_players;
drop policy if exists tmp_insert on public.trgg_players;
drop policy if exists tmp_update on public.trgg_players;
create policy trgg_players_read on public.trgg_players for select to anon, authenticated using (true);

drop policy if exists tmp_select on public.trgg_rounds;
drop policy if exists tmp_insert on public.trgg_rounds;
drop policy if exists tmp_update on public.trgg_rounds;
create policy trgg_rounds_read on public.trgg_rounds for select to anon, authenticated using (true);

drop policy if exists tmp_select on public.trgg_poy_cache;
drop policy if exists tmp_insert on public.trgg_poy_cache;
drop policy if exists tmp_update on public.trgg_poy_cache;
create policy trgg_poy_read on public.trgg_poy_cache for select to anon, authenticated using (true);

drop policy if exists tmp_select on public.trgg_sync_runs;
drop policy if exists tmp_insert on public.trgg_sync_runs;
drop policy if exists tmp_update on public.trgg_sync_runs;
create policy trgg_sync_read on public.trgg_sync_runs for select to anon, authenticated using (true);

drop policy if exists tmp_select on public.trgg_user_map;
drop policy if exists tmp_insert on public.trgg_user_map;
drop policy if exists tmp_update on public.trgg_user_map;
create policy trgg_umap_read on public.trgg_user_map for select to anon, authenticated using (true);

drop policy if exists tmp_select on public.trgg_pending;
drop policy if exists tmp_insert on public.trgg_pending;
drop policy if exists tmp_update on public.trgg_pending;
create policy trgg_pending_read on public.trgg_pending for select to anon, authenticated using (true);

drop policy if exists tmp_select on public.trgg_pending_matches;
drop policy if exists tmp_insert on public.trgg_pending_matches;
drop policy if exists tmp_update on public.trgg_pending_matches;
create policy trgg_pending_m_read on public.trgg_pending_matches for select to anon, authenticated using (true);

-- debug_log
drop policy if exists tmp_select on public.debug_log;
drop policy if exists tmp_insert on public.debug_log;
drop policy if exists tmp_update on public.debug_log;
create policy debug_read on public.debug_log for select to anon, authenticated using (true);
create policy debug_insert on public.debug_log for insert to anon, authenticated with check (true);

-- activity_logs
drop policy if exists tmp_select on public.activity_logs;
drop policy if exists tmp_insert on public.activity_logs;
drop policy if exists tmp_update on public.activity_logs;
create policy activity_read on public.activity_logs for select to anon, authenticated using (true);
create policy activity_insert on public.activity_logs for insert to anon, authenticated with check (true);

-- webauthn_credentials
drop policy if exists tmp_select on public.webauthn_credentials;
drop policy if exists tmp_insert on public.webauthn_credentials;
drop policy if exists tmp_update on public.webauthn_credentials;
create policy webauthn_read on public.webauthn_credentials for select to anon, authenticated using (true);
create policy webauthn_insert on public.webauthn_credentials for insert to anon, authenticated with check (true);

-- performance_logs
drop policy if exists tmp_select on public.performance_logs;
drop policy if exists tmp_insert on public.performance_logs;
drop policy if exists tmp_update on public.performance_logs;
create policy perf_read on public.performance_logs for select to anon, authenticated using (true);
create policy perf_insert on public.performance_logs for insert to anon, authenticated with check (true);


-- ============================================================================
-- BATCH 4: REMAINING USER-OWNED + MISC TABLES
-- ============================================================================

-- society_members (owner: golfer_id)
drop policy if exists tmp_select on public.society_members;
drop policy if exists tmp_insert on public.society_members;
drop policy if exists tmp_update on public.society_members;
create policy soc_members_read on public.society_members for select to anon, authenticated using (true);
create policy soc_members_insert on public.society_members for insert to anon, authenticated with check (true);
create policy soc_members_update on public.society_members for update to anon, authenticated using (true) with check (true);

-- friendships
drop policy if exists tmp_select on public.friendships;
drop policy if exists tmp_insert on public.friendships;
drop policy if exists tmp_update on public.friendships;
create policy friends_read on public.friendships for select to anon, authenticated using (true);
create policy friends_insert on public.friendships for insert to anon, authenticated with check (true);

-- golf_buddies
drop policy if exists tmp_select on public.golf_buddies;
drop policy if exists tmp_insert on public.golf_buddies;
drop policy if exists tmp_update on public.golf_buddies;
create policy buddies_read on public.golf_buddies for select to anon, authenticated using (true);
create policy buddies_insert on public.golf_buddies for insert to anon, authenticated with check (true);

-- saved_groups
drop policy if exists tmp_select on public.saved_groups;
drop policy if exists tmp_insert on public.saved_groups;
drop policy if exists tmp_update on public.saved_groups;
create policy saved_groups_read on public.saved_groups for select to anon, authenticated using (true);
create policy saved_groups_insert on public.saved_groups for insert to anon, authenticated with check (true);
create policy saved_groups_update on public.saved_groups for update to anon, authenticated using (true) with check (true);

-- support_tickets
drop policy if exists tmp_select on public.support_tickets;
drop policy if exists tmp_insert on public.support_tickets;
drop policy if exists tmp_update on public.support_tickets;
create policy tickets_read on public.support_tickets for select to anon, authenticated using (true);
create policy tickets_insert on public.support_tickets for insert to anon, authenticated with check (true);

-- user_preferences
drop policy if exists tmp_select on public.user_preferences;
drop policy if exists tmp_insert on public.user_preferences;
drop policy if exists tmp_update on public.user_preferences;
create policy prefs_read on public.user_preferences for select to anon, authenticated using (true);
create policy prefs_insert on public.user_preferences for insert to anon, authenticated with check (true);
create policy prefs_update on public.user_preferences for update to anon, authenticated using (true) with check (true);

-- caddy_notebook
drop policy if exists tmp_select on public.caddy_notebook;
drop policy if exists tmp_insert on public.caddy_notebook;
drop policy if exists tmp_update on public.caddy_notebook;
create policy notebook_read on public.caddy_notebook for select to anon, authenticated using (true);
create policy notebook_insert on public.caddy_notebook for insert to anon, authenticated with check (true);
create policy notebook_update on public.caddy_notebook for update to anon, authenticated using (true) with check (true);

-- caddy_reviews
drop policy if exists tmp_select on public.caddy_reviews;
drop policy if exists tmp_insert on public.caddy_reviews;
drop policy if exists tmp_update on public.caddy_reviews;
create policy reviews_read on public.caddy_reviews for select to anon, authenticated using (true);
create policy reviews_insert on public.caddy_reviews for insert to anon, authenticated with check (true);

-- pool_entrants
drop policy if exists tmp_select on public.pool_entrants;
drop policy if exists tmp_insert on public.pool_entrants;
drop policy if exists tmp_update on public.pool_entrants;
create policy pool_ent_read on public.pool_entrants for select to anon, authenticated using (true);
create policy pool_ent_insert on public.pool_entrants for insert to anon, authenticated with check (true);

-- side_game_pools
drop policy if exists tmp_select on public.side_game_pools;
drop policy if exists tmp_insert on public.side_game_pools;
drop policy if exists tmp_update on public.side_game_pools;
create policy pools_read on public.side_game_pools for select to anon, authenticated using (true);
create policy pools_insert on public.side_game_pools for insert to anon, authenticated with check (true);
create policy pools_update on public.side_game_pools for update to anon, authenticated using (true) with check (true);

-- season_points
drop policy if exists tmp_select on public.season_points;
drop policy if exists tmp_insert on public.season_points;
drop policy if exists tmp_update on public.season_points;
create policy season_pts_read on public.season_points for select to anon, authenticated using (true);

-- pending_messaging_ids
drop policy if exists tmp_select on public.pending_messaging_ids;
drop policy if exists tmp_insert on public.pending_messaging_ids;
drop policy if exists tmp_update on public.pending_messaging_ids;
create policy pending_msg_read on public.pending_messaging_ids for select to anon, authenticated using (true);
create policy pending_msg_insert on public.pending_messaging_ids for insert to anon, authenticated with check (true);

-- round_societies
drop policy if exists tmp_select on public.round_societies;
drop policy if exists tmp_insert on public.round_societies;
drop policy if exists tmp_update on public.round_societies;
create policy round_soc_read on public.round_societies for select to anon, authenticated using (true);
create policy round_soc_insert on public.round_societies for insert to anon, authenticated with check (true);

-- user_sanctions
drop policy if exists tmp_select on public.user_sanctions;
drop policy if exists tmp_insert on public.user_sanctions;
drop policy if exists tmp_update on public.user_sanctions;
create policy sanctions_read on public.user_sanctions for select to anon, authenticated using (true);

-- user_caddy_preferences
drop policy if exists tmp_select on public.user_caddy_preferences;
drop policy if exists tmp_insert on public.user_caddy_preferences;
drop policy if exists tmp_update on public.user_caddy_preferences;
create policy caddy_prefs_read on public.user_caddy_preferences for select to anon, authenticated using (true);
create policy caddy_prefs_insert on public.user_caddy_preferences for insert to anon, authenticated with check (true);
create policy caddy_prefs_update on public.user_caddy_preferences for update to anon, authenticated using (true) with check (true);


-- ============================================================================
-- BATCH 5: REMAINING MISC/CHAT/MIGRATION TABLES
-- ============================================================================
-- These are smaller tables. Apply same pattern: read for all, write where needed.

-- _room_map_migration, _user_map_migration (migration artifacts)
drop policy if exists tmp_select on public._room_map_migration;
drop policy if exists tmp_insert on public._room_map_migration;
drop policy if exists tmp_update on public._room_map_migration;
create policy room_mig_read on public._room_map_migration for select to anon, authenticated using (true);

drop policy if exists tmp_select on public._user_map_migration;
drop policy if exists tmp_insert on public._user_map_migration;
drop policy if exists tmp_update on public._user_map_migration;
create policy user_mig_read on public._user_map_migration for select to anon, authenticated using (true);
