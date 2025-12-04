-- ============================================================================
-- FINAL FIX - EVERYTHING IN ONE SCRIPT
-- ============================================================================
-- This script fixes ALL issues:
-- 1. Disables handicap trigger (stops corruption)
-- 2. Restores Pete Park = 3.8, Alan Thomas = 11.8
-- 3. Fixes RLS so rounds are visible
-- ============================================================================

-- STEP 1: DISABLE HANDICAP TRIGGER
ALTER TABLE public.rounds DISABLE TRIGGER trigger_auto_update_handicap;

-- STEP 2: RESTORE CORRECT HANDICAPS
UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '3.8'::jsonb
)
WHERE name ILIKE '%Pete%Park%' OR line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

UPDATE public.user_profiles
SET profile_data = jsonb_set(
    COALESCE(profile_data, '{}'::jsonb),
    '{golfInfo,handicap}',
    '11.8'::jsonb
)
WHERE name ILIKE '%Alan%Thomas%' OR line_user_id = 'U214f2fe47e1681fbb26f0aba95930d64';

-- STEP 3: FIX RLS POLICIES FOR ROUNDS
DROP POLICY IF EXISTS "rounds_select_own_or_shared" ON public.rounds;
DROP POLICY IF EXISTS "rounds_select_all_authenticated" ON public.rounds;
DROP POLICY IF EXISTS "rounds_select_all_anon" ON public.rounds;

CREATE POLICY "rounds_select_all_authenticated"
ON public.rounds
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "rounds_select_all_anon"
ON public.rounds
FOR SELECT
TO anon
USING (true);

-- VERIFY
SELECT 'Trigger disabled:', tgenabled::text
FROM pg_trigger
WHERE tgname = 'trigger_auto_update_handicap';

SELECT 'Pete handicap:', profile_data->'golfInfo'->>'handicap'
FROM public.user_profiles
WHERE name ILIKE '%Pete%Park%';

SELECT 'Alan handicap:', profile_data->'golfInfo'->>'handicap'
FROM public.user_profiles
WHERE name ILIKE '%Alan%Thomas%';

SELECT 'RLS policies:', COUNT(*)
FROM pg_policies
WHERE tablename = 'rounds';

-- ============================================================================
-- DONE. Refresh your Round History page - rounds should now be visible.
-- Handicaps will stay at 3.8 and 11.8 forever.
-- ============================================================================
