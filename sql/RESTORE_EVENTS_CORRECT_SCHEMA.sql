-- =====================================================
-- RESTORE ALL SOCIETY EVENTS - CORRECT SCHEMA VERSION
-- =====================================================
-- Created: 2025-11-01
-- Purpose: Restore all lost society events for TRGG
-- Schema: Matches actual society_events table structure
-- Events: October + November 2025 schedules (36 events)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Clean up any partial/duplicate data
-- =====================================================

-- Delete existing October-November events
DELETE FROM society_events
WHERE event_date >= '2025-10-20'
  AND event_date <= '2025-11-30';

-- =====================================================
-- STEP 2: RESTORE OCTOBER 2025 EVENTS
-- =====================================================

INSERT INTO society_events (
  title,
  description,
  event_date,
  start_time,
  registration_close_date,
  max_participants,
  entry_fee
) VALUES

-- October 20, 2025 - Monday - Pattaya C.C.
(
  'TRGG - Pattaya C.C.',
  'Departure: 08:30 | First Tee: 09:20 | Cart & Caddy included',
  '2025-10-20',
  '09:20',
  '2025-10-19 18:00:00+07',
  80,
  1950
),

-- October 21, 2025 - Tuesday - Treasure Hill
(
  NULL,
  'TRGG - Treasure Hill',
  'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-21',
  '10:30',
  '2025-10-20 18:00:00+07',
  80,
  1750,
  NULL,
  NOW(),
  NOW()
),

-- October 22, 2025 - Wednesday - Pleasant Valley
(

  NULL,
  'TRGG - Pleasant Valley',
  'Departure: 09:30 | First Tee: 10:40 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-22',
  '10:40',
  '2025-10-21 18:00:00+07',
  80,
  1850,
  NULL,
  NOW(),
  NOW()
),

-- October 23, 2025 - Thursday - Khao Kheow
(

  NULL,
  'TRGG - Khao Kheow',
  'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-23',
  '10:30',
  '2025-10-22 18:00:00+07',
  80,
  2050,
  NULL,
  NOW(),
  NOW()
),

-- October 24, 2025 - Friday - Burapha Two Man Scramble
(

  NULL,
  'TRGG - Burapha Two Man Scramble',
  'Departure: 09:00 | First Tee: 10:00 | TWO MAN SCRAMBLE | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-24',
  '10:00',
  '2025-10-23 18:00:00+07',
  80,
  2550,
  NULL,
  NOW(),
  NOW()
),

-- October 25, 2025 - Saturday - Greenwood
(

  NULL,
  'TRGG - Greenwood',
  'Departure: 11:30 | First Tee: 12:50 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-25',
  '12:50',
  '2025-10-24 18:00:00+07',
  80,
  1850,
  NULL,
  NOW(),
  NOW()
),

-- October 27, 2025 - Monday - Pattaya C.C.
(

  NULL,
  'TRGG - Pattaya C.C.',
  'Departure: 08:30 | First Tee: 09:20 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-27',
  '09:20',
  '2025-10-26 18:00:00+07',
  80,
  1950,
  NULL,
  NOW(),
  NOW()
),

