-- ============================================================================
-- SAFE RESTORATION - PETE PARK ONLY - NO ASSUMPTIONS ABOUT COLUMNS
-- This script ONLY restores Pete's data with columns we KNOW exist
-- ============================================================================

BEGIN;

-- ============================================================================
-- RESTORE PETE PARK - ABSOLUTE MINIMUM
-- ============================================================================

UPDATE user_profiles
SET
    name = 'Pete Park',
    username = '007',
    role = 'golfer',
    profile_data = jsonb_build_object(
        'personalInfo', jsonb_build_object(
            'firstName', 'Pete',
            'lastName', 'Park',
            'username', '007'
        ),
        'golfInfo', jsonb_build_object(
            'handicap', '2',
            'homeClub', 'Pattaya CC Golf',
            'clubAffiliation', 'Travellers Rest Golf Group'
        ),
        'organizationInfo', jsonb_build_object(
            'societyName', 'Travellers Rest Golf Group'
        )
    ),
    updated_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- If Pete doesn't exist, create him with MINIMAL fields
INSERT INTO user_profiles (line_user_id, name, role, created_at, updated_at)
SELECT
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Pete Park',
    'golfer',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
);

-- Now update with full data
UPDATE user_profiles
SET
    username = '007',
    profile_data = jsonb_build_object(
        'personalInfo', jsonb_build_object(
            'firstName', 'Pete',
            'lastName', 'Park',
            'username', '007'
        ),
        'golfInfo', jsonb_build_object(
            'handicap', '2',
            'homeClub', 'Pattaya CC Golf',
            'clubAffiliation', 'Travellers Rest Golf Group'
        ),
        'organizationInfo', jsonb_build_object(
            'societyName', 'Travellers Rest Golf Group'
        )
    ),
    updated_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    '✅ PETE PARK RESTORED' AS status,
    line_user_id,
    name,
    username,
    role,
    profile_data->'personalInfo' as personal_info,
    profile_data->'golfInfo' as golf_info,
    profile_data->'organizationInfo' as organization_info
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '✅ PETE PARK RESTORED SUCCESSFULLY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Data restored:';
    RAISE NOTICE '  - Name: Pete Park';
    RAISE NOTICE '  - Username: 007';
    RAISE NOTICE '  - Handicap: 2';
    RAISE NOTICE '  - Home Club: Pattaya CC Golf';
    RAISE NOTICE '  - Society: Travellers Rest Golf Group';
    RAISE NOTICE '';
    RAISE NOTICE 'All data is in profile_data JSONB column';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;
