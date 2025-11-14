-- =====================================================
-- GOLFER EVENT CREATION & MANAGEMENT SYSTEM
-- Add support for golfers to create public/private events
-- =====================================================

-- Step 1: Add is_private column to society_events
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

COMMENT ON COLUMN society_events.is_private IS 'Whether this event is private (invite-only) or public. Defaults to public (false).';

-- Step 2: Add creator_id to track who created the event
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS creator_id TEXT;

COMMENT ON COLUMN society_events.creator_id IS 'LINE user ID of the person who created this event (golfer or organizer)';

-- Step 3: Add creator_type to distinguish between organizer-created and golfer-created events
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS creator_type TEXT DEFAULT 'organizer';

COMMENT ON COLUMN society_events.creator_type IS 'Type of creator: organizer (society organizer) or golfer (individual golfer creating event with friends)';

-- Step 4: Create event_invites table for private event invitations
CREATE TABLE IF NOT EXISTS event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES society_events(id) ON DELETE CASCADE,

  -- Invitee info
  invitee_id TEXT NOT NULL,  -- LINE user ID of invited person
  invitee_name TEXT NOT NULL,

  -- Invitation status
  status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'declined'

  -- Who sent the invite
  invited_by TEXT,  -- LINE user ID of person who sent invite

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE event_invites IS 'Tracks invitations to private events. Only invited golfers can see and register for private events.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invites_event ON event_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee ON event_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON event_invites(status);
CREATE INDEX IF NOT EXISTS idx_society_events_creator ON society_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_society_events_is_private ON society_events(is_private);

-- Step 5: Enable RLS on event_invites
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;

-- Public read access for invites (users can see invites sent to them)
CREATE POLICY "Invites are viewable by everyone" ON event_invites
  FOR SELECT USING (true);

CREATE POLICY "Invites are insertable by everyone" ON event_invites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Invites are updatable by everyone" ON event_invites
  FOR UPDATE USING (true);

CREATE POLICY "Invites are deletable by everyone" ON event_invites
  FOR DELETE USING (true);

-- Step 6: Enable realtime for event_invites
ALTER PUBLICATION supabase_realtime ADD TABLE event_invites;

-- Step 7: Update timestamp trigger for event_invites
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON event_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Set existing events to public and assign creator info
UPDATE society_events
SET
  is_private = false,
  creator_type = 'organizer'
WHERE is_private IS NULL OR creator_type IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check the new columns exist
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'society_events'
  AND column_name IN ('is_private', 'creator_id', 'creator_type')
ORDER BY ordinal_position;

-- Verify event_invites table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'event_invites'
) AS event_invites_exists;

-- Show sample data
SELECT
  id,
  title,
  event_date,
  is_private,
  creator_id,
  creator_type,
  organizer_id
FROM society_events
LIMIT 5;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Golfer Event Creation System installed successfully!';
  RAISE NOTICE '   - is_private column added (default: false = public)';
  RAISE NOTICE '   - creator_id column added';
  RAISE NOTICE '   - creator_type column added';
  RAISE NOTICE '   - event_invites table created';
  RAISE NOTICE '   - Indexes and RLS policies created';
  RAISE NOTICE '   - Realtime enabled';
END $$;
