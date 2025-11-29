-- ============================================================================
-- GET ALL SOCIETY UUIDs
-- Use this to find the correct UUIDs for your SQL scripts
-- ============================================================================

SELECT
    id AS society_uuid,
    society_name,
    created_at
FROM public.society_profiles
ORDER BY society_name;

-- ============================================================================
-- KNOWN SOCIETY UUIDs:
-- ============================================================================
-- JOA Golf Pattaya: 72d8444a-56bf-4441-86f2-22087f0e6b27
-- Ora Ora Golf: 64aa0745-9e05-4f9f-9f22-373c9b29cf2d
-- Travellers Rest Golf Group (TRGG): 7c0e4b72-d925-44bc-afda-38259a7ba346
-- ============================================================================
