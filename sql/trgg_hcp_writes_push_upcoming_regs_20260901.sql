-- ============================================================================
-- 2026-09-01 part 2 (Pete: "the players from the player directory and the
-- players from the tee sheet and everywhere else is not changing").
--
-- The morning fix (sql/manual_trgg_edit_syncs_globally_20260901.sql) made
-- directory MANUAL edits cascade to universal + profile mirrors — but every
-- EVENT surface displays the event_registrations.handicap SNAPSHOT, which was
-- only refreshed when a client happened to call sync_event_reg_handicaps
-- (tee-sheet open). Pete edited yu yubin 23→18 at 06:17; today's St Andrews
-- reg + pairing still said 23 two hours later because nobody had opened the
-- organizer tee sheet since.
--
-- Fix: the cascade trigger itself now pushes the TRGG value into
--   * event_registrations.handicap  (::real, IS DISTINCT — converges, so the
--     auto_promote_waitlist trigger fires at most once per real change)
--   * event_pairings.groups[].players[].handicap (merge with ||, order kept
--     via WITH ORDINALITY — FUCKUPS #19: never rebuild player objects)
-- for TRGG events dated today-or-later (Asia/Bangkok — Postgres current_date
-- is UTC and loses Thai mornings). Past events keep the handicap they were
-- played off; retro-apply stays an explicit organizer act (Summary ✎ /
-- applyHandicapToEvent). Runs for BOTH import writes and MANUAL edits, and
-- also when the universal is MANUAL-pinned (the pin protects the universal,
-- not event rosters).
-- Base: Part 1 of sql/manual_trgg_edit_syncs_globally_20260901.sql.
-- ============================================================================

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

  ------------------------------------------------------------------
  -- 2026-09-01: push the new TRGG number into today's + future TRGG
  -- event rosters immediately (regs are what tee sheet / QSE / golfer
  -- event views display; the load-time RPC stays as belt-and-braces).
  ------------------------------------------------------------------
  IF v_is_trgg THEN
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
