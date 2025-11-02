-- =====================================================
-- RUN THIS ENTIRE SCRIPT IN SUPABASE SQL EDITOR
-- =====================================================

-- Step 1: Check what columns user_profiles actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Show Pete's profile to see the structure
SELECT *
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Step 3: Create the mapping table
CREATE TABLE IF NOT EXISTS public.user_identities (
  line_user_id TEXT PRIMARY KEY,
  user_uuid UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_identities_user_uuid_idx
  ON public.user_identities(user_uuid);

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

-- Step 4: Based on the screenshot you provided earlier, user_profiles has line_user_id as TEXT
-- Let's just map LINE user ID to itself as the UUID for now (we'll fix the proper UUID later)
-- Actually, let me check if there's an auth.users entry first

-- Show all auth.users to find Pete
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
