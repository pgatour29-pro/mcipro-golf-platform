-- One-time sync 2026-08-02: real caddies from Pete's My Caddies notebook (caddy_notebook)
-- into the booking module roster (caddy_profiles). Mock rows (is_mock=true) untouched.
-- Keyed number+course per standing rule. Photos only fill NULL slots (never overwrite).

-- 1) Photo fill on existing real (is_mock=false) rows imported 2026-07-03 (all have photo_url NULL)
UPDATE caddy_profiles p SET photo_url = v.photo, updated_at = now()
FROM (VALUES
  ('8',   'eastern_star',        'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576390481.jpg'),
  ('15',  'pattaya_county',      'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785632693991.jpg'),
  ('84',  'hermes',              'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576337824.jpg'),
  ('139', 'pattavia',            'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576369621.jpg'),
  ('177', 'green_valley_rayong', 'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785632682492.jpg'),
  ('243', 'bangpakong',          'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576382773.jpg'),
  ('363', 'green_valley_rayong', 'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576374136.jpg')
) AS v(num, cid, photo)
WHERE p.is_mock = false
  AND p.caddy_number = v.num
  AND p.course_id = v.cid
  AND p.photo_url IS NULL;

-- 2) Insert notebook caddies not yet in the roster (QATest test row excluded)
INSERT INTO caddy_profiles (id, name, caddy_number, course_id, course_name, photo_url,
                            is_active, is_mock, bio, created_at, updated_at)
SELECT gen_random_uuid(), v.name, v.num, v.cid, c.name, v.photo,
       true, false, 'Imported from My Caddies notebook 2026-08-02', now(), now()
FROM (VALUES
  ('Caddy #21',  '21',  'burapha',             'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576449387.jpg'),
  ('Caddy #33',  '33',  'pleasant_valley',     'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576458445.jpg'),
  ('Caddy #45',  '45',  'pattaya_county',      NULL),
  ('Caddy #72',  '72',  'royal_lakeside',      'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576473166.jpg'),
  ('Caddy #109', '109', 'pattaya_county',      'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576318214.jpg'),
  ('Peary',      '148', 'royal_lakeside',      'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785632938154.jpg'),
  ('Caddy #162', '162', 'pattavia',            'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785576405146.jpg'),
  ('Caddy #167', '167', 'green_valley_rayong', NULL),
  ('Pumz',       '183', 'bangpra',             'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785653702645.jpg'),
  ('Numin',      '395', 'plutaluang',          'https://pyeeplwsnupmhgbguwqs.supabase.co/storage/v1/object/public/caddy_photos/notebook/U2b6d976f19bca4b2f4374ae0e10ed873_1785653549840.jpg')
) AS v(name, num, cid, photo)
JOIN courses c ON c.id = v.cid
WHERE NOT EXISTS (
  SELECT 1 FROM caddy_profiles p
  WHERE p.is_mock = false AND p.caddy_number = v.num AND p.course_id = v.cid
);

-- 3) Verify
SELECT is_mock, count(*) AS rows, count(photo_url) AS with_photo
FROM caddy_profiles GROUP BY is_mock ORDER BY is_mock;
