-- =====================================================================
-- ADD SCORING_FORMAT COLUMN TO SCORECARDS TABLE
-- =====================================================================
-- Purpose: Support new game formats (Nassau, Match Play, Best Ball, etc.)
-- Date: 2025-10-11
-- =====================================================================

-- Add scoring_format column if it doesn't exist
ALTER TABLE scorecards
ADD COLUMN IF NOT EXISTS scoring_format TEXT DEFAULT 'stableford';

-- Update existing scorecards to have default format
UPDATE scorecards
SET scoring_format = 'stableford'
WHERE scoring_format IS NULL;

-- Add comment
COMMENT ON COLUMN scorecards.scoring_format IS
'Scoring format: stableford, strokeplay, matchplay, bestball, scramble, modifiedstableford, skins, nassau';

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'scorecards' AND column_name = 'scoring_format';

-- =====================================================================
-- SUPPORTED FORMATS:
-- =====================================================================
-- stableford          - Thailand Stableford (Eagle 4, Birdie 3, Par 2, Bogey 1 + stroke bonus)
-- strokeplay          - Total strokes
-- matchplay           - Head-to-head, win/lose/halve holes
-- bestball            - Team format, best score per hole
-- scramble            - Team format, play best shot
-- modifiedstableford  - Albatross 8, Eagle 5, Birdie 2, Par 0, Bogey -1, Double+ -3
-- skins               - Win individual holes, ties carry over
-- nassau              - Three matches: front 9, back 9, overall
-- =====================================================================

-- =====================================================================
-- INSTRUCTIONS:
-- =====================================================================
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Verify column was added successfully
-- 3. Hard refresh app (Ctrl+Shift+R)
-- 4. Try starting a round with Nassau or other new format
-- 5. Check browser console for any errors
-- =====================================================================
