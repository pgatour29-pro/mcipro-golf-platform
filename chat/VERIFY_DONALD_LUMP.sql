-- Check if Donald Lump exists now
SELECT
  'Donald Lump Check' as check,
  id,
  username,
  display_name,
  updated_at
FROM profiles
WHERE id = '07dc3f53-468a-4a2a-9baf-c8dfaa4ca365'
   OR display_name ILIKE '%donald%'
   OR display_name ILIKE '%lump%';

-- Show all non-test users (what the frontend sees)
SELECT
  'Non-Test Users' as check,
  id,
  username,
  display_name
FROM profiles
WHERE display_name IS NOT NULL
  AND display_name NOT ILIKE '%test%'
  AND display_name NOT ILIKE '%tester%'
  AND username NOT ILIKE '%test%'
ORDER BY display_name;
