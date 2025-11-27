-- Verify current state of all society logos
-- Run this to check if logos are set correctly

SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    CASE
        WHEN society_logo IS NULL THEN '❌ NULL - No logo set'
        WHEN society_logo LIKE 'data:image%' THEN '❌ BASE64 - CORRUPTED (needs fix)'
        WHEN society_logo LIKE './societylogos/%' THEN '✅ Static file path - OK'
        WHEN society_logo LIKE 'https://%' THEN '✅ Supabase URL - OK'
        ELSE '⚠️  Unknown format'
    END as logo_status,
    LENGTH(society_logo) as logo_length,
    created_at,
    updated_at
FROM society_profiles
ORDER BY society_name;

-- Check for corrupted base64 data
SELECT
    organizer_id,
    society_name,
    'CORRUPTED: Has base64 data instead of file path' as issue,
    SUBSTRING(society_logo, 1, 50) || '...' as logo_preview
FROM society_profiles
WHERE society_logo LIKE 'data:image%';

-- Expected valid logos
SELECT
    '✅ Expected valid logos:' as info,
    'Travellers Rest Golf Group' as society,
    'U2b6d976f19bca4b2f4374ae0e10ed873' as organizer_id,
    './societylogos/trgg.jpg' as expected_logo
UNION ALL
SELECT
    '✅ Expected valid logos:',
    'JOA Golf Pattaya',
    'JOAGOLFPAT',
    './societylogos/JOAgolf.jpeg'
UNION ALL
SELECT
    '✅ Expected valid logos:',
    'Ora Ora Golf',
    'ora-ora-golf',
    './societylogos/oraora.png';
