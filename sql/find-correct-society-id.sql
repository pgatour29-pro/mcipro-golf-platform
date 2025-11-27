-- =====================================================
-- FIND CORRECT SOCIETY_ID FOR TRAVELLERS REST
-- =====================================================

-- 1. List all societies to find Travellers Rest
SELECT
    id,
    name,
    organizer_id,
    created_at
FROM societies
ORDER BY name;

-- 2. Find Travellers Rest specifically
SELECT
    id,
    name,
    organizer_id
FROM societies
WHERE name LIKE '%Traveller%' OR name LIKE '%TRGG%';

-- 3. Check relationship between societies and society_profiles
SELECT
    s.id as society_id,
    s.name as society_name,
    s.organizer_id,
    sp.id as profile_id,
    sp.society_name as profile_society_name,
    sp.organizer_id as profile_organizer_id
FROM societies s
LEFT JOIN society_profiles sp ON sp.organizer_id = 'trgg-pattaya'
WHERE s.name LIKE '%Traveller%' OR sp.society_name LIKE '%Traveller%';
