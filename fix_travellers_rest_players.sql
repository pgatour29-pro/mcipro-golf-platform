-- =====================================================
-- FIX TRAVELLERS REST GOLF GROUP - ADD EXISTING PLAYERS
-- =====================================================
-- This script adds all users with clubAffiliation = 'Travellers Rest Golf Group'
-- to the society_members table and updates their society_id
--
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Get the Travellers Rest society UUID
DO $$
DECLARE
  trgg_society_id UUID;
  affected_users INT := 0;
  affected_members INT := 0;
BEGIN
  -- Find Travellers Rest society ID
  SELECT id INTO trgg_society_id
  FROM public.society_profiles
  WHERE society_name ILIKE '%Travellers Rest%'
     OR organizer_id = 'trgg-pattaya'
  LIMIT 1;

  -- Check if society was found
  IF trgg_society_id IS NULL THEN
    RAISE EXCEPTION 'Travellers Rest Golf Group society not found in society_profiles table!';
  END IF;

  RAISE NOTICE 'Found Travellers Rest society: %', trgg_society_id;

  -- Step 2: Update all user_profiles with clubAffiliation = 'Travellers Rest Golf Group'
  -- Set their society_id and society_name
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

  -- Step 3: Insert into society_members table (avoid duplicates)
  INSERT INTO public.society_members (
    society_id,
    golfer_id,
    joined_date,
    status,
    member_data
  )
  SELECT
    trgg_society_id,
    up.line_user_id,
    COALESCE(
      (up.profile_data->'golfInfo'->>'memberSince')::date,
      up.created_at::date,
      CURRENT_DATE
    ) as joined_date,
    'active' as status,
    jsonb_build_object(
      'name', up.name,
      'handicap', up.profile_data->'golfInfo'->'handicap',
      'homeClub', up.profile_data->'golfInfo'->>'homeClub',
      'email', up.email,
      'phone', up.phone
    ) as member_data
  FROM public.user_profiles up
  WHERE
    (
      up.profile_data->'golfInfo'->>'clubAffiliation' = 'Travellers Rest Golf Group'
      OR up.profile_data->'golfInfo'->>'clubAffiliation' ILIKE '%Traveller%Rest%'
      OR up.profile_data->'organizationInfo'->>'societyName' ILIKE '%Traveller%Rest%'
      OR up.society_id = trgg_society_id
    )
    -- Only insert if not already exists
    AND NOT EXISTS (
      SELECT 1 FROM public.society_members sm
      WHERE sm.society_id = trgg_society_id
        AND sm.golfer_id = up.line_user_id
    );

  GET DIAGNOSTICS affected_members = ROW_COUNT;
  RAISE NOTICE 'Inserted % new members into society_members table', affected_members;

  -- Step 4: Summary report
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '  - Society ID: %', trgg_society_id;
  RAISE NOTICE '  - Updated user profiles: %', affected_users;
  RAISE NOTICE '  - Created society memberships: %', affected_members;
  RAISE NOTICE '========================================';

END $$;

-- Verification Query: Check the results
SELECT
  '=== TRAVELLERS REST MEMBERS ===' as section,
  up.name,
  up.line_user_id,
  up.society_name,
  up.profile_data->'golfInfo'->>'handicap' as handicap,
  up.profile_data->'golfInfo'->>'homeClub' as home_club,
  sm.joined_date,
  sm.status
FROM public.user_profiles up
JOIN public.society_members sm ON sm.golfer_id = up.line_user_id
WHERE sm.society_id = (
  SELECT id FROM public.society_profiles
  WHERE society_name ILIKE '%Travellers Rest%'
  LIMIT 1
)
ORDER BY up.name;

-- Count verification
SELECT
  'Total Travellers Rest Members' as metric,
  COUNT(*) as count
FROM public.society_members
WHERE society_id = (
  SELECT id FROM public.society_profiles
  WHERE society_name ILIKE '%Travellers Rest%'
  LIMIT 1
);
