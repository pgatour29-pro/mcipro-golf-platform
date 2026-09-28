-- 2026-09-28 — A PLAYED ROUND KEEPS THE HANDICAP IT WAS PLAYED OFF.
-- Pete: "handicap adjustments must not affect a round just played ... only time a hcp can be
-- adjusted is by the organizer to correct a wrong hcp that was used for that round."
-- The masterscoreboard pull writes society_handicaps; the roster syncs below then copied the new
-- number onto event registrations. Their "played" guard only looked at LIVE scorecards, so a
-- paper-card event (rounds only) on the same day was still overwritten, and
-- sync_event_reg_handicaps (tee sheet / Registrations open) had NO guard at all.
-- ONE rule now — event_hcp_frozen(): past date, OR today once the tee time has passed, OR any
-- scorecard / round exists for it. Organizer corrections (applyHandicapToEvent) are direct
-- writes and are NOT affected.
CREATE OR REPLACE FUNCTION public.event_hcp_frozen(p_event text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.society_events se
     WHERE se.id::text = p_event
       AND ( se.event_date < (now() AT TIME ZONE 'Asia/Bangkok')::date
          OR ( se.event_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
               AND se.start_time IS NOT NULL
               AND (now() AT TIME ZONE 'Asia/Bangkok')::time >= se.start_time ) ))
  OR EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.event_id = p_event)
  OR EXISTS (SELECT 1 FROM public.rounds r WHERE r.society_event_id::text = p_event);
$function$;
GRANT EXECUTE ON FUNCTION public.event_hcp_frozen(text) TO anon, authenticated;

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
       WHERE NOT public.event_hcp_frozen(se.id::text)
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
         AND NOT public.event_hcp_frozen(se.id::text)
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
        WHERE NOT public.event_hcp_frozen(se.id::text)
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
        WHERE NOT public.event_hcp_frozen(se.id::text)
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
      WHEN v_is_manual OR (v_is_trgg AND v_is_locked) THEN NEW.handicap_index
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

