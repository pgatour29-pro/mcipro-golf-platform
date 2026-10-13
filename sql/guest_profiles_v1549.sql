-- v1549 (2026-10-13) EVERY PLAYER HAS A PROFILE — Pete: "Every player even the ones who haven't
-- registered but has been on a tee sheet or scoring system needs to be included and when they do
-- register its already populated".
--
-- 1. golfer_name_key / golfer_name_variant_keys: one name identity rule in SQL — tokens in any order,
--    "(Guest)" dropped, first names nickname-equivalent via name_nickname_variants ("Pete Park" =
--    "Park, Peter").
-- 2. golfer_for_name(): a name typed on the pro shop tee sheet resolves to the ONE guest profile
--    that already carries it, or a new MANUAL- profile. Those ids are what the first-login claim
--    offers, so the player's tee sheet history moves onto their account when they register
--    (relink_guest_rows / merge_golfer_profiles already sweep text AND json columns).
--    NEVER returns a real account: a namesake's account would get the tee time in its app and
--    its LINE alerts. A name that matches a real account stays name-only (the course CRM already
--    joins it to that account by name). Ambiguous / one-word / generic names are refused.
-- 3. _relink_course_notes(): the pro shop's own note on a player (course_golfer_notes,
--    golfer_key 'id:<id>') follows the claim / merge — the id-column sweep can't see 'id:' keys.
--
-- ANON RPC: golfer_for_name (SECURITY DEFINER). Writes only a placeholder user_profiles row
-- (anon already holds INSERT on user_profiles via tmp_insert). Listed in project_security_rls.

CREATE OR REPLACE FUNCTION public.golfer_name_key(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT string_agg(t, ' ' ORDER BY t)
  FROM unnest(string_to_array(trim(regexp_replace(lower(regexp_replace(coalesce(p,''),
         '\([^)]*\)', ' ', 'g')), '[^a-z0-9]+', ' ', 'g')), ' ')) t
  WHERE t <> ''
$$;

CREATE OR REPLACE FUNCTION public.golfer_name_variant_keys(p text)
RETURNS text[] LANGUAGE plpgsql STABLE AS $$
DECLARE
  toks text[]; keys text[] := ARRAY['']; nk text[]; t text; v text;
BEGIN
  SELECT array_agg(x) INTO toks
  FROM unnest(string_to_array(trim(regexp_replace(lower(regexp_replace(coalesce(p,''),
         '\([^)]*\)', ' ', 'g')), '[^a-z0-9]+', ' ', 'g')), ' ')) x WHERE x <> '';
  IF toks IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  FOREACH t IN ARRAY toks LOOP
    nk := ARRAY[]::text[];
    FOREACH v IN ARRAY coalesce(public.name_nickname_variants(t), ARRAY[t]) LOOP
      nk := nk || (SELECT array_agg(CASE WHEN k = '' THEN v ELSE k || ' ' || v END) FROM unnest(keys) k);
    END LOOP;
    keys := nk;
    EXIT WHEN cardinality(keys) > 400;
  END LOOP;
  RETURN (SELECT array_agg(DISTINCT (SELECT string_agg(w, ' ' ORDER BY w) FROM unnest(string_to_array(k, ' ')) w))
          FROM unnest(keys) k);
END $$;

CREATE OR REPLACE FUNCTION public.golfer_for_name(p_name text, p_hcp numeric DEFAULT NULL,
  p_source text DEFAULT 'proshop-teesheet', p_course text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_name text := trim(regexp_replace(regexp_replace(coalesce(p_name, ''), '\s*\((guest|visitor)\)\s*$', '', 'i'), '\s+', ' ', 'g'));
  v_keys text[];
  v_real int;
  v_ph   record;
  v_id   text;
BEGIN
  IF v_name = '' OR length(v_name) > 60 THEN RETURN jsonb_build_object('ok', false, 'reason', 'name'); END IF;
  -- a title is not a name: "Mr. Lee" / "Khun Somchai" is one word
  IF (SELECT count(*) FROM regexp_matches(regexp_replace(v_name, '^(mr|mrs|ms|miss|dr|khun)\.?\s*', '', 'i'), '[A-Za-z]{2,}', 'g')) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'one_word');
  END IF;
  IF v_name ~* '^(test\y|player\s*\d|golfer\y|guest\y|walk.?in|tbc\y|tba\y|unknown\y|phone tester|zzz|.*\ytester\y)' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'generic');
  END IF;
  v_keys := public.golfer_name_variant_keys(v_name);
  PERFORM pg_advisory_xact_lock(hashtext('golfer_for_name:' || public.golfer_name_key(v_name)));

  SELECT count(*) INTO v_real FROM user_profiles u
   WHERE u.line_user_id ~ '^(U[0-9a-f]{32}|GOOGLE-|KAKAO-)' AND public.golfer_name_key(u.name) = ANY (v_keys);
  IF v_real > 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'account', 'n', v_real); END IF;

  SELECT u.line_user_id, u.name INTO v_ph FROM user_profiles u
   WHERE (u.line_user_id LIKE 'MANUAL-%' OR u.line_user_id LIKE '%-GUEST-%' OR u.line_user_id LIKE 'player\_%'
          OR u.line_user_id LIKE 'TRGG-HCP-%' OR u.line_user_id LIKE 'manual\_%')
     AND public.golfer_name_key(u.name) = ANY (v_keys)
   ORDER BY (u.line_user_id LIKE 'TRGG-%') DESC, u.created_at NULLS LAST, u.line_user_id
   LIMIT 1;
  IF FOUND THEN RETURN jsonb_build_object('ok', true, 'id', v_ph.line_user_id, 'name', v_ph.name, 'linked', 'guest'); END IF;

  v_id := 'MANUAL-' || (extract(epoch FROM clock_timestamp()) * 1000)::bigint || '-' || substr(md5(random()::text), 1, 7);
  INSERT INTO user_profiles (line_user_id, name, role, handicap_index, profile_data)
  VALUES (v_id, v_name, 'golfer', p_hcp, jsonb_build_object(
    'name', v_name, 'handicap', p_hcp, 'golfInfo', jsonb_build_object('handicap', p_hcp),
    'is_manual_entry', true, 'isGuest', true, 'addedVia', coalesce(p_source, 'proshop-teesheet'), 'course', p_course));
  RETURN jsonb_build_object('ok', true, 'id', v_id, 'name', v_name, 'linked', 'new');
