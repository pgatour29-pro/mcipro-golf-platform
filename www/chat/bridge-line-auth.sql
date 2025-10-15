-- =====================================================================
-- Bridge LINE Authentication with Supabase Anonymous Auth
-- =====================================================================
-- This migration adds LINE user ID tracking to profiles and updates
-- RLS policies to allow anonymous authenticated users.
-- =====================================================================

-- 1. Add line_user_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON public.profiles(line_user_id);

COMMENT ON COLUMN public.profiles.line_user_id IS 'LINE user ID (e.g., U9e64d5456b0...) linked to this Supabase Auth user';

-- 2. Update RLS policies to allow anonymous authenticated users

-- ============ PROFILES TABLE ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Select: Allow any authenticated user (including anon) to read all profiles
DROP POLICY IF EXISTS "profiles_read_any" ON public.profiles;
CREATE POLICY "profiles_read_any"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Only allow a user to create their own profile
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Update: Only allow a user to update their own profile
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============ MESSAGES TABLE ============
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Select: Allow reading all messages (app handles room membership)
DROP POLICY IF EXISTS "messages_read" ON public.messages;
CREATE POLICY "messages_read"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Only allow sending messages as yourself
DROP POLICY IF EXISTS "messages_insert_self" ON public.messages;
CREATE POLICY "messages_insert_self"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Update: Only allow editing your own messages
DROP POLICY IF EXISTS "messages_update_self" ON public.messages;
CREATE POLICY "messages_update_self"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Delete: Only allow deleting your own messages
DROP POLICY IF EXISTS "messages_delete_self" ON public.messages;
CREATE POLICY "messages_delete_self"
  ON public.messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- ============ CONVERSATIONS TABLE ============
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Select: Allow reading all conversations (membership checked by app)
DROP POLICY IF EXISTS "conversations_read" ON public.conversations;
CREATE POLICY "conversations_read"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Allow creating conversations
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Update: Allow updating conversations you created
DROP POLICY IF EXISTS "conversations_update_creator" ON public.conversations;
CREATE POLICY "conversations_update_creator"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- ============ CONVERSATION_PARTICIPANTS TABLE ============
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Select: Allow reading all participants
DROP POLICY IF EXISTS "participants_read" ON public.conversation_participants;
CREATE POLICY "participants_read"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Allow joining conversations as yourself
DROP POLICY IF EXISTS "participants_insert_self" ON public.conversation_participants;
CREATE POLICY "participants_insert_self"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update: Allow updating your own participation
DROP POLICY IF EXISTS "participants_update_self" ON public.conversation_participants;
CREATE POLICY "participants_update_self"
  ON public.conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Delete: Allow leaving conversations
DROP POLICY IF EXISTS "participants_delete_self" ON public.conversation_participants;
CREATE POLICY "participants_delete_self"
  ON public.conversation_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =====================================================================
-- Grant necessary permissions
-- =====================================================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;

-- Grant EXECUTE on RPC functions
GRANT EXECUTE ON FUNCTION public.ensure_direct_conversation(uuid, uuid) TO authenticated;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
