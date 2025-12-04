-- =====================================================
-- ADD MATCH_PLAY_CONFIG COLUMN TO SCORECARDS TABLE
-- =====================================================
-- This adds a JSONB column to store match play configuration
-- (round robin matches and team assignments)
-- for live scorecard sessions.
--
-- Run this in Supabase SQL Editor.
-- =====================================================

-- Add match_play_config column if it doesn't exist
ALTER TABLE public.scorecards
ADD COLUMN IF NOT EXISTS match_play_config JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.scorecards.match_play_config IS
'Stores match play configuration as JSON. Structure: { "teams": { "teamA": [], "teamB": [] }, "roundRobin": { "playerId": ["opponent1Id", "opponent2Id"] } }';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'scorecards'
  AND column_name = 'match_play_config';
