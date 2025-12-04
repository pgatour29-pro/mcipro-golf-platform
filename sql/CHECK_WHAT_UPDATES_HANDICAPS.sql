-- Check ALL triggers on rounds table
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END as status,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'rounds'::regclass
ORDER BY tgname;

-- Check ALL triggers on user_profiles table
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END as status,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'user_profiles'::regclass
ORDER BY tgname;

-- Find ALL functions that update user_profiles
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%UPDATE%user_profiles%'
ORDER BY routine_name;

-- Find ALL functions that mention handicap
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%handicap%' OR routine_definition LIKE '%handicap%')
ORDER BY routine_name;
