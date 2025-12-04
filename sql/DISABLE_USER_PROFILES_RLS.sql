-- DISABLE RLS ON USER_PROFILES TO FIX PROFILE SAVE ERRORS
-- This fixes the 400 Bad Request error when trying to save profile edits

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- Should show: user_profiles | false
