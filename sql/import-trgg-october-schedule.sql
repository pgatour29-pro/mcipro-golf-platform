-- =====================================================
-- IMPORT TRGG PATTAYA OCTOBER 2025 SCHEDULE
-- =====================================================
-- Imports golf events from TRGG Pattaya schedule
-- Date range: October 20-31, 2025
-- Source: www.trggpattaya.com/schedule/
-- =====================================================

-- Insert TRGG October events into society_events table
INSERT INTO society_events (
  id,
  name,
  date,
  start_time,
  base_fee,
  cart_fee,
  caddy_fee,
  max_players,
  organizer_id,
  organizer_name,
  status,
  course_id,
  course_name,
  notes,
  cutoff,
  auto_waitlist,
  recurring,
  created_at,
  updated_at
) VALUES

-- October 20, 2025 - Monday - Pattaya C.C.
(
  'trgg-2025-10-20-pattaya-cc',
  'TRGG - Pattaya C.C.',
  '2025-10-20',
  '09:20',
  1950,
  0, -- INCL in base fee
  0, -- INCL in base fee
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  'pattaya_country_club',
  'Pattaya C.C.',
  'Departure: 08:30 | First Tee: 09:20 | Cart & Caddy included',
  '2025-10-19 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 21, 2025 - Tuesday - Treasure Hill
(
  'trgg-2025-10-21-treasure-hill',
  'TRGG - Treasure Hill',
  '2025-10-21',
  '10:30',
  1750,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Treasure Hill',
  'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included',
  '2025-10-20 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 22, 2025 - Wednesday - Pleasant Valley
(
  'trgg-2025-10-22-pleasant-valley',
  'TRGG - Pleasant Valley',
  '2025-10-22',
  '10:40',
  1850,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Pleasant Valley',
  'Departure: 09:30 | First Tee: 10:40 | Cart & Caddy included',
  '2025-10-21 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 23, 2025 - Thursday - Khao Kheow
(
  'trgg-2025-10-23-khao-kheow',
  'TRGG - Khao Kheow',
  '2025-10-23',
  '10:30',
  2050,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  'khao_kheow',
  'Khao Kheow',
  'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included',
  '2025-10-22 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 24, 2025 - Friday - Burapha Two Man Scramble
(
  'trgg-2025-10-24-burapha-scramble',
  'TRGG - Burapha Two Man Scramble',
  '2025-10-24',
  '10:00',
  2550,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Burapha',
  'Departure: 09:00 | First Tee: 10:00 | TWO MAN SCRAMBLE | Cart & Caddy included',
  '2025-10-23 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 25, 2025 - Saturday - Greenwood
(
  'trgg-2025-10-25-greenwood',
  'TRGG - Greenwood',
  '2025-10-25',
  '12:50',
  1850,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Greenwood',
  'Departure: 11:30 | First Tee: 12:50 | Cart & Caddy included',
  '2025-10-24 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 27, 2025 - Monday - Pattaya C.C.
(
  'trgg-2025-10-27-pattaya-cc',
  'TRGG - Pattaya C.C.',
  '2025-10-27',
  '09:20',
  1950,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  'pattaya_country_club',
  'Pattaya C.C.',
  'Departure: 08:30 | First Tee: 09:20 | Cart & Caddy included',
  '2025-10-26 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 28, 2025 - Tuesday - Royal Lakeside
(
  'trgg-2025-10-28-royal-lakeside',
  'TRGG - Royal Lakeside',
  '2025-10-28',
  '09:35',
  2250,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Royal Lakeside',
  'Departure: 08:15 | First Tee: 09:35 | Cart & Caddy included',
  '2025-10-27 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 29, 2025 - Wednesday - Bangpra Monthly Medal Stroke
(
  'trgg-2025-10-29-bangpra-medal',
  'TRGG - Bangpra Monthly Medal Stroke',
  '2025-10-29',
  '11:30',
  1650,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Bangpra',
  'Departure: 10:15 | First Tee: 11:30 | MONTHLY MEDAL STROKE | Cart & Caddy included',
  '2025-10-28 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 30, 2025 - Thursday - Phoenix
(
  'trgg-2025-10-30-phoenix',
  'TRGG - Phoenix',
  '2025-10-30',
  '11:00',
  2350,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Phoenix',
  'Departure: 10:00 | First Tee: 11:00 | Cart & Caddy included',
  '2025-10-29 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- October 31, 2025 - Friday - Burapha Free Food Friday
(
  'trgg-2025-10-31-burapha-fff',
  'TRGG - Burapha Free Food Friday',
  '2025-10-31',
  '10:00',
  2250,
  0,
  0,
  80,
  'trgg-pattaya',
  'Travellers Rest Golf Group',
  'open',
  null,
  'Burapha',
  'Departure: 09:00 | First Tee: 10:00 | FREE FOOD FRIDAY | Cart & Caddy included',
  '2025-10-30 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Count imported events
SELECT
  'TRGG October Events Imported' as status,
  COUNT(*) as total_events
FROM society_events
WHERE organizer_id = 'trgg-pattaya'
  AND date >= '2025-10-20'
  AND date <= '2025-10-31';

-- Show all imported events
SELECT
  id,
  date,
  name,
  course_name,
  start_time,
  base_fee,
  status
FROM society_events
WHERE organizer_id = 'trgg-pattaya'
  AND date >= '2025-10-20'
  AND date <= '2025-10-31'
ORDER BY date;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '=============================================' as message
UNION ALL SELECT 'TRGG Pattaya October 2025 Schedule Imported'
UNION ALL SELECT '============================================='
UNION ALL SELECT '11 events added (October 20-31)'
UNION ALL SELECT 'Organizer: Travellers Rest Golf Group'
UNION ALL SELECT 'Status: All events set to OPEN'
UNION ALL SELECT 'Max Players: 80 per event'
UNION ALL SELECT '============================================='
UNION ALL SELECT 'Next: View events in Society Organizer UI'
UNION ALL SELECT '=============================================';
