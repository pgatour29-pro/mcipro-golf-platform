-- 2026-09-18 (Pete): "scrambles, 3 man waltz or any team events does not affect the handicap system".
-- The DB only knew SCRAMBLE: the round trigger + calculate_society_handicap_index skipped scramble, but a
-- 3-Man Waltz round (scoring_formats ["stableford","waltz"], no team_size / scramble_config) went straight
-- into the 8-of-20 window and the universal drift (Jul/Aug waltz rounds bumped universals +0.1 before the
-- TRGG mirror mode masked it). ONE rule now — public.is_team_round() — and every handicap path uses it:
--   trigger auto_update_society_handicaps_on_round (skips the round outright), and the calculators
--   calculate_society_handicap_index / calculate_whs_handicap_index / calculate_society_hcp /
--   calculate_universal_hcp / calculate_handicap_index (team rounds never enter the window).
-- (auto_update_handicaps_on_society_change + recalculate_all_* only CALL these calculators → covered.)
-- Function bodies are the LIVE prosrc with surgical inserts (never re-authored from repo files).
-- Writes NO handicap: CREATE OR REPLACE only. Self-check at the end raises → whole file rolls back.

create or replace function public.is_team_round(p_scoring_formats jsonb, p_team_size integer, p_scramble_config jsonb,
                                                p_game_config jsonb, p_society_event_id uuid)
returns boolean language sql stable set search_path = public as $fn$
  select coalesce(p_team_size, 1) > 1
      or (p_scramble_config is not null and jsonb_typeof(p_scramble_config) <> 'null')
      or coalesce(p_scoring_formats::text, '') ~* '(scramble|waltz|shamble|fourball|four_ball|foursome|greensome|pinehurst|chapman|bestball|best_ball|betterball|better_ball|ryder|team)'
      or coalesce((p_game_config->'formats')::text, '') ~* '(scramble|waltz|shamble|fourball|four_ball|foursome|greensome|pinehurst|chapman|bestball|best_ball|betterball|better_ball|ryder|team)'
      or coalesce(p_game_config->>'scramble', 'false') not in ('false', 'null')
      or coalesce(p_game_config->>'waltz', 'false') not in ('false', 'null')
      -- backstop: a round posted into a team EVENT counts as team even if the phone lost the format tick
      or exists (select 1 from public.society_events e
                  where e.id = p_society_event_id
                    and (coalesce(e.title, '') ~* '(scramble|waltz|shamble|best ?ball|better ?ball|four ?ball|foursome|greensome|pinehurst|chapman|ryder cup)'
                      or coalesce(e.format, '') ~* '(scramble|waltz|shamble|fourball|foursome|greensome|pinehurst|chapman|bestball|betterball|ryder|team)'));
$fn$;
grant execute on function public.is_team_round(jsonb, integer, jsonb, jsonb, uuid) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.auto_update_society_handicaps_on_round()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  -- 2026-09-18: ANY team round (scramble, 3-man waltz, team formats, team events) never touches a
  -- handicap — one rule, public.is_team_round (was scramble-only; waltz rounds were counted).
  v_is_scramble := public.is_team_round(NEW.scoring_formats, NEW.team_size, NEW.scramble_config,
                                        NEW.game_config, NEW.society_event_id);
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

