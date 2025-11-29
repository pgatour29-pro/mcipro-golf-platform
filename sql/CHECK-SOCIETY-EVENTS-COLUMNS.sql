-- Check the actual column types of society_events table
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'society_events'
  AND column_name IN ('id', 'society_id', 'organizer_id', 'creator_id', 'created_by', 'updated_by')
ORDER BY ordinal_position;
