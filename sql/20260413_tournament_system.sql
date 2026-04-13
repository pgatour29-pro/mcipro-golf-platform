-- ============================================================================
-- TOURNAMENT SYSTEM — Multi-Day Tournament Support
-- ============================================================================
-- Created: 2026-04-13
-- Purpose: Support 2-4 day tournaments with cumulative scoring, cut lines,
--          and tournament leaderboards. Each tournament day is a regular
--          society_event, so existing live scoring works without modification.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: tournaments
-- Purpose: Parent record for multi-day tournaments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization
    society_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    organizer_id TEXT NOT NULL,
    organizer_name TEXT,

    -- Tournament config
    num_days INTEGER NOT NULL CHECK (num_days BETWEEN 2 AND 4),
    scoring_format TEXT NOT NULL DEFAULT 'stableford'
        CHECK (scoring_format IN ('stroke_play', 'stableford', 'both')),
    status TEXT NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'registration_open', 'in_progress', 'completed', 'cancelled')),

    -- Cut line config
    cut_enabled BOOLEAN DEFAULT false,
    cut_after_day INTEGER,
    cut_type TEXT CHECK (cut_type IN ('top_n_and_ties', 'top_n', 'score_threshold')),
    cut_value INTEGER,  -- e.g., 20 for "top 20 and ties"

    -- Registration
    entry_fee INTEGER DEFAULT 0,
    max_participants INTEGER,
    registration_deadline DATE,
    is_private BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer ON public.tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_society ON public.tournaments(society_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);

-- ============================================================================
-- TABLE: tournament_days
-- Purpose: Links tournament to individual society_events (one per day)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournament_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 4),
    event_id TEXT NOT NULL,  -- References society_events.id
    course_name TEXT,
    event_date DATE,
    tee_marker TEXT DEFAULT 'white',
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tournament_id, day_number),
    UNIQUE(tournament_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_days_tournament ON public.tournament_days(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_days_event ON public.tournament_days(event_id);

-- ============================================================================
-- TABLE: tournament_registrations
-- Purpose: Single registration for entire tournament (cascades to day events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    handicap REAL,
    playing_handicap REAL,
    status TEXT DEFAULT 'registered'
        CHECK (status IN ('registered', 'confirmed', 'cut', 'withdrawn', 'disqualified')),
    cut_after_day INTEGER,  -- NULL = not cut, else day number when eliminated

    -- Payment
    paid BOOLEAN DEFAULT false,
    payment_method TEXT,

    -- Metadata
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_reg_tournament ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_reg_player ON public.tournament_registrations(player_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Tournaments: anyone can read, authenticated can create/update
CREATE POLICY "Anyone can read tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tournaments" ON public.tournaments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tournaments" ON public.tournaments FOR UPDATE USING (true);

-- Tournament days: anyone can read/write
CREATE POLICY "Anyone can read tournament_days" ON public.tournament_days FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tournament_days" ON public.tournament_days FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tournament_days" ON public.tournament_days FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tournament_days" ON public.tournament_days FOR DELETE USING (true);

-- Tournament registrations: anyone can read/write
CREATE POLICY "Anyone can read tournament_registrations" ON public.tournament_registrations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tournament_registrations" ON public.tournament_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tournament_registrations" ON public.tournament_registrations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tournament_registrations" ON public.tournament_registrations FOR DELETE USING (true);

-- ============================================================================
-- FUNCTION: get_tournament_leaderboard
-- Purpose: Aggregate scores across all tournament days for cumulative leaderboard
-- ============================================================================
CREATE OR REPLACE FUNCTION get_tournament_leaderboard(p_tournament_id UUID)
RETURNS TABLE (
    player_id TEXT,
    player_name TEXT,
    handicap REAL,
    registration_status TEXT,
    cut_after_day INTEGER,
    day_scores JSONB,
    total_gross INTEGER,
    total_net INTEGER,
    total_stableford INTEGER,
    rounds_completed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH tournament_events AS (
        SELECT td.day_number, td.event_id
        FROM public.tournament_days td
        WHERE td.tournament_id = p_tournament_id
        ORDER BY td.day_number
    ),
    player_day_scores AS (
        SELECT
            sc.player_id,
            sc.player_name,
            te.day_number,
            sc.total_gross,
            sc.total_net,
            COALESCE(
                (SELECT SUM(s.stableford_points) FROM public.scores s WHERE s.scorecard_id = sc.id),
                0
            )::INTEGER AS day_stableford,
            sc.handicap AS day_handicap,
            CASE WHEN sc.status = 'completed' THEN 1 ELSE 0 END AS is_completed
        FROM tournament_events te
        JOIN public.scorecards sc ON sc.event_id = te.event_id
        WHERE sc.total_gross IS NOT NULL AND sc.total_gross > 0
    ),
    aggregated AS (
        SELECT
            pds.player_id,
            pds.player_name,
            jsonb_object_agg(
                'day_' || pds.day_number,
                jsonb_build_object(
                    'gross', pds.total_gross,
                    'net', pds.total_net,
                    'stableford', pds.day_stableford,
                    'completed', pds.is_completed
                )
            ) AS day_scores,
            SUM(pds.total_gross)::INTEGER AS total_gross,
            SUM(COALESCE(pds.total_net, pds.total_gross))::INTEGER AS total_net,
            SUM(pds.day_stableford)::INTEGER AS total_stableford,
            SUM(pds.is_completed)::INTEGER AS rounds_completed
        FROM player_day_scores pds
        GROUP BY pds.player_id, pds.player_name
    )
    SELECT
        a.player_id,
        a.player_name,
        tr.handicap,
        tr.status AS registration_status,
        tr.cut_after_day,
        a.day_scores,
        a.total_gross,
        a.total_net,
        a.total_stableford,
        a.rounds_completed
    FROM aggregated a
    LEFT JOIN public.tournament_registrations tr
        ON tr.tournament_id = p_tournament_id AND tr.player_id = a.player_id
    ORDER BY
        CASE WHEN tr.status = 'cut' THEN 1 ELSE 0 END,
        a.total_gross ASC;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- COMPLETION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE 'TOURNAMENT SYSTEM TABLES CREATED';
    RAISE NOTICE '========================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables: tournaments, tournament_days, tournament_registrations';
    RAISE NOTICE 'Function: get_tournament_leaderboard(tournament_id)';
    RAISE NOTICE 'RLS: All tables have public read/write policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Each tournament day is a regular society_event.';
    RAISE NOTICE 'Existing live scoring works without modification.';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================================';
END $$;
