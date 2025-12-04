-- Check if Pete and Gilbert have proper profiles

SELECT
    name,
    line_user_id,
    profile_data->'golfInfo'->>'handicap' as handicap
FROM public.user_profiles
WHERE
    name ILIKE '%Pete%Park%'
    OR name ILIKE '%Gilbert%'
    OR name ILIKE '%Tristan%'
    OR line_user_id IN ('TRGG-GUEST-0793', 'TRGG-GUEST-0319');

-- Also check what those guest IDs are
SELECT * FROM public.user_profiles
WHERE line_user_id LIKE 'TRGG-GUEST%';
