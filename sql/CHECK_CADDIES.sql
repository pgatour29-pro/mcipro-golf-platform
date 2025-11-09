-- Quick check for caddy data
SELECT '=== CADDIES TABLE ===' as info;

-- Check if table exists
SELECT COUNT(*) as total_caddies
FROM caddies;

-- Check available caddies
SELECT COUNT(*) as available_caddies
FROM caddies
WHERE availability_status = 'available';

-- Show sample caddies
SELECT
    id,
    name,
    home_club_id,
    home_club_name,
    availability_status,
    rating
FROM caddies
LIMIT 10;

-- Check caddy_profiles (for Personal Organizer)
SELECT '=== CADDY_PROFILES TABLE ===' as info;

SELECT COUNT(*) as total_profiles
FROM caddy_profiles;

SELECT COUNT(*) as active_profiles
FROM caddy_profiles
WHERE is_active = true;

-- Show sample profiles
SELECT
    id,
    name,
    course_name,
    rating,
    is_active
FROM caddy_profiles
LIMIT 10;
