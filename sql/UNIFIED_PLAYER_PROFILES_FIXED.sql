-- ============================================================================
-- UNIFIED PLAYER PROFILES SYSTEM (FIXED)
-- ============================================================================
-- Created: 2025-12-11
-- IMPORTANT: Works with your actual schema:
--   - user_profiles table exists (line_user_id is PK, has profile_data JSONB)
--   - NO standalone 'profiles' table exists
--   - rounds table uses course_id (TEXT), course_name (TEXT)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PROFILE COMPLETENESS TRACKING
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_profile_completeness(p_player_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_score INTEGER := 0;
    v_max_score INTEGER := 100;
    v_missing_fields TEXT[] := '{}';
    v_up RECORD;
BEGIN
    -- Get user_profiles data
    SELECT * INTO v_up FROM user_profiles WHERE line_user_id = p_player_id;

    IF v_up IS NULL THEN
        RETURN jsonb_build_object(
            'score', 0,
            'max_score', v_max_score,
            'percentage', 0,
            'missing_fields', ARRAY['profile'],
            'is_complete', false
        );
    END IF;

    -- Check each field and accumulate score
    -- Name (20 points)
    IF v_up.name IS NOT NULL AND v_up.name != '' THEN
        v_score := v_score + 20;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'name');
    END IF;

    -- Handicap (20 points)
    IF (v_up.profile_data->'golfInfo'->>'handicap') IS NOT NULL
       OR (v_up.profile_data->>'handicap') IS NOT NULL THEN
        v_score := v_score + 20;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'handicap');
    END IF;

    -- Home course (15 points)
    IF v_up.home_course_name IS NOT NULL AND v_up.home_course_name != '' THEN
        v_score := v_score + 15;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'home_course');
    END IF;

    -- Society membership (15 points)
    IF EXISTS (SELECT 1 FROM society_members WHERE (golfer_id = p_player_id OR user_id::text = p_player_id) AND status = 'active') THEN
        v_score := v_score + 15;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'society');
    END IF;

    -- Has played rounds (20 points)
    IF EXISTS (SELECT 1 FROM rounds WHERE golfer_id = p_player_id) THEN
        v_score := v_score + 20;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'rounds');
    END IF;

    -- Contact info in profile_data (10 points)
    IF (v_up.profile_data->>'email') IS NOT NULL
       OR (v_up.profile_data->>'phone') IS NOT NULL
       OR v_up.email IS NOT NULL
       OR v_up.phone IS NOT NULL THEN
        v_score := v_score + 10;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'contact');
    END IF;

    RETURN jsonb_build_object(
        'score', v_score,
        'max_score', v_max_score,
        'percentage', ROUND((v_score::numeric / v_max_score) * 100),
        'missing_fields', v_missing_fields,
        'is_complete', v_score >= 80
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. UNIFIED PLAYER DATA VIEW
-- ============================================================================
CREATE OR REPLACE VIEW unified_player_profiles AS
SELECT
    up.line_user_id as player_id,

    -- Identity
    up.name as display_name,
    NULL::TEXT as username,
    NULL::TEXT as avatar_url,

    -- Golf Info
    COALESCE(
        (up.profile_data->'golfInfo'->>'handicap')::numeric,
        (up.profile_data->>'handicap')::numeric
    ) as handicap_index,

    up.home_course_name,
    up.home_course_id,

    -- Preferred tee
    COALESCE(
        up.profile_data->'golfInfo'->>'preferredTee',
        up.profile_data->>'preferredTee',
        'White'
    ) as preferred_tee,

    -- Society affiliation
    up.society_name as primary_society,
    up.society_id as primary_society_id,

    -- Contact
    COALESCE(up.profile_data->>'email', up.email) as email,
    COALESCE(up.profile_data->>'phone', up.phone) as phone,

    -- Statistics (calculated)
    (
        SELECT COUNT(*)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
    ) as total_rounds,

    (
        SELECT AVG(r.total_gross::numeric)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
        AND r.total_gross IS NOT NULL
        AND r.total_gross > 0
    )::numeric(5,1) as avg_gross_score,

    (
        SELECT MIN(r.total_gross)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
        AND r.total_gross IS NOT NULL
        AND r.total_gross > 50
    ) as best_gross_score,

    (
        SELECT MAX(r.created_at)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
    ) as last_round_date,

    -- Recent performance (last 20 rounds average)
    (
        SELECT AVG(sub.total_gross::numeric)
        FROM (
            SELECT r.total_gross
            FROM rounds r
            WHERE r.golfer_id = up.line_user_id
            AND r.total_gross IS NOT NULL
            AND r.total_gross > 0
            ORDER BY r.created_at DESC
            LIMIT 20
        ) sub
    )::numeric(5,1) as recent_avg_score,

    -- Society memberships (society_members uses society_id UUID, not society_name)
    (
        SELECT array_agg(DISTINCT sm.society_id::text)
        FROM society_members sm
        WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id)
        AND sm.status = 'active'
    ) as society_memberships,

    (
        SELECT COUNT(DISTINCT sm.society_id)
        FROM society_members sm
        WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id)
        AND sm.status = 'active'
    ) as society_count,

    -- Full profile data
    COALESCE(up.profile_data, '{}'::jsonb) as profile_data,

    -- Data source tracking
    'user_profiles' as data_source,

    -- Timestamps
    up.created_at,
    up.updated_at