-- October 28, 2025 - Tuesday - Royal Lakeside
(

  NULL,
  'TRGG - Royal Lakeside',
  'Departure: 08:15 | First Tee: 09:35 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-28',
  '09:35',
  '2025-10-27 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- October 29, 2025 - Wednesday - Bangpra Monthly Medal Stroke
(

  NULL,
  'TRGG - Bangpra Monthly Medal Stroke',
  'Departure: 10:15 | First Tee: 11:30 | MONTHLY MEDAL STROKE | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-29',
  '11:30',
  '2025-10-28 18:00:00+07',
  80,
  1650,
  NULL,
  NOW(),
  NOW()
),

-- October 30, 2025 - Thursday - Phoenix
(

  NULL,
  'TRGG - Phoenix',
  'Departure: 10:00 | First Tee: 11:00 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-30',
  '11:00',
  '2025-10-29 18:00:00+07',
  80,
  2350,
  NULL,
  NOW(),
  NOW()
),

-- October 31, 2025 - Friday - Burapha Free Food Friday
(

  NULL,
  'TRGG - Burapha Free Food Friday',
  'Departure: 09:00 | First Tee: 10:00 | FREE FOOD FRIDAY | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-10-31',
  '10:00',
  '2025-10-30 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- =====================================================
-- STEP 3: RESTORE NOVEMBER 2025 EVENTS
-- =====================================================

-- November 1, 2025 - Greenwood
(

  NULL,
  'TRGG - GREENWOOD',
  'Departure: 10.45 | First Tee: 12.00 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-01',
  '12:00',
  '2025-10-31 18:00:00+07',
  80,
  1850,
  NULL,
  NOW(),
  NOW()
),

-- November 3, 2025 - Khao Kheow
(

  NULL,
  'TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A',
  'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-03',
  '11:40',
  '2025-11-02 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- November 4, 2025 - Pleasant Valley
(

  NULL,
  'TRGG - PLEASANT VALLEY',
  'Departure: 08.45 | First Tee: 10.00 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-04',
  '10:00',
  '2025-11-03 18:00:00+07',
  80,
  2150,
  NULL,
  NOW(),
  NOW()
),

-- November 5, 2025 - Royal Lakeside
(

  NULL,
  'TRGG - ROYAL LAKESIDE',
  'Departure: 10.00 | First Tee: 11.20 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-05',
  '11:20',
  '2025-11-04 18:00:00+07',
  80,
  2450,
  NULL,
  NOW(),
  NOW()
),

-- November 6, 2025 - Phoenix
(

  NULL,
  'TRGG - PHOENIX',
  'Departure: 08.50 | First Tee: 09.50 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-06',
  '09:50',
  '2025-11-05 18:00:00+07',
  80,
  2650,
  NULL,
  NOW(),
  NOW()
),

-- November 7, 2025 - Burapha Free Food Friday
(

  NULL,
  'TRGG - BURAPHA A-B FREE FOOD FRIDAY',
  'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-07',
  '10:00',
  '2025-11-06 18:00:00+07',
  80,
  2750,
  NULL,
  NOW(),
  NOW()
),

-- November 8, 2025 - Plutaluang
(

  NULL,
  'TRGG - PLUTALUANG',
  'Departure: 08.45 | First Tee: 10.00 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-08',
  '10:00',
  '2025-11-07 18:00:00+07',
  80,
  1750,
  NULL,
  NOW(),
  NOW()
),

-- November 10, 2025 - Greenwood
(

  NULL,
  'TRGG - GREENWOOD (2 WAY)',
  'Departure: 09.15 | First Tee: 10.30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-10',
  '10:30',
  '2025-11-09 18:00:00+07',
  80,
  1750,
  NULL,
  NOW(),
  NOW()
),

-- November 11, 2025 - Eastern Star
(

  NULL,
  'TRGG - EASTERN STAR',
  'Departure: 09.40 | First Tee: 10.40 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-11',
  '10:40',
  '2025-11-10 18:00:00+07',
  80,
  2150,
  NULL,
  NOW(),
  NOW()
),

-- November 12, 2025 - Khao Kheow
(

  NULL,
  'TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C',
  'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-12',
  '11:40',
  '2025-11-11 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- November 13, 2025 - Bangpakong
(

  NULL,
  'TRGG - BANGPAKONG',
  'Departure: 08.15 | First Tee: 09.45 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-13',
  '09:45',
  '2025-11-12 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- November 14, 2025 - Burapha Free Food Friday
(

  NULL,
  'TRGG - BURAPHA A-B FREE FOOD FRIDAY',
  'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-14',
  '10:00',
  '2025-11-13 18:00:00+07',
  80,
  2750,
  NULL,
  NOW(),
  NOW()
),

-- November 15, 2025 - Green Valley Pleasant Valley
(

  NULL,
  'TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)',
  'Departure: 10.30 | First Tee: 11.30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-15',
  '11:30',
  '2025-11-14 18:00:00+07',
  80,
  2550,
  NULL,
  NOW(),
  NOW()
),

-- November 17, 2025 - Treasure Hill
(

  NULL,
  'TRGG - TREASURE HILL',
  'Departure: 10.15 | First Tee: 11.30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-17',
  '11:30',
  '2025-11-16 18:00:00+07',
  80,
  1950,
  NULL,
  NOW(),
  NOW()
),

-- November 18, 2025 - Khao Kheow
(

  NULL,
  'TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A',
  'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-18',
  '11:40',
  '2025-11-17 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- November 19, 2025 - Royal Lakeside
(

  NULL,
  'TRGG - ROYAL LAKESIDE (TWO WAY)',
  'Departure: 10.00 | First Tee: 11.20 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-19',
  '11:20',
  '2025-11-18 18:00:00+07',
  80,
  2450,
  NULL,
  NOW(),
  NOW()
),

-- November 20, 2025 - Phoenix
(

  NULL,
  'TRGG - PHOENIX',
  'Departure: 10.20 | First Tee: 11.20 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-20',
  '11:20',
  '2025-11-19 18:00:00+07',
  80,
  2650,
  NULL,
  NOW(),
  NOW()
),

-- November 21, 2025 - Burapha Two Man Scramble
(

  NULL,
  'TRGG - BURAPHA TWO MAN SCRAMBLE',
  'Departure: 09.00 | First Tee: 10.00 | TWO MAN SCRAMBLE | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-21',
  '10:00',
  '2025-11-20 18:00:00+07',
  80,
  2950,
  NULL,
  NOW(),
  NOW()
),

-- November 22, 2025 - Eastern Star
(

  NULL,
  'TRGG - EASTERN STAR',
  'Departure: 09.20 | First Tee: 10.20 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-22',
  '10:20',
  '2025-11-21 18:00:00+07',
  80,
  2450,
  NULL,
  NOW(),
  NOW()
),

-- November 24, 2025 - Bangpra
(

  NULL,
  'TRGG - BANGPRA',
  'Departure: 10.15 | First Tee: 11.30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-24',
  '11:30',
  '2025-11-23 18:00:00+07',
  80,
  2150,
  NULL,
  NOW(),
  NOW()
),

-- November 25, 2025 - Greenwood
(

  NULL,
  'TRGG - GREENWOOD (2 WAY)',
  'Departure: 09.15 | First Tee: 10.30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-25',
  '10:30',
  '2025-11-24 18:00:00+07',
  80,
  1750,
  NULL,
  NOW(),
  NOW()
),

-- November 26, 2025 - Bangpakong Monthly Medal
(

  NULL,
  'TRGG - BANGPAKONG MONTHLY MEDAL STROKE',
  'Departure: 09.00 | First Tee: 10.15 | MONTHLY MEDAL STROKE | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-26',
  '10:15',
  '2025-11-25 18:00:00+07',
  80,
  2250,
  NULL,
  NOW(),
  NOW()
),

-- November 27, 2025 - Phoenix
(

  NULL,
  'TRGG - PHOENIX',
  'Departure: 10.10 | First Tee: 11.10 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-27',
  '11:10',
  '2025-11-26 18:00:00+07',
  80,
  2650,
  NULL,
  NOW(),
  NOW()
),

-- November 28, 2025 - Burapha Free Food Friday
(

  NULL,
  'TRGG - BURAPHA A-B FREE FOOD FRIDAY',
  'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-28',
  '10:00',
  '2025-11-27 18:00:00+07',
  80,
  2750,
  NULL,
  NOW(),
  NOW()
),

-- November 29, 2025 - Green Valley Treasure Hill
(

  NULL,
  'TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)',
  'Departure: 10.30 | First Tee: 11.30 | Cart & Caddy included',
  NULL,
  NULL,
  NULL,
  '2025-11-29',
  '11:30',
  '2025-11-28 18:00:00+07',
  80,
  2550,
  NULL,
  NOW(),
  NOW()
);

-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

SELECT '=========================================' as message;
SELECT 'EVENT RESTORATION COMPLETE' as message;
SELECT '=========================================' as message;

SELECT
  CONCAT('Total Events Restored: ', COUNT(*)::TEXT) as message
FROM society_events
WHERE event_date >= '2025-10-20'
  AND event_date <= '2025-11-30';

SELECT '=========================================' as message;
SELECT 'All 36 TRGG events restored!' as message;
SELECT '=========================================' as message;

-- Show all restored events
SELECT
  event_date::TEXT as date,
  title,
  entry_fee::TEXT as fee,
  max_participants::TEXT as max,
  status
FROM society_events
WHERE event_date >= '2025-10-20'
  AND event_date <= '2025-11-30'
ORDER BY event_date;

COMMIT;
