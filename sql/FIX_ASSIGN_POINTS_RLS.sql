-- =====================================================================
-- FIX ASSIGN POINTS - Add column and RLS policies
-- =====================================================================
-- Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Add point_allocation column to society_events if it doesn't exist
ALTER TABLE society_events
ADD COLUMN IF NOT EXISTS point_allocation JSONB DEFAULT '{}';

-- 2. Check if event_results table exists, create if not
CREATE TABLE IF NOT EXISTS event_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES society_events(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE SET NULL,
    player_id TEXT NOT NULL,
    player_name TEXT,
    division TEXT,
    position INTEGER NOT NULL,
    score NUMERIC,
    score_type TEXT DEFAULT 'stableford',
    points_earned INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    is_counted BOOLEAN DEFAULT true,
    event_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_results_event_id ON event_results(event_id);
CREATE INDEX IF NOT EXISTS idx_event_results_player_id ON event_results(player_id);

-- 4. Enable RLS on event_results
ALTER TABLE event_results ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to recreate them clean
DROP POLICY IF EXISTS "Allow public read of event_results" ON event_results;
DROP POLICY IF EXISTS "Allow authenticated insert to event_results" ON event_results;
DROP POLICY IF EXISTS "Allow authenticated update to event_results" ON event_results;
DROP POLICY IF EXISTS "Allow authenticated delete to event_results" ON event_results;
DROP POLICY IF EXISTS "Allow anon read of event_results" ON event_results;
DROP POLICY IF EXISTS "Allow anon insert to event_results" ON event_results;
DROP POLICY IF EXISTS "Allow anon update to event_results" ON event_results;
DROP POLICY IF EXISTS "Allow anon delete to event_results" ON event_results;

-- 6. Create permissive policies for event_results
-- Read: Anyone can read results
CREATE POLICY "Allow public read of event_results" ON event_results
    FOR SELECT USING (true);

-- Insert: Allow authenticated users and anon (for LINE users without Supabase auth)
CREATE POLICY "Allow authenticated insert to event_results" ON event_results
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow anon insert to event_results" ON event_results
    FOR INSERT TO anon WITH CHECK (true);

-- Update: Allow updates
CREATE POLICY "Allow authenticated update to event_results" ON event_results
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon update to event_results" ON event_results
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Delete: Allow deletes (for re-assigning points)
CREATE POLICY "Allow authenticated delete to event_results" ON event_results
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow anon delete to event_results" ON event_results
    FOR DELETE TO anon USING (true);

-- 7. Verify setup
SELECT 'event_results table' as check_item,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'event_results') as exists;

SELECT 'point_allocation column' as check_item,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'society_events' AND column_name = 'point_allocation') as exists;

SELECT 'RLS policies' as check_item, count(*) as policy_count
FROM pg_policies
WHERE tablename = 'event_results';
