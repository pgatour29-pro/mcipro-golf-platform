-- Grant JOA Golf Pattaya Society Organizer Access
-- Run this SQL in Supabase SQL Editor
-- Replace 'YOUR_LINE_USER_ID' with the actual LINE user ID

-- STEP 1: Find your LINE user ID
-- (Run this first to get your LINE ID if you don't know it)
SELECT line_user_id, name, email, role, society_name
FROM user_profiles
WHERE name ILIKE '%your_name%'  -- Replace with your actual name
ORDER BY created_at DESC;

-- STEP 2: Update your profile to be a society organizer for JOA Golf Pattaya
-- Replace 'YOUR_LINE_USER_ID' with the value from Step 1
UPDATE user_profiles
SET
    role = 'society_organizer',
    society_id = 'JOAGOLFPAT',
    society_name = 'JOA Golf Pattaya',
    updated_at = NOW()
WHERE line_user_id = 'YOUR_LINE_USER_ID';  -- Replace with your actual LINE user ID

-- STEP 3: Verify the update
SELECT line_user_id, name, role, society_id, society_name
FROM user_profiles
WHERE line_user_id = 'YOUR_LINE_USER_ID';  -- Replace with your actual LINE user ID

-- STEP 4: Check that the society profile exists
SELECT * FROM society_profiles WHERE organizer_id = 'JOAGOLFPAT';

-- If the society profile doesn't exist, run the create-joa-society.sql file first!
