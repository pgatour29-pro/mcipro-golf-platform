-- ============================================================================
-- UNIFIED PLAYER PROFILES SYSTEM
-- ============================================================================
-- Created: 2025-12-11
-- Purpose: Merge and unify player data from user_profiles and profiles tables
-- Features:
--   - Consolidated player view with all data sources
--   - Profile completeness tracking
--   - Automatic data sync between tables
--   - Golf statistics aggregation
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
    v_p RECORD;
BEGIN
    -- Get user_profiles data
    SELECT * INTO v_up FROM user_profiles WHERE line_user_id = p_player_id;

    -- Get profiles data
    SELECT * INTO v_p FROM profiles WHERE line_user_id = p_player_id;

    -- Check each field and accumulate score
    -- Name (20 points)
    IF COALESCE(v_up.name, v_p.display_name, v_p.username) IS NOT NULL
       AND COALESCE(v_up.name, v_p.display_name, v_p.username) != '' THEN
        v_score := v_score + 20;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'name');
    END IF;

    -- Avatar (10 points)
    IF v_p.avatar_url IS NOT NULL AND v_p.avatar_url != '' THEN
        v_score := v_score + 10;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'avatar');
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
    IF EXISTS (SELECT 1 FROM society_members WHERE golfer_id = p_player_id AND status = 'active') THEN
        v_score := v_score + 15;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'society');
    END IF;

    -- Has played rounds (10 points)
    IF EXISTS (SELECT 1 FROM rounds WHERE golfer_id = p_player_id) THEN
        v_score := v_score + 10;
    ELSE
        v_missing_fields := array_append(v_missing_fields, 'rounds');
    END IF;

    -- Contact info in profile_data (10 points)
    IF (v_up.profile_data->>'email') IS NOT NULL
       OR (v_up.profile_data->>'phone') IS NOT NULL THEN
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
-- 2. UNIFIED PLAYER DATA VIEW (Enhanced)
-- ============================================================================
CREATE OR REPLACE VIEW unified_player_profiles AS
SELECT
    COALESCE(up.line_user_id, p.line_user_id) as player_id,

    -- Identity
    COALESCE(up.name, p.display_name, p.username, 'Unknown Player') as display_name,
    p.username,
    p.avatar_url,

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
    up.profile_data->>'email' as email,
    up.profile_data->>'phone' as phone,

    -- Statistics (calculated)
    (
        SELECT COUNT(*)
        FROM rounds r
        WHERE r.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
    ) as total_rounds,

    (
        SELECT AVG(r.total_gross::numeric)
        FROM rounds r
        WHERE r.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
        AND r.total_gross IS NOT NULL
        AND r.total_gross > 0
    )::numeric(5,1) as avg_gross_score,

    (
        SELECT MIN(r.total_gross)
        FROM rounds r
        WHERE r.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
        AND r.total_gross IS NOT NULL
        AND r.total_gross > 50
    ) as best_gross_score,

    (
        SELECT MAX(r.created_at)
        FROM rounds r
        WHERE r.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
    ) as last_round_date,

    -- Recent performance (last 20 rounds average)
    (
        SELECT AVG(sub.total_gross::numeric)
        FROM (
            SELECT r.total_gross
            FROM rounds r
            WHERE r.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
            AND r.total_gross IS NOT NULL
            AND r.total_gross > 0
            ORDER BY r.created_at DESC
            LIMIT 20
        ) sub
    )::numeric(5,1) as recent_avg_score,

    -- Society memberships
    (
        SELECT array_agg(DISTINCT sm.society_name)
        FROM society_members sm
        WHERE sm.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
        AND sm.status = 'active'
    ) as society_memberships,

    (
        SELECT COUNT(DISTINCT sm.society_id)
        FROM society_members sm
        WHERE sm.golfer_id = COALESCE(up.line_user_id, p.line_user_id)
        AND sm.status = 'active'
    ) as society_count,

    -- Full profile data
    COALESCE(up.profile_data, '{}'::jsonb) as profile_data,

    -- Data source tracking
    CASE
        WHEN up.line_user_id IS NOT NULL AND p.line_user_id IS NOT NULL THEN 'both'
        WHEN up.line_user_id IS NOT NULL THEN 'user_profiles'
        WHEN p.line_user_id IS NOT NULL THEN 'profiles'
        ELSE 'unknown'
    END as data_source,

    -- Timestamps
    COALESCE(up.created_at, p.created_at) as created_at,
    GREATEST(COALESCE(up.updated_at, p.updated_at), COALESCE(p.updated_at, up.updated_at)) as updated_at

