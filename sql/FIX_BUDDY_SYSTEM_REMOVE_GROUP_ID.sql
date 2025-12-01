-- =============================================================================
-- FIX: Buddy System - Remove group_id References
-- =============================================================================
-- Date: 2025-12-01
-- Issue: Trigger accessing NEW.group_id causes "record new has no field group_id"
-- Root Cause: rounds table doesn't have group_id column, but buddy triggers expect it
--
-- SOLUTION: Remove all group_id references from buddy system functions
-- Match players only by society_event_id instead
-- =============================================================================

BEGIN;

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_update_buddy_stats ON public.rounds;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_buddy_play_stats();
DROP FUNCTION IF EXISTS public.get_recent_partners(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_buddy_suggestions(TEXT);

-- =============================================================================
-- RECREATE FUNCTIONS WITHOUT group_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_buddy_suggestions(p_user_id TEXT)
RETURNS TABLE (
    buddy_id TEXT,
    buddy_name TEXT,
    times_played INTEGER,
    last_played TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH play_partners AS (
        SELECT
            CASE
                WHEN r1.golfer_id = p_user_id THEN r2.golfer_id
                ELSE r1.golfer_id
            END AS partner_id,
            COUNT(*) AS times_together,
            MAX(COALESCE(r1.completed_at, r1.created_at)) AS last_played_date
        FROM rounds r1
        JOIN rounds r2 ON (
            r1.society_event_id IS NOT NULL
            AND r1.society_event_id = r2.society_event_id
        )
        WHERE
            (r1.golfer_id = p_user_id OR r2.golfer_id = p_user_id)
            AND r1.golfer_id != r2.golfer_id
            AND r1.status = 'completed'
            AND r2.status = 'completed'
        GROUP BY partner_id
        HAVING COUNT(*) >= 2
    )
    SELECT
        pp.partner_id,
        up.name AS buddy_name,
        pp.times_together::INTEGER,
        pp.last_played_date
    FROM play_partners pp
    JOIN user_profiles up ON up.line_user_id = pp.partner_id
    LEFT JOIN golf_buddies gb ON gb.user_id = p_user_id AND gb.buddy_id = pp.partner_id
    WHERE gb.id IS NULL
    ORDER BY pp.times_together DESC, pp.last_played_date DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_recent_partners(
    p_user_id TEXT,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    partner_id TEXT,
    partner_name TEXT,
    last_played TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_rounds AS (
        SELECT
            r1.society_event_id,
            COALESCE(r1.completed_at, r1.created_at) AS round_date
        FROM rounds r1
        WHERE r1.golfer_id = p_user_id
            AND r1.status = 'completed'
            AND r1.society_event_id IS NOT NULL
        ORDER BY round_date DESC
        LIMIT 5
    )
    SELECT DISTINCT
        r2.golfer_id AS partner_id,
        up.name AS partner_name,
        MAX(COALESCE(r2.completed_at, r2.created_at)) AS last_played
    FROM recent_rounds rr
    JOIN rounds r2 ON (
        rr.society_event_id IS NOT NULL
        AND rr.society_event_id = r2.society_event_id
    )
    JOIN user_profiles up ON up.line_user_id = r2.golfer_id
    WHERE r2.golfer_id != p_user_id
        AND r2.status = 'completed'
    GROUP BY r2.golfer_id, up.name
    ORDER BY last_played DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.update_buddy_play_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if round is newly completed and is part of a society event
    IF NEW.status = 'completed'
        AND (OLD.status IS NULL OR OLD.status != 'completed')
        AND NEW.society_event_id IS NOT NULL
    THEN
        -- Update stats for user's buddies
        UPDATE public.golf_buddies gb
        SET
            times_played_together = times_played_together + 1,
            last_played_together = COALESCE(NEW.completed_at, NEW.created_at)
        WHERE
            gb.user_id = NEW.golfer_id
            AND gb.buddy_id IN (
                SELECT r.golfer_id
                FROM rounds r
                WHERE
                    NEW.society_event_id IS NOT NULL
                    AND r.society_event_id = NEW.society_event_id
                    AND r.golfer_id != NEW.golfer_id
                    AND r.status = 'completed'
            );

        -- Update stats for buddies who have user as buddy (bidirectional)
        UPDATE public.golf_buddies gb
        SET
            times_played_together = times_played_together + 1,
            last_played_together = COALESCE(NEW.completed_at, NEW.created_at)
        WHERE
            gb.buddy_id = NEW.golfer_id
            AND gb.user_id IN (
                SELECT r.golfer_id
                FROM rounds r
                WHERE
                    NEW.society_event_id IS NOT NULL
                    AND r.society_event_id = NEW.society_event_id
                    AND r.golfer_id != NEW.golfer_id
                    AND r.status = 'completed'
            );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_buddy_stats
    AFTER INSERT OR UPDATE OF status
    ON public.rounds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_buddy_play_stats();

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Test that functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_buddy_suggestions', 'get_recent_partners', 'update_buddy_play_stats')
ORDER BY routine_name;

-- Test that trigger exists
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_buddy_stats';

-- Success notification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'BUDDY SYSTEM FIX DEPLOYED';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS FIXED:';
  RAISE NOTICE '  ✅ Removed all group_id references from buddy system functions';
  RAISE NOTICE '  ✅ Updated get_buddy_suggestions() - now uses only society_event_id';
  RAISE NOTICE '  ✅ Updated get_recent_partners() - now uses only society_event_id';
  RAISE NOTICE '  ✅ Updated update_buddy_play_stats() trigger - no more group_id access';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT THIS FIXES:';
  RAISE NOTICE '  - Rounds will save without "record new has no field group_id" error';
  RAISE NOTICE '  - Buddy stats only track for society event rounds (not private rounds)';
  RAISE NOTICE '  - No more database trigger failures during score saving';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE:';
  RAISE NOTICE '  - Buddy matching now only works for society event rounds';
  RAISE NOTICE '  - Private rounds will not update buddy statistics';
  RAISE NOTICE '  - This is correct since private rounds dont have shared identifiers';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;