CREATE OR REPLACE FUNCTION public.sync_upcoming_trgg_reg_handicaps()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE n integer;
BEGIN
  WITH prof AS (
    SELECT p.trgg_handicap, p.updated_at,
      (SELECT string_agg(t,' ' ORDER BY t)
         FROM regexp_split_to_table(
                regexp_replace(lower(regexp_replace(coalesce(p.name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),
                '\s+') t
         WHERE t <> '') AS k
    FROM public.user_profiles p
    WHERE p.trgg_handicap IS NOT NULL
  ),
  prof_best AS (
    SELECT DISTINCT ON (k) k, trgg_handicap AS h
    FROM prof
    WHERE k IS NOT NULL AND k <> ''
    ORDER BY k, updated_at DESC NULLS LAST
  ),
  reg AS (
    SELECT er.id, er.player_id,
      (SELECT string_agg(t,' ' ORDER BY t)
         FROM regexp_split_to_table(
                regexp_replace(lower(regexp_replace(coalesce(er.player_name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),
                '\s+') t
         WHERE t <> '') AS k
    FROM public.event_registrations er
    JOIN public.society_events se ON se.id::text = er.event_id::text
    WHERE ( se.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
            OR se.title ILIKE '%TRGG%' OR se.title ILIKE '%Travellers%' )
      AND NOT public.event_hcp_frozen(se.id::text)
  ),
  target AS (
    SELECT r.id, COALESCE(
      (SELECT sh.handicap_index FROM public.society_handicaps sh
        WHERE sh.golfer_id = r.player_id
          AND sh.society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
          AND sh.handicap_index IS NOT NULL
        LIMIT 1),
      (SELECT pb.h FROM prof_best pb WHERE pb.k = r.k)
    ) AS h
    FROM reg r
  )
  -- er.handicap is REAL (float4); compare against h::real so the sync CONVERGES.
  UPDATE public.event_registrations er
  SET handicap = t.h::real
  FROM target t
  WHERE er.id = t.id
    AND t.h IS NOT NULL
    AND er.handicap IS DISTINCT FROM t.h::real;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$function$;

CREATE OR REPLACE FUNCTION public.sync_event_reg_handicaps(p_event_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE n integer;
BEGIN
  UPDATE public.event_registrations er
  SET handicap = m.h
  FROM (
    SELECT er2.id,
      (COALESCE(
        -- 1. SOCIETY handicap for THIS event's society, keyed by the player's id.
        --    TRGG (either id, or TRGG-titled with NULL society) matches rows
        --    under both TRGG ids, newest first.
        (SELECT sh.handicap_index
           FROM public.society_events se
           CROSS JOIN LATERAL (
             SELECT CASE
               WHEN se.society_id IS NOT NULL THEN se.society_id
               WHEN se.title ~* 'trgg|travellers' THEN '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
             END AS sid
           ) eff
           JOIN public.society_handicaps sh
             ON sh.golfer_id = er2.player_id
            AND ( sh.society_id = eff.sid
                  OR ( eff.sid = ANY (ARRAY['7c0e4b72-d925-44bc-afda-38259a7ba346','17451cf3-8b57-4166-af0a-dd902b7fb1af']::uuid[])
                       AND sh.society_id = ANY (ARRAY['7c0e4b72-d925-44bc-afda-38259a7ba346','17451cf3-8b57-4166-af0a-dd902b7fb1af']::uuid[]) ) )
          WHERE se.id = er2.event_id
            AND eff.sid IS NOT NULL
            AND sh.handicap_index IS NOT NULL
          ORDER BY sh.updated_at DESC NULLS LAST
          LIMIT 1),
        -- 2. TRGG events ONLY: name-matched masterscoreboard value from
        --    user_profiles.trgg_handicap (covers fragmented/guest reg ids that
        --    have no society_handicaps row of their own).
        (SELECT p.trgg_handicap FROM public.user_profiles p
          WHERE EXISTS (
                  SELECT 1 FROM public.society_events se2
                   WHERE se2.id = er2.event_id
                     AND ( se2.society_id = ANY (ARRAY['7c0e4b72-d925-44bc-afda-38259a7ba346','17451cf3-8b57-4166-af0a-dd902b7fb1af']::uuid[])
                           OR se2.title ~* 'trgg|travellers' ) )
            AND (SELECT string_agg(t,' ' ORDER BY t) FROM regexp_split_to_table(regexp_replace(lower(regexp_replace(coalesce(p.name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') t WHERE t<>'')
                = (SELECT string_agg(t,' ' ORDER BY t) FROM regexp_split_to_table(regexp_replace(lower(regexp_replace(er2.player_name,'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') t WHERE t<>'')
            AND p.trgg_handicap IS NOT NULL
          ORDER BY p.updated_at DESC NULLS LAST LIMIT 1),
        -- 3. FALLBACK (unchanged): name-matched universal handicap from user_profiles.
        (SELECT p.handicap_index FROM public.user_profiles p
           WHERE (SELECT string_agg(t,' ' ORDER BY t) FROM regexp_split_to_table(regexp_replace(lower(regexp_replace(coalesce(p.name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') t WHERE t<>'')
               = (SELECT string_agg(t,' ' ORDER BY t) FROM regexp_split_to_table(regexp_replace(lower(regexp_replace(er2.player_name,'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') t WHERE t<>'')
             AND p.handicap_index IS NOT NULL
           ORDER BY p.updated_at DESC NULLS LAST LIMIT 1)
      ))::real AS h
    FROM public.event_registrations er2
    WHERE er2.event_id::text = p_event_id
  ) m
  WHERE er.id = m.id AND m.h IS NOT NULL AND er.handicap IS DISTINCT FROM m.h
    AND NOT public.event_hcp_frozen(er.event_id::text);   -- 2026-09-28: a played round keeps the number it was played off
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;

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
     AND NOT public.event_hcp_frozen(er.event_id::text)
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
    AND NOT public.event_hcp_frozen(ep.event_id::text)
    AND jsonb_typeof(ep.groups) = 'array'
    AND ep.groups::text LIKE '%' || p_golfer || '%';
END
$function$;
