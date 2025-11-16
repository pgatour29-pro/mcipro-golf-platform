-- ============================================================================
-- UPDATE CADDY PHOTOS - Add photo URLs to existing caddies
-- ============================================================================
-- Maps existing caddy images to caddy profiles
-- Images located in: /images/caddies/caddy1.jpg through caddy50.jpg
-- ============================================================================

-- Update Pattana Golf Resort caddies (PAT001-PAT020) with photos 1-20
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

-- Update Burapha Golf Club caddies (BUR001-BUR020) with photos 21-40
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy21.jpg' WHERE caddy_number = 'BUR001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy22.jpg' WHERE caddy_number = 'BUR002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy23.jpg' WHERE caddy_number = 'BUR003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy24.jpg' WHERE caddy_number = 'BUR004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy25.jpg' WHERE caddy_number = 'BUR005';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy26.jpg' WHERE caddy_number = 'BUR006';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy27.jpg' WHERE caddy_number = 'BUR007';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy28.jpg' WHERE caddy_number = 'BUR008';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy29.jpg' WHERE caddy_number = 'BUR009';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy30.jpg' WHERE caddy_number = 'BUR010';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy31.jpg' WHERE caddy_number = 'BUR011';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy32.jpg' WHERE caddy_number = 'BUR012';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy33.jpg' WHERE caddy_number = 'BUR013';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy34.jpg' WHERE caddy_number = 'BUR014';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy35.jpg' WHERE caddy_number = 'BUR015';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy36.jpg' WHERE caddy_number = 'BUR016';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy37.jpg' WHERE caddy_number = 'BUR017';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy38.jpg' WHERE caddy_number = 'BUR018';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy39.jpg' WHERE caddy_number = 'BUR019';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy40.jpg' WHERE caddy_number = 'BUR020';

-- Update Phoenix Gold caddies (PHX001-PHX005) with photos 41-45
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy41.jpg' WHERE caddy_number = 'PHX001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy42.jpg' WHERE caddy_number = 'PHX002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy43.jpg' WHERE caddy_number = 'PHX003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy44.jpg' WHERE caddy_number = 'PHX004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy45.jpg' WHERE caddy_number = 'PHX005';

-- Update Khao Kheow caddies (KHK001-KHK005) with photos 46-50
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy46.jpg' WHERE caddy_number = 'KHK001';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy47.jpg' WHERE caddy_number = 'KHK002';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy48.jpg' WHERE caddy_number = 'KHK003';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy49.jpg' WHERE caddy_number = 'KHK004';
UPDATE caddy_profiles SET photo_url = '/images/caddies/caddy50.jpg' WHERE caddy_number = 'KHK005';

-- Verify photos were added
SELECT
    caddy_number,
    name,
    course_name,
    photo_url,
    CASE
        WHEN photo_url IS NOT NULL THEN '✅ Has Photo'
        ELSE '❌ No Photo'
    END as photo_status
FROM caddy_profiles
ORDER BY caddy_number;

-- Summary
SELECT
    course_name,
    COUNT(*) as total_caddies,
    COUNT(photo_url) as with_photos,
    COUNT(*) - COUNT(photo_url) as missing_photos
FROM caddy_profiles
GROUP BY course_name
ORDER BY course_name;
