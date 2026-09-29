-- 2026-09-29: TRGG handicap pull timing out. event_hcp_frozen() cast uuid columns to text
-- (se.id::text, r.society_event_id::text) so every call seq-scanned society_events + rounds;
-- the roster-push trigger calls it for every TRGG event on every society_handicaps row
-- (~260ms/row ⇒ a 300-row upsert chunk blew the 3s anon statement_timeout; nothing landed since 09-24).
-- Same answer, index lookups: compare on uuid.
CREATE OR REPLACE FUNCTION public.event_hcp_frozen(p_event text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH k AS (
    SELECT CASE WHEN p_event ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                THEN p_event::uuid END AS u
  )
  SELECT EXISTS (
    SELECT 1 FROM public.society_events se, k
     WHERE se.id = k.u
       AND ( se.event_date < (now() AT TIME ZONE 'Asia/Bangkok')::date
          OR ( se.event_date = (now() AT TIME ZONE 'Asia/Bangkok')::date
               AND se.start_time IS NOT NULL
               AND (now() AT TIME ZONE 'Asia/Bangkok')::time >= se.start_time ) ))
  OR EXISTS (SELECT 1 FROM public.scorecards sc WHERE sc.event_id = p_event)
  OR EXISTS (SELECT 1 FROM public.rounds r, k WHERE r.society_event_id = k.u);
$function$;
-- 2026-09-29: past events are frozen by definition — skip them with a cheap date test before event_hcp_frozen().
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
       WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date AND NOT public.event_hcp_frozen(se.id::text)
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
         AND se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date AND NOT public.event_hcp_frozen(se.id::text)
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
        WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date AND NOT public.event_hcp_frozen(se.id::text)
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
        WHERE se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date AND NOT public.event_hcp_frozen(se.id::text)
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
$function$

;

-- sync_upcoming_trgg_reg_handicaps(): the planner inlined prof_best and re-ran the name-key regex over
-- every profile once per registration (8s, anon limit 3s). MATERIALIZED = computed once (50ms), same rows updated.
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
  prof_best AS MATERIALIZED (
    SELECT DISTINCT ON (k) k, trgg_handicap AS h
    FROM prof
    WHERE k IS NOT NULL AND k <> ''
    ORDER BY k, updated_at DESC NULLS LAST
  ),
  reg AS MATERIALIZED (
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
      AND se.event_date >= (now() AT TIME ZONE 'Asia/Bangkok')::date AND NOT public.event_hcp_frozen(se.id::text)
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
$function$

;