CREATE OR REPLACE FUNCTION public.calculate_society_handicap_index(p_golfer_id text, p_society_id uuid, OUT new_handicap_index numeric, OUT rounds_used integer, OUT all_differentials jsonb, OUT best_differentials jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_best_avg DECIMAL;
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_to_use INTEGER;
  v_adjustment DECIMAL := 0;
  v_best_diffs DECIMAL[];
  v_max_rounds INTEGER;
BEGIN
  -- Both universal and society use best 8 of last 20 rounds (WHS standard)
  v_max_rounds := 20;

  -- Get completed rounds
  FOR v_round IN
    SELECT
      r.id,
      r.total_gross,
      r.course_id,
      r.tee_marker,
      r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND r.total_gross IS NOT NULL
      AND r.tee_marker IS NOT NULL
      -- v1253 (2026-09-18): a scramble round is the TEAM's score — never one of this golfer's
      -- differentials (the trigger already skips the scramble round itself; this keeps it out of
      -- the window when a LATER round recomputes). Same detection as the trigger, plus the
      -- explicit team markers the app stamps on both teammates' rows.
      AND COALESCE(r.team_size, 1) <= 1
      AND r.scramble_config IS NULL
      AND NOT (r.scoring_formats::text ILIKE '%scramble%')
      AND COALESCE(r.game_config->>'scramble', 'false') IN ('false', 'null')
      AND NOT public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)  -- 2026-09-18: waltz + every team round
      AND (
        p_society_id IS NULL
        OR
        (
          r.primary_society_id = p_society_id
          OR EXISTS (
            SELECT 1 FROM public.round_societies rs
            WHERE rs.round_id = r.id
              AND rs.society_id = p_society_id
          )
        )
      )
    ORDER BY r.completed_at DESC
    LIMIT v_max_rounds
  LOOP
    -- Get course rating and slope rating for the tee played
    SELECT * INTO v_course_rating, v_slope_rating
    FROM get_course_rating_for_tee(v_round.course_id, v_round.tee_marker);

    -- Calculate score differential
    v_differential := calculate_score_differential(
      v_round.total_gross,
      v_course_rating,
      v_slope_rating
    );

    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  -- Count rounds
  rounds_used := array_length(v_differentials, 1);

  IF rounds_used IS NULL OR rounds_used = 0 THEN
    new_handicap_index := NULL;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);

  -- WHS 8-of-20 adjustment table (same for universal and society)
  CASE
    WHEN rounds_used >= 20 THEN v_num_to_use := 8; v_adjustment := 0;
    WHEN rounds_used = 19 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN rounds_used = 18 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN rounds_used = 17 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN rounds_used = 16 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN rounds_used = 15 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN rounds_used = 14 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN rounds_used = 13 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN rounds_used = 12 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN rounds_used = 11 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN rounds_used = 10 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN rounds_used = 9 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN rounds_used = 8 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN rounds_used = 7 THEN v_num_to_use := 2; v_adjustment := 0;
    WHEN rounds_used = 6 THEN v_num_to_use := 2; v_adjustment := -1.0;
    WHEN rounds_used = 5 THEN v_num_to_use := 1; v_adjustment := 0;
    WHEN rounds_used = 4 THEN v_num_to_use := 1; v_adjustment := -1.0;
    WHEN rounds_used = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
    ELSE v_num_to_use := 1; v_adjustment := -2.0;
  END CASE;

  -- Sort and get best N differentials
  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff
    ORDER BY diff ASC
    LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  -- Calculate average of best differentials
  SELECT AVG(d) INTO v_best_avg
  FROM unnest(v_best_diffs) AS d;

  -- Apply WHS 0.96 multiplier + adjustment
  new_handicap_index := ROUND((v_best_avg * 0.96) + v_adjustment, 1);

  -- Cap at WHS limits (-10.0 to 54.0)
  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_whs_handicap_index(p_golfer_id text, p_society_id uuid DEFAULT NULL::uuid, OUT new_handicap_index numeric, OUT rounds_used integer, OUT all_differentials jsonb, OUT best_differentials jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_rounds INTEGER;
  v_num_to_use INTEGER;
  v_adjustment DECIMAL := 0;
  v_avg DECIMAL;
  v_best_diffs DECIMAL[];
BEGIN
  -- Get last 20 completed rounds - ALL rounds regardless of society (standard WHS)
  FOR v_round IN
    SELECT r.id, r.total_gross, r.course_id, r.tee_marker, r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND r.total_gross IS NOT NULL
      AND r.tee_marker IS NOT NULL
      -- Exclude ACTUAL scramble rounds only (not "scramble": null in game_config)
      AND NOT (r.scoring_formats @> '["scramble"]'::jsonb)
      AND NOT (r.game_config IS NOT NULL
               AND jsonb_typeof(r.game_config->'scramble') = 'object')
      AND NOT public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)  -- 2026-09-18: waltz + every team round
    ORDER BY r.completed_at DESC
    LIMIT 20
  LOOP
    SELECT
      COALESCE(
        (SELECT (t->>'rating')::DECIMAL
         FROM courses c, jsonb_array_elements(c.tees) AS t
         WHERE c.id = v_round.course_id
           AND LOWER(t->>'name') = LOWER(v_round.tee_marker)
         LIMIT 1),
        72.0
      ),
      COALESCE(
        (SELECT (t->>'slope')::DECIMAL
         FROM courses c, jsonb_array_elements(c.tees) AS t
         WHERE c.id = v_round.course_id
           AND LOWER(t->>'name') = LOWER(v_round.tee_marker)
         LIMIT 1),
        113.0
      )
    INTO v_course_rating, v_slope_rating;

    v_differential := (v_round.total_gross - v_course_rating) * 113.0 / v_slope_rating;
    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  v_num_rounds := array_length(v_differentials, 1);

  IF v_num_rounds IS NULL OR v_num_rounds = 0 THEN
    new_handicap_index := NULL;
    rounds_used := 0;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);
  rounds_used := v_num_rounds;

  CASE
    WHEN v_num_rounds >= 20 THEN v_num_to_use := 8; v_adjustment := 0;
    WHEN v_num_rounds = 19 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN v_num_rounds = 18 THEN v_num_to_use := 7; v_adjustment := 0;
    WHEN v_num_rounds = 17 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN v_num_rounds = 16 THEN v_num_to_use := 6; v_adjustment := 0;
    WHEN v_num_rounds = 15 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN v_num_rounds = 14 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN v_num_rounds = 13 THEN v_num_to_use := 5; v_adjustment := 0;
    WHEN v_num_rounds = 12 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN v_num_rounds = 11 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN v_num_rounds = 10 THEN v_num_to_use := 4; v_adjustment := 0;
    WHEN v_num_rounds = 9 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN v_num_rounds = 8 THEN v_num_to_use := 3; v_adjustment := 0;
    WHEN v_num_rounds = 7 THEN v_num_to_use := 2; v_adjustment := 0;
    WHEN v_num_rounds = 6 THEN v_num_to_use := 2; v_adjustment := -1.0;
    WHEN v_num_rounds = 5 THEN v_num_to_use := 1; v_adjustment := 0;
    WHEN v_num_rounds = 4 THEN v_num_to_use := 1; v_adjustment := -1.0;
    WHEN v_num_rounds = 3 THEN v_num_to_use := 1; v_adjustment := -2.0;
    ELSE v_num_to_use := 1; v_adjustment := -2.0;
  END CASE;

  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff
    ORDER BY diff ASC
    LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  SELECT AVG(d) INTO v_avg
  FROM unnest(v_best_diffs) AS d;

  new_handicap_index := ROUND((v_avg * 0.96) + v_adjustment, 1);

  IF new_handicap_index < -10.0 THEN
    new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_society_hcp(p_golfer_id text, p_society_id uuid, OUT new_handicap_index numeric, OUT rounds_used integer, OUT all_differentials jsonb, OUT best_differentials jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_rounds INTEGER;
  v_num_to_use INTEGER;
  v_avg DECIMAL;
  v_best_diffs DECIMAL[];
BEGIN
  FOR v_round IN
    SELECT
      r.id, r.total_gross, r.course_id, r.tee_marker,
      r.course_rating AS round_cr, r.slope_rating AS round_sr,
      r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND NOT public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)  -- 2026-09-18: team rounds never count
      AND r.total_gross IS NOT NULL
      AND r.total_gross >= 40
      AND r.completed_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.round_societies rs
        WHERE rs.round_id = r.id AND rs.society_id = p_society_id
        UNION ALL
        SELECT 1 WHERE r.primary_society_id = p_society_id
      )
    ORDER BY r.completed_at DESC
    LIMIT 5
  LOOP
    SELECT g.course_rating, g.slope_rating INTO v_course_rating, v_slope_rating
    FROM get_tee_rating_from_course(v_round.course_id, v_round.tee_marker, v_round.round_cr::DECIMAL, v_round.round_sr::DECIMAL) g;

    v_differential := (v_round.total_gross - v_course_rating) * 113.0 / v_slope_rating;
    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  v_num_rounds := array_length(v_differentials, 1);

  IF v_num_rounds IS NULL OR v_num_rounds = 0 THEN
    new_handicap_index := NULL;
    rounds_used := 0;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);
  rounds_used := v_num_rounds;

  CASE
    WHEN v_num_rounds >= 5 THEN v_num_to_use := 3;
    WHEN v_num_rounds = 4 THEN v_num_to_use := 2;
    WHEN v_num_rounds = 3 THEN v_num_to_use := 2;
    ELSE v_num_to_use := 1;
  END CASE;

  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff ORDER BY diff ASC LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  SELECT AVG(d) INTO v_avg FROM unnest(v_best_diffs) AS d;

  new_handicap_index := ROUND(v_avg, 1);

  IF new_handicap_index < -10.0 THEN new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN new_handicap_index := 54.0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_universal_hcp(p_golfer_id text, OUT new_handicap_index numeric, OUT rounds_used integer, OUT all_differentials jsonb, OUT best_differentials jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
  v_num_rounds INTEGER;
  v_num_to_use INTEGER;
  v_avg DECIMAL;
  v_best_diffs DECIMAL[];
BEGIN
  FOR v_round IN
    SELECT
      r.id, r.total_gross, r.course_id, r.tee_marker,
      r.course_rating AS round_cr, r.slope_rating AS round_sr,
      r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND NOT public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)  -- 2026-09-18: team rounds never count
      AND r.total_gross IS NOT NULL
      AND r.total_gross >= 40
      AND r.completed_at IS NOT NULL
    ORDER BY r.completed_at DESC
    LIMIT 20
  LOOP
    SELECT g.course_rating, g.slope_rating INTO v_course_rating, v_slope_rating
    FROM get_tee_rating_from_course(v_round.course_id, v_round.tee_marker, v_round.round_cr::DECIMAL, v_round.round_sr::DECIMAL) g;

    v_differential := (v_round.total_gross - v_course_rating) * 113.0 / v_slope_rating;
    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  v_num_rounds := array_length(v_differentials, 1);

  IF v_num_rounds IS NULL OR v_num_rounds = 0 THEN
    new_handicap_index := NULL;
    rounds_used := 0;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  all_differentials := to_jsonb(v_differentials);
  rounds_used := v_num_rounds;

  v_num_to_use := LEAST(8, v_num_rounds);

  SELECT ARRAY(
    SELECT unnest(v_differentials) AS diff ORDER BY diff ASC LIMIT v_num_to_use
  ) INTO v_best_diffs;

  best_differentials := to_jsonb(v_best_diffs);

  SELECT AVG(d) INTO v_avg FROM unnest(v_best_diffs) AS d;

  new_handicap_index := ROUND(v_avg * 0.96, 1);

  IF new_handicap_index < -10.0 THEN new_handicap_index := -10.0;
  ELSIF new_handicap_index > 54.0 THEN new_handicap_index := 54.0;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_handicap_index(p_golfer_id text, OUT new_handicap_index numeric, OUT rounds_used integer, OUT all_differentials jsonb, OUT best_differentials jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_round RECORD;
  v_differentials DECIMAL[] := ARRAY[]::DECIMAL[];
  v_best_3_avg DECIMAL;
  v_course_rating DECIMAL;
  v_slope_rating DECIMAL;
  v_differential DECIMAL;
BEGIN
  -- Get last 5 completed rounds with necessary data
  FOR v_round IN
    SELECT
      r.id,
      r.total_gross,
      r.course_id,
      r.tee_marker,
      r.completed_at
    FROM public.rounds r
    WHERE r.golfer_id = p_golfer_id
      AND r.status = 'completed'
      AND NOT public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)  -- 2026-09-18: team rounds never count
      AND r.total_gross IS NOT NULL
      AND r.tee_marker IS NOT NULL
    ORDER BY r.completed_at DESC
    LIMIT 5
  LOOP
    -- Get course rating and slope rating for the tee played
    SELECT * INTO v_course_rating, v_slope_rating
    FROM get_course_rating_for_tee(v_round.course_id, v_round.tee_marker);

    -- Calculate score differential
    v_differential := calculate_score_differential(
      v_round.total_gross,
      v_course_rating,
      v_slope_rating
    );

    -- Add to array
    v_differentials := array_append(v_differentials, v_differential);
  END LOOP;

  -- Check if we have enough rounds
  rounds_used := array_length(v_differentials, 1);

  IF rounds_used IS NULL OR rounds_used = 0 THEN
    -- No rounds found
    new_handicap_index := NULL;
    all_differentials := '[]'::JSONB;
    best_differentials := '[]'::JSONB;
    RETURN;
  END IF;

  -- Convert to JSONB for storage
  all_differentials := to_jsonb(v_differentials);

  -- WHS Calculation Rules (adapted for 5 rounds)
  IF rounds_used >= 5 THEN
    -- Use best 3 of 5 (40% like WHS uses 8/20)
    -- Sort differentials ascending and take first 3
    SELECT AVG(diff)
    INTO v_best_3_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 3
    ) AS best_3;

    -- Store best 3 for history
    SELECT jsonb_agg(diff ORDER BY diff ASC)
    INTO best_differentials
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 3
    ) AS best_3_arr;

  ELSIF rounds_used = 4 THEN
    -- Use best 2 of 4
    SELECT AVG(diff)
    INTO v_best_3_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2;

    SELECT jsonb_agg(diff ORDER BY diff ASC)
    INTO best_differentials
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2_arr;

  ELSIF rounds_used = 3 THEN
    -- Use best 2 of 3
    SELECT AVG(diff)
    INTO v_best_3_avg
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2;

    SELECT jsonb_agg(diff ORDER BY diff ASC)
    INTO best_differentials
    FROM (
      SELECT unnest(v_differentials) AS diff
      ORDER BY diff ASC
      LIMIT 2
    ) AS best_2_arr;

  ELSIF rounds_used <= 2 THEN
    -- Use best 1 (lowest differential)
    SELECT MIN(diff)
    INTO v_best_3_avg
    FROM unnest(v_differentials) AS diff;

    SELECT jsonb_agg(v_best_3_avg) INTO best_differentials;
  END IF;

  -- Apply WHS 0.96 multiplier
  new_handicap_index := ROUND(v_best_3_avg * 0.96, 1);

  -- Cap handicap at reasonable limits (0 to 54.0)
  IF new_handicap_index < 0 THEN
    new_handicap_index := 0.0;
  ELSIF new_handicap_index > 54.0 THEN
    new_handicap_index := 54.0;
  END IF;

