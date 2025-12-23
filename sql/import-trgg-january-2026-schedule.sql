-- =====================================================
-- IMPORT TRGG PATTAYA JANUARY 2026 SCHEDULE
-- =====================================================
-- Imports golf events from TRGG Pattaya schedule
-- Date range: January 1-31, 2026
-- Source: User-provided JSON
-- Society: Travellers Rest Golf Group ONLY
-- =====================================================

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

-- January 1, 2026 (Thursday) - Mountain Shadow (Holiday)
('TRGG - Mountain Shadow (Holiday)', '2026-01-01', '10:30', 0, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Mountain Shadow', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included | Price: TBA', 'stableford', false, NOW(), NOW()),

-- January 2, 2026 (Friday) - Burapha (Free Food Friday)
('TRGG - Burapha (Free Food Friday)', '2026-01-02', '10:00', 2750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Burapha', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- January 3, 2026 (Saturday) - Eastern Star (Two Way)
('TRGG - Eastern Star (Two Way)', '2026-01-03', '10:30', 2450, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Eastern Star', 'Departure: 09:30 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 5, 2026 (Monday) - Pattaya C.C.
('TRGG - Pattaya C.C.', '2026-01-05', '09:35', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Pattaya C.C.', 'Departure: 08:35 | First Tee: 09:35 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 6, 2026 (Tuesday) - Greenwood
('TRGG - Greenwood', '2026-01-06', '09:05', 1750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Greenwood', 'Departure: 08:50 | First Tee: 09:05 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 7, 2026 (Wednesday) - Bangpakong (Monthly Medal Final)
('TRGG - Bangpakong (Monthly Medal Final)', '2026-01-07', '10:40', 1850, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Bangpakong', 'Departure: 09:10 | First Tee: 10:40 | Cart & Caddy included | MONTHLY MEDAL FINAL', 'stableford', false, NOW(), NOW()),

-- January 8, 2026 (Thursday) - Phoenix
('TRGG - Phoenix', '2026-01-08', '11:45', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Phoenix', 'Departure: 10:45 | First Tee: 11:45 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 9, 2026 (Friday) - Burapha (Free Food Friday)
('TRGG - Burapha (Free Food Friday)', '2026-01-09', '10:00', 2750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Burapha', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- January 10, 2026 (Saturday) - Pleasant Valley (Two Way)
('TRGG - Pleasant Valley (Two Way)', '2026-01-10', '11:30', 2350, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Pleasant Valley', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 12, 2026 (Monday) - Pattaya C.C.
('TRGG - Pattaya C.C.', '2026-01-12', '09:35', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Pattaya C.C.', 'Departure: 08:35 | First Tee: 09:35 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 13, 2026 (Tuesday) - Khao Kheow
('TRGG - Khao Kheow', '2026-01-13', '11:35', 2250, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Khao Kheow', 'Departure: 10:25 | First Tee: 11:35 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 14, 2026 (Wednesday) - Green Valley (Two Way)
('TRGG - Green Valley (Two Way)', '2026-01-14', '11:15', 2550, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Green Valley', 'Departure: 10:15 | First Tee: 11:15 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 15, 2026 (Thursday) - Phoenix
('TRGG - Phoenix', '2026-01-15', '11:45', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Phoenix', 'Departure: 10:45 | First Tee: 11:45 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 16, 2026 (Friday) - Burapha (Free Food Friday)
('TRGG - Burapha (Free Food Friday)', '2026-01-16', '10:00', 2750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Burapha', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- January 17, 2026 (Saturday) - Eastern Star (Two Way)
('TRGG - Eastern Star (Two Way)', '2026-01-17', '10:20', 2450, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Eastern Star', 'Departure: 09:20 | First Tee: 10:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 19, 2026 (Monday) - Phoenix
('TRGG - Phoenix', '2026-01-19', '11:50', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Phoenix', 'Departure: 10:50 | First Tee: 11:50 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 20, 2026 (Tuesday) - St Andrews (10 Groups)
('TRGG - St Andrews (10 Groups)', '2026-01-20', '09:30', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'St Andrews', 'Departure: 08:30 | First Tee: 09:30 | Cart & Caddy included | 10 GROUPS', 'stableford', false, NOW(), NOW()),

-- January 20, 2026 (Tuesday) - Bangpakong (Alternative Group)
('TRGG - Bangpakong (Alternative Group)', '2026-01-20', '10:10', 1850, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Bangpakong', 'Departure: 08:40 | First Tee: 10:10 | Cart & Caddy included | ALTERNATIVE GROUP', 'stableford', false, NOW(), NOW()),

-- January 21, 2026 (Wednesday) - Treasure Hill (Times TBA)
('TRGG - Treasure Hill', '2026-01-21', NULL, 0, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Treasure Hill', 'Departure: TBA | First Tee: TBA | Cart & Caddy included | Price: TBA', 'stableford', false, NOW(), NOW()),

-- January 22, 2026 (Thursday) - Greenwood
('TRGG - Greenwood', '2026-01-22', '09:05', 1750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Greenwood', 'Departure: 08:50 | First Tee: 09:05 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 23, 2026 (Friday) - Burapha (Two Man Scramble)
('TRGG - Burapha (Two Man Scramble)', '2026-01-23', '10:00', 2950, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Burapha', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | TWO MAN SCRAMBLE', 'stableford', false, NOW(), NOW()),

-- January 24, 2026 (Saturday) - Plutaluang (N-W)
('TRGG - Plutaluang (N-W)', '2026-01-24', '10:30', 1750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Plutaluang', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included | N-W COURSE', 'stableford', false, NOW(), NOW()),

-- January 26, 2026 (Monday) - Pattaya C.C.
('TRGG - Pattaya C.C.', '2026-01-26', '09:35', 2650, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Pattaya C.C.', 'Departure: 08:35 | First Tee: 09:35 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 27, 2026 (Tuesday) - Bangpakong
('TRGG - Bangpakong', '2026-01-27', '09:50', 1850, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Bangpakong', 'Departure: 08:20 | First Tee: 09:50 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 28, 2026 (Wednesday) - Green Valley (Two Way - Monthly Medal Stroke)
('TRGG - Green Valley (Monthly Medal Stroke)', '2026-01-28', '11:15', 2550, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Green Valley', 'Departure: 10:15 | First Tee: 11:15 | Cart & Caddy included | MONTHLY MEDAL STROKE', 'stableford', false, NOW(), NOW()),

-- January 29, 2026 (Thursday) - Greenwood
('TRGG - Greenwood', '2026-01-29', '09:05', 1750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Greenwood', 'Departure: 08:50 | First Tee: 09:05 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),

-- January 30, 2026 (Friday) - Burapha (Free Food Friday)
('TRGG - Burapha (Free Food Friday)', '2026-01-30', '10:00', 2750, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Burapha', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),

-- January 31, 2026 (Saturday) - Pleasant Valley (Two Way)
('TRGG - Pleasant Valley (Two Way)', '2026-01-31', '11:30', 2350, 80, '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft', 'Pleasant Valley', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW());

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT COUNT(*) as january_2026_events
FROM society_events
WHERE society_id = '17451cf3-f499-4aa3-83d7-c206149838c4'
  AND event_date >= '2026-01-01'
  AND event_date <= '2026-01-31';

-- List all January 2026 events for TRGG
SELECT title, event_date, start_time, entry_fee, course_name
FROM society_events
WHERE society_id = '17451cf3-f499-4aa3-83d7-c206149838c4'
  AND event_date >= '2026-01-01'
  AND event_date <= '2026-01-31'
ORDER BY event_date, start_time;
