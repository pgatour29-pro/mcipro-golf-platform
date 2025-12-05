-- Check what columns exist in the rounds table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
ORDER BY ordinal_position;
