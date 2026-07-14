-- ============================================================================
-- v556 REPLAY: apply the universal anchored step to rounds the scramble
-- false-positive skipped (completed_at >= 2026-07-12, verified 8 rounds).
-- Logic is VERBATIM from auto_update_society_handicaps_on_round (v556),
-- NEW.* -> r.*, RETURN NEW -> CONTINUE. Locks respected. Runs in
-- chronological order so each step anchors on the previous result.
-- Society WHS recomputes afterwards (full recompute = idempotent).
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  p RECORD;
  v_new_handicap DECIMAL;
  v_rounds_used INTEGER;
  v_all_diffs JSONB;
  v_best_diffs JSONB;
  v_soc_method TEXT;
  v_uni_value DECIMAL;
  v_uni_method TEXT;
  v_anchor DECIMAL;
  v_new_universal DECIMAL;
  v_method TEXT;
  v_diff DECIMAL;
  v_cr DECIMAL;
  v_slope DECIMAL;
  v_stb DECIMAL;
  v_total_rounds INTEGER;
  v_adj_gross INTEGER;
BEGIN
  FOR r IN
    SELECT * FROM public.rounds
    WHERE status = 'completed'
      AND total_gross IS NOT NULL
      AND tee_marker IS NOT NULL
      AND COALESCE(holes_played, 18) >= 9
      AND completed_at >= '2026-07-12'
      AND NOT (
        scoring_formats::text ILIKE '%scramble%'
        OR COALESCE(game_config->>'scramble', 'false') NOT IN ('false', 'null')
      )
    ORDER BY completed_at ASC
  LOOP
    SELECT handicap_index, calculation_method INTO v_uni_value, v_uni_method
    FROM public.society_handicaps
    WHERE golfer_id = r.golfer_id AND society_id IS NULL;

    IF v_uni_method IS NOT NULL AND (
         upper(v_uni_method) = 'MANUAL'
      OR upper(v_uni_method) LIKE 'TRGG%'
      OR upper(v_uni_method) LIKE '%MASTERSCORE%'
    ) THEN
      RAISE NOTICE '[replay] % universal locked (%) — skip round %', r.golfer_id, v_uni_method, r.id;
      CONTINUE;
    END IF;

    v_anchor := v_uni_value;

    IF v_anchor IS NULL AND r.primary_society_id IS NOT NULL THEN
      SELECT handicap_index INTO v_anchor
      FROM public.society_handicaps
      WHERE golfer_id = r.golfer_id
        AND society_id = r.primary_society_id
        AND handicap_index IS NOT NULL;
    END IF;

    IF v_anchor IS NULL THEN
      SELECT handicap_index INTO v_anchor
      FROM public.society_handicaps
      WHERE golfer_id = r.golfer_id
        AND society_id IS NOT NULL
        AND handicap_index IS NOT NULL
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1;
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
      WHERE up.line_user_id = r.golfer_id;
    END IF;

    SELECT count(*) INTO v_total_rounds
    FROM public.rounds
    WHERE golfer_id = r.golfer_id
      AND status = 'completed'
      AND total_gross IS NOT NULL
      AND tee_marker IS NOT NULL;

    IF v_anchor IS NULL THEN
      SELECT * INTO v_new_universal, v_rounds_used, v_all_diffs, v_best_diffs
      FROM calculate_society_handicap_index(r.golfer_id, NULL);
      IF v_new_universal IS NULL THEN
        CONTINUE;
      END IF;
      v_method := 'WHS-8of20';
    ELSE
      v_new_universal := v_anchor;
      v_method := 'ANCHORED';
      v_rounds_used := v_total_rounds;

      v_diff := NULL;
      IF r.tee_marker IS NOT NULL THEN
        SELECT * INTO v_cr, v_slope
        FROM get_course_rating_for_tee(r.course_id, r.tee_marker);
        IF v_cr IS NOT NULL AND v_slope IS NOT NULL AND v_slope > 0 THEN
          v_adj_gross := CASE WHEN COALESCE(r.holes_played, 18) = 9
                              THEN r.total_gross * 2 ELSE r.total_gross END;
          v_diff := calculate_score_differential(v_adj_gross, v_cr, v_slope);
        END IF;
      END IF;

      v_stb := NULLIF(r.total_stableford, 0);
      IF v_stb IS NOT NULL AND COALESCE(r.holes_played, 18) = 9 THEN
        v_stb := v_stb * 2;
      END IF;
      IF v_stb IS NOT NULL AND r.handicap_used IS NOT NULL THEN
        v_stb := v_stb - (r.handicap_used - v_anchor);
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

    DELETE FROM public.society_handicaps
    WHERE golfer_id = r.golfer_id AND society_id IS NULL;

    INSERT INTO public.society_handicaps (
      golfer_id, society_id, handicap_index, rounds_count,
      rounds_since_adjustment, last_calculated_at, calculation_method
    ) VALUES (
      r.golfer_id, NULL, v_new_universal, COALESCE(v_rounds_used, 0),
      0, NOW(), v_method
    );

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
    WHERE line_user_id = r.golfer_id;

    INSERT INTO public.handicap_history (
      golfer_id, old_handicap, new_handicap, change, round_id,
      differentials, rounds_used, best_differentials, calculated_at
    ) VALUES (
      r.golfer_id, v_uni_value, v_new_universal,
      v_new_universal - COALESCE(v_uni_value, v_new_universal),
      r.id, COALESCE(v_all_diffs, '[]'::jsonb), COALESCE(v_rounds_used, 0),
      COALESCE(v_best_diffs, '[]'::jsonb), NOW()
    );

    RAISE NOTICE '[replay] % round % : % -> % (%)', r.golfer_id, r.id, v_uni_value, v_new_universal, v_method;
  END LOOP;

  -- Society WHS recomputes for the affected pairs (full recompute, idempotent)
  FOR p IN
    SELECT DISTINCT r2.golfer_id, s.society_id
    FROM public.rounds r2
    CROSS JOIN LATERAL (
      SELECT r2.primary_society_id AS society_id
      WHERE r2.primary_society_id IS NOT NULL
      UNION
      SELECT rs.society_id FROM public.round_societies rs WHERE rs.round_id = r2.id
    ) s
    WHERE r2.status = 'completed'
      AND r2.total_gross IS NOT NULL
      AND r2.tee_marker IS NOT NULL
      AND COALESCE(r2.holes_played, 18) >= 9
      AND r2.completed_at >= '2026-07-12'
      AND NOT (
        r2.scoring_formats::text ILIKE '%scramble%'
        OR COALESCE(r2.game_config->>'scramble', 'false') NOT IN ('false', 'null')
      )
      AND s.society_id IS NOT NULL
  LOOP
    SELECT calculation_method INTO v_soc_method
    FROM public.society_handicaps
    WHERE golfer_id = p.golfer_id AND society_id = p.society_id;

    IF v_soc_method IS NOT NULL AND (
         upper(v_soc_method) = 'MANUAL'
      OR upper(v_soc_method) LIKE 'TRGG%'
      OR upper(v_soc_method) LIKE '%MASTERSCORE%'
    ) THEN
      RAISE NOTICE '[replay] society % locked (%) — skip', p.society_id, v_soc_method;
      CONTINUE;
    END IF;

    SELECT * INTO v_new_handicap, v_rounds_used, v_all_diffs, v_best_diffs
    FROM calculate_society_handicap_index(p.golfer_id, p.society_id);

    IF v_new_handicap IS NOT NULL THEN
      PERFORM update_society_handicap(
        p.golfer_id, p.society_id, v_new_handicap,
        v_rounds_used, v_all_diffs, v_best_diffs
      );
    END IF;
  END LOOP;
END $$;
