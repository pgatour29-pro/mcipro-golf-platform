-- ============================================================================
-- RESTORE CORRECT HANDICAPS FOR PETE PARK AND ALAN THOMAS
-- ============================================================================
-- Pete Park correct handicap: 3.8
-- Alan Thomas correct handicap: 11.8
-- ============================================================================

-- Update Pete Park's handicap
UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '3.8'::jsonb
)
WHERE name = 'Park, Pete' OR name ILIKE '%Pete%Park%';

-- Update Alan Thomas's handicap
UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '11.8'::jsonb
)
WHERE name = 'Alan Thomas' OR name ILIKE '%Alan%Thomas%';

-- Verify the updates
SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' AS current_handicap
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%' OR name ILIKE '%Alan%Thomas%';

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run DISABLE_AUTO_HANDICAP_TRIGGER.sql first to prevent future corruption
-- 2. Run this script to restore correct handicaps
-- 3. Test round saving - handicaps should stay fixed now
-- ============================================================================
