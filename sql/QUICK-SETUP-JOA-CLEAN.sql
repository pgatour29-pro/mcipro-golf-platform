-- =====================================================
-- QUICK SETUP: JOA Golf Pattaya Society Access
-- =====================================================
-- Copy each section below and run in Supabase SQL Editor
-- Replace YOUR_LINE_USER_ID with your actual LINE user ID

-- =====================================================
-- STEP 1: Create JOA Golf Pattaya Society Profile
-- =====================================================

INSERT INTO society_profiles (organizer_id, society_name, society_logo, description)
VALUES (
    'JOAGOLFPAT',
    'JOA Golf Pattaya',
    './societylogos/JOAgolf.jpeg',
    'JOA Golf Pattaya Society - Weekly tournaments and events'
)
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify it was created and get the UUID
SELECT id, organizer_id, society_name, society_logo FROM society_profiles WHERE organizer_id = 'JOAGOLFPAT';


-- =====================================================
-- STEP 2: Grant Yourself Access
-- =====================================================
-- IMPORTANT: Replace 'YOUR_LINE_USER_ID' below with your actual LINE user ID

UPDATE user_profiles
SET
    role = 'society_organizer',
    society_id = (SELECT id FROM society_profiles WHERE organizer_id = 'JOAGOLFPAT'),
    society_name = 'JOA Golf Pattaya',
    updated_at = NOW()
WHERE line_user_id = 'YOUR_LINE_USER_ID';


-- =====================================================
-- STEP 3: Verify the Update
-- =====================================================
-- IMPORTANT: Replace 'YOUR_LINE_USER_ID' below with your actual LINE user ID

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
WHERE up.line_user_id = 'YOUR_LINE_USER_ID';
