-- ============================================================================
-- 2026-09-01 (Pete): "whenever TRGG players info is adjusted it needs to be
-- updated globally." Directory/organizer handicap edits write the TRGG
-- society_handicaps row with calculation_method='MANUAL' — but the mirror
-- trigger sync_universal_to_locked_society() only cascaded TRGG%/%MASTERSCORE%
-- (import) writes. So a Players Directory edit updated the TRGG row and
-- NOTHING else: universal row, user_profiles.handicap_index, trgg_handicap,
-- profile_data.handicap and golfInfo.handicap all stayed stale.
-- Live incident 2026-08-31: Ms Fon 11.0-vs-31.9, Mr Ota 16.0-vs-29.2,
-- yu yubin 18.0-vs-23.0.
--
-- Part 1: MANUAL writes on a TRGG society row now cascade globally too.
--         Semantics vs imports: an import write still respects a MANUAL-pinned
--         universal (that is what the pin is for); a MANUAL TRGG edit is a
--         human setting the number RIGHT NOW, so it updates the universal
--         VALUE even through a pin — but never changes the universal's method
--         (a pin stays a pin, an ANCHORED row stays ANCHORED).
-- Part 2: auto_update_society_handicaps_on_round — the 2026-08-18 rewrite was
--         based on the stale v536 FILE and re-introduced the v556 scramble
--         false-positive (bare "scramble": null key skipped the engine; 20
--         legit rounds silently skipped since 08-18). Gate restored. Also the
--         locked-value mirror lookup now counts a MANUAL TRGG row as authority.
-- Part 3: backfill — touch every MANUAL TRGG row so the cascade syncs the
--         stale mirrors.
-- Supersedes: sql/universal_mirrors_locked_trgg_20260818.sql,
--             sql/locked_trgg_mirrors_trgg_handicap_20260824.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Part 1: cascade trigger — MANUAL TRGG edits sync globally
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_universal_to_locked_society()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uni_method TEXT;
  v_is_trgg BOOLEAN;
  v_is_manual_edit BOOLEAN;
BEGIN
  IF NEW.society_id IS NULL OR NEW.handicap_index IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_trgg := NEW.society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                                  '17451cf3-f499-4aa3-83d7-c206149838c4');
  -- Directory / organizer hand-set TRGG handicap (OSS.setSocietyHandicap,
  -- SocietyOrganizerSystem/AdminSystem.saveUserEdits all write MANUAL).
  v_is_manual_edit := v_is_trgg
    AND upper(COALESCE(NEW.calculation_method,'')) = 'MANUAL';

  IF NOT (v_is_manual_edit
       OR upper(COALESCE(NEW.calculation_method,'')) LIKE 'TRGG%'
       OR upper(COALESCE(NEW.calculation_method,'')) LIKE '%MASTERSCORE%') THEN
    RETURN NEW;
  END IF;

  SELECT calculation_method INTO v_uni_method
  FROM public.society_handicaps
  WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;

  -- A MANUAL-pinned universal blocks IMPORT cascades only. A MANUAL TRGG edit
  -- goes through: the pin keeps its method, the value follows the edit.
  IF v_uni_method IS NOT NULL AND upper(v_uni_method) = 'MANUAL'
     AND NOT v_is_manual_edit THEN
    -- ...but the TRGG master number itself still syncs (different field).
    IF v_is_trgg THEN
      UPDATE public.user_profiles
      SET trgg_handicap = NEW.handicap_index, updated_at = NOW()
      WHERE line_user_id = NEW.golfer_id
        AND trgg_handicap IS DISTINCT FROM NEW.handicap_index;
    END IF;
    RETURN NEW;
  END IF;

  IF v_uni_method IS NULL THEN
    INSERT INTO public.society_handicaps (
      golfer_id, society_id, handicap_index, rounds_count,
      rounds_since_adjustment, last_calculated_at, calculation_method
    ) VALUES (NEW.golfer_id, NULL, NEW.handicap_index, 0, 0, NOW(), 'ANCHORED');
  ELSE
    UPDATE public.society_handicaps
    SET handicap_index = NEW.handicap_index,
        last_calculated_at = NOW(),
        updated_at = NOW(),
        rounds_since_adjustment = 0
    WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;
  END IF;

  UPDATE public.user_profiles
  SET handicap_index = NEW.handicap_index,
      trgg_handicap = CASE WHEN v_is_trgg THEN NEW.handicap_index ELSE trgg_handicap END,
      profile_data = jsonb_set(
        COALESCE(profile_data, '{}'::jsonb)
          || jsonb_build_object('handicap', NEW.handicap_index),
        '{golfInfo}',
        COALESCE(profile_data->'golfInfo', '{}'::jsonb)
          || jsonb_build_object('handicap', NEW.handicap_index,
                                'lastHandicapUpdate', NOW())
      ),
      updated_at = NOW()
  WHERE line_user_id = NEW.golfer_id;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Part 2: round engine — v556 scramble gate restored + MANUAL TRGG = authority
