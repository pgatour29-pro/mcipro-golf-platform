-- ============================================================================
-- UNIVERSAL HANDICAP: ANCHORED, NEVER FROM SCRATCH (v535, 2026-07-12)
-- ----------------------------------------------------------------------------
-- Pete's rule: the universal handicap never starts from scratch. It seeds from
-- the player's original/only handicap (society hcp, else profile hcp) and works
-- off that anchor incrementally. From-scratch WHS is used ONLY when the player
-- has no handicap anywhere (true beginner) or has a full 20-round sample.
--
-- Trigger case: Kyungtae Kim (JOA 3.9 manual) got universal 11.2 + profile 13.2
-- from just 2 rounds because three writers each recomputed from scratch:
--   1. this rounds trigger (WHS from 2 rounds, no lock checks, NULL-clobber)
--   2. scorecard trigger -> calculate_handicap_index -> profile 13.2
--   3. client adjustHandicapAfterRound (WHS-8of20 from scratch)
-- This migration makes the rounds trigger the SINGLE authoritative writer,
-- drops the scorecard trigger, and the client is demoted to read+sync (v535).
--
-- New universal algorithm (per completed round, counted exactly once):
--   anchor = existing universal value
--            else round's primary society hcp / most recent society hcp
--            else profile handicap (handicap_index or golfInfo.handicap)
--   if universal row is locked (MANUAL / TRGG% / %MASTERSCORE%): hands off
--   if no anchor OR >= 20 counted rounds: WHS 8-of-20 (method WHS-8of20)
--   else (anchored mode, method ANCHORED):
--     stableford >= 41 (effective)  -> anchor - 2.0   (exceptional, GPR tier 2)
--     stableford >= 40 (effective)  -> anchor - 1.0   (GPR tier 1)
--     differential <= anchor - 6    -> anchor - 2.0   (stroke-play GPR tier 2)
--     differential <= anchor - 5    -> anchor - 1.0   (stroke-play GPR tier 1)
--     differential >  anchor + 3    -> anchor + 0.1   (above buffer: slow drift)
--     otherwise                     -> anchor          (buffer zone: no change)
--   effective stableford corrects for rounds played off a different handicap
--   than the anchor (prevents false cuts when playing off an inflated hcp).
--
-- Society handicaps: unchanged WHS 8-of-20, but now the DB ALSO respects the
-- lock (MANUAL / TRGG / masterscore) that until now only the client enforced.
-- Non-society rounds never touch society handicaps (unchanged).
--
-- Profile sync: user_profiles.handicap_index + profile_data.handicap +
-- profile_data.golfInfo.handicap always mirror the universal (single writer).
-- ============================================================================

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
BEGIN
  -- Count each round exactly ONCE: INSERT as completed, or transition to
  -- completed. Re-fires (e.g. gross corrections on completed rounds) must NOT
  -- re-apply the incremental adjustment.
  IF NOT ( (TG_OP = 'INSERT' AND NEW.status = 'completed')
        OR (TG_OP = 'UPDATE' AND NEW.status = 'completed'
            AND OLD.status IS DISTINCT FROM 'completed') ) THEN
    RETURN NEW;
  END IF;

  IF NEW.total_gross IS NULL OR COALESCE(NEW.holes_played, 18) < 9 THEN
    RETURN NEW;
  END IF;

  -- Scramble rounds never adjust handicaps
  v_is_scramble := (
    NEW.scoring_formats::text LIKE '%scramble%'
    OR (NEW.game_config IS NOT NULL AND NEW.game_config::text LIKE '%scramble%')
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
  -- UNIVERSAL HANDICAP: anchored, incremental
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

  IF v_anchor IS NULL OR v_total_rounds >= 20 THEN
    -- True beginner (no handicap anywhere) or full WHS sample: compute from data
    SELECT * INTO v_new_universal, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_society_handicap_index(NEW.golfer_id, NULL);

    IF v_new_universal IS NULL THEN
      RETURN NEW;  -- nothing computable (no ratings) and no anchor: leave alone
    END IF;
    v_method := 'WHS-8of20';
  ELSE
    -- ANCHORED MODE: work off the anchor
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

-- ----------------------------------------------------------------------------
-- Kill the second from-scratch writer: the scorecard trigger wrote profile
-- golfInfo.handicap via calculate_handicap_index (best-N of last 5, no anchor,
-- no locks) — this is what put 13.2 on Kyungtae Kim's profile. The rounds
-- trigger above now owns the profile sync.
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_auto_update_handicap_scorecard ON public.scorecards;

-- ----------------------------------------------------------------------------
-- DATA FIX: Kyungtae Kim (U657c6033b696a24ed75b16158ea4f535)
-- JOA manual 3.9 is his original/only handicap. Reseed universal + profile.
-- ----------------------------------------------------------------------------
DELETE FROM public.society_handicaps
WHERE golfer_id = 'U657c6033b696a24ed75b16158ea4f535' AND society_id IS NULL;

INSERT INTO public.society_handicaps (
  golfer_id, society_id, handicap_index, rounds_count,
  rounds_since_adjustment, last_calculated_at, calculation_method
) VALUES (
  'U657c6033b696a24ed75b16158ea4f535', NULL, 3.9, 2, 0, NOW(), 'ANCHORED'
);

UPDATE public.user_profiles
SET handicap_index = 3.9,
    profile_data = jsonb_set(
      COALESCE(profile_data, '{}'::jsonb) || jsonb_build_object('handicap', 3.9),
      '{golfInfo}',
      COALESCE(profile_data->'golfInfo', '{}'::jsonb)
        || jsonb_build_object('handicap', 3.9)
    ),
    updated_at = NOW()
WHERE line_user_id = 'U657c6033b696a24ed75b16158ea4f535';

INSERT INTO public.handicap_history (
  golfer_id, old_handicap, new_handicap, change, round_id,
  differentials, rounds_used, best_differentials, calculated_at
) VALUES (
  'U657c6033b696a24ed75b16158ea4f535', 13.2, 3.9, -9.3, NULL,
  '[]'::jsonb, 2, '[]'::jsonb, NOW()
);

-- ----------------------------------------------------------------------------
-- HARDEN sync_handicap_to_profile (trigger on society_handicaps):
-- jsonb_set is STRICT — syncing a NULL handicap_index wiped the player's
-- ENTIRE profile_data. Skip NULLs (the old trigger's counter branch used to
-- write NULL universal rows; the new engine never does, but manual paths can).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_handicap_to_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only sync UNIVERSAL handicap (society_id IS NULL) to profile
    IF NEW.society_id IS NULL AND NEW.handicap_index IS NOT NULL THEN
        UPDATE user_profiles
        SET profile_data = jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{golfInfo,handicap}',
            to_jsonb(NEW.handicap_index::text)
        ),
        updated_at = NOW()
        WHERE line_user_id = NEW.golfer_id;
    END IF;

    RETURN NEW;
END;
$function$;
