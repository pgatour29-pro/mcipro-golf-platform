-- =====================================================================================
-- UNIVERSAL HANDICAP = LOWEST RECORDED ACROSS ANY SOURCE   (2026-09-12, Pete's spec)
-- =====================================================================================
-- Pete: "universal hcp is for those playing in no-society events and general tournaments
--        otherwise, where the events will require a golfer to play with their lowest
--        recorded hcp across any platform."
--
-- This SUPERSEDES the 2026-08-18 "universal MIRRORS the locked TRGG row" behaviour. The
-- old function only cascaded when the incoming row's method was TRGG%/%MASTERSCORE%/
-- MANUAL-on-TRGG, so JOA and JGTS numbers never reached the universal at all, and it
-- assigned the TRGG value outright rather than taking a minimum.
--
-- MEASURED LIVE BEFORE THIS CHANGE (1227 golfers with a universal + >=1 society row):
--    1214  universal already equals their lowest society handicap
--      10  universal is LOWER than every society row (engine-computed) -- a strict
--          `universal = MIN(society rows)` would RAISE these, which would break the rule,
--          which is why this uses LEAST (ratchet DOWN) and never a plain assignment
--       3  universal is HIGHER than one of their society rows  <-- the actual defect
--          U76cbc333... uni 9.6 vs JOA 8.6 | player_1776739271311 uni 13.1 vs TRGG 12.5
--          U657c6033... uni 4.1 vs JOA 3.9
--
-- RULES:
--   * A MANUAL row is an explicit human correction and still SETS the universal, in
--     either direction -- that keeps FUCKUPS #37 ("whenever TRGG players info is adjusted
--     it needs to be updated fucking globally") working.
--   * Any COMPUTED/IMPORTED value (TRGG masterscore, WHS from ANY society) only ever
--     ratchets the universal DOWN: universal := LEAST(universal, incoming).
--   * A MANUAL-pinned universal still blocks non-manual cascades (unchanged).
--   * user_profiles now mirrors the RESULTING universal, not the incoming society value
--     (the old function copied NEW.handicap_index into the profile even when that was not
--     what the universal row ended up holding).
--   * The TRGG roster push (event_registrations + event_pairings) is unchanged and still
--     fires only for locked TRGG rows, carrying the TRGG number -- a TRGG event plays off
--     the TRGG handicap, never the universal.
--
-- NOTE the second "TRGG id" in the old function ('17451cf3-f499-4aa3-83d7-c206149838c4')
-- does not exist: society_profiles, societies, society_members, society_events and
-- society_handicaps all have ZERO rows for any 17451cf3% id. The client-side resolver
-- hardcodes a DIFFERENT dead uuid ('17451cf3-8b57-4166-af0a-dd902b7fb1af'). Both are
-- no-ops; the real TRGG id is 7c0e4b72-d925-44bc-afda-38259a7ba346. Kept here so the
-- dual-id intent is still visible, but it matches nothing.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.sync_universal_to_locked_society()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uni_method TEXT;
  v_uni_value  DECIMAL;
  v_new_uni    DECIMAL;
  v_is_trgg    BOOLEAN;
  v_is_manual  BOOLEAN;
  v_is_locked  BOOLEAN;
BEGIN
  IF NEW.society_id IS NULL OR NEW.handicap_index IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_trgg := NEW.society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                                  '17451cf3-f499-4aa3-83d7-c206149838c4');
  v_is_manual := upper(COALESCE(NEW.calculation_method,'')) = 'MANUAL';
  v_is_locked := v_is_manual
    OR upper(COALESCE(NEW.calculation_method,'')) LIKE 'TRGG%'
    OR upper(COALESCE(NEW.calculation_method,'')) LIKE '%MASTERSCORE%';

  ------------------------------------------------------------------
  -- TRGG roster push (2026-09-01, unchanged): a new locked TRGG number lands in today's
  -- and future TRGG event rosters immediately. TRGG events play off the TRGG handicap.
  ------------------------------------------------------------------
  IF v_is_trgg AND v_is_locked THEN
    UPDATE public.event_registrations er
    SET handicap = NEW.handicap_index::real
    WHERE er.player_id = NEW.golfer_id
      AND er.handicap IS DISTINCT FROM NEW.handicap_index::real
      AND er.event_id::text IN (
        SELECT se.id::text FROM public.society_events se
        WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date
          AND ( se.society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                                  '17451cf3-f499-4aa3-83d7-c206149838c4')
                OR (se.society_id IS NULL AND se.title ~* 'trgg|travellers') ));

    UPDATE public.event_pairings ep
    SET groups = (
      SELECT jsonb_agg(
        CASE
          WHEN grp ? 'players' THEN jsonb_set(grp, '{players}', (
            SELECT COALESCE(jsonb_agg(
              CASE WHEN COALESCE(p->>'playerId', p->>'id') = NEW.golfer_id
                   THEN p || jsonb_build_object('handicap', NEW.handicap_index)
                   ELSE p END ORDER BY ord), '[]'::jsonb)
            FROM jsonb_array_elements(grp->'players') WITH ORDINALITY AS t(p, ord)))
          WHEN COALESCE(grp->>'playerId', grp->>'id') = NEW.golfer_id
               THEN grp || jsonb_build_object('handicap', NEW.handicap_index)
          ELSE grp
        END ORDER BY gord)
      FROM jsonb_array_elements(ep.groups) WITH ORDINALITY AS gt(grp, gord))
    WHERE ep.groups::text LIKE '%' || NEW.golfer_id || '%'
      AND ep.event_id::text IN (
        SELECT se.id::text FROM public.society_events se
        WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date
          AND ( se.society_id IN ('7c0e4b72-d925-44bc-afda-38259a7ba346',
                                  '17451cf3-f499-4aa3-83d7-c206149838c4')
                OR (se.society_id IS NULL AND se.title ~* 'trgg|travellers') ));
  END IF;

  SELECT calculation_method, handicap_index INTO v_uni_method, v_uni_value
  FROM public.society_handicaps
  WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;

  -- A MANUAL-pinned universal blocks automatic cascades; an explicit MANUAL edit goes through.
  IF v_uni_method IS NOT NULL AND upper(v_uni_method) = 'MANUAL' AND NOT v_is_manual THEN
    IF v_is_trgg THEN
      UPDATE public.user_profiles
      SET trgg_handicap = NEW.handicap_index, updated_at = NOW()
      WHERE line_user_id = NEW.golfer_id
        AND trgg_handicap IS DISTINCT FROM NEW.handicap_index;
    END IF;
    RETURN NEW;
  END IF;

  ------------------------------------------------------------------
  -- THE RULE: the universal is the LOWEST recorded handicap across any source.
  -- MANUAL = explicit correction, assigns either way. Everything else ratchets DOWN.
  ------------------------------------------------------------------
  IF v_uni_method IS NULL THEN
    v_new_uni := NEW.handicap_index;
    INSERT INTO public.society_handicaps (
      golfer_id, society_id, handicap_index, rounds_count,
      rounds_since_adjustment, last_calculated_at, calculation_method
    ) VALUES (NEW.golfer_id, NULL, v_new_uni, 0, 0, NOW(), 'ANCHORED');
  ELSE
    v_new_uni := CASE
      WHEN v_is_manual THEN NEW.handicap_index
      ELSE LEAST(COALESCE(v_uni_value, NEW.handicap_index), NEW.handicap_index)
    END;
    IF v_new_uni IS DISTINCT FROM v_uni_value THEN
      UPDATE public.society_handicaps
      SET handicap_index = v_new_uni,
          last_calculated_at = NOW(),
          updated_at = NOW(),
          rounds_since_adjustment = 0
      WHERE golfer_id = NEW.golfer_id AND society_id IS NULL;
    END IF;
  END IF;

  -- Mirror the RESULTING universal into the profile (the old function copied the incoming
  -- society value here even when the universal row kept a different number).
  UPDATE public.user_profiles
  SET handicap_index = v_new_uni,
      trgg_handicap = CASE WHEN v_is_trgg THEN NEW.handicap_index ELSE trgg_handicap END,
      profile_data = jsonb_set(
        COALESCE(profile_data, '{}'::jsonb)
          || jsonb_build_object('handicap', v_new_uni),
        '{golfInfo}',
        COALESCE(profile_data->'golfInfo', '{}'::jsonb)
          || jsonb_build_object('handicap', v_new_uni,
                                'lastHandicapUpdate', NOW())
      ),
      updated_at = NOW()
  WHERE line_user_id = NEW.golfer_id;

  RETURN NEW;
END;
$function$;
