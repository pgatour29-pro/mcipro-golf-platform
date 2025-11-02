-- =============================================================================
-- VERIFY ROUNDS SCHEMA AND RLS READINESS
-- Run this in Supabase SQL editor. It does not mutate data.
-- =============================================================================

-- 1) Table presence
SELECT 'tables' AS section, table_name, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND table_name IN ('rounds','round_holes')
ORDER BY table_name;

-- 2) Columns presence (canonical + legacy)
SELECT 'rounds_columns' AS section, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rounds'
  AND column_name IN (
    -- canonical
    'golfer_id','course_id','course_name','type','society_event_id','started_at','completed_at','status','total_gross','total_net','total_stableford','handicap_used','tee_marker',
    -- legacy
    'user_id','played_at','holes_played','tee_used','total_score','adjusted_gross_score','is_tournament','tournament_name','notes'
  )
ORDER BY column_name;

-- 3) Policies on rounds
SELECT 'rounds_policies' AS section, policyname, roles, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'rounds'
ORDER BY cmd, policyname;

-- 4) Policies on round_holes
SELECT 'round_holes_policies' AS section, policyname, roles, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'round_holes'
ORDER BY cmd, policyname;

-- 5) Indexes (helpful but optional)
SELECT 'indexes' AS section, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('rounds','round_holes')
ORDER BY tablename, indexname;

-- 6) Summary guidance (NOTICEs)
DO $$
DECLARE
  has_golfer_id BOOLEAN;
  has_completed_at BOOLEAN;
  has_total_gross BOOLEAN;
  has_tee_marker BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rounds' AND column_name='golfer_id'
  ) INTO has_golfer_id;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rounds' AND column_name='completed_at'
  ) INTO has_completed_at;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rounds' AND column_name='total_gross'
  ) INTO has_total_gross;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='rounds' AND column_name='tee_marker'
  ) INTO has_tee_marker;

  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'ROUNDS SCHEMA SUMMARY';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'golfer_id:      %', CASE WHEN has_golfer_id THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'completed_at:   %', CASE WHEN has_completed_at THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'total_gross:    %', CASE WHEN has_total_gross THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE 'tee_marker:     %', CASE WHEN has_tee_marker THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '';
  RAISE NOTICE 'If any are NO, run MIGRATE_ROUNDS_TO_CANONICAL.sql to add/backfill.';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS:
  - Use FINAL_ROUNDS_RLS_POLICIES.sql for temporary unblocked testing (anon+auth).
  - Use ROUNDS_RLS_HARDENED.sql after Supabase sessions are confirmed.';
  RAISE NOTICE '====================================================================';
END $$;

