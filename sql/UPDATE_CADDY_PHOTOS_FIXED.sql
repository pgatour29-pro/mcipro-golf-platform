-- ============================================================================
-- UPDATE CADDY PHOTOS - FIXED VERSION
-- ============================================================================
-- You have 25 caddy images (caddy1-25.jpg) + 25 screenshot images
-- This maps them to your 50 caddies
-- ============================================================================

-- Clear old incorrect photo URLs first
UPDATE caddy_profiles SET photo_url = NULL;

-- Update Pattana Golf Resort caddies (PAT001-PAT020) with caddy1-20.jpg
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy1.jpg' WHERE caddy_number = 'PAT001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy2.jpg' WHERE caddy_number = 'PAT002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy3.jpg' WHERE caddy_number = 'PAT003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy4.jpg' WHERE caddy_number = 'PAT004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy5.jpg' WHERE caddy_number = 'PAT005';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy6.jpg' WHERE caddy_number = 'PAT006';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy7.jpg' WHERE caddy_number = 'PAT007';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy8.jpg' WHERE caddy_number = 'PAT008';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy9.jpg' WHERE caddy_number = 'PAT009';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy10.jpg' WHERE caddy_number = 'PAT010';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy11.jpg' WHERE caddy_number = 'PAT011';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy12.jpg' WHERE caddy_number = 'PAT012';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy13.jpg' WHERE caddy_number = 'PAT013';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy14.jpg' WHERE caddy_number = 'PAT014';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy15.jpg' WHERE caddy_number = 'PAT015';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy16.jpg' WHERE caddy_number = 'PAT016';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy17.jpg' WHERE caddy_number = 'PAT017';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy18.jpg' WHERE caddy_number = 'PAT018';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy19.jpg' WHERE caddy_number = 'PAT019';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy20.jpg' WHERE caddy_number = 'PAT020';

-- Update Burapha Golf Club caddies (BUR001-BUR020) with caddy21-25.jpg + screenshots
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy21.jpg' WHERE caddy_number = 'BUR001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy22.jpg' WHERE caddy_number = 'BUR002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy23.jpg' WHERE caddy_number = 'BUR003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy24.jpg' WHERE caddy_number = 'BUR004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy25.jpg' WHERE caddy_number = 'BUR005';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213011.jpg' WHERE caddy_number = 'BUR006';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213040.jpg' WHERE caddy_number = 'BUR007';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213103.jpg' WHERE caddy_number = 'BUR008';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213124.jpg' WHERE caddy_number = 'BUR009';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213137.jpg' WHERE caddy_number = 'BUR010';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213151.jpg' WHERE caddy_number = 'BUR011';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213205.jpg' WHERE caddy_number = 'BUR012';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213220.jpg' WHERE caddy_number = 'BUR013';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213233.jpg' WHERE caddy_number = 'BUR014';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213257.jpg' WHERE caddy_number = 'BUR015';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213311.jpg' WHERE caddy_number = 'BUR016';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213327.jpg' WHERE caddy_number = 'BUR017';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213340.jpg' WHERE caddy_number = 'BUR018';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213356.jpg' WHERE caddy_number = 'BUR019';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213434.jpg' WHERE caddy_number = 'BUR020';

-- Update Phoenix Gold caddies (PHX001-PHX005) with screenshots
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213447.jpg' WHERE caddy_number = 'PHX001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213500.jpg' WHERE caddy_number = 'PHX002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213525.jpg' WHERE caddy_number = 'PHX003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213759.jpg' WHERE caddy_number = 'PHX004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213818.jpg' WHERE caddy_number = 'PHX005';

-- Update Khao Kheow caddies (KHK001-KHK005) with screenshots
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213834.jpg' WHERE caddy_number = 'KHK001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213850.jpg' WHERE caddy_number = 'KHK002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213904.jpg' WHERE caddy_number = 'KHK003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213918.jpg' WHERE caddy_number = 'KHK004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/Screenshot 2025-10-04 213932.jpg' WHERE caddy_number = 'KHK005';

-- Verify all 50 caddies have photos
SELECT
    caddy_number,
    name,
    course_name,
    CASE
        WHEN photo_url IS NOT NULL THEN '✅ Has Photo'
        ELSE '❌ No Photo'
    END as photo_status,
    photo_url
FROM caddy_profiles
ORDER BY caddy_number;

-- Summary by course
SELECT
    course_name,
    COUNT(*) as total_caddies,
    COUNT(photo_url) as with_photos,
    COUNT(*) - COUNT(photo_url) as missing_photos
FROM caddy_profiles
GROUP BY course_name
ORDER BY course_name;
