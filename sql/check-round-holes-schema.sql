-- =====================================================================
-- CHECK ROUND_HOLES TABLE SCHEMA
-- =====================================================================
-- This checks what columns exist in the round_holes table
-- and creates the table if it doesn't exist
-- =====================================================================

-- Check if round_holes table exists and what columns it has
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'round_holes'
ORDER BY ordinal_position;

-- If table doesn't exist or has wrong columns, create/fix it
-- Run this section if the query above shows missing columns

CREATE TABLE IF NOT EXISTS round_holes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    par INTEGER NOT NULL,
    stroke_index INTEGER NOT NULL,
    gross_score INTEGER,
    net_score INTEGER,
    stableford_points INTEGER,
    handicap_strokes INTEGER DEFAULT 0,
    drive_player_id TEXT,
    drive_player_name TEXT,
    putt_player_id TEXT,
    putt_player_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(round_id, hole_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_round_holes_round_id ON round_holes(round_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'ROUND_HOLES TABLE SCHEMA CHECK';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'If table was just created, you need to re-apply RLS policies!';
  RAISE NOTICE 'Run: sql/fix-round-holes-rls-anon.sql';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
