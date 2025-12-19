-- =====================================================================
-- FIX CHAT LOADING ISSUES - Missing Profiles Table and RLS Policies
-- =====================================================================
-- This script fixes the chat system members/chats loading failures
-- Execute this in Supabase SQL Editor after DEPLOY_ALL_SCHEMAS.sql
-- =====================================================================

-- PART 1: Ensure PROFILES table exists (required by auth-bridge.js)
-- =====================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  line_user_id TEXT UNIQUE,
  display_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- RLS Policy: Users can view all profiles (for chat contacts)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);  -- Anyone authenticated can view profiles

-- RLS Policy: Users can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- RLS Policy: Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- =====================================================================
-- PART 2: Migrate data from user_profiles to profiles if needed
-- =====================================================================

-- This function maps user_profiles.line_user_id to profiles (Supabase auth UUIDs)
-- Only run if you have existing user_profiles data

DO $$
DECLARE
  v_user_profiles_exists BOOLEAN;
BEGIN
  -- Check if user_profiles table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'user_profiles'
  ) INTO v_user_profiles_exists;

  IF v_user_profiles_exists THEN
    RAISE NOTICE 'Found user_profiles table - migrating to profiles...';

    -- Insert profiles that don't exist yet
    -- This requires that users have already authenticated and have auth.users records
    INSERT INTO profiles (id, line_user_id, display_name, username)
    SELECT
      au.id,
      up.line_user_id,
      COALESCE(up.name, up.line_user_id),
      COALESCE(
        up.caddy_number,
        LOWER(REGEXP_REPLACE(up.name, '[^a-zA-Z0-9]', '-', 'g')),
        up.line_user_id
      )
    FROM user_profiles up
    INNER JOIN auth.users au ON au.raw_user_meta_data->>'lineUserId' = up.line_user_id
    WHERE up.line_user_id IS NOT NULL
    ON CONFLICT (id) DO UPDATE
      SET line_user_id = EXCLUDED.line_user_id,
          display_name = EXCLUDED.display_name,
          username = EXCLUDED.username,
          updated_at = now();

    RAISE NOTICE '✅ Migration complete - profiles table populated';
  ELSE
    RAISE NOTICE 'No user_profiles table found - skipping migration';
  END IF;
END $$;

-- =====================================================================
-- PART 3: Fix chat_room_members RLS to allow viewing all members
-- =====================================================================

-- This allows authenticated users to see who they can chat with
-- Previous policy blocked users from seeing potential chat partners

DROP POLICY IF EXISTS "Users can view group memberships" ON chat_room_members;

CREATE POLICY "chat_room_members_select_all"
  ON chat_room_members FOR SELECT
  USING (true);  -- Any authenticated user can see room memberships

-- =====================================================================
-- PART 4: Add RLS policy to allow reading profiles
-- =====================================================================

-- Ensure users can query profiles table to build contact list
-- This is required for chat-system-full.js line 1155-1158

GRANT SELECT ON profiles TO authenticated;
GRANT INSERT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;

-- =====================================================================
-- PART 5: Create helper function to get all chat-eligible users
-- =====================================================================

-- This function returns all users who can be contacted via chat
-- Replaces the direct query in chat-system-full.js

CREATE OR REPLACE FUNCTION get_chat_contacts()
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  username TEXT,
  line_user_id TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.line_user_id
  FROM profiles p
  WHERE p.id != auth.uid()  -- Don't show current user
    AND p.line_user_id IS NOT NULL  -- Only users with LINE accounts
  ORDER BY p.display_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_chat_contacts() TO authenticated;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

DO $$
DECLARE
  v_profiles_count INTEGER;
  v_profiles_policies INTEGER;
  v_chat_tables INTEGER;
BEGIN
  -- Count profiles
  SELECT COUNT(*) INTO v_profiles_count
  FROM profiles;

  -- Count profiles policies
  SELECT COUNT(*) INTO v_profiles_policies
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Count chat tables
  SELECT COUNT(*) INTO v_chat_tables
  FROM information_schema.tables
  WHERE table_name IN ('chat_rooms', 'chat_messages', 'room_members', 'chat_room_members');

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHAT FIX VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profiles table: ✅ EXISTS';
  RAISE NOTICE 'Profiles count: %', v_profiles_count;
  RAISE NOTICE 'Profiles RLS policies: %', v_profiles_policies;
  RAISE NOTICE 'Chat tables: % / 4', v_chat_tables;
  RAISE NOTICE '========================================';

  IF v_chat_tables < 4 THEN
    RAISE WARNING '⚠️ Chat tables incomplete - run DEPLOY_ALL_SCHEMAS.sql first!';
  ELSE
    RAISE NOTICE '✅ Chat system ready - all tables deployed';
  END IF;

  IF v_profiles_count = 0 THEN
    RAISE NOTICE '⚠️ No profiles found - users need to authenticate first';
  ELSE
    RAISE NOTICE '✅ % users ready for chat', v_profiles_count;
  END IF;

  RAISE NOTICE '';
END $$;
