-- ============================================================================
-- FIX: Handicap Trigger NULL Conflict Issue
-- ============================================================================
-- Problem 1: The unique constraint doesn't exist
-- Problem 2: The update_society_handicap function uses ON CONFLICT incorrectly
-- ============================================================================

-- Step 1: Create unique constraint if it doesn't exist
-- Using COALESCE to handle NULL society_id properly
DO $$
BEGIN
    -- First drop any existing index/constraint that might conflict
    DROP INDEX IF EXISTS idx_society_handicaps_golfer_society;

    -- Create unique index that handles NULL properly
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'society_handicaps_golfer_society_idx'
    ) THEN
        CREATE UNIQUE INDEX society_handicaps_golfer_society_idx
        ON society_handicaps (golfer_id, COALESCE(society_id::text, 'UNIVERSAL'));
        RAISE NOTICE 'Created unique index society_handicaps_golfer_society_idx';
    ELSE
        RAISE NOTICE 'Index society_handicaps_golfer_society_idx already exists';
    END IF;
END $$;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB);

-- Step 3: Create fixed function using DELETE + INSERT instead of ON CONFLICT
-- This works reliably with NULL values
CREATE OR REPLACE FUNCTION update_society_handicap(
  p_golfer_id TEXT,
  p_society_id UUID, -- NULL = universal handicap
  p_new_handicap DECIMAL,
  p_rounds_used INTEGER,
  p_all_diffs JSONB,
  p_best_diffs JSONB
)
RETURNS VOID AS $$
DECLARE
  v_society_name TEXT;
BEGIN
  -- Get society name for logging
  IF p_society_id IS NOT NULL THEN
    SELECT society_name INTO v_society_name
    FROM public.society_profiles
    WHERE id = p_society_id;
  ELSE
    v_society_name := 'Universal';
  END IF;

  -- Delete existing record (handles NULL properly)
  IF p_society_id IS NULL THEN
    DELETE FROM public.society_handicaps
    WHERE golfer_id = p_golfer_id AND society_id IS NULL;
  ELSE
    DELETE FROM public.society_handicaps
    WHERE golfer_id = p_golfer_id AND society_id = p_society_id;
  END IF;

  -- Insert new record
  INSERT INTO public.society_handicaps (
    golfer_id,
    society_id,
    handicap_index,
    rounds_count,
    last_calculated_at,
    calculation_method
  )
  VALUES (
    p_golfer_id,
    p_society_id,
    p_new_handicap,
    p_rounds_used,
    NOW(),
    'WHS-5'
  );

  -- Log to console
  RAISE NOTICE '[%] Handicap updated for golfer %: % (based on % rounds)',
    v_society_name,
    p_golfer_id,
    p_new_handicap,
    p_rounds_used;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB) TO anon;

-- Step 4: Test - update Dec 24 rounds to completed
-- Uncomment and run after applying the fix above:
-- UPDATE public.rounds
-- SET status = 'completed'
-- WHERE id IN (
--   '6fe60d6c-8ec9-446c-ace3-4d728018de33',
--   '1b45ab89-aefa-4228-a18e-32de51488960',
--   'c4e7825a-46b5-4b5f-a30d-c0db017acc2c',
--   '6a307002-6b68-4244-b64d-b1210272d757'
-- );

-- ============================================================================
-- VERIFICATION: After running, check these:
-- ============================================================================
-- SELECT * FROM society_handicaps WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
-- SELECT id, golfer_id, status FROM rounds WHERE id = '6fe60d6c-8ec9-446c-ace3-4d728018de33';
