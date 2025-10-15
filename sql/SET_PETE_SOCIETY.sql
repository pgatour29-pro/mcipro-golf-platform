-- Set Pete Park's society affiliation to Travellers Rest Golf

BEGIN;

-- Update Pete's profile with society data
UPDATE user_profiles
SET
    society_name = 'Travellers Rest Golf',
    home_course_name = COALESCE(home_course_name, home_club, 'Travellers Rest Golf')
WHERE name ILIKE '%Pete%' OR name ILIKE '%Park%';

COMMIT;

-- Verify the update
SELECT
    name,
    society_name,
    home_course_name,
    home_club
FROM user_profiles
WHERE name ILIKE '%Pete%';
