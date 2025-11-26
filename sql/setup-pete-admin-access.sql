-- =====================================================================
-- SETUP PETE'S ADMIN ACCESS TO ALL SOCIETIES (TRGG + JOA)
-- =====================================================================
-- LINE User ID: pgatour29
-- This script creates both societies and sets Pete as admin
-- =====================================================================

BEGIN;

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

-- STEP 2: Ensure TRGG exists in society_profiles
INSERT INTO society_profiles (organizer_id, society_name, society_logo, description)
VALUES (
    'U2b6d976f19bca4b2f4374ae0e10ed873',
    'Travellers Rest Golf Group',
    './societylogos/trgg.jpg',
    'Travellers Rest Golf Group - Regular tournaments and social golf events'
)
ON CONFLICT (organizer_id) DO UPDATE SET
    society_name = EXCLUDED.society_name,
    society_logo = EXCLUDED.society_logo,
    updated_at = NOW();

-- STEP 3: Set Pete's role to 'admin' so he can access all societies
UPDATE user_profiles
SET
    role = 'admin',
    updated_at = NOW()
WHERE line_user_id = 'pgatour29';

COMMIT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Show all societies (should see TRGG + JOA)
SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    created_at
FROM society_profiles
ORDER BY society_name;

-- Show Pete's profile (should have role = 'admin')
SELECT
    line_user_id,
    name,
    role,
    email,
    society_name
FROM user_profiles
WHERE line_user_id = 'pgatour29';

-- =====================================================================
-- EXPECTED RESULTS:
-- =====================================================================
-- 1. Two societies in society_profiles:
--    - JOA Golf Pattaya (JOAGOLFPAT)
--    - Travellers Rest Golf Group (U2b6d976f19bca4b2f4374ae0e10ed873)
--
-- 2. Pete's profile:
--    - line_user_id: pgatour29
--    - role: admin
--
-- 3. After reloading MciPro app:
--    - Dev Tools → Switch to "Society Organizer"
--    - Society selector modal appears with both TRGG and JOA
--    - Can switch between societies anytime
-- =====================================================================
