-- Check EXACTLY what data exists in Pete's profile right now

SELECT
    line_user_id,
    name,
    role,

    -- Old column
    home_club,

    -- New columns
    home_course_id,
    home_course_name,
    society_id,
    society_name,

    -- JSONB paths
    profile_data->'golfInfo'->>'homeClub' as jsonb_home_club,
    profile_data->'golfInfo'->>'homeCourseId' as jsonb_home_course_id,
    profile_data->'organizationInfo'->>'societyName' as jsonb_society_name,

    -- Full JSONB
    profile_data

FROM user_profiles
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
