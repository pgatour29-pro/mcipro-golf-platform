-- ============================================================================
-- FIX: Insert Pete Park's round for Jan 30 2026 at Burapha
-- The handicap trigger on rounds table has a bug with the unique constraint
-- on society_handicaps. This bypasses it by disabling the trigger temporarily.
-- ============================================================================

-- Step 1: Temporarily disable the handicap trigger
ALTER TABLE public.rounds DISABLE TRIGGER ALL;

-- Step 2: Insert Pete's round
INSERT INTO public.rounds (
  golfer_id, course_id, course_name, type, society_event_id,
  played_at, started_at, completed_at, status,
  total_gross, total_net, total_stableford, handicap_used,
  tee_marker, course_rating, slope_rating, holes_played,
  scoring_formats, format_scores, player_name
) VALUES (
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'burapha',
  'Burapha Golf Club (A+B)',
  'society',
  'e492db2e-c76c-4277-bea3-21391a0a5d1e',
  '2026-01-30T04:00:00.000Z',
  '2026-01-30T00:41:07.000Z',
  '2026-01-30T04:00:00.000Z',
  'completed',
  76, NULL, 35, 1.9,
  'white', 72.0, 113, 18,
  '["stableford"]',
  '{"stableford": 35}',
  'Pete Park'
);

-- Step 3: Re-enable triggers
ALTER TABLE public.rounds ENABLE TRIGGER ALL;

-- Step 4: Fix the handicap trigger function to use proper UPSERT
-- The current trigger tries INSERT and fails on the unique constraint
-- when the golfer already has a society_handicaps record
CREATE OR REPLACE FUNCTION auto_update_society_handicaps()
RETURNS TRIGGER AS $$
DECLARE
  v_golfer_id TEXT;
  v_society_id UUID;
BEGIN
  v_golfer_id := NEW.golfer_id;
  v_society_id := NEW.primary_society_id;

  -- Update existing society handicap if it exists, don't try to INSERT
  IF v_society_id IS NOT NULL THEN
    UPDATE public.society_handicaps
    SET rounds_count = rounds_count + 1,
        rounds_since_adjustment = rounds_since_adjustment + 1,
        last_calculated_at = NOW(),
        updated_at = NOW()
    WHERE golfer_id = v_golfer_id AND society_id = v_society_id;

    -- Only insert if no existing record
    IF NOT FOUND THEN
      INSERT INTO public.society_handicaps (golfer_id, society_id, handicap_index, rounds_count, calculation_method)
      VALUES (v_golfer_id, v_society_id, NEW.handicap_used, 1, 'MANUAL');
    END IF;
  END IF;

  -- Update universal handicap
  UPDATE public.society_handicaps
  SET rounds_count = rounds_count + 1,
      rounds_since_adjustment = rounds_since_adjustment + 1,
      last_calculated_at = NOW(),
      updated_at = NOW()
  WHERE golfer_id = v_golfer_id AND society_id IS NULL;

  -- Only insert if no existing record
  IF NOT FOUND THEN
    INSERT INTO public.society_handicaps (golfer_id, society_id, handicap_index, rounds_count, calculation_method)
    VALUES (v_golfer_id, NULL, NEW.handicap_used, 1, 'MANUAL');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Verify
SELECT id, golfer_id, player_name, total_gross, total_stableford, course_name
FROM rounds
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
AND played_at >= '2026-01-30'
ORDER BY played_at DESC;
