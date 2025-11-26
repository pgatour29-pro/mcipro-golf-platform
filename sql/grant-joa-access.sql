-- Grant JOA Golf Pattaya Society Organizer Access
-- Run this SQL in Supabase SQL Editor
-- Replace 'YOUR_LINE_USER_ID' with the actual LINE user ID

-- STEP 1: Find your LINE user ID
-- (Run this first to get your LINE ID if you don't know it)
SELECT line_user_id, name, email, role, society_name
FROM user_profiles
WHERE name ILIKE '%your_name%'  -- Replace with your actual name
ORDER BY created_at DESC;

-- STEP 2: Get the JOA Golf Pattaya society UUID
-- (This returns the UUID we need for society_id)
SELECT id, organizer_id, society_name, society_logo
FROM society_profiles
WHERE organizer_id = 'JOAGOLFPAT';

-- If the query above returns no results, run create-joa-society.sql first!

-- STEP 3: Update your profile to be a society organizer for JOA Golf Pattaya
-- Replace 'YOUR_LINE_USER_ID' with your LINE user ID from Step 1
-- IMPORTANT: society_id must be the UUID from Step 2, not 'JOAGOLFPAT'
UPDATE user_profiles
SET
    role = 'society_organizer',
    society_id = (SELECT id FROM society_profiles WHERE organizer_id = 'JOAGOLFPAT'),
    society_name = 'JOA Golf Pattaya',
    updated_at = NOW()
WHERE line_user_id = 'YOUR_LINE_USER_ID';  -- Replace with your actual LINE user ID

-- STEP 4: Verify the update
SELECT
    up.line_user_id,
    up.name,
    up.role,
    up.society_id,
    up.society_name,
    sp.organizer_id,
    sp.society_logo
FROM user_profiles up
LEFT JOIN society_profiles sp ON up.society_id = sp.id
WHERE up.line_user_id = 'YOUR_LINE_USER_ID';  -- Replace with your actual LINE user ID
