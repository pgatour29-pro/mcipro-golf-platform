-- =====================================================
-- RESTORE ALL SOCIETY EVENTS - COMPLETE RESTORATION
-- =====================================================
-- Created: 2025-11-01
-- Purpose: Restore all lost society events for TRGG
-- Events: October + November 2025 schedules
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Clean up any partial/duplicate data
-- =====================================================

-- Delete existing October-November events to avoid duplicates
DELETE FROM society_events
WHERE organizer_id IN ('trgg-pattaya', 'U2b6d976f19bca4b2f4374ae0e10ed873')
  AND date >= '2025-10-20'
  AND date <= '2025-11-30';

-- =====================================================
-- STEP 2: RESTORE OCTOBER 2025 EVENTS
-- =====================================================

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
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
  'U2b6d976f19bca4b2f4374ae0e10ed873',
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
),

-- =====================================================
-- STEP 3: RESTORE NOVEMBER 2025 EVENTS
-- =====================================================

-- November 1, 2025 - Greenwood
(
  'trgg-2025-11-01-greenwood',
  'TRGG - GREENWOOD',
  '2025-11-01',
  '12.00',
  1850,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'GREENWOOD',
  'Departure: 10.45 | First Tee: 12.00 | Cart & Caddy included',
  '2025-10-31 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 3, 2025 - Khao Kheow
(
  'trgg-2025-11-03-khao-kheow-khao-kheo',
  'TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A',
  '2025-11-03',
  '11.40',
  2250,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'KHAO KHEOW KHAO KHEOW',
  'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included',
  '2025-11-02 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 4, 2025 - Pleasant Valley
(
  'trgg-2025-11-04-pleasant-valley',
  'TRGG - PLEASANT VALLEY',
  '2025-11-04',
  '10.00',
  2150,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'PLEASANT VALLEY',
  'Departure: 08.45 | First Tee: 10.00 | Cart & Caddy included',
  '2025-11-03 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 5, 2025 - Royal Lakeside
(
  'trgg-2025-11-05-royal-lakeside',
  'TRGG - ROYAL LAKESIDE',
  '2025-11-05',
  '11.20',
  2450,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'ROYAL LAKESIDE',
  'Departure: 10.00 | First Tee: 11.20 | Cart & Caddy included',
  '2025-11-04 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 6, 2025 - Phoenix
(
  'trgg-2025-11-06-phoenix',
  'TRGG - PHOENIX',
  '2025-11-06',
  '09.50',
  2650,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'PHOENIX',
  'Departure: 08.50 | First Tee: 09.50 | Cart & Caddy included',
  '2025-11-05 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 7, 2025 - Burapha Free Food Friday
(
  'trgg-2025-11-07-burapha-free-food-fr',
  'TRGG - BURAPHA A-B FREE FOOD FRIDAY',
  '2025-11-07',
  '10.00',
  2750,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BURAPHA FREE FOOD FRIDAY',
  'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included',
  '2025-11-06 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 8, 2025 - Plutaluang
(
  'trgg-2025-11-08-plutaluang',
  'TRGG - PLUTALUANG',
  '2025-11-08',
  '10.00',
  1750,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'PLUTALUANG',
  'Departure: 08.45 | First Tee: 10.00 | Cart & Caddy included',
  '2025-11-07 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 10, 2025 - Greenwood
(
  'trgg-2025-11-10-greenwood',
  'TRGG - GREENWOOD (2 WAY)',
  '2025-11-10',
  '10.30',
  1750,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'GREENWOOD',
  'Departure: 09.15 | First Tee: 10.30 | Cart & Caddy included',
  '2025-11-09 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 11, 2025 - Eastern Star
(
  'trgg-2025-11-11-eastern-star',
  'TRGG - EASTERN STAR',
  '2025-11-11',
  '10.40',
  2150,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'EASTERN STAR',
  'Departure: 09.40 | First Tee: 10.40 | Cart & Caddy included',
  '2025-11-10 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 12, 2025 - Khao Kheow
(
  'trgg-2025-11-12-khao-kheow-khao-kheo',
  'TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C',
  '2025-11-12',
  '11.40',
  2250,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'KHAO KHEOW KHAO KHEOW',
  'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included',
  '2025-11-11 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 13, 2025 - Bangpakong
(
  'trgg-2025-11-13-bangpakong',
  'TRGG - BANGPAKONG',
  '2025-11-13',
  '09.45',
  2250,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BANGPAKONG',
  'Departure: 08.15 | First Tee: 09.45 | Cart & Caddy included',
  '2025-11-12 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 14, 2025 - Burapha Free Food Friday
(
  'trgg-2025-11-14-burapha-free-food-fr',
  'TRGG - BURAPHA A-B FREE FOOD FRIDAY',
  '2025-11-14',
  '10.00',
  2750,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BURAPHA FREE FOOD FRIDAY',
  'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included',
  '2025-11-13 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 15, 2025 - Green Valley Pleasant Valley
(
  'trgg-2025-11-15-green-valley-pleasan',
  'TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)',
  '2025-11-15',
  '11.30',
  2550,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'GREEN VALLEY PLEASANT VALLEY (6 GROUPS)',
  'Departure: 10.30 | First Tee: 11.30 | Cart & Caddy included',
  '2025-11-14 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 17, 2025 - Treasure Hill
(
  'trgg-2025-11-17-treasure-hill',
  'TRGG - TREASURE HILL',
  '2025-11-17',
  '11.30',
  1950,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'TREASURE HILL',
  'Departure: 10.15 | First Tee: 11.30 | Cart & Caddy included',
  '2025-11-16 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 18, 2025 - Khao Kheow
(
  'trgg-2025-11-18-khao-kheow-khao-kheo',
  'TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A',
  '2025-11-18',
  '11.40',
  2250,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'KHAO KHEOW KHAO KHEOW',
  'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included',
  '2025-11-17 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 19, 2025 - Royal Lakeside
(
  'trgg-2025-11-19-royal-lakeside',
  'TRGG - ROYAL LAKESIDE (TWO WAY)',
  '2025-11-19',
  '11.20',
  2450,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'ROYAL LAKESIDE',
  'Departure: 10.00 | First Tee: 11.20 | Cart & Caddy included',
  '2025-11-18 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 20, 2025 - Phoenix
(
  'trgg-2025-11-20-phoenix',
  'TRGG - PHOENIX',
  '2025-11-20',
  '11.20',
  2650,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'PHOENIX',
  'Departure: 10.20 | First Tee: 11.20 | Cart & Caddy included',
  '2025-11-19 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 21, 2025 - Burapha Two Man Scramble
(
  'trgg-2025-11-21-burapha-two-man-scra',
  'TRGG - BURAPHA TWO MAN SCRAMBLE',
  '2025-11-21',
  '10.00',
  2950,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BURAPHA TWO MAN SCRAMBLE',
  'Departure: 09.00 | First Tee: 10.00 | TWO MAN SCRAMBLE | Cart & Caddy included',
  '2025-11-20 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 22, 2025 - Eastern Star
(
  'trgg-2025-11-22-eastern-star',
  'TRGG - EASTERN STAR',
  '2025-11-22',
  '10.20',
  2450,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'EASTERN STAR',
  'Departure: 09.20 | First Tee: 10.20 | Cart & Caddy included',
  '2025-11-21 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 24, 2025 - Bangpra
(
  'trgg-2025-11-24-bangpra',
  'TRGG - BANGPRA',
  '2025-11-24',
  '11.30',
  2150,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BANGPRA',
  'Departure: 10.15 | First Tee: 11.30 | Cart & Caddy included',
  '2025-11-23 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 25, 2025 - Greenwood
(
  'trgg-2025-11-25-greenwood',
  'TRGG - GREENWOOD (2 WAY)',
  '2025-11-25',
  '10.30',
  1750,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'GREENWOOD',
  'Departure: 09.15 | First Tee: 10.30 | Cart & Caddy included',
  '2025-11-24 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 26, 2025 - Bangpakong Monthly Medal
(
  'trgg-2025-11-26-bangpakong-monthly-m',
  'TRGG - BANGPAKONG MONTHLY MEDAL STROKE',
  '2025-11-26',
  '10.15',
  2250,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BANGPAKONG MONTHLY MEDAL STROKE',
  'Departure: 09.00 | First Tee: 10.15 | MONTHLY MEDAL STROKE | Cart & Caddy included',
  '2025-11-25 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 27, 2025 - Phoenix
(
  'trgg-2025-11-27-phoenix',
  'TRGG - PHOENIX',
  '2025-11-27',
  '11.10',
  2650,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'PHOENIX',
  'Departure: 10.10 | First Tee: 11.10 | Cart & Caddy included',
  '2025-11-26 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 28, 2025 - Burapha Free Food Friday
(
  'trgg-2025-11-28-burapha-free-food-fr',
  'TRGG - BURAPHA A-B FREE FOOD FRIDAY',
  '2025-11-28',
  '10.00',
  2750,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'BURAPHA FREE FOOD FRIDAY',
  'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included',
  '2025-11-27 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
),

-- November 29, 2025 - Green Valley Treasure Hill
(
  'trgg-2025-11-29-green-valley-treasur',
  'TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)',
  '2025-11-29',
  '11.30',
  2550,
  0,
  0,
  80,
  'U2b6d976f19bca4b2f4374ae0e10ed873',
  'Travellers Rest Golf Group',
  'open',
  null,
  'GREEN VALLEY TREASURE HILL (7 GROUPS)',
  'Departure: 10.30 | First Tee: 11.30 | Cart & Caddy included',
  '2025-11-28 18:00:00+07',
  true,
  false,
  NOW(),
  NOW()
);

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

-- Count all restored events
SELECT
  '=========================================' as message
UNION ALL SELECT 'EVENT RESTORATION COMPLETE'
UNION ALL SELECT '========================================='
UNION ALL SELECT CONCAT('Total Events Restored: ', COUNT(*)::TEXT)
FROM society_events
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND date >= '2025-10-20'
  AND date <= '2025-11-30';

-- Show breakdown by month
SELECT
  '=========================================' as message
UNION ALL SELECT 'OCTOBER 2025 EVENTS:'
UNION ALL SELECT '-----------------------------------------';

SELECT
  date::TEXT as event_date,
  name,
  course_name,
  base_fee::TEXT as fee
FROM society_events
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND date >= '2025-10-20'
  AND date <= '2025-10-31'
ORDER BY date;

SELECT
  '=========================================' as message
UNION ALL SELECT 'NOVEMBER 2025 EVENTS:'
UNION ALL SELECT '-----------------------------------------';

SELECT
  date::TEXT as event_date,
  name,
  course_name,
  base_fee::TEXT as fee
FROM society_events
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND date >= '2025-11-01'
  AND date <= '2025-11-30'
ORDER BY date;

SELECT
  '=========================================' as message
UNION ALL SELECT 'SUCCESS!'
UNION ALL SELECT '========================================='
UNION ALL SELECT 'All TRGG events have been restored.'
UNION ALL SELECT 'Events are now visible in:'
UNION ALL SELECT '  - Golfer Society Page'
UNION ALL SELECT '  - Society Organizer Dashboard'
UNION ALL SELECT '========================================';

COMMIT;
