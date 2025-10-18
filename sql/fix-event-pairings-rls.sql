-- =====================================================
-- FIX EVENT_PAIRINGS TABLE - RLS & Structure
-- =====================================================
-- This script safely fixes the event_pairings table without errors
-- even if policies already exist

-- Drop existing policies first (safe - no error if they don't exist)
DROP POLICY IF EXISTS "Pairings are viewable by everyone" ON event_pairings;
DROP POLICY IF EXISTS "Pairings are insertable by everyone" ON event_pairings;
DROP POLICY IF EXISTS "Pairings are updatable by everyone" ON event_pairings;
DROP POLICY IF EXISTS "Pairings are deletable by everyone" ON event_pairings;

-- Ensure RLS is enabled
ALTER TABLE event_pairings ENABLE ROW LEVEL SECURITY;

-- Recreate policies with public access (matching other society tables)
CREATE POLICY "Pairings are viewable by everyone" ON event_pairings
  FOR SELECT USING (true);

CREATE POLICY "Pairings are insertable by everyone" ON event_pairings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Pairings are updatable by everyone" ON event_pairings
  FOR UPDATE USING (true);

CREATE POLICY "Pairings are deletable by everyone" ON event_pairings
  FOR DELETE USING (true);

-- Ensure table is in realtime publication
-- This might error if already added, but we'll catch it
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE event_pairings;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table already in realtime publication';
END $$;

-- Ensure columns exist (add if missing)
DO $$
BEGIN
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_pairings' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE event_pairings ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_pairings' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE event_pairings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists and recreate
DROP TRIGGER IF EXISTS update_pairings_updated_at ON event_pairings;

CREATE TRIGGER update_pairings_updated_at
  BEFORE UPDATE ON event_pairings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify everything
SELECT
    '✅ event_pairings table is now properly configured!' AS status,
    'RLS enabled: ' || (SELECT rowsecurity FROM pg_tables WHERE tablename = 'event_pairings') AS rls_status,
    'Policies: ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'event_pairings') AS policy_count,
    'In realtime: ' || (SELECT COUNT(*) > 0 FROM pg_publication_tables WHERE tablename = 'event_pairings' AND pubname = 'supabase_realtime') AS realtime_enabled;
