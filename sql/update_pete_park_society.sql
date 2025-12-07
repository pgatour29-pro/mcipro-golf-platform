-- =====================================================
-- UPDATE PETE PARK'S SOCIETY AFFILIATION
-- Set society to "Travellers Rest Golf"
-- =====================================================

-- First, let's check current Pete Park profile
SELECT
    line_user_id,
    name,
    society_name,
    society_id,
    profile_data->'golfInfo'->>'handicap' as handicap,
    profile_data->'golfInfo'->>'homeClub' as home_club,
    profile_data->'golfInfo'->>'clubAffiliation' as club_affiliation,
    profile_data->'organizationInfo'->>'societyName' as org_society_name,
    profile_data->'organizationInfo'->>'societyId' as org_society_id
FROM user_profiles
WHERE name ILIKE '%pete%park%'
   OR name ILIKE '%park%pete%';

-- Get the Travellers Rest Golf society ID
SELECT id, society_name, organizer_id
FROM society_profiles
WHERE society_name ILIKE '%travellers%rest%';

-- Update Pete Park's profile with society affiliation
-- Replace 'U2b6d976f19bca4b2f4374ae0e10ed873' with actual LINE user ID if different
-- Replace 'SOCIETY_ID_HERE' with actual society ID from above query
UPDATE user_profiles
SET
    society_name = 'Travellers Rest Golf',
    society_id = (SELECT id FROM society_profiles WHERE society_name ILIKE '%travellers%rest%' LIMIT 1),
    profile_data = jsonb_set(
        jsonb_set(
            jsonb_set(
                profile_data,
                '{golfInfo,clubAffiliation}',
                '"Travellers Rest Golf"'
            ),
            '{organizationInfo,societyName}',
            '"Travellers Rest Golf"'
        ),
        '{organizationInfo,societyId}',
        to_jsonb((SELECT id FROM society_profiles WHERE society_name ILIKE '%travellers%rest%' LIMIT 1)::text)
    )
WHERE name ILIKE '%pete%park%'
   OR name ILIKE '%park%pete%';

-- Verify the update
SELECT
    line_user_id,
    name,
    society_name,
    society_id,
    profile_data->'golfInfo'->>'handicap' as handicap,
    profile_data->'golfInfo'->>'homeClub' as home_club,
    profile_data->'golfInfo'->>'clubAffiliation' as club_affiliation,
    profile_data->'organizationInfo'->>'societyName' as org_society_name,
    profile_data->'organizationInfo'->>'societyId' as org_society_id
FROM user_profiles
WHERE name ILIKE '%pete%park%'
   OR name ILIKE '%park%pete%';
