-- Fix duplicate Pete Park registration for December 31 Monthly Medal
-- Run this in Supabase SQL Editor
-- December 14, 2025

-- First, view all registrations for Pete Park to identify duplicates
SELECT id, event_id, player_name, player_id, caddy_numbers, created_at
FROM event_registrations
WHERE player_name ILIKE '%Pete Park%'
ORDER BY created_at DESC;

-- Find registrations for the December 31 event (Monthly Medal at Travellers Rest)
-- Get the event_id first
SELECT id, title, event_date, course_name
FROM society_events
WHERE event_date = '2025-12-31';

-- Delete the duplicate (keep the older one, delete newer duplicate)
-- Replace EVENT_ID with actual event_id from above query
-- This deletes registrations that DON'T have the minimum created_at (keeps oldest)
WITH duplicates AS (
    SELECT id, player_id, event_id, created_at,
           ROW_NUMBER() OVER (PARTITION BY player_id, event_id ORDER BY created_at ASC) as rn
    FROM event_registrations
    WHERE player_name ILIKE '%Pete Park%'
)
DELETE FROM event_registrations
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Verify the fix
SELECT id, event_id, player_name, player_id, caddy_numbers, created_at
FROM event_registrations
WHERE player_name ILIKE '%Pete Park%'
ORDER BY created_at DESC;