-- (body = live prod source 2026-09-01 with exactly those two edits)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_update_society_handicaps_on_round()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_society RECORD;
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
  v_is_scramble BOOLEAN;
  v_soc_method TEXT;
  v_uni_value DECIMAL;
  v_uni_method TEXT;
  v_anchor DECIMAL;
  v_anchor_src TEXT;
  v_new_universal DECIMAL;
  v_method TEXT;
  v_diff DECIMAL;
  v_cr DECIMAL;
  v_slope DECIMAL;
  v_stb DECIMAL;
  v_total_rounds INTEGER;
  v_adj_gross INTEGER;
  v_locked_hcp DECIMAL;
BEGIN
  IF NOT ( (TG_OP = 'INSERT' AND NEW.status = 'completed')
        OR (TG_OP = 'UPDATE' AND NEW.status = 'completed'
            AND OLD.status IS DISTINCT FROM 'completed') ) THEN
    RETURN NEW;
  END IF;

  IF NEW.total_gross IS NULL OR COALESCE(NEW.holes_played, 18) < 9 THEN
    RETURN NEW;
  END IF;

  -- v556 gate (regressed by the 2026-08-18 rewrite which was based on the v536
  -- FILE): Live Scoring writes a bare "scramble": null key into game_config on
  -- EVERY round, so ::text LIKE matches non-scrambles. Only a real value counts.
  v_is_scramble := (
    NEW.scoring_formats::text ILIKE '%scramble%'
    OR COALESCE(NEW.game_config->>'scramble', 'false') NOT IN ('false', 'null')
  );
  IF v_is_scramble THEN
    RETURN NEW;
  END IF;

  ------------------------------------------------------------------
  -- SOCIETY HANDICAPS: WHS 8-of-20 per society round (unchanged),
  -- but locked rows (MANUAL / TRGG / masterscore) are never touched.
  ------------------------------------------------------------------
  FOR v_society IN
    SELECT DISTINCT society_id
    FROM (
      SELECT NEW.primary_society_id AS society_id
      WHERE NEW.primary_society_id IS NOT NULL
      UNION
      SELECT rs.society_id
      FROM public.round_societies rs
      WHERE rs.round_id = NEW.id
    ) AS all_societies
    WHERE society_id IS NOT NULL
  LOOP
    SELECT calculation_method INTO v_soc_method
    FROM public.society_handicaps
    WHERE golfer_id = NEW.golfer_id AND society_id = v_society.society_id;

    IF v_soc_method IS NOT NULL AND (
         upper(v_soc_method) = 'MANUAL'
      OR upper(v_soc_method) LIKE 'TRGG%'
      OR upper(v_soc_method) LIKE '%MASTERSCORE%'
    ) THEN
      RAISE NOTICE '[Handicap] Society % is locked (%) — skipping', v_society.society_id, v_soc_method;
      CONTINUE;
    END IF;

    SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_society_handicap_index(NEW.golfer_id, v_society.society_id);

    IF v_new_handicap IS NOT NULL THEN
      PERFORM update_society_handicap(
        NEW.golfer_id, v_society.society_id, v_new_handicap,
        v_rounds_used, v_all_diffs, v_best_diffs
      );
    END IF;
  END LOOP;

  ------------------------------------------------------------------
  -- UNIVERSAL HANDICAP
  ------------------------------------------------------------------
  SELECT handicap_index, calculation_method INTO v_uni_value, v_uni_method
  FROM public.society_handicaps
  WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;

  -- Locked universal (MANUAL / TRGG-only / masterscore): hands off entirely
  IF v_uni_method IS NOT NULL AND (
       upper(v_uni_method) = 'MANUAL'
    OR upper(v_uni_method) LIKE 'TRGG%'
    OR upper(v_uni_method) LIKE '%MASTERSCORE%'
  ) THEN
    RETURN NEW;
  END IF;

  -- 2026-08-18 (Pete): a locked TRGG/masterscore society hcp is the PRIMARY —
  -- the universal mirrors it verbatim; drift only applies when no locked row.
  SELECT handicap_index INTO v_locked_hcp
  FROM public.society_handicaps
  WHERE golfer_id = NEW.golfer_id
    AND society_id IS NOT NULL
    AND handicap_index IS NOT NULL
    AND (upper(COALESCE(calculation_method,'')) LIKE 'TRGG%'
      OR upper(COALESCE(calculation_method,'')) LIKE '%MASTERSCORE%'
      -- 2026-09-01: a MANUAL (directory-set) TRGG row is authority too
      OR (upper(COALESCE(calculation_method,'')) = 'MANUAL'
          AND society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                             '17451cf3-f499-4aa3-83d7-c206149838c4')))
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  -- Anchor: existing universal -> round's society hcp -> any society hcp -> profile
  v_anchor := v_uni_value;
  v_anchor_src := 'universal';

  IF v_anchor IS NULL AND NEW.primary_society_id IS NOT NULL THEN
    SELECT handicap_index INTO v_anchor
    FROM public.society_handicaps
    WHERE golfer_id = NEW.golfer_id
      AND society_id = NEW.primary_society_id
      AND handicap_index IS NOT NULL;
    v_anchor_src := 'society';
  END IF;

  IF v_anchor IS NULL THEN
    SELECT handicap_index INTO v_anchor
    FROM public.society_handicaps
    WHERE golfer_id = NEW.golfer_id
      AND society_id IS NOT NULL
      AND handicap_index IS NOT NULL
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
    v_anchor_src := 'society';
  END IF;

  IF v_anchor IS NULL THEN
    SELECT COALESCE(
             up.handicap_index,
             CASE WHEN up.profile_data->'golfInfo'->>'handicap' ~ '^[+-]?[0-9]+(\.[0-9]+)?$'
                  THEN (up.profile_data->'golfInfo'->>'handicap')::numeric END,
             CASE WHEN up.profile_data->>'handicap' ~ '^[+-]?[0-9]+(\.[0-9]+)?$'
                  THEN (up.profile_data->>'handicap')::numeric END
           )
    INTO v_anchor
    FROM public.user_profiles up
    WHERE up.line_user_id = NEW.golfer_id;
    v_anchor_src := 'profile';
  END IF;

  SELECT count(*) INTO v_total_rounds
  FROM public.rounds
  WHERE golfer_id = NEW.golfer_id
    AND status = 'completed'
    AND total_gross IS NOT NULL
    AND tee_marker IS NOT NULL;

  IF v_locked_hcp IS NOT NULL THEN
    -- MIRROR MODE: locked TRGG/masterscore value IS the universal. No drift.
    v_new_universal := v_locked_hcp;
    v_method := 'ANCHORED';
    v_rounds_used := v_total_rounds;
    v_all_diffs := '[]'::jsonb;
    v_best_diffs := '[]'::jsonb;
  ELSIF v_anchor IS NULL THEN
    -- True beginner (no handicap anywhere): bootstrap from round data
    SELECT * INTO v_new_universal, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_society_handicap_index(NEW.golfer_id, NULL);

    IF v_new_universal IS NULL THEN
      RETURN NEW;  -- nothing computable (no ratings) and no anchor: leave alone
    END IF;
    v_method := 'WHS-8of20';
  ELSE
    -- ANCHORED MODE: work off the anchor (permanent — no WHS takeover)
    v_new_universal := v_anchor;
    v_method := 'ANCHORED';
    v_rounds_used := v_total_rounds;

    -- This round's differential (only if ratings exist for the tee played)
    v_diff := NULL;
    IF NEW.tee_marker IS NOT NULL THEN
      SELECT * INTO v_cr, v_slope
      FROM get_course_rating_for_tee(NEW.course_id, NEW.tee_marker);
      IF v_cr IS NOT NULL AND v_slope IS NOT NULL AND v_slope > 0 THEN
        v_adj_gross := CASE WHEN COALESCE(NEW.holes_played, 18) = 9
                            THEN NEW.total_gross * 2 ELSE NEW.total_gross END;
        v_diff := calculate_score_differential(v_adj_gross, v_cr, v_slope);
      END IF;
    END IF;

    -- Effective stableford: correct for playing off a different hcp than anchor
    v_stb := NULLIF(NEW.total_stableford, 0);
    IF v_stb IS NOT NULL AND COALESCE(NEW.holes_played, 18) = 9 THEN
      v_stb := v_stb * 2;
    END IF;
    IF v_stb IS NOT NULL AND NEW.handicap_used IS NOT NULL THEN
      v_stb := v_stb - (NEW.handicap_used - v_anchor);
    END IF;

    IF v_stb IS NOT NULL AND v_stb >= 41 THEN
      v_new_universal := v_anchor - 2.0;
    ELSIF v_stb IS NOT NULL AND v_stb >= 40 THEN
      v_new_universal := v_anchor - 1.0;
    ELSIF v_diff IS NOT NULL AND (v_anchor - v_diff) >= 6 THEN
      v_new_universal := v_anchor - 2.0;
    ELSIF v_diff IS NOT NULL AND (v_anchor - v_diff) >= 5 THEN
      v_new_universal := v_anchor - 1.0;
    ELSIF v_diff IS NOT NULL AND v_diff > (v_anchor + 3) THEN
      v_new_universal := v_anchor + 0.1;
    END IF;

    v_new_universal := GREATEST(-10.0, LEAST(54.0, v_new_universal));
    v_all_diffs := COALESCE(to_jsonb(ARRAY[v_diff]), '[]'::jsonb);
    v_best_diffs := v_all_diffs;
  END IF;

  -- Write universal (DELETE+INSERT: unique index uses COALESCE)
  DELETE FROM public.society_handicaps
  WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;

  INSERT INTO public.society_handicaps (
    golfer_id, society_id, handicap_index, rounds_count,
    rounds_since_adjustment, last_calculated_at, calculation_method
  ) VALUES (
    NEW.golfer_id, NULL, v_new_universal, COALESCE(v_rounds_used, 0),
    0, NOW(), v_method
  );

  -- Profile mirrors the universal (single writer for the displayed number)
  UPDATE public.user_profiles
  SET handicap_index = v_new_universal,
      profile_data = jsonb_set(
        COALESCE(profile_data, '{}'::jsonb)
          || jsonb_build_object('handicap', v_new_universal),
        '{golfInfo}',
        COALESCE(profile_data->'golfInfo', '{}'::jsonb)
          || jsonb_build_object('handicap', v_new_universal,
                                'lastHandicapUpdate', NOW())
      ),
      updated_at = NOW()
  WHERE line_user_id = NEW.golfer_id;

  -- Audit trail
  INSERT INTO public.handicap_history (
    golfer_id, old_handicap, new_handicap, change, round_id,
    differentials, rounds_used, best_differentials, calculated_at
  ) VALUES (
    NEW.golfer_id, v_uni_value, v_new_universal,
    v_new_universal - COALESCE(v_uni_value, v_new_universal),
    NEW.id, COALESCE(v_all_diffs, '[]'::jsonb), COALESCE(v_rounds_used, 0),
    COALESCE(v_best_diffs, '[]'::jsonb), NOW()
  );

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Part 3: backfill — fire the cascade for every MANUAL TRGG row
-- ---------------------------------------------------------------------------
UPDATE public.society_handicaps
SET handicap_index = handicap_index, updated_at = NOW()
WHERE society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                    '17451cf3-f499-4aa3-83d7-c206149838c4')
  AND upper(COALESCE(calculation_method,'')) = 'MANUAL'
  AND handicap_index IS NOT NULL;
