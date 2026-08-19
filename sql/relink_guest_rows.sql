-- =====================================================================
-- relink_guest_rows: server-side satellite sweep for the FRESH-CLAIM path.
--
-- MemberLink's fresh claim repoints the guest profile's PK onto the LINE id
-- (no absorbed row, so merge_golfer_profiles can't run), then used to move
-- 7 hand-picked tables client-side (_relinkGuestRows). That list missed
-- every id EMBEDDED in JSON — event_pairings.groups and
-- scorecards.match_play_config — so a claimed player vanished from the
-- matchplay/nassau boards mid-round (Justin Carroll, Green Valley,
-- 2026-08-19). This mirrors merge_golfer_profiles' full sweep: every text
-- column in public holding the old id, plus the two JSONB embeds. No
-- profile row is touched (the claim already repointed it) and nothing is
-- deleted except losing duplicates on unique collisions.
--
-- SECURITY: callable by anon (the browser runs on the anon key — Auth v2
-- pending), so the old id MUST look like a placeholder. A real LINE/Google
-- account can never be relinked away.
-- =====================================================================
CREATE OR REPLACE FUNCTION relink_guest_rows(p_old text, p_new text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_moved jsonb := '[]'::jsonb;
  r       RECORD;
  v_cnt   bigint;
  v_del   bigint;
  v_ctid  tid;
  is_ph   boolean;
BEGIN
  IF p_old IS NULL OR p_new IS NULL OR p_old = p_new THEN
    RAISE EXCEPTION 'relink needs two different ids (old=%, new=%)', p_old, p_new;
  END IF;

  is_ph := p_old LIKE '%-GUEST-%' OR p_old LIKE 'GUEST-%'
        OR p_old LIKE 'MANUAL-%'  OR p_old LIKE 'manual_%'
        OR p_old LIKE 'player_%'  OR p_old LIKE 'TRGG-HCP-%';
  IF NOT is_ph THEN
    RAISE EXCEPTION 'relink only moves placeholder ids (got %)', p_old;
  END IF;

  -- Quiet sweep: best-effort trigger suppression (superuser-only GUC — works under the
  -- management-API path, silently skipped under the browser's anon role; the triggers on
  -- the touched tables are no-ops on an id swap, same analysis as merge_golfer_profiles).
  BEGIN
    SET LOCAL session_replication_role = replica;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Move every TEXT column across public that literally holds the old id. The identity
  -- tables are excluded: the claim already repointed user_profiles itself.
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text','character varying','character')
      AND c.table_name NOT IN ('user_profiles','profiles','profile_merges')
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', r.table_name, r.column_name)
      INTO v_cnt USING p_old;
    CONTINUE WHEN v_cnt = 0;

    v_del := 0;
    BEGIN
      EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2',
                     r.table_name, r.column_name, r.column_name)
        USING p_new, p_old;
    EXCEPTION WHEN unique_violation THEN
      -- The new id already owns some of these keys: move row-by-row, drop losing dupes.
      LOOP
        EXECUTE format('SELECT ctid FROM public.%I WHERE %I = $1 LIMIT 1', r.table_name, r.column_name)
          INTO v_ctid USING p_old;
        EXIT WHEN v_ctid IS NULL;
        BEGIN
          EXECUTE format('UPDATE public.%I SET %I = $1 WHERE ctid = $2', r.table_name, r.column_name)
            USING p_new, v_ctid;
        EXCEPTION WHEN unique_violation THEN
          EXECUTE format('DELETE FROM public.%I WHERE ctid = $1', r.table_name) USING v_ctid;
          v_del := v_del + 1;
        END;
      END LOOP;
    END;

    v_moved := v_moved || jsonb_build_object(
      'table', r.table_name, 'column', r.column_name, 'rows', v_cnt, 'deleted_dupes', v_del);
  END LOOP;

  -- Ids embedded in JSONB — invisible to the column sweep above.
  UPDATE event_pairings
     SET groups = replace(groups::text, p_old, p_new)::jsonb
   WHERE groups::text LIKE '%' || p_old || '%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  IF v_cnt > 0 THEN
    v_moved := v_moved || jsonb_build_object(
      'table','event_pairings','column','groups(jsonb)','rows',v_cnt,'deleted_dupes',0);
  END IF;

  UPDATE scorecards
     SET match_play_config = replace(match_play_config::text, p_old, p_new)::jsonb
   WHERE match_play_config IS NOT NULL
     AND match_play_config::text LIKE '%' || p_old || '%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  IF v_cnt > 0 THEN
    v_moved := v_moved || jsonb_build_object(
      'table','scorecards','column','match_play_config(jsonb)','rows',v_cnt,'deleted_dupes',0);
  END IF;

  RETURN jsonb_build_object('old', p_old, 'new', p_new, 'moved', v_moved);
END $$;
