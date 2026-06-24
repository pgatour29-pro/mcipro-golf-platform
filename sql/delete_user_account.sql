-- =====================================================================
-- Account deletion (Google Play / App Store compliance)
-- SECURITY DEFINER so it bypasses RLS and actually deletes the user's data.
-- Deletes ALL data keyed to the user's TEXT identity (line_user_id/golfer_id/
-- player_id/user_id-text) across base tables, child rows first. Per-table
-- exception handling → one bad table never aborts the whole purge. Returns a
-- jsonb summary of rows removed per table.
--
-- ⚠️ SECURITY NOTE: callable by anon (consistent with the app's current anon
-- model, where UPDATE on these tables is already open). Tighten to the JWT'd
-- caller's own id in the planned auth hardening. The app only ever calls it
-- with the logged-in user's own id.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_cnt    bigint;
  v_uuid   uuid;
  t        text[];
  -- (table, uuid-column) personal tables keyed by the user's internal UUID (profiles.id),
  -- e.g. chat/notifications/social. Safe: uuid is unique so a wrong/empty match is a no-op.
  -- Shared-conversation owners (rooms.created_by etc.) are intentionally NOT deleted.
  uuid_targets text[] := ARRAY[
    ['activity_logs','user_id'], ['notifications','user_id'], ['push_tokens','user_id'],
    ['chat_devices','user_id'], ['chat_room_members','user_id'], ['read_cursors','user_id'],
    ['message_receipts','user_id'], ['typing_events','user_id'], ['friendships','user_id'],
    ['support_tickets','user_id'], ['user_handicaps','user_id'], ['user_preferences','user_id'],
    ['event_leaderboard','user_id'], ['conversation_participants','profile_id'],
    ['caddy_reviews','user_id'], ['caddy_waitlist','user_id'], ['room_members','user_id']
  ];
  -- (table, text-column) personal-data tables keyed by the user's TEXT id.
  -- Views are intentionally excluded. Order roughly children → parents.
  text_targets text[] := ARRAY[
    ['shots','player_id'],
    ['live_progress','player_id'],
    ['pool_entrants','player_id'],
    ['event_payments','player_id'],
    ['event_results','player_id'],
    ['event_waitlist','player_id'],
    ['event_join_requests','golfer_id'],
    ['tournament_registrations','player_id'],
    ['season_points','player_id'],
    ['series_event_results','golfer_id'],
    ['series_standings','golfer_id'],
    ['game_presses','created_by'],
    ['side_game_pools','created_by'],
    ['event_registrations','player_id'],
    ['scorecards','player_id'],
    ['rounds','golfer_id'],
    ['handicap_history','golfer_id'],
    ['society_handicaps','golfer_id'],
    ['society_members','golfer_id'],
    ['society_organizer_roles','user_id'],
    ['golfer_society_subscriptions','golfer_id'],
    ['bookings','golfer_id'],
    ['caddy_bookings','golfer_id'],
    ['caddy_bookings','user_id'],
    ['caddy_notebook','golfer_id'],
    ['caddy_waitlists','golfer_id'],
    ['golf_buddies','user_id'],
    ['saved_groups','user_id'],
    ['condition_likes','user_id'],
    ['course_conditions','user_id'],
    ['client_errors','user_id'],
    ['emergency_alerts','user_id'],
    ['notification_preferences','user_id'],
    ['user_sanctions','user_id'],
    ['webauthn_credentials','user_id'],
    ['user_caddy_preferences','user_id'],
    ['trgg_players','user_id'],
    ['trgg_poy_cache','user_id'],
    ['trgg_user_map','profile_id'],
    ['pending_member_links','line_user_id'],
    ['app_users','line_user_id'],
    ['user_profiles','line_user_id'],
    ['profiles','line_user_id']
  ];
BEGIN
  IF coalesce(trim(p_user_id), '') = '' THEN
    RAISE EXCEPTION 'p_user_id required';
  END IF;

  -- Resolve the user's internal UUID (for chat/notification tables) BEFORE deleting profiles.
  BEGIN
    SELECT id INTO v_uuid FROM profiles WHERE line_user_id = p_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_uuid := NULL; END;

  -- Child rows first (FK-safe). scorecards.id is uuid, scores.scorecard_id is text.
  BEGIN
    DELETE FROM scores WHERE scorecard_id IN (SELECT id::text FROM scorecards WHERE player_id = p_user_id);
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_result := v_result || jsonb_build_object('scores', v_cnt);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('scores_error', SQLERRM); END;

  BEGIN
    DELETE FROM round_holes WHERE round_id IN (SELECT id FROM rounds WHERE golfer_id = p_user_id);
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_result := v_result || jsonb_build_object('round_holes', v_cnt);
  EXCEPTION WHEN OTHERS THEN v_result := v_result || jsonb_build_object('round_holes_error', SQLERRM); END;

  -- Loop the text-keyed tables; skip/record any that error (missing col, view, FK, etc.)
  FOREACH t SLICE 1 IN ARRAY text_targets LOOP
    BEGIN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', t[1], t[2]) USING p_user_id;
      GET DIAGNOSTICS v_cnt = ROW_COUNT;
      IF v_cnt > 0 THEN
        v_result := v_result || jsonb_build_object(t[1] || '.' || t[2], v_cnt);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_result := v_result || jsonb_build_object(t[1] || '.' || t[2] || '_error', SQLERRM);
    END;
  END LOOP;

  -- UUID-keyed personal tables (chat/notifications/social), if the user has an internal uuid.
  IF v_uuid IS NOT NULL THEN
    FOREACH t SLICE 1 IN ARRAY uuid_targets LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE %I = $1', t[1], t[2]) USING v_uuid;
        GET DIAGNOSTICS v_cnt = ROW_COUNT;
        IF v_cnt > 0 THEN
          v_result := v_result || jsonb_build_object(t[1] || '.' || t[2], v_cnt);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_result := v_result || jsonb_build_object(t[1] || '.' || t[2] || '_error', SQLERRM);
      END;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('deleted_user', p_user_id, 'uuid', v_uuid, 'details', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(text) TO anon, authenticated;