FROM user_profiles up
WHERE up.line_user_id IS NOT NULL;

-- ============================================================================
-- 3. GET FULL PLAYER PROFILE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_full_player_profile(p_player_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_completeness JSONB;
    v_recent_rounds JSONB;
    v_scoring_trends JSONB;
    v_course_stats JSONB;
BEGIN
    -- Get base profile
    SELECT * INTO v_profile FROM unified_player_profiles WHERE player_id = p_player_id;

    IF v_profile IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get completeness
    v_completeness := calculate_profile_completeness(p_player_id);

    -- Get recent rounds
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'course_name', COALESCE(r.course_name, r.course_id, 'Unknown Course'),
            'date', r.created_at,
            'gross_score', r.total_gross,
            'net_score', r.total_net,
            'tee_marker', r.tee_marker
        ) ORDER BY r.created_at DESC
    ), '[]'::jsonb)
    INTO v_recent_rounds
    FROM (
        SELECT id, course_name, course_id, created_at, total_gross, total_net, tee_marker
        FROM rounds
        WHERE golfer_id = p_player_id
        ORDER BY created_at DESC
        LIMIT 10
    ) r;

    -- Get scoring trends (monthly averages for last 6 months)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'month', month_data.month,
            'avg_score', month_data.avg_score,
            'rounds_played', month_data.round_count
        ) ORDER BY month_data.month DESC
    ), '[]'::jsonb)
    INTO v_scoring_trends
    FROM (
        SELECT
            DATE_TRUNC('month', r.created_at) as month,
            AVG(r.total_gross)::numeric(5,1) as avg_score,
            COUNT(*) as round_count
        FROM rounds r
        WHERE r.golfer_id = p_player_id
        AND r.total_gross IS NOT NULL
        AND r.created_at > NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', r.created_at)
    ) month_data;

    -- Get course statistics (top 5 most played courses)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'course_name', course_stats.course_name,
            'rounds_played', course_stats.rounds,
            'avg_score', course_stats.avg_score,
            'best_score', course_stats.best_score
        ) ORDER BY course_stats.rounds DESC
    ), '[]'::jsonb)
    INTO v_course_stats
    FROM (
        SELECT
            COALESCE(r.course_name, r.course_id, 'Unknown Course') as course_name,
            COUNT(*) as rounds,
            AVG(r.total_gross)::numeric(5,1) as avg_score,
            MIN(r.total_gross) as best_score
        FROM rounds r
        WHERE r.golfer_id = p_player_id
        AND r.total_gross IS NOT NULL
        GROUP BY COALESCE(r.course_name, r.course_id, 'Unknown Course')
        ORDER BY COUNT(*) DESC
        LIMIT 5
    ) course_stats;

    RETURN jsonb_build_object(
        'player_id', v_profile.player_id,
        'display_name', v_profile.display_name,
        'username', v_profile.username,
        'avatar_url', v_profile.avatar_url,
        'handicap_index', v_profile.handicap_index,
        'home_course', jsonb_build_object(
            'name', v_profile.home_course_name,
            'id', v_profile.home_course_id
        ),
        'preferred_tee', v_profile.preferred_tee,
        'primary_society', v_profile.primary_society,
        'society_memberships', v_profile.society_memberships,
        'society_count', v_profile.society_count,
        'contact', jsonb_build_object(
            'email', v_profile.email,
            'phone', v_profile.phone
        ),
        'statistics', jsonb_build_object(
            'total_rounds', v_profile.total_rounds,
            'avg_gross_score', v_profile.avg_gross_score,
            'best_gross_score', v_profile.best_gross_score,
            'recent_avg_score', v_profile.recent_avg_score,
            'last_round_date', v_profile.last_round_date
        ),
        'profile_completeness', v_completeness,
        'recent_rounds', v_recent_rounds,
        'scoring_trends', v_scoring_trends,
        'course_stats', v_course_stats,
        'profile_data', v_profile.profile_data,
        'data_source', v_profile.data_source,
        'created_at', v_profile.created_at,
        'updated_at', v_profile.updated_at
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. UPDATE PLAYER PROFILE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_player_profile(
    p_player_id TEXT,
    p_updates JSONB
)
RETURNS JSONB AS $$
BEGIN
    -- Update user_profiles
    UPDATE user_profiles
    SET
        name = COALESCE(p_updates->>'display_name', name),
        home_course_name = COALESCE(p_updates->>'home_course_name', home_course_name),
        home_course_id = COALESCE(p_updates->>'home_course_id', home_course_id),
        society_name = COALESCE(p_updates->>'primary_society', society_name),
        profile_data = profile_data || COALESCE(p_updates->'profile_data', '{}'::jsonb),
        updated_at = NOW()
    WHERE line_user_id = p_player_id;

    -- Return updated profile
    RETURN get_full_player_profile(p_player_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. SEARCH UNIFIED PROFILES
-- ============================================================================
CREATE OR REPLACE FUNCTION search_unified_profiles(
    p_search_query TEXT DEFAULT NULL,
    p_society_filter TEXT DEFAULT NULL,
    p_handicap_min NUMERIC DEFAULT NULL,
    p_handicap_max NUMERIC DEFAULT NULL,
    p_has_rounds BOOLEAN DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    player_id TEXT,
    display_name TEXT,
    avatar_url TEXT,
    handicap_index NUMERIC,
    home_course_name TEXT,
    primary_society TEXT,
    total_rounds BIGINT,
    avg_gross_score NUMERIC,
    last_round_date TIMESTAMPTZ,
    society_count BIGINT,
    profile_completeness INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        upp.player_id,
        upp.display_name,
        upp.avatar_url,
        upp.handicap_index,
        upp.home_course_name,
        upp.primary_society,
        upp.total_rounds,
        upp.avg_gross_score,
        upp.last_round_date,
        upp.society_count,
        (calculate_profile_completeness(upp.player_id)->>'percentage')::INTEGER as profile_completeness
    FROM unified_player_profiles upp
    WHERE
        (p_search_query IS NULL OR p_search_query = '' OR
         upp.display_name ILIKE '%' || p_search_query || '%')
        AND (p_society_filter IS NULL OR
             upp.primary_society = p_society_filter OR
             p_society_filter = ANY(upp.society_memberships))
        AND (p_handicap_min IS NULL OR upp.handicap_index >= p_handicap_min)
        AND (p_handicap_max IS NULL OR upp.handicap_index <= p_handicap_max)
        AND (p_has_rounds IS NULL OR
             (p_has_rounds = TRUE AND upp.total_rounds > 0) OR
             (p_has_rounds = FALSE AND upp.total_rounds = 0))
    ORDER BY
        upp.display_name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. GET PROFILE STATS SUMMARY
-- ============================================================================
CREATE OR REPLACE FUNCTION get_profile_stats_summary()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'total_profiles', (SELECT COUNT(*) FROM unified_player_profiles),
        'profiles_with_handicap', (SELECT COUNT(*) FROM unified_player_profiles WHERE handicap_index IS NOT NULL),
        'profiles_with_rounds', (SELECT COUNT(*) FROM unified_player_profiles WHERE total_rounds > 0),
        'profiles_with_society', (SELECT COUNT(*) FROM unified_player_profiles WHERE society_count > 0),
        'active_last_30_days', (
            SELECT COUNT(*)
            FROM unified_player_profiles
            WHERE last_round_date > NOW() - INTERVAL '30 days'
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_id_date ON rounds(golfer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_gross ON rounds(golfer_id, total_gross) WHERE total_gross IS NOT NULL;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON unified_player_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completeness TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_full_player_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_player_profile TO authenticated;
GRANT EXECUTE ON FUNCTION search_unified_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_profile_stats_summary TO anon, authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'UNIFIED_PLAYER_PROFILES_FIXED.sql deployed successfully' as status;

-- Test the view
SELECT COUNT(*) as total_profiles FROM unified_player_profiles;
