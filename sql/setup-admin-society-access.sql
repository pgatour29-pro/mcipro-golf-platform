-- =====================================================================
-- SETUP ADMIN ACCESS TO ALL SOCIETIES (TRGG + JOA)
-- =====================================================================
-- This creates JOA society and ensures Pete has admin role
-- Admins can access ALL society dashboards via the selector
-- =====================================================================

-- STEP 1: Create JOA Golf Pattaya in society_profiles
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description)
VALUES (
    'JOAGOLFPAT',
    'JOA Golf Pattaya',
    './societylogos/JOAgolf.jpeg',
    'JOA Golf Pattaya Society - Weekly tournaments and events in the Pattaya area'
)
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    description = EXCLUDED.description,
    updated_at = NOW();

-- STEP 2: Verify TRGG exists in society_profiles
-- (Insert if it doesn't exist)
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description)
VALUES (
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Travellers Rest Golf Group',
    './societylogos/trgg.jpg',
    'Travellers Rest Golf Group - Regular tournaments and social golf events'
)
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    updated_at = NOW();

-- STEP 3: Set Pete's role to 'admin' so he can access all societies
-- Replace 'YOUR_LINE_USER_ID' with Pete's actual LINE user ID
UPDATE user_profiles
SET
    role = 'admin',
    updated_at = NOW()
WHERE line_user_id = 'YOUR_LINE_USER_ID';  -- Replace with Pete's LINE ID


-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Show all societies
SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    description,
    created_at
FROM society_profiles
ORDER BY society_name;

-- Show Pete's profile
SELECT
    line_user_id,
    name,
    role,
    email
FROM user_profiles
WHERE line_user_id = 'YOUR_LINE_USER_ID';  -- Replace with Pete's LINE ID


-- =====================================================================
-- HOW IT WORKS
-- =====================================================================
-- 1. Society selector (society-selector-modal.js) queries society_profiles
-- 2. If user role = 'admin' or 'super_admin', shows ALL societies
-- 3. If user role = 'society_organizer', shows only THEIR society
-- 4. Admin can switch between TRGG and JOA dashboards via selector modal
-- 5. Selection is stored in localStorage for next session
-- =====================================================================
