-- Restore Pete Park's profile data with handicap and home club
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor

UPDATE user_profiles
SET
    profile_data = jsonb_set(
        jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{golfInfo}',
            '{"handicap": "1", "homeClub": "Pattana Golf Resort & Spa", "clubAffiliation": "Travellers Rest Group"}'::jsonb
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
    username = '007'
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- Verify the update
SELECT
    line_user_id,
    username,
    profile_data->'golfInfo' as golf_info,
    profile_data->'personalInfo' as personal_info
FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
