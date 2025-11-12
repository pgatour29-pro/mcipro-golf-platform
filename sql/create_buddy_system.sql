-- ===========================================================================
-- GOLF BUDDIES & SAVED GROUPS SYSTEM
-- ===========================================================================
-- Date: 2025-11-12
-- Purpose: Enable golfers to manage buddy lists and saved groups for quick scorecard setup
--
-- FEATURES:
-- 1. Track buddies (frequent playing partners)
-- 2. Auto-suggest buddies based on play history
-- 3. Save common groups for quick round setup
-- 4. Quick-add buddies when starting rounds
-- ===========================================================================

-- ===========================================================================
-- TABLE: golf_buddies
-- ===========================================================================
-- Stores buddy relationships between players
-- Can be manually added or auto-suggested from play history

CREATE TABLE IF NOT EXISTS public.golf_buddies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                    -- The player's LINE user ID
    buddy_id TEXT NOT NULL,                   -- The buddy's LINE user ID
    added_manually BOOLEAN DEFAULT true,      -- TRUE if user added, FALSE if auto-suggested
    times_played_together INTEGER DEFAULT 0,  -- Count of rounds played together
    last_played_together TIMESTAMPTZ,         -- Most recent round together
    notes TEXT,                               -- Optional notes about buddy
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, buddy_id),
    CHECK (user_id != buddy_id)  -- Can't buddy yourself
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_golf_buddies_user_id ON public.golf_buddies(user_id);
CREATE INDEX IF NOT EXISTS idx_golf_buddies_buddy_id ON public.golf_buddies(buddy_id);
CREATE INDEX IF NOT EXISTS idx_golf_buddies_times_played ON public.golf_buddies(user_id, times_played_together DESC);

-- ===========================================================================
-- TABLE: saved_groups
-- ===========================================================================
-- Stores saved player groups for quick round setup (e.g., "Sunday Group", "Work Friends")

CREATE TABLE IF NOT EXISTS public.saved_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,           -- Owner of the group
    group_name TEXT NOT NULL,        -- Display name (e.g., "Sunday Group")
    member_ids JSONB NOT NULL,       -- Array of player LINE user IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,           -- Last time this group was loaded

    -- Constraints
    UNIQUE(user_id, group_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_groups_user_id ON public.saved_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_groups_last_used ON public.saved_groups(user_id, last_used DESC NULLS LAST);

-- ===========================================================================
-- FUNCTION: get_buddy_suggestions(user_id)
-- ===========================================================================
-- Returns suggested buddies based on play history
-- Players you've played with 2+ times but haven't added as buddies yet

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
        -- Get all players this user has played with
        SELECT
            CASE
                WHEN r1.golfer_id = p_user_id THEN r2.golfer_id
                ELSE r1.golfer_id
            END AS partner_id,
            COUNT(*) AS times_together,
            MAX(COALESCE(r1.completed_at, r1.created_at)) AS last_played_date
        FROM rounds r1
        JOIN rounds r2 ON (
            -- Same round (by group or event)
            (r1.group_id IS NOT NULL AND r1.group_id = r2.group_id)
            OR (r1.society_event_id IS NOT NULL AND r1.society_event_id = r2.society_event_id)
        )
        WHERE
            (r1.golfer_id = p_user_id OR r2.golfer_id = p_user_id)
            AND r1.golfer_id != r2.golfer_id
            AND r1.status = 'completed'
            AND r2.status = 'completed'
        GROUP BY partner_id
        HAVING COUNT(*) >= 2  -- Played together at least 2 times
    )
    SELECT
        pp.partner_id,
        up.name AS buddy_name,
        pp.times_together::INTEGER,
        pp.last_played_date
    FROM play_partners pp
    JOIN user_profiles up ON up.line_user_id = pp.partner_id
    LEFT JOIN golf_buddies gb ON gb.user_id = p_user_id AND gb.buddy_id = pp.partner_id
    WHERE gb.id IS NULL  -- Not already a buddy
    ORDER BY pp.times_together DESC, pp.last_played_date DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================================================
-- FUNCTION: get_recent_partners(user_id, limit)
-- ===========================================================================
-- Returns players you've recently played with (last 5 rounds)

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

-- ===========================================================================
-- FUNCTION: update_buddy_play_stats()
-- ===========================================================================
-- Automatically updates buddy play statistics when rounds are completed
-- Triggers on round completion to increment times_played_together

CREATE OR REPLACE FUNCTION public.update_buddy_play_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if round is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update all buddies who played in this round
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

        -- Also update reverse relationships (buddies who have this player as a buddy)
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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_buddy_stats ON public.rounds;
CREATE TRIGGER trigger_update_buddy_stats
    AFTER INSERT OR UPDATE OF status
    ON public.rounds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_buddy_play_stats();

-- ===========================================================================
-- RLS POLICIES
-- ===========================================================================

-- Enable RLS
ALTER TABLE public.golf_buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_groups ENABLE ROW LEVEL SECURITY;

-- Golf Buddies Policies
CREATE POLICY "Users can view their own buddies"
    ON public.golf_buddies FOR SELECT
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can add their own buddies"
    ON public.golf_buddies FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update their own buddies"
    ON public.golf_buddies FOR UPDATE
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete their own buddies"
    ON public.golf_buddies FOR DELETE
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Service role can manage all buddies"
    ON public.golf_buddies FOR ALL
    USING (auth.role() = 'service_role');

-- Saved Groups Policies
CREATE POLICY "Users can view their own groups"
    ON public.saved_groups FOR SELECT
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can create their own groups"
    ON public.saved_groups FOR INSERT
    WITH CHECK (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update their own groups"
    ON public.saved_groups FOR UPDATE
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete their own groups"
    ON public.saved_groups FOR DELETE
    USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Service role can manage all groups"
    ON public.saved_groups FOR ALL
    USING (auth.role() = 'service_role');

-- ===========================================================================
-- HELPER QUERIES (For testing/admin)
-- ===========================================================================

-- Get all buddies for a user with full details
COMMENT ON FUNCTION public.get_buddy_suggestions(TEXT) IS
'Get suggested buddies based on play history - players you''ve played with 2+ times but haven''t added yet';

COMMENT ON FUNCTION public.get_recent_partners(TEXT, INTEGER) IS
'Get players you''ve recently played with in your last 5 rounds';

-- Example usage:
-- SELECT * FROM get_buddy_suggestions('U044fd835263fc6c0c596cf1d6c2414af');
-- SELECT * FROM get_recent_partners('U044fd835263fc6c0c596cf1d6c2414af', 5);

-- ===========================================================================
-- DEPLOYMENT COMPLETE
-- ===========================================================================
-- Tables created: golf_buddies, saved_groups
-- Functions created: get_buddy_suggestions, get_recent_partners, update_buddy_play_stats
-- Trigger created: trigger_update_buddy_stats (auto-updates play counts)
-- RLS enabled: All tables secured with user-level policies
-- ===========================================================================
