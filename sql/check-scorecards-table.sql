-- =====================================================================
-- CHECK IF SCORECARDS TABLE EXISTS AND HAS CORRECT PERMISSIONS
-- =====================================================================

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE  table_schema = 'public'
   AND    table_name   = 'scorecards'
);

-- If it exists, check its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scorecards'
ORDER BY ordinal_position;

-- Check RLS policies on scorecards table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'scorecards';

-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'scorecards';
