-- =============================================================================
-- FIX PETE PARK EVENT REGISTRATION ISSUE
-- =============================================================================
-- Date: 2025-12-02
-- Purpose: Clean up stale approval records preventing re-registration
-- Event ID: 1615e7f3-ef39-4788-9428-fbce5dd2de4a
-- User ID: U2b6d976f19bca4b2f4374ae0e10ed873
-- =============================================================================

-- =============================================================================
-- PART 1: DIAGNOSE - Check current state
-- =============================================================================

SELECT '=== EVENT INVITES FOR PETE PARK ===' as info;

-- Check event_invites table
SELECT
    id,
    event_id,
    invitee_id,
    status,
    created_at,
    updated_at
FROM event_invites
WHERE invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY created_at DESC;

SELECT '=== EVENT REGISTRATIONS FOR PETE PARK ===' as info;

-- Check event_registrations table
SELECT
    id,
    event_id,
    golfer_id,
    status,
    registered_at,
    created_at
FROM event_registrations
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY created_at DESC;

SELECT '=== CROSS-CHECK: INVITES WITHOUT REGISTRATIONS ===' as info;

-- Find invites that don't have corresponding registrations
SELECT
    ei.id as invite_id,
    ei.event_id,
    ei.invitee_id,
    ei.status as invite_status,
    er.id as registration_id,
    er.status as registration_status
FROM event_invites ei
LEFT JOIN event_registrations er
    ON ei.event_id = er.event_id
    AND ei.invitee_id = er.golfer_id
WHERE ei.invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY ei.created_at DESC;

SELECT '=== SPECIFIC EVENT CHECK ===' as info;

-- Check the specific problematic event
SELECT
    'event_invites' as table_name,
    id,
    event_id,
    invitee_id as user_id,
    status,
    created_at
FROM event_invites
WHERE event_id = '1615e7f3-ef39-4788-9428-fbce5dd2de4a'
    AND invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'

UNION ALL

SELECT
    'event_registrations' as table_name,
    id,
    event_id,
    golfer_id as user_id,
    status,
    created_at
FROM event_registrations
WHERE event_id = '1615e7f3-ef39-4788-9428-fbce5dd2de4a'
    AND golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- =============================================================================
-- PART 2: FIX - Clean up orphaned approval records
-- =============================================================================

SELECT '=== CLEANUP ORPHANED APPROVALS ===' as info;

-- Delete invites that don't have corresponding registrations
-- This will allow Pete Park to re-register for events

BEGIN;

-- First, show what will be deleted
SELECT
    'WILL DELETE' as action,
    ei.id,
    ei.event_id,
    ei.status,
    'No registration found' as reason
FROM event_invites ei
LEFT JOIN event_registrations er
    ON ei.event_id = er.event_id
    AND ei.invitee_id = er.golfer_id
WHERE ei.invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
    AND er.id IS NULL;

-- Now delete them
DELETE FROM event_invites
WHERE id IN (
    SELECT ei.id
    FROM event_invites ei
    LEFT JOIN event_registrations er
        ON ei.event_id = er.event_id
        AND ei.invitee_id = er.golfer_id
    WHERE ei.invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
        AND er.id IS NULL
);

COMMIT;

-- =============================================================================
-- PART 3: VERIFY - Check cleanup was successful
-- =============================================================================

SELECT '=== VERIFICATION AFTER CLEANUP ===' as info;

SELECT
    ei.id as invite_id,
    ei.event_id,
    ei.status as invite_status,
    er.id as registration_id,
    er.status as registration_status,
    CASE
        WHEN er.id IS NOT NULL THEN '✅ HAS REGISTRATION'
        ELSE '❌ ORPHANED (should be deleted)'
    END as status
FROM event_invites ei
LEFT JOIN event_registrations er
    ON ei.event_id = er.event_id
    AND ei.invitee_id = er.golfer_id
WHERE ei.invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
ORDER BY ei.created_at DESC;

SELECT '=== SUMMARY ===' as info;

SELECT
    COUNT(DISTINCT ei.event_id) as total_invites,
    COUNT(DISTINCT er.event_id) as total_registrations,
    COUNT(DISTINCT CASE WHEN er.id IS NULL THEN ei.id END) as orphaned_invites_remaining
FROM event_invites ei
LEFT JOIN event_registrations er
    ON ei.event_id = er.event_id
    AND ei.invitee_id = er.golfer_id
WHERE ei.invitee_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
