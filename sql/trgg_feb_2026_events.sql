-- TRGG Pattaya February 2026 Schedule Insert
-- Run this in Supabase SQL Editor

-- First, check if TRGG society exists and get organizer info
-- SELECT id, name, organizer_name FROM societies WHERE name ILIKE '%traveller%' OR name ILIKE '%TRGG%';

-- Get organizer ID for TRGG (Derek Thorogood or similar)
-- SELECT id, name, line_user_id FROM user_profiles WHERE name ILIKE '%thorogood%' OR profile_data->>'clubAffiliation' = 'Travellers Rest Group';

-- Insert all February 2026 events for TRGG Pattaya
-- Using TRGG prefix in title to match existing pattern
-- organizer_id set to NULL - can be updated later if needed

INSERT INTO society_events (title, event_date, start_time, departure_time, course_name, entry_fee, description, organizer_name, format, creator_type)
VALUES
-- Week 1
('TRGG - Bangpakong', '2026-02-02', '09:45', '08:30', 'Bangpakong Riverside Country Club', 1850, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Bangpra', '2026-02-03', '11:30', '10:15', 'Bangpra International Golf Club', 2150, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Eastern Star', '2026-02-04', '11:30', '10:15', 'Eastern Star Country Club', 2050, '2-WAY. Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Phoenix', '2026-02-05', '11:28', '10:30', 'Phoenix Gold Golf & Country Club', 2650, 'Ocean (6) / Mountain (6). Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Burapha (FFF)', '2026-02-06', '10:00', '09:00', 'Burapha Golf Club', 2750, 'Free Food Friday. Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Plutaluang', '2026-02-07', '10:00', '08:45', 'Plutaluang Navy Golf Course', 1850, 'N-W. Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),

-- Week 2
('TRGG - Bangpakong', '2026-02-09', '10:45', '09:30', 'Bangpakong Riverside Country Club', 1850, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Khao Kheow', '2026-02-10', '11:35', '10:20', 'Khao Kheow Country Club', 2250, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Pattaya C.C.', '2026-02-11', '10:24', '09:15', 'Pattaya Country Club', 2650, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Greenwood', '2026-02-12', '11:04', '09:50', 'Greenwood Golf Club', 1750, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Burapha (FFF)', '2026-02-13', '10:00', '09:00', 'Burapha Golf Club', 2750, 'Free Food Friday. Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Mountain Shadow', '2026-02-14', '10:15', '09:00', 'Mountain Shadow Golf Club', 1850, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),

-- Week 3
('TRGG - Bangpakong', '2026-02-16', '09:45', '08:30', 'Bangpakong Riverside Country Club', 1850, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Greenwood', '2026-02-17', '11:20', '10:00', 'Greenwood Golf Club', 1750, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Pattaya C.C.', '2026-02-18', '10:24', '09:15', 'Pattaya Country Club', 2650, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Phoenix', '2026-02-19', '11:35', '10:35', 'Phoenix Gold Golf & Country Club', 2650, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Burapha (FFF)', '2026-02-20', '10:00', '09:00', 'Burapha Golf Club', 2750, 'Free Food Friday. Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Plutaluang', '2026-02-21', '10:00', '08:45', 'Plutaluang Navy Golf Course', 1850, 'S-E. Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),

-- Week 4
('TRGG - Pattaya C.C.', '2026-02-23', '09:20', '08:10', 'Pattaya Country Club', 2650, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Phoenix', '2026-02-24', '11:52', '10:50', 'Phoenix Gold Golf & Country Club', 2650, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Eastern Star (Medal)', '2026-02-25', '10:00', '09:00', 'Eastern Star Country Club', 2050, 'Monthly Medal Stroke. Caddy & Cart Included', 'TRGG Pattaya', 'stroke', 'organizer'),
('TRGG - Bangpakong', '2026-02-26', '09:45', '08:30', 'Bangpakong Riverside Country Club', 1850, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer'),
('TRGG - Burapha (FFF + Scramble)', '2026-02-27', '10:00', '09:00', 'Burapha Golf Club', 2950, 'Free Food Friday + Two Man Scramble. Caddy & Cart Included', 'TRGG Pattaya', 'scramble', 'organizer'),
('TRGG - Pleasant Valley', '2026-02-28', '11:40', '10:30', 'Pleasant Valley Golf Club', 2350, 'Caddy & Cart Included', 'TRGG Pattaya', 'stableford', 'organizer')

ON CONFLICT (id) DO NOTHING;

-- Verify inserted events
SELECT title, event_date, start_time, departure_time, course_name, entry_fee, format
FROM society_events
WHERE title LIKE 'TRGG%' AND event_date >= '2026-02-01' AND event_date <= '2026-02-28'
ORDER BY event_date;
