-- =====================================================================
-- Duplicate-profile merge engine
--   * profile_merges         : audit log (every merge is recorded → reversible/undoable)
--   * merge_golfer_profiles  : move ALL of an absorbed profile's data onto a survivor, then
--                              delete the absorbed shell. Triggers suppressed so no waitlist
--                              auto-promote / LINE notifications / handicap recompute fire.
--   * find_duplicate_profiles: read-only detector. Groups profiles by order-insensitive name
--                              token-set, recommends a survivor, and tiers each group auto|review.
-- Safe by construction: merge only ever ACTS when explicitly called; a real (claimed) account can
-- never be silently absorbed (needs p_force); every merge stores the absorbed row's full JSON.
-- =====================================================================

CREATE TABLE IF NOT EXISTS profile_merges (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  survivor_id  text NOT NULL,
  absorbed_id  text NOT NULL,
  absorbed_row jsonb NOT NULL,          -- full user_profiles row of the absorbed profile (undo record)
  moved        jsonb,                   -- [{table, column, rows, deleted_dupes}]
  reason       text,
  merged_by    text DEFAULT 'system',
  merged_at    timestamptz DEFAULT now(),
  reversed_at  timestamptz
);
ALTER TABLE profile_merges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tmp_profile_merges_all ON profile_merges;
CREATE POLICY tmp_profile_merges_all ON profile_merges FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE ON profile_merges TO anon, authenticated;

-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION merge_golfer_profiles(
  p_survivor text,
  p_absorbed text,
  p_reason   text DEFAULT NULL,
  p_force    boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_abs    user_profiles;
  v_moved  jsonb := '[]'::jsonb;
  r        RECORD;
  v_cnt    bigint;
  v_del    bigint;
  v_ctid   tid;
  is_ph    boolean;
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

  -- Quiet merge: suppress user + FK triggers for this transaction only.
  SET LOCAL session_replication_role = replica;

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

  -- Remove the now-empty absorbed profile shell.
  DELETE FROM user_profiles WHERE line_user_id = p_absorbed;

  INSERT INTO profile_merges(survivor_id, absorbed_id, absorbed_row, moved, reason)
  VALUES (p_survivor, p_absorbed, to_jsonb(v_abs), v_moved, p_reason);

  RETURN jsonb_build_object('survivor', p_survivor, 'absorbed', p_absorbed, 'moved', v_moved);
END $$;

GRANT EXECUTE ON FUNCTION merge_golfer_profiles(text,text,text,boolean) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Read-only detector. Returns one row per duplicate name-group.
CREATE OR REPLACE FUNCTION find_duplicate_profiles()
RETURNS TABLE(
  name_key    text,
  n           int,
  tier        text,        -- 'auto' (safe to merge) | 'review' (needs a human)
  hcp_status  text,        -- 'ok' | 'conflict'
  survivor    text,        -- recommended keeper
  members     jsonb        -- [{id,type,name,hcp,created_at,has_membership,is_survivor}]
)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT up.line_user_id AS id,
           up.name,
           up.created_at,
           COALESCE(up.profile_data->>'handicap', up.handicap_index::text) AS hcp,
           -- numeric form so "19" and "19.0" are the SAME handicap, not a false conflict
           NULLIF(regexp_replace(COALESCE(up.profile_data->>'handicap', up.handicap_index::text, ''), '[^0-9.-]', '', 'g'), '')::numeric AS hcp_num,
           CASE
             WHEN up.line_user_id ~ '^U[0-9a-f]{20,}$' THEN 'real_LINE'
             WHEN up.line_user_id LIKE '%-GUEST-%' OR up.line_user_id LIKE 'GUEST-%' THEN 'guest'
             WHEN up.line_user_id LIKE 'MANUAL-%'  OR up.line_user_id LIKE 'manual_%' THEN 'manual'
             WHEN up.line_user_id LIKE 'player_%'  THEN 'player'
             WHEN up.line_user_id LIKE 'TRGG-HCP-%' THEN 'hcp_pull'
             ELSE 'other'
           END AS type,
           EXISTS(SELECT 1 FROM society_members sm WHERE sm.golfer_id = up.line_user_id) AS has_mem,
           (SELECT string_agg(tok,' ' ORDER BY tok)
              FROM unnest(string_to_array(regexp_replace(lower(coalesce(up.name,'')),'[^a-z0-9]+',' ','g'),' ')) tok
              WHERE tok <> '') AS key
    FROM user_profiles up
    WHERE coalesce(up.name,'') <> ''
      -- golfers only: organizer/society/staff identity rows are not duplicate players
      AND COALESCE(up.role,'') NOT IN ('organizer','society_organizer','manager','admin','staff','proshop')
      AND NOT EXISTS (SELECT 1 FROM society_profiles sp WHERE sp.id::text = up.line_user_id)
  ),
  ranked AS (
    SELECT b.*,
           row_number() OVER (
             PARTITION BY b.key
             ORDER BY (b.type = 'real_LINE') DESC, b.has_mem DESC, b.created_at ASC NULLS LAST
           ) AS rn
    FROM base b
    WHERE b.key IS NOT NULL AND b.key <> ''
  ),
  grp AS (
    SELECT key,
           count(*)::int AS n,
           count(*) FILTER (WHERE type='real_LINE') AS n_real,
           count(DISTINCT round(hcp_num, 1)) FILTER (WHERE hcp_num IS NOT NULL) AS distinct_hcps,
           bool_or(type='other') AS has_other,   -- unrecognized id (e.g. raw UUID) → never auto
           max(id) FILTER (WHERE rn=1) AS survivor,
           jsonb_agg(jsonb_build_object(
             'id', id, 'type', type, 'name', name, 'hcp', hcp,
             'created_at', created_at, 'has_membership', has_mem, 'is_survivor', (rn=1)
           ) ORDER BY rn) AS members
    FROM ranked
    GROUP BY key
    HAVING count(*) > 1
  )
  SELECT key,
         n,
         CASE WHEN n_real >= 2 OR distinct_hcps > 1 OR has_other THEN 'review' ELSE 'auto' END AS tier,
         CASE WHEN distinct_hcps > 1 THEN 'conflict' ELSE 'ok' END AS hcp_status,
         survivor,
         members
  FROM grp
  ORDER BY (CASE WHEN n_real >= 2 OR distinct_hcps > 1 OR has_other THEN 'review' ELSE 'auto' END), n DESC;
$$;

GRANT EXECUTE ON FUNCTION find_duplicate_profiles() TO anon, authenticated;
