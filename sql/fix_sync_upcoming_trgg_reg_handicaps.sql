-- Speed up sync_upcoming_trgg_reg_handicaps so it completes under the anon
-- statement_timeout (~3s). The old version recomputed a regex name-key for
-- every user_profile INSIDE a correlated subquery, once per registration
-- (O(regs x profiles)) -> 57014 statement timeout via the browser/anon path
-- (silently swallowed by the paste tool). This computes each profile key ONCE
-- in a CTE and joins. Same semantics (best profile per name = latest updated_at).
CREATE OR REPLACE FUNCTION public.sync_upcoming_trgg_reg_handicaps()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE n integer;
BEGIN
  WITH prof AS (
    SELECT p.handicap_index, p.updated_at,
      (SELECT string_agg(t,' ' ORDER BY t)
         FROM regexp_split_to_table(
                regexp_replace(lower(regexp_replace(coalesce(p.name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),
                '\s+') t
         WHERE t <> '') AS k
    FROM public.user_profiles p
    WHERE p.handicap_index IS NOT NULL
  ),
  prof_best AS (
    SELECT DISTINCT ON (k) k, handicap_index AS h
    FROM prof
    WHERE k IS NOT NULL AND k <> ''
    ORDER BY k, updated_at DESC NULLS LAST
  ),
  reg AS (
    SELECT er.id,
      (SELECT string_agg(t,' ' ORDER BY t)
         FROM regexp_split_to_table(
                regexp_replace(lower(regexp_replace(coalesce(er.player_name,''),'\([^)]*\)','','g')),'[^a-z0-9]',' ','g'),
                '\s+') t
         WHERE t <> '') AS k
    FROM public.event_registrations er
    JOIN public.society_events se ON se.id::text = er.event_id::text
    WHERE (se.title ILIKE '%TRGG%' OR se.title ILIKE '%Travellers%')
      AND se.event_date >= CURRENT_DATE
  )
  -- er.handicap is REAL (float4); master is NUMERIC. Compare against pb.h::real
  -- (the value that will actually be stored) so the sync CONVERGES instead of
  -- flagging every row as "distinct" forever from float representation noise.
  UPDATE public.event_registrations er
  SET handicap = pb.h
  FROM reg r
  JOIN prof_best pb ON pb.k = r.k
  WHERE er.id = r.id
    AND pb.h IS NOT NULL
    AND er.handicap IS DISTINCT FROM pb.h::real;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;
