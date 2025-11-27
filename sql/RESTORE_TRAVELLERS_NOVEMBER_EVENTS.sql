-- =====================================================
-- RESTORE TRAVELLERS REST NOVEMBER 2025 EVENTS
-- =====================================================
-- Restores all 25 November 2025 events to correct society
-- Travellers Rest UUID: 7c0e4b72-d925-44bc-afda-38259a7ba346
-- Uses CORRECT production schema
-- =====================================================

BEGIN;

-- Delete any existing November events for Travellers Rest to avoid duplicates
DELETE FROM society_events
WHERE organizer_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
AND event_date >= '2025-11-01'
AND event_date < '2025-12-01';

-- Insert all 25 November events with CORRECT schema
INSERT INTO society_events (
  title,
  event_date,
  start_time,
  entry_fee,
  max_participants,
  organizer_id,
  status,
  course_name,
  description,
  format,
  is_private,
  created_at,
  updated_at
) VALUES

-- Nov 1 - GREENWOOD
('TRGG - GREENWOOD', '2025-11-01', '12:00', 1850, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'GREENWOOD', 'Departure: 10:45 | First Tee: 12:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 3 - KHAO KHEOW
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-11-03', '11:40', 2250, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 4 - PLEASANT VALLEY
('TRGG - PLEASANT VALLEY', '2025-11-04', '10:00', 2150, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'PLEASANT VALLEY', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 5 - ROYAL LAKESIDE
('TRGG - ROYAL LAKESIDE', '2025-11-05', '11:20', 2450, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 6 - PHOENIX
('TRGG - PHOENIX', '2025-11-06', '09:50', 2650, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'PHOENIX', 'Departure: 08:50 | First Tee: 09:50 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 7 - BURAPHA FREE FOOD FRIDAY
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-11-07', '10:00', 2750, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- Nov 8 - PLUTALUANG
('TRGG - PLUTALUANG', '2025-11-08', '10:00', 1750, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'PLUTALUANG', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 10 - GREENWOOD (2 WAY)
('TRGG - GREENWOOD (2 WAY)', '2025-11-10', '10:30', 1750, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 11 - EASTERN STAR
('TRGG - EASTERN STAR', '2025-11-11', '10:40', 2150, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'EASTERN STAR', 'Departure: 09:40 | First Tee: 10:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 12 - KHAO KHEOW
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C', '2025-11-12', '11:40', 2250, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 13 - BANGPAKONG
('TRGG - BANGPAKONG', '2025-11-13', '09:45', 2250, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BANGPAKONG', 'Departure: 08:15 | First Tee: 09:45 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 14 - BURAPHA FREE FOOD FRIDAY
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-11-14', '10:00', 2750, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- Nov 15 - GREEN VALLEY / PLEASANT VALLEY
('TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)', '2025-11-15', '11:30', 2550, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'GREEN VALLEY PLEASANT VALLEY (6 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 17 - TREASURE HILL
('TRGG - TREASURE HILL', '2025-11-17', '11:30', 1950, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'TREASURE HILL', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 18 - KHAO KHEOW
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-11-18', '11:40', 2250, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 19 - ROYAL LAKESIDE (TWO WAY)
('TRGG - ROYAL LAKESIDE (TWO WAY)', '2025-11-19', '11:20', 2450, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 20 - PHOENIX
('TRGG - PHOENIX', '2025-11-20', '11:20', 2650, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'PHOENIX', 'Departure: 10:20 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 21 - BURAPHA TWO MAN SCRAMBLE
('TRGG - BURAPHA TWO MAN SCRAMBLE', '2025-11-21', '10:00', 2950, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BURAPHA TWO MAN SCRAMBLE', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | TWO MAN SCRAMBLE', 'scramble', false, NOW(), NOW()),

-- Nov 22 - EASTERN STAR
('TRGG - EASTERN STAR', '2025-11-22', '10:20', 2450, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'EASTERN STAR', 'Departure: 09:20 | First Tee: 10:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 24 - BANGPRA
('TRGG - BANGPRA', '2025-11-24', '11:30', 2150, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BANGPRA', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 25 - GREENWOOD (2 WAY)
('TRGG - GREENWOOD (2 WAY)', '2025-11-25', '10:30', 1750, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 26 - BANGPAKONG MONTHLY MEDAL STROKE
('TRGG - BANGPAKONG MONTHLY MEDAL STROKE', '2025-11-26', '10:15', 2250, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BANGPAKONG MONTHLY MEDAL STROKE', 'Departure: 09:00 | First Tee: 10:15 | Cart & Caddy included | MONTHLY MEDAL STROKE', 'stroke', false, NOW(), NOW()),

-- Nov 27 - PHOENIX
('TRGG - PHOENIX', '2025-11-27', '11:10', 2650, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'PHOENIX', 'Departure: 10:10 | First Tee: 11:10 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Nov 28 - BURAPHA FREE FOOD FRIDAY
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-11-28', '10:00', 2750, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- Nov 29 - GREEN VALLEY / TREASURE HILL
('TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)', '2025-11-29', '11:30', 2550, 80, '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid, 'draft', 'GREEN VALLEY TREASURE HILL (7 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW());

-- Verify the restoration
SELECT
    sp.organizer_id,
    sp.society_name,
    COUNT(se.id) as event_count,
    MIN(se.event_date) as earliest_event,
    MAX(se.event_date) as latest_event
FROM society_profiles sp
LEFT JOIN society_events se ON se.organizer_id = sp.id
WHERE sp.organizer_id = 'trgg-pattaya'
GROUP BY sp.id, sp.organizer_id, sp.society_name;

-- Show all November events for Travellers Rest
SELECT
    title,
    event_date,
    start_time,
    entry_fee,
    course_name
FROM society_events
WHERE organizer_id = '7c0e4b72-d925-44bc-afda-38259a7ba346'::uuid
AND event_date >= '2025-11-01'
AND event_date < '2025-12-01'
ORDER BY event_date;

COMMIT;

-- Expected result: 25 November events restored to Travellers Rest Golf Group
