-- sync_event_reg_handicaps: make tee-sheet handicap sync SOCIETY-AWARE.
-- BUG: the old version matched each registration by NAME to user_profiles and pulled
-- user_profiles.handicap_index (the UNIVERSAL/anchor handicap). For a player whose
-- society handicap differs from their universal (e.g. Pete Park: TRGG 0.5 vs universal 0.7),
-- every tee-sheet load overwrote the society handicap with the universal one.
-- FIX: prefer the event's-society handicap from society_handicaps (keyed by the player's id),
-- and fall back to the original name-matched universal lookup only when there is no
-- society-specific handicap (guests, events with no society_id). Canonical order is
-- society_handicaps -> profile, which this now matches.
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
      COALESCE(
        -- 1. SOCIETY-SPECIFIC handicap for THIS event's society, keyed by the player's id.
        (SELECT sh.handicap_index
           FROM public.society_handicaps sh
           JOIN public.society_events se ON se.id = er2.event_id
          WHERE se.society_id IS NOT NULL
            AND sh.society_id = se.society_id
            AND sh.golfer_id = er2.player_id
            AND sh.handicap_index IS NOT NULL
          LIMIT 1),
        -- 2. FALLBACK (unchanged): name-matched universal handicap from user_profiles.
        (SELECT p.handicap_index FROM public.user_profiles p
           WHERE (SELECT string_agg(t,' ' ORDER BY t) FROM regexp_split_to_table(regexp_replace(lower(regexp_replace(coalesce(p.name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') t WHERE t<>'')
               = (SELECT string_agg(t,' ' ORDER BY t) FROM regexp_split_to_table(regexp_replace(lower(regexp_replace(er2.player_name,'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),'\s+') t WHERE t<>'')
             AND p.handicap_index IS NOT NULL
           ORDER BY p.updated_at DESC NULLS LAST LIMIT 1)
      ) AS h
    FROM public.event_registrations er2
    WHERE er2.event_id::text = p_event_id
  ) m
  WHERE er.id = m.id AND m.h IS NOT NULL AND er.handicap IS DISTINCT FROM m.h;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;
