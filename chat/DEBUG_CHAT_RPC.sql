-- DEBUG: Test the RPC function manually
-- Run this to see the exact error

-- Step 1: Check if the function exists
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'ensure_direct_conversation';

-- Step 2: Check permissions on the function
SELECT
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'ensure_direct_conversation';

-- Step 3: Try calling it manually (replace with real UUID)
-- This will show the exact error
SELECT * FROM ensure_direct_conversation('047a77ed-f7a7-4f97-9290-7dbe10a57f37');

-- Step 4: Check if auth.uid() works
SELECT auth.uid() as my_user_id;

-- Step 5: Check room_members table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'room_members'
ORDER BY ordinal_position;
