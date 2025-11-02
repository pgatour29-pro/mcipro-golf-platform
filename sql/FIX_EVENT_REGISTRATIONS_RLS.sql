-- =====================================================
-- FIX RLS FOR event_registrations
-- =====================================================
-- Allow users to read their own registrations by player_id (LINE user ID)

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can insert own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can update own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Users can delete own registrations" ON event_registrations;

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own registrations
-- player_id is TEXT containing LINE user ID (e.g., 'U2b6d976f19bca4b2f4374ae0e10ed873')
CREATE POLICY "Users can read own registrations"
ON event_registrations
FOR SELECT
TO authenticated, anon
USING (true);  -- Allow anyone to read all registrations (public events)

-- Policy: Allow service role to insert (Edge Function)
CREATE POLICY "Service role can insert registrations"
ON event_registrations
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Users can update their own registrations
CREATE POLICY "Users can update own registrations"
ON event_registrations
FOR UPDATE
TO authenticated, anon
USING (player_id = current_setting('request.headers', true)::json->>'x-line-user-id')
WITH CHECK (player_id = current_setting('request.headers', true)::json->>'x-line-user-id');

-- Policy: Users can delete their own registrations
CREATE POLICY "Users can delete own registrations"
ON event_registrations
FOR DELETE
TO authenticated, anon
USING (player_id = current_setting('request.headers', true)::json->>'x-line-user-id');

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'event_registrations';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies created for event_registrations';
    RAISE NOTICE 'Users can now read all registrations (public events)';
    RAISE NOTICE 'Edge Function can insert using service role';
END $$;