END $$;

REVOKE ALL ON FUNCTION public.golfer_for_name(text, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.golfer_for_name(text, numeric, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._relink_course_notes(p_old text, p_new text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT * FROM course_golfer_notes WHERE golfer_key = 'id:' || p_old LOOP
    IF EXISTS (SELECT 1 FROM course_golfer_notes WHERE venue = r.venue AND golfer_key = 'id:' || p_new) THEN
      UPDATE course_golfer_notes t SET
        note = left(CASE WHEN coalesce(r.note, '') = '' OR position(r.note IN coalesce(t.note, '')) > 0 THEN t.note
                         WHEN coalesce(t.note, '') = '' THEN r.note ELSE t.note || E'\n' || r.note END, 2000),
        vip = t.vip OR r.vip, updated_at = greatest(t.updated_at, r.updated_at)
      WHERE t.venue = r.venue AND t.golfer_key = 'id:' || p_new;
      DELETE FROM course_golfer_notes WHERE venue = r.venue AND golfer_key = r.golfer_key;
    ELSE
      UPDATE course_golfer_notes SET golfer_key = 'id:' || p_new WHERE venue = r.venue AND golfer_key = r.golfer_key;
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public._relink_course_notes(text, text) FROM PUBLIC, anon, authenticated;

-- 3b. both claim paths carry the course notes along (bodies = prod 2026-10-13 + one PERFORM line)
CREATE OR REPLACE FUNCTION public.relink_guest_rows(p_old text, p_new text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Ids embedded in json/jsonb documents — invisible to the column sweep above. Sweep EVERY
  -- json column generically (tee-sheet groups, match_play_config, rounds game configs,
  -- four_ball_groups, side-game pools, partner prefs, profile_data self-refs…) instead of
  -- hand-enumerating: the enumerated lists are how groups (2026-07-27) and match_play_config
  -- (2026-08-19) got missed. Audit/log tables stay verbatim. Unlike the text sweep,
  -- user_profiles IS included here: its PK was already repointed by the claim, but
  -- profile_data can still embed the old id.
  FOR r IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('json','jsonb')
      AND c.is_generated = 'NEVER'
      AND c.table_name NOT IN ('profile_merges','client_errors','trgg_sync_runs')
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET %I = replace(%I::text, $1, $2)::%s WHERE %I::text LIKE $3',
      r.table_name, r.column_name, r.column_name, r.data_type, r.column_name)
      USING p_old, p_new, '%' || p_old || '%';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    IF v_cnt > 0 THEN
      v_moved := v_moved || jsonb_build_object(
        'table', r.table_name, 'column', r.column_name || '(' || r.data_type || ')',
        'rows', v_cnt, 'deleted_dupes', 0);
    END IF;
  END LOOP;

  PERFORM public._relink_course_notes(p_old, p_new);   -- v1549
  RETURN jsonb_build_object('old', p_old, 'new', p_new, 'moved', v_moved);
END $function$;

CREATE OR REPLACE FUNCTION public.merge_golfer_profiles(p_survivor text, p_absorbed text, p_reason text DEFAULT NULL::text, p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_abs    user_profiles;
  v_moved  jsonb := '[]'::jsonb;
  r        RECORD;
  v_cnt    bigint;
  v_del    bigint;
  v_ctid   tid;
  is_ph    boolean;
  v_nkey   text;
BEGIN
  IF p_survivor IS NULL OR p_absorbed IS NULL OR p_survivor = p_absorbed THEN
    RAISE EXCEPTION 'merge needs two different ids (survivor=%, absorbed=%)', p_survivor, p_absorbed;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE line_user_id = p_survivor) THEN
    RAISE EXCEPTION 'survivor % not found', p_survivor;
  END IF;
  SELECT * INTO v_abs FROM user_profiles WHERE line_user_id = p_absorbed;
  IF NOT FOUND THEN RAISE EXCEPTION 'absorbed % not found', p_absorbed; END IF;

  -- Never silently delete a real (claimed) account. Only placeholders are freely absorbable.
  is_ph := p_absorbed LIKE '%-GUEST-%' OR p_absorbed LIKE 'GUEST-%'
        OR p_absorbed LIKE 'MANUAL-%'  OR p_absorbed LIKE 'manual_%'
        OR p_absorbed LIKE 'player_%'  OR p_absorbed LIKE 'TRGG-HCP-%';
  IF NOT is_ph AND NOT p_force THEN
    RAISE EXCEPTION 'absorbed % looks like a real account — pass p_force := true to merge it', p_absorbed;
  END IF;

  -- Quiet merge: best-effort trigger suppression (only a superuser can set this GUC — works
  -- under the management-API/cron path, silently skipped under the browser's anon role).
  -- Verified safe either way: the triggers on the touched tables are no-ops on a merge —
  -- auto_promote_waitlist needs a capacity change (a player_id swap isn't one) and sends no
  -- notification; auto_update_society_handicaps_on_round only fires on new/completed rounds,
  -- not a golfer_id change; sync_handicap_to_profile merely keeps the profile handicap in sync.
  BEGIN
    SET LOCAL session_replication_role = replica;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Move every TEXT column across public that literally holds the absorbed id, except the identity
  -- tables (handled explicitly). A 30-char LINE / TRGG-GUEST id can't collide with unrelated free text.
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
      INTO v_cnt USING p_absorbed;
    CONTINUE WHEN v_cnt = 0;

    v_del := 0;
    BEGIN
      -- Fast path: move all rows at once.
      EXECUTE format('UPDATE public.%I SET %I = $1 WHERE %I = $2',
                     r.table_name, r.column_name, r.column_name)
        USING p_survivor, p_absorbed;
    EXCEPTION WHEN unique_violation THEN
      -- Slow path: the survivor already owns some of these keys. Move row-by-row; on collision drop
      -- the absorbed's losing duplicate. Re-query each iteration so ctids never go stale.
      LOOP
        EXECUTE format('SELECT ctid FROM public.%I WHERE %I = $1 LIMIT 1', r.table_name, r.column_name)
          INTO v_ctid USING p_absorbed;
        EXIT WHEN v_ctid IS NULL;
        BEGIN
          EXECUTE format('UPDATE public.%I SET %I = $1 WHERE ctid = $2', r.table_name, r.column_name)
            USING p_survivor, v_ctid;
        EXCEPTION WHEN unique_violation THEN
          EXECUTE format('DELETE FROM public.%I WHERE ctid = $1', r.table_name) USING v_ctid;
          v_del := v_del + 1;
        END;
      END LOOP;
    END;

    v_moved := v_moved || jsonb_build_object(
      'table', r.table_name, 'column', r.column_name, 'rows', v_cnt, 'deleted_dupes', v_del);
  END LOOP;

  -- Ids also live INSIDE json/jsonb documents — tee-sheet groups (Tom Britt, 2026-07-27),
  -- scorecards.match_play_config (Justin Carroll's matchplay board empty mid-round,
  -- 2026-08-19), rounds.game_config/playing_partners, four_ball_groups, side-game pools,
  -- partner prefs… The text-column sweep can't see them, and hand-enumerating columns kept
  -- missing new ones, so sweep EVERY json/jsonb column generically. String-replace is safe:
  -- a 15+ char placeholder / LINE id can't collide with unrelated JSON content. Audit/log
  -- tables stay verbatim (profile_merges is the undo record; client_errors and
  -- trgg_sync_runs are historical captures).
  FOR r IN
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('json','jsonb')
      AND c.is_generated = 'NEVER'
      AND c.table_name NOT IN ('profile_merges','client_errors','trgg_sync_runs')
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET %I = replace(%I::text, $1, $2)::%s WHERE %I::text LIKE $3',
      r.table_name, r.column_name, r.column_name, r.data_type, r.column_name)
      USING p_absorbed, p_survivor, '%' || p_absorbed || '%';
    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    IF v_cnt > 0 THEN
      v_moved := v_moved || jsonb_build_object(
        'table', r.table_name, 'column', r.column_name || '(' || r.data_type || ')',
        'rows', v_cnt, 'deleted_dupes', 0);
    END IF;
  END LOOP;

  -- A first-login claim absorbs a rich roster/guest profile into a BLANK LINE shell — carry the
  -- absorbed profile's identity data onto the survivor wherever the survivor is empty
  -- (merge-don't-clobber: the survivor's own values always win; isGuest never survives).
  UPDATE user_profiles s SET
    handicap_index   = COALESCE(s.handicap_index, v_abs.handicap_index),
    society_id       = COALESCE(s.society_id, v_abs.society_id),
    society_name     = CASE WHEN COALESCE(s.society_name,'') = '' THEN v_abs.society_name ELSE s.society_name END,
    home_course_id   = COALESCE(s.home_course_id, v_abs.home_course_id),
    home_course_name = COALESCE(s.home_course_name, v_abs.home_course_name),
    home_club        = COALESCE(s.home_club, v_abs.home_club),
    profile_data     = (COALESCE(v_abs.profile_data,'{}'::jsonb) - 'isGuest') || COALESCE(s.profile_data,'{}'::jsonb)
  WHERE s.line_user_id = p_survivor;

  -- Remove the now-empty absorbed profile shell.
  DELETE FROM user_profiles WHERE line_user_id = p_absorbed;

  INSERT INTO profile_merges(survivor_id, absorbed_id, absorbed_row, moved, reason)
  VALUES (p_survivor, p_absorbed, to_jsonb(v_abs), v_moved, p_reason);

  -- RESURRECTION GUARD (2026-08-11): the TRGG handicap pull CREATES a new profile for any
  -- scraped name that matches nothing — so a merged-away name comes straight back on the next
  -- pull unless trgg_handicap_alias maps its name-key to the survivor ("Jin, Yun Jong" was
  -- absorbed 15x and re-created daily; the 2026-08-09 organizer merges all resurrected on
  -- 2026-08-10). Every TRGG-relevant merge now records the absorbed NAME as an alias of the
  -- survivor, so all four pull entry points resolve it instead of creating. Skipped when a
  -- DIFFERENT live profile still owns that name-key (an alias would hijack their pull row).
  -- Best-effort: an alias failure must never fail the merge.
  BEGIN
    IF p_survivor LIKE 'TRGG-%' OR p_absorbed LIKE 'TRGG-%'
       OR EXISTS (SELECT 1 FROM society_members sm
                  WHERE sm.golfer_id IN (p_survivor, p_absorbed)
                    AND sm.society_id::text IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                                                '17451cf3-f499-4aa3-83d7-c206149838c4',
                                                '17451cf3-8b57-4166-af0a-dd902b7fb1af'))
    THEN
      SELECT (SELECT string_agg(t, ' ' ORDER BY t)
              FROM unnest(string_to_array(trim(regexp_replace(lower(regexp_replace(COALESCE(v_abs.name,''),
                     '\([^)]*\)',' ','g')),'[^a-z0-9]+',' ','g')),' ')) t WHERE t <> '')
        INTO v_nkey;
      IF v_nkey IS NOT NULL AND v_nkey <> '' AND NOT EXISTS (
           SELECT 1 FROM user_profiles u
           WHERE u.line_user_id <> p_survivor
             AND (SELECT string_agg(t2, ' ' ORDER BY t2)
                  FROM unnest(string_to_array(trim(regexp_replace(lower(regexp_replace(COALESCE(u.name,''),
                         '\([^)]*\)',' ','g')),'[^a-z0-9]+',' ','g')),' ')) t2 WHERE t2 <> '') = v_nkey)
      THEN
        INSERT INTO trgg_handicap_alias(alias_key, golfer_id)
        VALUES (v_nkey, p_survivor)
        ON CONFLICT (alias_key) DO UPDATE SET golfer_id = EXCLUDED.golfer_id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM public._relink_course_notes(p_absorbed, p_survivor);   -- v1549
  RETURN jsonb_build_object('survivor', p_survivor, 'absorbed', p_absorbed, 'moved', v_moved);
END $function$;

