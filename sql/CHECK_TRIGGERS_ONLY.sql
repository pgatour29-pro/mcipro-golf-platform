-- Check all triggers on rounds table
SELECT
  tgname as trigger_name,
  CASE
    WHEN tgenabled = 'O' THEN 'ENABLED'
    WHEN tgenabled = 'D' THEN 'DISABLED'
    ELSE 'OTHER'
  END as status
FROM pg_trigger
WHERE tgrelid = 'rounds'::regclass;
