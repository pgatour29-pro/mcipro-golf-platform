-- Nightly auto-sweep: merge the safe ('auto') tier of duplicates. Review-tier is left untouched.
-- A real (claimed) account is always the survivor (never absorbed) — only placeholders get absorbed.
CREATE OR REPLACE FUNCTION sweep_duplicate_profiles()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g RECORD; m jsonb; groups int := 0; absorbed int := 0;
BEGIN
  FOR g IN SELECT * FROM find_duplicate_profiles() WHERE tier = 'auto' LOOP
    FOR m IN SELECT jsonb_array_elements(g.members) LOOP
      IF (m->>'is_survivor')::boolean IS NOT TRUE
         AND (m->>'type') IN ('guest','manual','player','hcp_pull') THEN
        PERFORM merge_golfer_profiles(g.survivor, m->>'id', 'auto-sweep: ' || g.name_key);
        absorbed := absorbed + 1;
      END IF;
    END LOOP;
    groups := groups + 1;
  END LOOP;
  RETURN jsonb_build_object('groups', groups, 'absorbed', absorbed, 'ran_at', now());
END $$;
GRANT EXECUTE ON FUNCTION sweep_duplicate_profiles() TO anon, authenticated;

-- Schedule nightly at 19:00 UTC (02:00 Asia/Bangkok). Safe to re-run this file (unschedule first).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('dedup-nightly-sweep')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dedup-nightly-sweep');
    PERFORM cron.schedule('dedup-nightly-sweep', '0 19 * * *', 'SELECT public.sweep_duplicate_profiles();');
    RAISE NOTICE 'scheduled dedup-nightly-sweep via pg_cron';
  ELSE
    RAISE NOTICE 'pg_cron not installed — call sweep_duplicate_profiles() from the app instead';
  END IF;
END $$;