END;
$function$;


-- self-check (raises → full rollback)
do $chk$
declare n_bad int; n_fn int;
begin
  -- every known team round is caught: all scramble/waltz-marked rounds + every round of a team event
  select count(*) into n_bad from public.rounds r
   where (r.scoring_formats::text ~* 'scramble|waltz' or coalesce(r.team_size,1) > 1 or r.scramble_config is not null)
     and not public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id);
  if n_bad > 0 then raise exception 'is_team_round misses % marked team rounds', n_bad; end if;
  -- no individual format is flagged: rounds with no team marker AND no team event must all be false
  select count(*) into n_bad from public.rounds r
   where not (r.scoring_formats::text ~* 'scramble|waltz' or coalesce(r.team_size,1) > 1 or r.scramble_config is not null)
     and r.society_event_id is null
     and public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id);
  if n_bad > 0 then raise exception 'is_team_round flags % individual casual rounds', n_bad; end if;
  -- all 6 functions now carry the rule
  select count(*) into n_fn from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.prosrc like '%is_team_round%'
     and p.proname in ('auto_update_society_handicaps_on_round','calculate_society_handicap_index','calculate_whs_handicap_index',
                       'calculate_society_hcp','calculate_universal_hcp','calculate_handicap_index');
  if n_fn <> 6 then raise exception 'only % of 6 handicap functions carry is_team_round', n_fn; end if;
  -- calculators still run
  perform * from public.calculate_society_handicap_index('U2b6d976f19bca4b2f4374ae0e10ed873', null);
  perform * from public.calculate_whs_handicap_index('U2b6d976f19bca4b2f4374ae0e10ed873');
  perform * from public.calculate_society_hcp('U2b6d976f19bca4b2f4374ae0e10ed873', '7c0e4b72-d925-44bc-afda-38259a7ba346');
  perform * from public.calculate_universal_hcp('U2b6d976f19bca4b2f4374ae0e10ed873');
  perform * from public.calculate_handicap_index('U2b6d976f19bca4b2f4374ae0e10ed873');
end $chk$;

select (select count(*) from public.rounds r where status='completed'
          and public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)) as team_rounds_excluded,
       (select count(*) from public.rounds r where status='completed' and r.scoring_formats::text ilike '%waltz%'
          and public.is_team_round(r.scoring_formats, r.team_size, r.scramble_config, r.game_config, r.society_event_id)) as waltz_excluded;
