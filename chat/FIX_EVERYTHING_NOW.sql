-- =====================================================================
-- COMPLETE FIX - RUN THIS ONCE AND BE DONE
-- =====================================================================

BEGIN;

-- 1. Fix user "16" to "Donald Lump" (forced, no conditions)
UPDATE profiles
SET
  display_name = 'Donald Lump',
  username = 'donald_lump',
  updated_at = NOW()
WHERE id = '07dc3f53-468a-4a2a-9baf-c8dfaa4ca365';

-- 2. Show what we just fixed
SELECT
  '✅ FIXED' as status,
  id,
  username,
  display_name
FROM profiles
WHERE id = '07dc3f53-468a-4a2a-9baf-c8dfaa4ca365';

-- 3. Show ALL profiles (what should appear in chat)
SELECT
  'All Profiles' as list,
  id,
  username,
  display_name,
  created_at
FROM profiles
ORDER BY created_at DESC;

COMMIT;
