-- =====================================================================
-- ADD PLAYER_NAME COLUMN TO ROUNDS TABLE
-- =====================================================================
-- This allows guest players (without LINE ID) to have their names
-- displayed on the society organizer dashboard
-- Run this in Supabase SQL Editor
-- Created: 2025-12-18
-- =====================================================================

-- =====================================================================
-- STEP 1: Add player_name column to rounds table
-- =====================================================================
ALTER TABLE public.rounds
ADD COLUMN IF NOT EXISTS player_name TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.rounds.player_name IS 'Player display name - especially important for guest players without LINE ID';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rounds_player_name
  ON public.rounds(player_name)
  WHERE player_name IS NOT NULL;

-- =====================================================================
-- STEP 2: Backfill player_name from user_profiles for existing rounds
-- =====================================================================
UPDATE rounds r
SET player_name = up.name
FROM user_profiles up
WHERE r.golfer_id = up.line_user_id
AND r.player_name IS NULL;

-- =====================================================================
-- STEP 3: Update RPC function to include player_name parameter
-- =====================================================================
CREATE OR REPLACE FUNCTION public.archive_scorecard_to_history(
  p_scorecard_id UUID,
  p_golfer_id TEXT,
  p_round_type TEXT DEFAULT 'private',
  p_society_event_id UUID DEFAULT NULL,
  p_scoring_formats JSONB DEFAULT '["stableford"]'::jsonb,
  p_format_scores JSONB DEFAULT '{}'::jsonb,
  p_posted_formats TEXT[] DEFAULT ARRAY['stableford'],
  p_scramble_config JSONB DEFAULT NULL,
  p_player_name TEXT DEFAULT NULL  -- NEW: Player name for guests
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round_id UUID;
  v_scorecard RECORD;
  v_organizer_id TEXT;
  v_player_name TEXT;
BEGIN
  -- Fetch scorecard data if scorecard_id provided
  IF p_scorecard_id IS NOT NULL THEN
    SELECT * INTO v_scorecard
    FROM scorecards
    WHERE id = p_scorecard_id;
  END IF;

  -- Get organizer ID if society event
  IF p_society_event_id IS NOT NULL THEN
    SELECT organizer_id INTO v_organizer_id
    FROM society_events
    WHERE id = p_society_event_id;
  END IF;

  -- Determine player name: use parameter first, then scorecard, then lookup from user_profiles
  v_player_name := COALESCE(
    p_player_name,
    v_scorecard.player_name,
    (SELECT name FROM user_profiles WHERE line_user_id = p_golfer_id LIMIT 1)
  );

  -- Create round record with multi-format support
  INSERT INTO rounds (
    golfer_id,
    player_name,
    course_id,
    course_name,
    type,
    society_event_id,
    started_at,
    completed_at,
    status,
    total_gross,
    total_net,
    total_stableford,
    handicap_used,
    tee_marker,
    scoring_formats,
    format_scores,
    posted_formats,
    scramble_config,
    posted_to_organizer,
    organizer_id
  )
  VALUES (
    p_golfer_id,
    v_player_name,
    COALESCE(v_scorecard.course_id, ''),
    COALESCE(v_scorecard.course_name, ''),
    p_round_type,
    p_society_event_id,
    COALESCE(v_scorecard.started_at, NOW()),
    NOW(),
    'completed',
    COALESCE(v_scorecard.total_gross, 0),
    COALESCE(v_scorecard.total_net, 0),
    COALESCE(v_scorecard.total_stableford, 0),
    COALESCE(v_scorecard.handicap, 0),
    COALESCE(v_scorecard.tee_marker, 'white'),
    p_scoring_formats,
    p_format_scores,
    p_posted_formats,
    p_scramble_config,
    CASE WHEN p_society_event_id IS NOT NULL THEN true ELSE false END,
    v_organizer_id
  )
  RETURNING id INTO v_round_id;

  -- Copy hole-by-hole scores if scorecard exists
  IF p_scorecard_id IS NOT NULL AND v_scorecard.id IS NOT NULL THEN
    INSERT INTO round_holes (
      round_id,
      hole_number,
      par,
      stroke_index,
      gross_score,
      net_score,
      stableford_points
    )
    SELECT
      v_round_id,
      hole_number,
      par,
      stroke_index,
      gross_score,
      net_score,
      stableford
    FROM scores
    WHERE scorecard_id = p_scorecard_id
    ORDER BY hole_number;
  END IF;

  RETURN v_round_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.archive_scorecard_to_history(UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT[], JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_scorecard_to_history(UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT[], JSONB, TEXT) TO anon;

-- =====================================================================
-- VERIFICATION
-- =====================================================================
SELECT
    'Rounds with player_name populated' as metric,
    COUNT(*) as count
FROM rounds
WHERE player_name IS NOT NULL;

SELECT
    'Rounds still missing player_name' as metric,
    COUNT(*) as count
FROM rounds
WHERE player_name IS NULL;

-- Show sample of updated rounds
SELECT id, golfer_id, player_name, course_name, total_stableford
FROM rounds
WHERE player_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
