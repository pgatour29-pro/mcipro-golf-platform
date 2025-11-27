-- =====================================================
-- RESTORE TRAVELLERS REST DECEMBER 2025 EVENTS
-- =====================================================
-- Restores all 26 December 2025 events to correct society
-- Travellers Rest UUID: 7c0e4b72-d925-44bc-afda-38259a7ba346
-- Uses CORRECT production schema
-- =====================================================

BEGIN;

-- Delete any existing December events for Travellers Rest to avoid duplicates
-- (Skip delete since we're using NULL organizer_id like existing events)

-- Insert all 26 December events with CORRECT schema
INSERT INTO society_events (
  title,
  event_date,
  start_time,
  entry_fee,
  max_participants,
  society_id,
  organizer_id,
  status,
  course_name,
  description,
  format,
  is_private,
  created_at,
  updated_at
) VALUES

-- Dec 1 - GREENWOOD
('TRGG - GREENWOOD', '2025-12-01', '12:00', 1850, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 10:45 | First Tee: 12:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 3 - KHAO KHEOW
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-12-03', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 4 - PLEASANT VALLEY
('TRGG - PLEASANT VALLEY', '2025-12-04', '10:00', 2150, 80, NULL, NULL, 'draft', 'PLEASANT VALLEY', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 5 - ROYAL LAKESIDE
('TRGG - ROYAL LAKESIDE', '2025-12-05', '11:20', 2450, 80, NULL, NULL, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 6 - PHOENIX
('TRGG - PHOENIX', '2025-12-06', '09:50', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 08:50 | First Tee: 09:50 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 7 - BURAPHA FREE FOOD FRIDAY
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-12-07', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- Dec 8 - PLUTALUANG
('TRGG - PLUTALUANG', '2025-12-08', '10:00', 1750, 80, NULL, NULL, 'draft', 'PLUTALUANG', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 10 - GREENWOOD (2 WAY)
('TRGG - GREENWOOD (2 WAY)', '2025-12-10', '10:30', 1750, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 11 - EASTERN STAR
('TRGG - EASTERN STAR', '2025-12-11', '10:40', 2150, 80, NULL, NULL, 'draft', 'EASTERN STAR', 'Departure: 09:40 | First Tee: 10:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 12 - KHAO KHEOW
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C', '2025-12-12', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 13 - BANGPAKONG
('TRGG - BANGPAKONG', '2025-12-13', '09:45', 2250, 80, NULL, NULL, 'draft', 'BANGPAKONG', 'Departure: 08:15 | First Tee: 09:45 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 14 - BURAPHA FREE FOOD FRIDAY
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-12-14', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- Dec 15 - GREEN VALLEY / PLEASANT VALLEY
('TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)', '2025-12-15', '11:30', 2550, 80, NULL, NULL, 'draft', 'GREEN VALLEY PLEASANT VALLEY (6 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 17 - TREASURE HILL
('TRGG - TREASURE HILL', '2025-12-17', '11:30', 1950, 80, NULL, NULL, 'draft', 'TREASURE HILL', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 18 - KHAO KHEOW
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-12-18', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 19 - ROYAL LAKESIDE (TWO WAY)
('TRGG - ROYAL LAKESIDE (TWO WAY)', '2025-12-19', '11:20', 2450, 80, NULL, NULL, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 20 - PHOENIX
('TRGG - PHOENIX', '2025-12-20', '11:20', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 10:20 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 21 - BURAPHA TWO MAN SCRAMBLE
('TRGG - BURAPHA TWO MAN SCRAMBLE', '2025-12-21', '10:00', 2950, 80, NULL, NULL, 'draft', 'BURAPHA TWO MAN SCRAMBLE', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | TWO MAN SCRAMBLE', 'stableford',false, NOW(), NOW()),

-- Dec 22 - EASTERN STAR
('TRGG - EASTERN STAR', '2025-12-22', '10:20', 2450, 80, NULL, NULL, 'draft', 'EASTERN STAR', 'Departure: 09:20 | First Tee: 10:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 24 - BANGPRA
('TRGG - BANGPRA', '2025-12-24', '11:30', 2150, 80, NULL, NULL, 'draft', 'BANGPRA', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 25 - GREENWOOD (2 WAY)
('TRGG - GREENWOOD (2 WAY)', '2025-12-25', '10:30', 1750, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 26 - BANGPAKONG MONTHLY MEDAL STROKE
('TRGG - BANGPAKONG MONTHLY MEDAL STROKE', '2025-12-26', '10:15', 2250, 80, NULL, NULL, 'draft', 'BANGPAKONG MONTHLY MEDAL STROKE', 'Departure: 09:00 | First Tee: 10:15 | Cart & Caddy included | MONTHLY MEDAL STROKE', 'stableford',false, NOW(), NOW()),

-- Dec 27 - PHOENIX
('TRGG - PHOENIX', '2025-12-27', '11:10', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 10:10 | First Tee: 11:10 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- Dec 28 - BURAPHA FREE FOOD FRIDAY
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-12-28', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- Dec 29 - GREEN VALLEY / TREASURE HILL
('TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)', '2025-12-29', '11:30', 2550, 80, NULL, NULL, 'draft', 'GREEN VALLEY TREASURE HILL (7 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW());

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

-- Show all December events (with NULL organizer_id)
SELECT
    title,
    event_date,
    start_time,
    entry_fee,
    course_name
FROM society_events
WHERE organizer_id IS NULL
AND event_date >= '2025-12-01'
AND event_date < '2026-01-01'
ORDER BY event_date;

COMMIT;

-- Expected result: 26 December events restored to Travellers Rest Golf Group
