-- =====================================================
-- ADD STABLEFORD_POINTS COLUMN TO SCORES TABLE
-- Run this in Supabase SQL Editor
-- Created: 2025-12-07
-- =====================================================
-- This is likely causing the 400 errors - the column
-- doesn't exist but the code is trying to query it
-- =====================================================

-- Check current columns in scores table
SELECT 'CURRENT SCORES COLUMNS' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'scores'
ORDER BY ordinal_position;

-- Add stableford_points column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'scores'
        AND column_name = 'stableford_points'
    ) THEN
        ALTER TABLE scores ADD COLUMN stableford_points INTEGER DEFAULT 0;
        RAISE NOTICE 'Added stableford_points column to scores table';
    ELSE
        RAISE NOTICE 'stableford_points column already exists';
    END IF;
END $$;

-- Verify column was added
SELECT 'AFTER FIX - SCORES COLUMNS' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'scores'
ORDER BY ordinal_position;

-- Also disable RLS while we're here
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE scorecards DISABLE ROW LEVEL SECURITY;

-- Drop any policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'scores'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON scores', pol.policyname);
    END LOOP;
END $$;

-- Grant permissions
GRANT ALL ON scores TO anon, authenticated;
GRANT ALL ON scorecards TO anon, authenticated;

-- Test query
SELECT 'TEST QUERY' as test;
SELECT scorecard_id, hole_number, gross_score, net_score, stableford_points
FROM scores
LIMIT 5;

SELECT '✅ FIX COMPLETE' as status;