FROM user_profiles up
FULL OUTER JOIN profiles p ON up.line_user_id = p.line_user_id
WHERE COALESCE(up.line_user_id, p.line_user_id) IS NOT NULL;

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
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'course_name', COALESCE(r.course_name, r.course_id, 'Unknown Course'),
            'date', r.created_at,
            'gross_score', r.total_gross,
            'net_score', r.total_net,
            'tee_marker', r.tee_marker
        ) ORDER BY r.created_at DESC
    )
    INTO v_recent_rounds
    FROM rounds r
    WHERE r.golfer_id = p_player_id
    LIMIT 10;

    -- Get scoring trends (monthly averages for last 6 months)
    SELECT jsonb_agg(
        jsonb_build_object(
            'month', month_data.month,
            'avg_score', month_data.avg_score,
            'rounds_played', month_data.round_count
        ) ORDER BY month_data.month DESC
    )
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
    SELECT jsonb_agg(
        jsonb_build_object(
            'course_name', course_stats.course_name,
            'rounds_played', course_stats.rounds,
            'avg_score', course_stats.avg_score,
            'best_score', course_stats.best_score
        ) ORDER BY course_stats.rounds DESC
    )
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
        'recent_rounds', COALESCE(v_recent_rounds, '[]'::jsonb),
        'scoring_trends', COALESCE(v_scoring_trends, '[]'::jsonb),
        'course_stats', COALESCE(v_course_stats, '[]'::jsonb),
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
DECLARE
    v_result JSONB;
