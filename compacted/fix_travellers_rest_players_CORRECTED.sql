-- =====================================================
-- FIX TRAVELLERS REST GOLF GROUP - ADD EXISTING PLAYERS (CORRECTED)
-- =====================================================
-- Uses the correct ID from societies table (not society_profiles)
-- =====================================================

DO $$
DECLARE
  trgg_society_id UUID := '17451cf3-f499-4aa3-83d7-c206149838c4'; -- From societies table
  affected_users INT := 0;
  affected_members INT := 0;
BEGIN

  RAISE NOTICE 'Using Travellers Rest society ID: %', trgg_society_id;

  -- Step 1: Update all user_profiles with clubAffiliation = 'Travellers Rest Golf Group'
  UPDATE public.user_profiles
  SET
    society_id = trgg_society_id,
    society_name = 'Travellers Rest Golf Group',
    profile_data = jsonb_set(
      jsonb_set(
        COALESCE(profile_data, '{}'::jsonb),
        '{organizationInfo,societyId}',
        to_jsonb(trgg_society_id::text)
      ),
      '{organizationInfo,societyName}',
      '"Travellers Rest Golf Group"'
    )
  WHERE
    profile_data->'golfInfo'->>'clubAffiliation' = 'Travellers Rest Golf Group'
    OR profile_data->'golfInfo'->>'clubAffiliation' ILIKE '%Traveller%Rest%'
    OR profile_data->'organizationInfo'->>'societyName' ILIKE '%Traveller%Rest%';

  GET DIAGNOSTICS affected_users = ROW_COUNT;
  RAISE NOTICE 'Updated % user profiles with society_id', affected_users;

  -- Step 2: Insert into society_members table
  INSERT INTO public.society_members (
    society_id,
    golfer_id
  )
  SELECT
    trgg_society_id,
    up.line_user_id
  FROM public.user_profiles up
  WHERE
    (
      up.profile_data->'golfInfo'->>'clubAffiliation' = 'Travellers Rest Golf Group'
      OR up.profile_data->'golfInfo'->>'clubAffiliation' ILIKE '%Traveller%Rest%'
      OR up.profile_data->'organizationInfo'->>'societyName' ILIKE '%Traveller%Rest%'
      OR up.society_id = trgg_society_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.society_members sm
      WHERE sm.society_id = trgg_society_id
        AND sm.golfer_id = up.line_user_id
    );

  GET DIAGNOSTICS affected_members = ROW_COUNT;
  RAISE NOTICE 'Inserted % new members into society_members table', affected_members;

  -- Summary report
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '  - Society ID: %', trgg_society_id;
  RAISE NOTICE '  - Updated user profiles: %', affected_users;
  RAISE NOTICE '  - Created society memberships: %', affected_members;
  RAISE NOTICE '========================================';

END $$;

-- Verification: Check the results
SELECT
  '=== TRAVELLERS REST MEMBERS ===' as section,
  up.name,
  up.line_user_id,
  up.society_name,
  up.profile_data->'golfInfo'->>'handicap' as handicap,
  up.profile_data->'golfInfo'->>'homeClub' as home_club
FROM public.user_profiles up
JOIN public.society_members sm ON sm.golfer_id = up.line_user_id
WHERE sm.society_id = '17451cf3-f499-4aa3-83d7-c206149838c4'
ORDER BY up.name;

-- Count verification
SELECT
  'Total Travellers Rest Members' as metric,
  COUNT(*) as count
FROM public.society_members
WHERE society_id = '17451cf3-f499-4aa3-83d7-c206149838c4';
