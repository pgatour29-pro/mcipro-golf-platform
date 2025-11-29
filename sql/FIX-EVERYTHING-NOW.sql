-- ============================================================================
-- ONE-STEP FIX: Check and create TRGG events + profile
-- Just run this ONE file in Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Check if TRGG events already exist
DO $$
DECLARE
    trgg_count INTEGER;
    profile_count INTEGER;
BEGIN
    -- Count existing TRGG events
    SELECT COUNT(*) INTO trgg_count FROM society_events WHERE title LIKE 'TRGG%';

    RAISE NOTICE '=== CURRENT STATE ===';
    RAISE NOTICE 'Existing TRGG events: %', trgg_count;

    -- Delete old TRGG events if any exist
    IF trgg_count > 0 THEN
        DELETE FROM society_events WHERE title LIKE 'TRGG%';
        RAISE NOTICE 'Deleted % old TRGG events', trgg_count;
    END IF;

    -- Check if TRGG profile exists
    SELECT COUNT(*) INTO profile_count FROM society_profiles WHERE organizer_id = 'trgg-pattaya';

    IF profile_count = 0 THEN
        INSERT INTO society_profiles (
            organizer_id,
            society_name,
            society_logo,
            created_at,
            updated_at
        ) VALUES (
            'trgg-pattaya',
            'Travellers Rest Golf Group',
            'societylogos/trgg.jpg',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created TRGG society profile';
    ELSE
        RAISE NOTICE 'TRGG profile already exists';
    END IF;
END $$;

-- Step 2: Insert all 51 TRGG events
INSERT INTO society_events (
  title, event_date, start_time, entry_fee, max_participants, society_id, organizer_id, status, course_name, description, format, is_private, created_at, updated_at
) VALUES
-- November events (25 events)
('TRGG - GREENWOOD', '2025-11-01', '12:00', 1850, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 10:45 | First Tee: 12:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-11-03', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - PLEASANT VALLEY', '2025-11-04', '10:00', 2150, 80, NULL, NULL, 'draft', 'PLEASANT VALLEY', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - ROYAL LAKESIDE', '2025-11-05', '11:20', 2450, 80, NULL, NULL, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - PHOENIX', '2025-11-06', '09:50', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 08:50 | First Tee: 09:50 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-11-07', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),
('TRGG - PLUTALUANG', '2025-11-08', '10:00', 1750, 80, NULL, NULL, 'draft', 'PLUTALUANG', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - GREENWOOD (2 WAY)', '2025-11-10', '10:30', 1750, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - EASTERN STAR', '2025-11-11', '10:40', 2150, 80, NULL, NULL, 'draft', 'EASTERN STAR', 'Departure: 09:40 | First Tee: 10:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C', '2025-11-12', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BANGPAKONG', '2025-11-13', '09:45', 2250, 80, NULL, NULL, 'draft', 'BANGPAKONG', 'Departure: 08:15 | First Tee: 09:45 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-11-14', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),
('TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)', '2025-11-15', '11:30', 2550, 80, NULL, NULL, 'draft', 'GREEN VALLEY PLEASANT VALLEY (6 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - TREASURE HILL', '2025-11-17', '11:30', 1950, 80, NULL, NULL, 'draft', 'TREASURE HILL', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-11-18', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - ROYAL LAKESIDE (TWO WAY)', '2025-11-19', '11:20', 2450, 80, NULL, NULL, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - PHOENIX', '2025-11-20', '11:20', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 10:20 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA TWO MAN SCRAMBLE', '2025-11-21', '10:00', 2950, 80, NULL, NULL, 'draft', 'BURAPHA TWO MAN SCRAMBLE', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | TWO MAN SCRAMBLE', 'stableford', false, NOW(), NOW()),
('TRGG - EASTERN STAR', '2025-11-22', '10:20', 2450, 80, NULL, NULL, 'draft', 'EASTERN STAR', 'Departure: 09:20 | First Tee: 10:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BANGPRA', '2025-11-24', '11:30', 2150, 80, NULL, NULL, 'draft', 'BANGPRA', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - GREENWOOD (2 WAY)', '2025-11-25', '10:30', 1750, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BANGPAKONG MONTHLY MEDAL STROKE', '2025-11-26', '10:15', 2250, 80, NULL, NULL, 'draft', 'BANGPAKONG MONTHLY MEDAL STROKE', 'Departure: 09:00 | First Tee: 10:15 | Cart & Caddy included | MONTHLY MEDAL STROKE', 'stableford', false, NOW(), NOW()),
('TRGG - PHOENIX', '2025-11-27', '11:10', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 10:10 | First Tee: 11:10 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-11-28', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),
('TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)', '2025-11-29', '11:30', 2550, 80, NULL, NULL, 'draft', 'GREEN VALLEY TREASURE HILL (7 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
-- December events (26 events)
('TRGG - GREENWOOD', '2025-12-01', '12:00', 1850, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 10:45 | First Tee: 12:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-12-03', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - PLEASANT VALLEY', '2025-12-04', '10:00', 2150, 80, NULL, NULL, 'draft', 'PLEASANT VALLEY', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - ROYAL LAKESIDE', '2025-12-05', '11:20', 2450, 80, NULL, NULL, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - PHOENIX', '2025-12-06', '09:50', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 08:50 | First Tee: 09:50 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-12-07', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),
('TRGG - PLUTALUANG', '2025-12-08', '10:00', 1750, 80, NULL, NULL, 'draft', 'PLUTALUANG', 'Departure: 08:45 | First Tee: 10:00 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - GREENWOOD (2 WAY)', '2025-12-10', '10:30', 1750, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - EASTERN STAR', '2025-12-11', '10:40', 2150, 80, NULL, NULL, 'draft', 'EASTERN STAR', 'Departure: 09:40 | First Tee: 10:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) B-C', '2025-12-12', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BANGPAKONG', '2025-12-13', '09:45', 2250, 80, NULL, NULL, 'draft', 'BANGPAKONG', 'Departure: 08:15 | First Tee: 09:45 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-12-14', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),
('TRGG - GREEN VALLEY (3 GROUPS) PLEASANT VALLEY (6 GROUPS)', '2025-12-15', '11:30', 2550, 80, NULL, NULL, 'draft', 'GREEN VALLEY PLEASANT VALLEY (6 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - TREASURE HILL', '2025-12-17', '11:30', 1950, 80, NULL, NULL, 'draft', 'TREASURE HILL', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - KHAO KHEOW (6 GROUPS) A-B KHAO KHEOW (6 GROUPS) C-A', '2025-12-18', '11:40', 2250, 80, NULL, NULL, 'draft', 'KHAO KHEOW KHAO KHEOW', 'Departure: 10:25 | First Tee: 11:40 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - ROYAL LAKESIDE (TWO WAY)', '2025-12-19', '11:20', 2450, 80, NULL, NULL, 'draft', 'ROYAL LAKESIDE', 'Departure: 10:00 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - PHOENIX', '2025-12-20', '11:20', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 10:20 | First Tee: 11:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA TWO MAN SCRAMBLE', '2025-12-21', '10:00', 2950, 80, NULL, NULL, 'draft', 'BURAPHA TWO MAN SCRAMBLE', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | TWO MAN SCRAMBLE', 'stableford', false, NOW(), NOW()),
('TRGG - EASTERN STAR', '2025-12-22', '10:20', 2450, 80, NULL, NULL, 'draft', 'EASTERN STAR', 'Departure: 09:20 | First Tee: 10:20 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BANGPRA', '2025-12-24', '11:30', 2150, 80, NULL, NULL, 'draft', 'BANGPRA', 'Departure: 10:15 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - GREENWOOD (2 WAY)', '2025-12-25', '10:30', 1750, 80, NULL, NULL, 'draft', 'GREENWOOD', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BANGPAKONG MONTHLY MEDAL STROKE', '2025-12-26', '10:15', 2250, 80, NULL, NULL, 'draft', 'BANGPAKONG MONTHLY MEDAL STROKE', 'Departure: 09:00 | First Tee: 10:15 | Cart & Caddy included | MONTHLY MEDAL STROKE', 'stableford', false, NOW(), NOW()),
('TRGG - PHOENIX', '2025-12-27', '11:10', 2650, 80, NULL, NULL, 'draft', 'PHOENIX', 'Departure: 10:10 | First Tee: 11:10 | Cart & Caddy included', 'stableford', false, NOW(), NOW()),
('TRGG - BURAPHA A-B FREE FOOD FRIDAY', '2025-12-28', '10:00', 2750, 80, NULL, NULL, 'draft', 'BURAPHA FREE FOOD FRIDAY', 'Departure: 09:00 | First Tee: 10:00 | Cart & Caddy included | FREE FOOD FRIDAY', 'stableford', false, NOW(), NOW()),
('TRGG - GREEN VALLEY (3 GROUPS) TREASURE HILL (7 GROUPS)', '2025-12-29', '11:30', 2550, 80, NULL, NULL, 'draft', 'GREEN VALLEY TREASURE HILL (7 GROUPS)', 'Departure: 10:30 | First Tee: 11:30 | Cart & Caddy included', 'stableford', false, NOW(), NOW());

-- Step 3: Verify results
SELECT
    '=== FINAL RESULT ===' AS status,
    COUNT(*) as total_trgg_events,
    COUNT(CASE WHEN event_date >= '2025-11-01' AND event_date < '2025-12-01' THEN 1 END) as november_events,
    COUNT(CASE WHEN event_date >= '2025-12-01' AND event_date < '2026-01-01' THEN 1 END) as december_events
FROM society_events
WHERE title LIKE 'TRGG%';

COMMIT;

-- Final check
SELECT 'SUCCESS: 51 TRGG events created. Now refresh your browser (Ctrl+Shift+R) and check the Travellers Rest dashboard.' as message;
