-- =====================================================================================
-- EVERY SOCIETY'S UPCOMING ROSTERS FOLLOW THE CURRENT HANDICAP (2026-09-23)
-- =====================================================================================
-- Pete: "Its not suppose to write over the days round. But a event registration regardless
--        of time needs to always be sync for the following future event."
-- Until now only TRGG pushed a new number onto upcoming registrations (trigger roster push).
-- A JOA/JGTS/any society row, or the universal, changed and the golfer's future registrations
-- kept the old number until an organizer happened to open that tee sheet
-- (sync_event_reg_handicaps). Now, on every society_handicaps write:
--   * TRGG locked row  -> TRGG events (unchanged, 2026-09-01)
--   * other society row -> that society's events
--   * universal row     -> non-TRGG events of a society the golfer has no row in (or none)
-- always only events dated today-or-later (Bangkok) that have NOT STARTED (no scorecards):
-- a round in play or played keeps the handicap it was played off.
-- New registrations: trg_event_reg_takes_society_hcp (BEFORE INSERT) — event society's row,
-- else (non-TRGG) the universal; TRGG without a TRGG row keeps what the client sent.
-- Supersedes the insert trigger in trgg_reg_insert_takes_trgg_hcp_20260923.sql.
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.push_hcp_to_upcoming_rosters(p_golfer text, p_h numeric, p_events text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_golfer IS NULL OR p_h IS NULL OR p_events IS NULL OR cardinality(p_events) = 0 THEN RETURN; END IF;
  UPDATE public.event_registrations er
     SET handicap = p_h::real
   WHERE er.player_id = p_golfer
     AND er.event_id::text = ANY (p_events)
     AND er.handicap IS DISTINCT FROM p_h::real;

  UPDATE public.event_pairings ep
  SET groups = (
    SELECT jsonb_agg(
      CASE
        WHEN grp ? 'players' THEN jsonb_set(grp, '{players}', (
          SELECT COALESCE(jsonb_agg(
            CASE WHEN COALESCE(p->>'playerId', p->>'id') = p_golfer
                 THEN p || jsonb_build_object('handicap', p_h)
                 ELSE p END ORDER BY ord), '[]'::jsonb)
          FROM jsonb_array_elements(grp->'players') WITH ORDINALITY AS t(p, ord)))
        WHEN COALESCE(grp->>'playerId', grp->>'id') = p_golfer
             THEN grp || jsonb_build_object('handicap', p_h)
        ELSE grp
      END ORDER BY gord)
    FROM jsonb_array_elements(ep.groups) WITH ORDINALITY AS gt(grp, gord))
  WHERE ep.event_id::text = ANY (p_events)
    AND jsonb_typeof(ep.groups) = 'array'
    AND ep.groups::text LIKE '%' || p_golfer || '%';
END
$function$;

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
  IF NEW.handicap_index IS NULL THEN
    RETURN NEW;
  END IF;

  ------------------------------------------------------------------
  -- 2026-09-23 (Pete: "a event registration regardless of time needs to always be sync for the
  -- following future event"): EVERY society's upcoming rosters follow the golfer's current number.
  -- UNIVERSAL row -> upcoming non-TRGG events of a society the golfer has NO row in (or no society).
  ------------------------------------------------------------------
  IF NEW.society_id IS NULL THEN
    PERFORM public.push_hcp_to_upcoming_rosters(NEW.golfer_id, NEW.handicap_index, ARRAY(
      SELECT se.id::text FROM public.society_events se
       WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date
         AND NOT EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.event_id = se.id::text)
         AND NOT ( se.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid OR se.title ~* 'trgg|travellers' )
         AND NOT EXISTS (SELECT 1 FROM public.society_handicaps s2
                          WHERE s2.golfer_id = NEW.golfer_id AND s2.society_id = se.society_id)
         AND EXISTS (SELECT 1 FROM public.event_registrations er
                      WHERE er.event_id = se.id AND er.player_id = NEW.golfer_id)));
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
  -- NON-TRGG society row -> that society's upcoming (not started) events.
  IF NOT v_is_trgg THEN
    PERFORM public.push_hcp_to_upcoming_rosters(NEW.golfer_id, NEW.handicap_index, ARRAY(
      SELECT se.id::text FROM public.society_events se
       WHERE se.society_id = NEW.society_id
         AND se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date
         AND NOT EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.event_id = se.id::text)
         AND EXISTS (SELECT 1 FROM public.event_registrations er
                      WHERE er.event_id = se.id AND er.player_id = NEW.golfer_id)));
  END IF;

  IF v_is_trgg AND v_is_locked THEN
    UPDATE public.event_registrations er
    SET handicap = NEW.handicap_index::real
    WHERE er.player_id = NEW.golfer_id
      AND er.handicap IS DISTINCT FROM NEW.handicap_index::real
      AND er.event_id::text IN (
        SELECT se.id::text FROM public.society_events se
        WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date
          AND NOT EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.event_id = se.id::text)
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
          AND NOT EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.event_id = se.id::text)
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


CREATE OR REPLACE FUNCTION public.event_reg_takes_society_hcp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_sid uuid; v_trgg boolean; v_h numeric;
BEGIN
  IF NEW.player_id IS NULL OR NEW.event_id IS NULL THEN RETURN NEW; END IF;
  SELECT se.society_id, (se.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid OR se.title ~* 'trgg|travellers')
    INTO v_sid, v_trgg
    FROM public.society_events se WHERE se.id::text = NEW.event_id::text;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF v_trgg THEN v_sid := '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid; END IF;
  IF v_sid IS NOT NULL THEN
    SELECT sh.handicap_index INTO v_h FROM public.society_handicaps sh
     WHERE sh.golfer_id = NEW.player_id AND sh.society_id = v_sid AND sh.handicap_index IS NOT NULL LIMIT 1;
  END IF;
  IF v_h IS NULL AND NOT v_trgg THEN
    SELECT sh.handicap_index INTO v_h FROM public.society_handicaps sh
     WHERE sh.golfer_id = NEW.player_id AND sh.society_id IS NULL AND sh.handicap_index IS NOT NULL LIMIT 1;
  END IF;
  IF v_h IS NOT NULL THEN NEW.handicap := v_h::real; END IF;
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_event_reg_takes_trgg_hcp ON public.event_registrations;
DROP FUNCTION IF EXISTS public.event_reg_takes_trgg_hcp();
DROP TRIGGER IF EXISTS trg_event_reg_takes_society_hcp ON public.event_registrations;
CREATE TRIGGER trg_event_reg_takes_society_hcp
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.event_reg_takes_society_hcp();
