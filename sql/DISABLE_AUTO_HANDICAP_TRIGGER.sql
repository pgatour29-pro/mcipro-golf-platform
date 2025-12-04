-- ============================================================================
-- DISABLE AUTO HANDICAP TRIGGER (TEMPORARY FIX)
-- ============================================================================
-- Problem: Trigger corrupts handicaps for Pete Park and Alan Thomas
-- Correct handicaps: Pete Park = 3.8, Alan Thomas = 11.8
-- Trigger recalculates from last 5 rounds but gets wrong values
-- ============================================================================

-- Disable the trigger that auto-updates handicaps
ALTER TABLE public.rounds DISABLE TRIGGER trigger_auto_update_handicap;

-- Verify trigger is disabled
SELECT
    tgname AS trigger_name,
    tgenabled AS enabled_status,
    CASE tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE 'UNKNOWN'
    END AS status_text
FROM pg_trigger
WHERE tgname = 'trigger_auto_update_handicap';

-- ============================================================================
-- NOTES:
-- - This disables automatic handicap recalculation when rounds are saved
-- - Handicaps will now stay fixed at their correct values
-- - To re-enable later: ALTER TABLE public.rounds ENABLE TRIGGER trigger_auto_update_handicap;
-- ============================================================================
