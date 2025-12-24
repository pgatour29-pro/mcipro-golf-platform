-- ============================================================================
-- FIX: Handicap Trigger NULL Conflict Issue
-- ============================================================================
-- Problem: The update_society_handicap function uses:
--   ON CONFLICT (golfer_id, society_id)
-- But the unique index uses:
--   COALESCE(society_id::text, 'UNIVERSAL'::text)
--
-- PostgreSQL doesn't match NULL = NULL in the ON CONFLICT clause,
-- so inserts with society_id = NULL fail even when a record exists.
-- ============================================================================

-- Step 1: Drop the old function
DROP FUNCTION IF EXISTS update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB);

-- Step 2: Create fixed function using ON CONFLICT ON CONSTRAINT
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

  -- Upsert society handicap using constraint name for proper NULL handling
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
  )
  ON CONFLICT ON CONSTRAINT society_handicaps_golfer_society_unique
  DO UPDATE SET
    handicap_index = EXCLUDED.handicap_index,
    rounds_count = EXCLUDED.rounds_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW();

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

-- Step 3: Test by updating a round to completed
-- (Run this after applying the fix above)
-- UPDATE public.rounds
-- SET status = 'completed'
-- WHERE id = '6fe60d6c-8ec9-446c-ace3-4d728018de33';

-- ============================================================================
-- MANUAL FIX: Complete today's rounds without trigger
-- Run this ONLY if the trigger fix above doesn't work
-- ============================================================================

-- Disable the trigger temporarily
-- ALTER TABLE public.rounds DISABLE TRIGGER trigger_auto_update_society_handicaps;

-- Update all 4 rounds from today's event
-- UPDATE public.rounds
-- SET status = 'completed', completed_at = NOW()
-- WHERE id IN (
--   '6fe60d6c-8ec9-446c-ace3-4d728018de33',
--   '1b45ab89-aefa-4228-a18e-32de51488960',
--   'c4e7825a-46b5-4b5f-a30d-c0db017acc2c',
--   '6a307002-6b68-4244-b64d-b1210272d757'
-- );

-- Re-enable the trigger
-- ALTER TABLE public.rounds ENABLE TRIGGER trigger_auto_update_society_handicaps;
