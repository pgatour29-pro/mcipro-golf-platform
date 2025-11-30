-- =====================================================
-- COMPLETE FIX FOR JOA EVENTS WITH TIMES
-- =====================================================

-- Step 1: Add columns if missing
DO $$
BEGIN
    -- Add departure_time if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'departure_time'
    ) THEN
        ALTER TABLE society_events ADD COLUMN departure_time TIME;
        RAISE NOTICE 'Added departure_time column';
    END IF;

    -- Add auto_waitlist if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'auto_waitlist'
    ) THEN
        ALTER TABLE society_events ADD COLUMN auto_waitlist BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added auto_waitlist column';
    END IF;

    -- Add member_fee if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_events' AND column_name = 'member_fee'
    ) THEN
        ALTER TABLE society_events ADD COLUMN member_fee DECIMAL(10,2);
        RAISE NOTICE 'Added member_fee column';
    END IF;
END $$;

-- Step 2: Delete ALL existing JOA December events
DELETE FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';

-- Step 3: Insert all 31 events WITH times
INSERT INTO society_events (
    title,
    course_name,
    format,
    event_date,
    departure_time,
    start_time,
    max_participants,
    member_fee,
    entry_fee,
    organizer_id,
    organizer_name,
    creator_type,
    auto_waitlist,
    description
) VALUES
-- December 1 - Monday
('JOA Golf - Greenwood CC', 'Greenwood CC', 'stableford', '2025-12-01', '09:00:00', '10:00:00', 40, 1800.00, 1800.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 2 - Tuesday
('JOA Golf - Hermes CC', 'Hermes CC', 'stableford', '2025-12-02', '09:00:00', '10:00:00', 40, 2400.00, 2400.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 3 - Wednesday
('JOA Golf - Eastern Star CC', 'Eastern Star CC', 'stableford', '2025-12-03', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 4 - Thursday
('JOA Golf - Pattaya CC', 'Pattaya CC', 'stableford', '2025-12-04', '09:00:00', '10:00:00', 40, 2900.00, 2900.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 5 - Friday
('JOA Golf - Bangpra CC', 'Bangpra CC', 'stableford', '2025-12-05', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 6 - Saturday
('JOA Golf - Patavia CC', 'Patavia CC', 'stableford', '2025-12-06', '09:00:00', '10:00:00', 40, 2300.00, 2300.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 7 - Sunday
('JOA Golf - Treasure Hill CC', 'Treasure Hill CC', 'stableford', '2025-12-07', '09:00:00', '10:00:00', 40, 2100.00, 2100.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 8 - Monday
('JOA Golf - Greenwood CC', 'Greenwood CC', 'stableford', '2025-12-08', '09:00:00', '10:00:00', 40, 1800.00, 1800.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 9 - Tuesday
('JOA Golf - Hermes CC', 'Hermes CC', 'stableford', '2025-12-09', '09:00:00', '10:00:00', 40, 2400.00, 2400.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 10 - Wednesday
('JOA Golf - Eastern Star CC', 'Eastern Star CC', 'stableford', '2025-12-10', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 11 - Thursday
('JOA Golf - Pattaya CC', 'Pattaya CC', 'stableford', '2025-12-11', '09:00:00', '10:00:00', 40, 2900.00, 2900.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 12 - Friday
('JOA Golf - Bangpra CC', 'Bangpra CC', 'stableford', '2025-12-12', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 13 - Saturday
('JOA Golf - Patavia CC', 'Patavia CC', 'stableford', '2025-12-13', '09:00:00', '10:00:00', 40, 2300.00, 2300.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 14 - Sunday
('JOA Golf - Treasure Hill CC', 'Treasure Hill CC', 'stableford', '2025-12-14', '09:00:00', '10:00:00', 40, 2100.00, 2100.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 15 - Monday
('JOA Golf - Greenwood CC', 'Greenwood CC', 'stableford', '2025-12-15', '09:00:00', '10:00:00', 40, 1800.00, 1800.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 16 - Tuesday
('JOA Golf - Hermes CC', 'Hermes CC', 'stableford', '2025-12-16', '09:00:00', '10:00:00', 40, 2400.00, 2400.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 17 - Wednesday
('JOA Golf - Eastern Star CC', 'Eastern Star CC', 'stableford', '2025-12-17', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 18 - Thursday
('JOA Golf - Pattaya CC', 'Pattaya CC', 'stableford', '2025-12-18', '09:00:00', '10:00:00', 40, 2900.00, 2900.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 19 - Friday
('JOA Golf - Bangpra CC', 'Bangpra CC', 'stableford', '2025-12-19', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 20 - Saturday
('JOA Golf - Patavia CC', 'Patavia CC', 'stableford', '2025-12-20', '09:00:00', '10:00:00', 40, 2300.00, 2300.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 21 - Sunday
('JOA Golf - Treasure Hill CC', 'Treasure Hill CC', 'stableford', '2025-12-21', '09:00:00', '10:00:00', 40, 2100.00, 2100.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 22 - Monday
('JOA Golf - Greenwood CC', 'Greenwood CC', 'stableford', '2025-12-22', '09:00:00', '10:00:00', 40, 1800.00, 1800.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 23 - Tuesday
('JOA Golf - Hermes CC', 'Hermes CC', 'stableford', '2025-12-23', '09:00:00', '10:00:00', 40, 2400.00, 2400.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 24 - Wednesday
('JOA Golf - Eastern Star CC', 'Eastern Star CC', 'stableford', '2025-12-24', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 25 - Thursday (Christmas)
('JOA Golf - Pattaya CC', 'Pattaya CC', 'stableford', '2025-12-25', '09:00:00', '10:00:00', 40, 2900.00, 2900.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 26 - Friday
('JOA Golf - Bangpra CC', 'Bangpra CC', 'stableford', '2025-12-26', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 27 - Saturday
('JOA Golf - Patavia CC', 'Patavia CC', 'stableford', '2025-12-27', '09:00:00', '10:00:00', 40, 2300.00, 2300.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 28 - Sunday
('JOA Golf - Treasure Hill CC', 'Treasure Hill CC', 'stableford', '2025-12-28', '09:00:00', '10:00:00', 40, 2100.00, 2100.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 29 - Monday
('JOA Golf - Greenwood CC', 'Greenwood CC', 'stableford', '2025-12-29', '09:00:00', '10:00:00', 40, 1800.00, 1800.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 30 - Tuesday
('JOA Golf - Hermes CC', 'Hermes CC', 'stableford', '2025-12-30', '09:00:00', '10:00:00', 40, 2400.00, 2400.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart'),
-- December 31 - Wednesday (New Year's Eve)
('JOA Golf - Eastern Star CC', 'Eastern Star CC', 'stableford', '2025-12-31', '09:00:00', '10:00:00', 40, 2200.00, 2200.00, NULL, 'JOA Golf Pattaya', 'organizer', true, 'Includes caddy and cart');

-- Step 4: VERIFY - Show all events with times
SELECT
    event_date,
    title,
    departure_time,
    start_time,
    member_fee,
    CASE
        WHEN departure_time IS NULL THEN '❌ NO DEPARTURE TIME'
        ELSE '✅ HAS DEPARTURE TIME'
    END as departure_status,
    CASE
        WHEN start_time IS NULL THEN '❌ NO START TIME'
        ELSE '✅ HAS START TIME'
    END as start_status
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY event_date;

-- Count final results
SELECT
    COUNT(*) as total_events,
    COUNT(departure_time) as events_with_departure_time,
    COUNT(start_time) as events_with_start_time
FROM society_events
WHERE organizer_name = 'JOA Golf Pattaya'
  AND event_date BETWEEN '2025-12-01' AND '2025-12-31';