BEGIN
    -- Update user_profiles
    UPDATE user_profiles
    SET
        name = COALESCE(p_updates->>'display_name', name),
        home_course_name = COALESCE(p_updates->>'home_course_name', home_course_name),
        home_course_id = COALESCE((p_updates->>'home_course_id')::uuid, home_course_id),
        society_name = COALESCE(p_updates->>'primary_society', society_name),
        profile_data = profile_data || COALESCE(p_updates->'profile_data', '{}'::jsonb),
        updated_at = NOW()
    WHERE line_user_id = p_player_id;

    -- Update profiles table if display_name changed
    IF p_updates->>'display_name' IS NOT NULL THEN
        UPDATE profiles
        SET
            display_name = p_updates->>'display_name',
            updated_at = NOW()
        WHERE line_user_id = p_player_id;
    END IF;

    -- Return updated profile
    RETURN get_full_player_profile(p_player_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. SYNC PROFILES FUNCTION
-- ============================================================================
-- Ensures data consistency between user_profiles and profiles tables
CREATE OR REPLACE FUNCTION sync_player_profiles()
RETURNS TABLE (
    synced_count INTEGER,
    created_in_profiles INTEGER,
    created_in_user_profiles INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    v_synced INTEGER := 0;
    v_created_profiles INTEGER := 0;
    v_created_user_profiles INTEGER := 0;
    v_errors TEXT[] := '{}';
    v_rec RECORD;
BEGIN
    -- Create missing profiles entries from user_profiles
    FOR v_rec IN
        SELECT up.line_user_id, up.name
        FROM user_profiles up
        LEFT JOIN profiles p ON up.line_user_id = p.line_user_id
        WHERE p.line_user_id IS NULL
        AND up.line_user_id IS NOT NULL
    LOOP
        BEGIN
            INSERT INTO profiles (line_user_id, display_name, created_at, updated_at)
            VALUES (v_rec.line_user_id, v_rec.name, NOW(), NOW());
            v_created_profiles := v_created_profiles + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'Failed to create profile for ' || v_rec.line_user_id || ': ' || SQLERRM);
        END;
    END LOOP;

    -- Create missing user_profiles entries from profiles
    FOR v_rec IN
        SELECT p.line_user_id, p.display_name
        FROM profiles p
        LEFT JOIN user_profiles up ON p.line_user_id = up.line_user_id
        WHERE up.line_user_id IS NULL
        AND p.line_user_id IS NOT NULL
    LOOP
        BEGIN
            INSERT INTO user_profiles (line_user_id, name, created_at, updated_at)
            VALUES (v_rec.line_user_id, v_rec.display_name, NOW(), NOW());
            v_created_user_profiles := v_created_user_profiles + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'Failed to create user_profile for ' || v_rec.line_user_id || ': ' || SQLERRM);
        END;
    END LOOP;

    v_synced := v_created_profiles + v_created_user_profiles;

    RETURN QUERY SELECT v_synced, v_created_profiles, v_created_user_profiles, v_errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. SEARCH UNIFIED PROFILES
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
         upp.display_name ILIKE '%' || p_search_query || '%' OR
         upp.username ILIKE '%' || p_search_query || '%')
        AND (p_society_filter IS NULL OR
             upp.primary_society = p_society_filter OR
             p_society_filter = ANY(upp.society_memberships))
        AND (p_handicap_min IS NULL OR upp.handicap_index >= p_handicap_min)
        AND (p_handicap_max IS NULL OR upp.handicap_index <= p_handicap_max)
        AND (p_has_rounds IS NULL OR
             (p_has_rounds = TRUE AND upp.total_rounds > 0) OR
             (p_has_rounds = FALSE AND upp.total_rounds = 0))
    ORDER BY
        CASE WHEN p_search_query IS NOT NULL AND p_search_query != ''
             THEN similarity(upp.display_name, p_search_query)
             ELSE 0
        END DESC,
        upp.display_name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. GET PROFILE STATS SUMMARY
-- ============================================================================
CREATE OR REPLACE FUNCTION get_profile_stats_summary()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'total_profiles', (SELECT COUNT(*) FROM unified_player_profiles),
        'profiles_with_handicap', (SELECT COUNT(*) FROM unified_player_profiles WHERE handicap_index IS NOT NULL),
        'profiles_with_rounds', (SELECT COUNT(*) FROM unified_player_profiles WHERE total_rounds > 0),
        'profiles_with_society', (SELECT COUNT(*) FROM unified_player_profiles WHERE society_count > 0),
        'avg_profile_completeness', (
            SELECT AVG((calculate_profile_completeness(player_id)->>'percentage')::numeric)::integer
            FROM unified_player_profiles
        ),
        'complete_profiles', (
            SELECT COUNT(*)
            FROM unified_player_profiles
            WHERE (calculate_profile_completeness(player_id)->>'is_complete')::boolean = true
        ),
        'active_last_30_days', (
            SELECT COUNT(*)
            FROM unified_player_profiles
            WHERE last_round_date > NOW() - INTERVAL '30 days'
        ),
        'data_source_breakdown', (
            SELECT jsonb_object_agg(data_source, cnt)
            FROM (
                SELECT data_source, COUNT(*) as cnt
                FROM unified_player_profiles
                GROUP BY data_source
            ) sub
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_line_user_id ON user_profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id);
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_id_date ON rounds(golfer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_gross ON rounds(golfer_id, total_gross) WHERE total_gross IS NOT NULL;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON unified_player_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_profile_completeness TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_full_player_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_player_profile TO authenticated;
GRANT EXECUTE ON FUNCTION sync_player_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION search_unified_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_profile_stats_summary TO anon, authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'UNIFIED_PLAYER_PROFILES.sql deployed successfully' as status;
