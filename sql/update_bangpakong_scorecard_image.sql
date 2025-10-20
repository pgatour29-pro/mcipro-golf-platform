-- Update Bangpakong scorecard image URL to the clean version
-- Date: 2025-10-20
-- Issue: Old scorecard image has writing on it, need to use clean image

UPDATE courses
SET scorecard_url = '/scorecard_profiles/Bangpakongriversidecountryclub.jpg'
WHERE id = 'bangpakong';

-- Verify the update
SELECT id, name, scorecard_url
FROM courses
WHERE id = 'bangpakong';

-- Expected result:
-- id: bangpakong
-- name: Bangpakong Riverside Country Club
-- scorecard_url: /scorecard_profiles/Bangpakongriversidecountryclub.jpg
--
-- NOTE: After running this SQL, clear the course cache:
-- localStorage.removeItem('mcipro_course_bangpakong');
-- localStorage.removeItem('mcipro_course_version_bangpakong');
-- Then hard refresh the page
