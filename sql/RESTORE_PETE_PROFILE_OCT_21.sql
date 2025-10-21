-- =====================================================================
-- RESTORE PETE'S PROFILE - EXACT FIX FROM OCT 11 + SOCIETY INFO
-- =====================================================================
-- This is the EXACT same SQL that fixed it on Oct 11, 2025
-- Plus organizationInfo for society name
--
-- Run in Supabase: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor
-- =====================================================================

UPDATE user_profiles
SET
    profile_data = jsonb_set(
        jsonb_set(
            jsonb_set(
                COALESCE(profile_data, '{}'::jsonb),
                '{golfInfo}',
                '{"handicap": "1", "homeClub": "Pattana Golf Resort & Spa", "clubAffiliation": "Travellers Rest Golf Group"}'::jsonb
            ),
            '{personalInfo}',
            jsonb_build_object(
                'username', '007',
                'firstName', 'Pete',
                'lastName', 'Park',
                'email', COALESCE(profile_data->'personalInfo'->>'email', ''),
                'phone', COALESCE(profile_data->'personalInfo'->>'phone', '')
            )
        ),
        '{organizationInfo}',
        '{"societyName": "Travellers Rest Golf Group", "societyId": null, "clubAffiliation": "Travellers Rest Golf Group"}'::jsonb
    ),
    username = '007',

    -- Also update the dedicated columns (from the Oct 16 migration)
    home_course_name = 'Pattana Golf Resort & Spa',
    home_club = 'Pattana Golf Resort & Spa',
    society_name = 'Travellers Rest Golf Group'

WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================

SELECT
    line_user_id,
    name,
    username,

    -- Dedicated columns
    home_course_name as column_home_course,
    society_name as column_society,
    home_club as column_old_home_club,

    -- JSONB data
    profile_data->'golfInfo' as jsonb_golf_info,
    profile_data->'organizationInfo' as jsonb_org_info,
    profile_data->'personalInfo' as jsonb_personal_info

FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
