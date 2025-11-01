-- =====================================================
-- RESTORE ALL SOCIETY EVENTS - SIMPLIFIED VERSION
-- =====================================================
-- Only includes required fields to avoid constraint issues
-- =====================================================

BEGIN;

-- Clean up existing events
DELETE FROM society_events
WHERE event_date >= '2025-10-20' AND event_date <= '2025-11-30';

-- Insert all 36 events with minimal required fields
INSERT INTO society_events (title, description, event_date, start_time, registration_close_date, max_participants, entry_fee) VALUES
('TRGG - Pattaya C.C.', 'Departure: 08:30 | First Tee: 09:20 | Cart & Caddy included', '2025-10-20', '09:20', '2025-10-19 18:00:00+07', 80, 1950),
('TRGG - Treasure Hill', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', '2025-10-21', '10:30', '2025-10-20 18:00:00+07', 80, 1750),
('TRGG - Pleasant Valley', 'Departure: 09:30 | First Tee: 10:40 | Cart & Caddy included', '2025-10-22', '10:40', '2025-10-21 18:00:00+07', 80, 1850),
('TRGG - Khao Kheow', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', '2025-10-23', '10:30', '2025-10-22 18:00:00+07', 80, 2050),
('TRGG - Burapha Two Man Scramble', 'Departure: 09:00 | First Tee: 10:00 | TWO MAN SCRAMBLE | Cart & Caddy included', '2025-10-24', '10:00', '2025-10-23 18:00:00+07', 80, 2550),
('TRGG - Greenwood', 'Departure: 11:30 | First Tee: 12:50 | Cart & Caddy included', '2025-10-25', '12:50', '2025-10-24 18:00:00+07', 80, 1850),
('TRGG - Pattaya C.C.', 'Departure: 08:30 | First Tee: 09:20 | Cart & Caddy included', '2025-10-27', '09:20', '2025-10-26 18:00:00+07', 80, 1950),
('TRGG - Royal Lakeside', 'Departure: 08:15 | First Tee: 09:35 | Cart & Caddy included', '2025-10-28', '09:35', '2025-10-27 18:00:00+07', 80, 2250),
('TRGG - Bangpra Monthly Medal Stroke', 'Departure: 10:15 | First Tee: 11:30 | MONTHLY MEDAL STROKE | Cart & Caddy included', '2025-10-29', '11:30', '2025-10-28 18:00:00+07', 80, 1650),
('TRGG - Phoenix', 'Departure: 10:00 | First Tee: 11:00 | Cart & Caddy included', '2025-10-30', '11:00', '2025-10-29 18:00:00+07', 80, 2350),
('TRGG - Burapha Free Food Friday', 'Departure: 09:00 | First Tee: 10:00 | FREE FOOD FRIDAY | Cart & Caddy included', '2025-10-31', '10:00', '2025-10-30 18:00:00+07', 80, 2250),
('TRGG - GREENWOOD', 'Departure: 10.45 | First Tee: 12.00 | Cart & Caddy included', '2025-11-01', '12:00', '2025-10-31 18:00:00+07', 80, 1850),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', 'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included', '2025-11-03', '11:40', '2025-11-02 18:00:00+07', 80, 2250),
('TRGG - PLEASANT VALLEY', 'Departure: 08.45 | First Tee: 10.00 | Cart & Caddy included', '2025-11-04', '10:00', '2025-11-03 18:00:00+07', 80, 2150),
('TRGG - ROYAL LAKESIDE', 'Departure: 10.00 | First Tee: 11.20 | Cart & Caddy included', '2025-11-05', '11:20', '2025-11-04 18:00:00+07', 80, 2450),
('TRGG - PHOENIX', 'Departure: 08.50 | First Tee: 09.50 | Cart & Caddy included', '2025-11-06', '09:50', '2025-11-05 18:00:00+07', 80, 2650),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', 'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included', '2025-11-07', '10:00', '2025-11-06 18:00:00+07', 80, 2750),
('TRGG - PLUTALUANG', 'Departure: 08.45 | First Tee: 10.00 | Cart & Caddy included', '2025-11-08', '10:00', '2025-11-07 18:00:00+07', 80, 1750),
('TRGG - GREENWOOD (2 WAY)', 'Departure: 09.15 | First Tee: 10.30 | Cart & Caddy included', '2025-11-10', '10:30', '2025-11-09 18:00:00+07', 80, 1750),
('TRGG - EASTERN STAR', 'Departure: 09.40 | First Tee: 10.40 | Cart & Caddy included', '2025-11-11', '10:40', '2025-11-10 18:00:00+07', 80, 2150),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C', 'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included', '2025-11-12', '11:40', '2025-11-11 18:00:00+07', 80, 2250),
('TRGG - BANGPAKONG', 'Departure: 08.15 | First Tee: 09.45 | Cart & Caddy included', '2025-11-13', '09:45', '2025-11-12 18:00:00+07', 80, 2250),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', 'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included', '2025-11-14', '10:00', '2025-11-13 18:00:00+07', 80, 2750),
('TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)', 'Departure: 10.30 | First Tee: 11.30 | Cart & Caddy included', '2025-11-15', '11:30', '2025-11-14 18:00:00+07', 80, 2550),
('TRGG - TREASURE HILL', 'Departure: 10.15 | First Tee: 11.30 | Cart & Caddy included', '2025-11-17', '11:30', '2025-11-16 18:00:00+07', 80, 1950),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', 'Departure: 10.25 | First Tee: 11.40 | Cart & Caddy included', '2025-11-18', '11:40', '2025-11-17 18:00:00+07', 80, 2250),
('TRGG - ROYAL LAKESIDE (TWO WAY)', 'Departure: 10.00 | First Tee: 11.20 | Cart & Caddy included', '2025-11-19', '11:20', '2025-11-18 18:00:00+07', 80, 2450),
('TRGG - PHOENIX', 'Departure: 10.20 | First Tee: 11.20 | Cart & Caddy included', '2025-11-20', '11:20', '2025-11-19 18:00:00+07', 80, 2650),
('TRGG - BURAPHA TWO MAN SCRAMBLE', 'Departure: 09.00 | First Tee: 10.00 | TWO MAN SCRAMBLE | Cart & Caddy included', '2025-11-21', '10:00', '2025-11-20 18:00:00+07', 80, 2950),
('TRGG - EASTERN STAR', 'Departure: 09.20 | First Tee: 10.20 | Cart & Caddy included', '2025-11-22', '10:20', '2025-11-21 18:00:00+07', 80, 2450),
('TRGG - BANGPRA', 'Departure: 10.15 | First Tee: 11.30 | Cart & Caddy included', '2025-11-24', '11:30', '2025-11-23 18:00:00+07', 80, 2150),
('TRGG - GREENWOOD (2 WAY)', 'Departure: 09.15 | First Tee: 10.30 | Cart & Caddy included', '2025-11-25', '10:30', '2025-11-24 18:00:00+07', 80, 1750),
('TRGG - BANGPAKONG MONTHLY MEDAL STROKE', 'Departure: 09.00 | First Tee: 10.15 | MONTHLY MEDAL STROKE | Cart & Caddy included', '2025-11-26', '10:15', '2025-11-25 18:00:00+07', 80, 2250),
('TRGG - PHOENIX', 'Departure: 10.10 | First Tee: 11.10 | Cart & Caddy included', '2025-11-27', '11:10', '2025-11-26 18:00:00+07', 80, 2650),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', 'Departure: 09.00 | First Tee: 10.00 | FREE FOOD FRIDAY | Cart & Caddy included', '2025-11-28', '10:00', '2025-11-27 18:00:00+07', 80, 2750),
('TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)', 'Departure: 10.30 | First Tee: 11.30 | Cart & Caddy included', '2025-11-29', '11:30', '2025-11-28 18:00:00+07', 80, 2550);

SELECT '=========================================' as message
UNION ALL SELECT 'EVENT RESTORATION COMPLETE'
UNION ALL SELECT '========================================='
UNION ALL SELECT CONCAT('Total Events Restored: ', COUNT(*)::TEXT)
FROM society_events
WHERE event_date >= '2025-10-20' AND event_date <= '2025-11-30';

COMMIT;
