-- ===========================================================================
-- GOLF BUDDIES SYSTEM - COMPLETE DEPLOYMENT (ONE-STEP)
-- ===========================================================================
-- Run this ENTIRE script in Supabase SQL Editor
-- It will drop and recreate everything fresh
-- ===========================================================================

-- Step 1: Clean up any existing objects
-- ===========================================================================

DROP POLICY IF EXISTS "Users can view their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can add their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can update their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can delete their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Users can manage their own buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Service role can manage all buddies" ON public.golf_buddies;
DROP POLICY IF EXISTS "Service role has full access to buddies" ON public.golf_buddies;

DROP POLICY IF EXISTS "Users can view their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can create their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can update their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can delete their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Users can manage their own groups" ON public.saved_groups;
DROP POLICY IF EXISTS "Service role has full access to groups" ON public.saved_groups;

DROP TRIGGER IF EXISTS trigger_update_buddy_stats ON public.rounds;

DROP FUNCTION IF EXISTS public.update_buddy_play_stats();
DROP FUNCTION IF EXISTS public.get_recent_partners(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_buddy_suggestions(TEXT);

DROP TABLE IF EXISTS public.saved_groups CASCADE;
DROP TABLE IF EXISTS public.golf_buddies CASCADE;

-- Step 2: Create Tables
-- ===========================================================================

CREATE TABLE public.golf_buddies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    buddy_id TEXT NOT NULL,
    added_manually BOOLEAN DEFAULT true,
    times_played_together INTEGER DEFAULT 0,
    last_played_together TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, buddy_id),
    CHECK (user_id != buddy_id)
);

CREATE INDEX idx_golf_buddies_user_id ON public.golf_buddies(user_id);
CREATE INDEX idx_golf_buddies_buddy_id ON public.golf_buddies(buddy_id);
CREATE INDEX idx_golf_buddies_times_played ON public.golf_buddies(user_id, times_played_together DESC);

CREATE TABLE public.saved_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    member_ids JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    UNIQUE(user_id, group_name)
);

CREATE INDEX idx_saved_groups_user_id ON public.saved_groups(user_id);
CREATE INDEX idx_saved_groups_last_used ON public.saved_groups(user_id, last_used DESC NULLS LAST);

-- Step 3: Create Functions
-- ===========================================================================

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
            (r1.group_id IS NOT NULL AND r1.group_id = r2.group_id)
            OR (r1.society_event_id IS NOT NULL AND r1.society_event_id = r2.society_event_id)
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
            r1.group_id,
            r1.society_event_id,
            COALESCE(r1.completed_at, r1.created_at) AS round_date
        FROM rounds r1
        WHERE r1.golfer_id = p_user_id
            AND r1.status = 'completed'
        ORDER BY round_date DESC
        LIMIT 5
    )
    SELECT DISTINCT
        r2.golfer_id AS partner_id,
        up.name AS partner_name,
        MAX(COALESCE(r2.completed_at, r2.created_at)) AS last_played
    FROM recent_rounds rr
    JOIN rounds r2 ON (
        (rr.group_id IS NOT NULL AND rr.group_id = r2.group_id)
        OR (rr.society_event_id IS NOT NULL AND rr.society_event_id = r2.society_event_id)
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
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
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
                    (NEW.group_id IS NOT NULL AND r.group_id = NEW.group_id)
                    OR (NEW.society_event_id IS NOT NULL AND r.society_event_id = NEW.society_event_id)
                    AND r.golfer_id != NEW.golfer_id
                    AND r.status = 'completed'
            );

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
                    (NEW.group_id IS NOT NULL AND r.group_id = NEW.group_id)
                    OR (NEW.society_event_id IS NOT NULL AND r.society_event_id = NEW.society_event_id)
                    AND r.golfer_id != NEW.golfer_id
                    AND r.status = 'completed'
            );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_buddy_stats
    AFTER INSERT OR UPDATE OF status
    ON public.rounds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_buddy_play_stats();

-- Step 4: Disable RLS (app uses service key with client-side filtering)
-- ===========================================================================

ALTER TABLE public.golf_buddies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_groups DISABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- ✅ DEPLOYMENT COMPLETE
-- ===========================================================================
-- Tables: golf_buddies, saved_groups
-- Functions: get_buddy_suggestions, get_recent_partners, update_buddy_play_stats
-- Trigger: trigger_update_buddy_stats
-- Security: Client-side filtering (app checks user_id matches logged-in user)
-- ===========================================================================

SELECT '✅ Golf Buddies System deployed successfully!' AS status;
