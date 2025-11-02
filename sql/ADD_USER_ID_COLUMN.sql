-- =====================================================
-- ADD user_id COLUMN TO event_registrations
-- =====================================================
-- This fixes the Edge Function 500 error by adding
-- the missing user_id column that the Edge Function
-- is trying to insert.

-- Add user_id column (UUID reference to auth.users)
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for efficient user_id lookups
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id
  ON event_registrations(user_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'event_registrations'
  AND column_name = 'user_id';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ user_id column added to event_registrations';
    RAISE NOTICE 'Column: user_id UUID (nullable, references auth.users)';
END $$;
