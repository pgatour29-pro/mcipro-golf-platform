-- 2026-08-13 — Pete's rule: TRGG events use ONLY the TRGG handicap, at registration
-- AND during the event. Never the universal/global, never another society's value.
--
-- Two changes:
--
-- 1) DATA BACKFILL: 112 TRGG-titled society_events rows had society_id NULL
--    (incl. all 5 King of the Mountain 2026 rounds), so sync_event_reg_handicaps
--    skipped the society lookup entirely and stamped name-matched UNIVERSAL
--    handicaps on every tee-sheet open. Notification-safe: the UPDATE trigger
--    (trigger_event_update_notification) only fires on event_date / start_time /
--    course_name changes or a flip to cancelled — society_id is not watched.
--
-- 2) RPC HARDENING (sync_event_reg_handicaps):
--    a. TRGG dual-id: society_handicaps rows match under EITHER TRGG id
--       (7c0e4b72-… holds all 1213 rows today; 17451cf3-… guarded for drift).
--    b. A NULL-society event titled TRGG/Travellers resolves to TRGG anyway
--       (self-heals future schedule loads that forget society_id).
--    c. TRGG events fall back to the name-matched user_profiles.trgg_handicap
--       (the masterscoreboard value) BEFORE the universal handicap_index —
--       a TRGG event must never show the universal when a TRGG value exists.
--    d. Convergence: compare/store as ::real — event_registrations.handicap is
--       float4; comparing it against numeric never settles (10.1 vs 10.10000038)
--       and re-fired the auto-promote trigger on every load (same trap as
--       sync_upcoming_trgg_reg_handicaps, fixed 2026-07-06).

UPDATE public.society_events
SET society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'
WHERE (title ILIKE 'trgg%' OR title ILIKE '%travellers%')
  AND society_id IS NULL;

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
  WHERE er.id = m.id AND m.h IS NOT NULL AND er.handicap IS DISTINCT FROM m.h;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;
