-- ============================================================================
-- GLOBAL PLAYER DIRECTORY SYSTEM (FIXED)
-- ============================================================================
-- Created: 2025-12-11
-- IMPORTANT: Works with your actual schema:
--   - user_profiles table exists (line_user_id is PK, has profile_data JSONB)
--   - NO standalone 'profiles' table exists
--   - courses.id is TEXT, courses.name (not course_name)
--   - rounds table exists with course_id, course_name, golfer_id
-- ============================================================================

BEGIN;

-- Enable fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 1. UNIFIED GLOBAL PLAYERS VIEW
-- ============================================================================
-- Only uses user_profiles since profiles table doesn't exist
CREATE OR REPLACE VIEW global_players AS
SELECT
    up.line_user_id as player_id,
    up.name as player_name,
    up.name as display_name,
    NULL::TEXT as username,
    NULL::TEXT as avatar_url,

    -- Extract handicap from profile_data
    COALESCE(
        up.profile_data->'golfInfo'->>'handicap',
        up.profile_data->>'handicap'
    ) as handicap,

    up.home_course_name,
    up.home_course_id,
    up.society_name as primary_society,
    up.society_id as primary_society_id,

    -- Society memberships (society_members uses society_id UUID, not society_name)
    (
        SELECT array_agg(DISTINCT sm.society_id::text)
        FROM society_members sm
        WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id)
        AND sm.status = 'active'
    ) as societies,

    (
        SELECT COUNT(DISTINCT sm.society_id)
        FROM society_members sm
        WHERE (sm.golfer_id = up.line_user_id OR sm.user_id::text = up.line_user_id)
        AND sm.status = 'active'
    ) as society_count,

    -- Statistics from rounds table
    (
        SELECT COUNT(*)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
    ) as total_rounds,

    (
        SELECT MAX(r.created_at)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
    ) as last_round_date,

    (
        SELECT AVG(r.total_gross::numeric)
        FROM rounds r
        WHERE r.golfer_id = up.line_user_id
        AND r.total_gross IS NOT NULL
        AND r.total_gross > 0
    )::numeric(5,1) as avg_score,

    COALESCE(up.profile_data, '{}'::jsonb) as profile_data,

    'user_profiles' as data_source,

    up.created_at,
    up.updated_at

FROM user_profiles up
WHERE up.name IS NOT NULL AND up.name != '';

-- ============================================================================
-- 2. GLOBAL SEARCH FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION search_players_global(
    search_query TEXT DEFAULT NULL,
    society_filter TEXT DEFAULT NULL,
    handicap_min NUMERIC DEFAULT NULL,
    handicap_max NUMERIC DEFAULT NULL,
    home_course_filter TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'name',
    result_limit INTEGER DEFAULT 50,
    result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    player_id TEXT,
    player_name TEXT,
    handicap TEXT,
    home_course TEXT,
    primary_society TEXT,
    societies TEXT[],
    society_count BIGINT,
    total_rounds BIGINT,
    last_round_date TIMESTAMPTZ,
    avg_score NUMERIC,
    profile_data JSONB,
    match_score NUMERIC,
    data_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        gp.player_id,
        gp.player_name,
        gp.handicap,
        gp.home_course_name as home_course,
        gp.primary_society,
        gp.societies,
        gp.society_count,
        gp.total_rounds,
        gp.last_round_date,
        gp.avg_score,
        gp.profile_data,
        CASE
            WHEN search_query IS NULL OR search_query = '' THEN 1.0
            ELSE similarity(gp.player_name, search_query) * 100
        END as match_score,
        gp.data_source
    FROM global_players gp
    WHERE
        (search_query IS NULL OR search_query = '' OR
         gp.player_name ILIKE '%' || search_query || '%')
        AND (society_filter IS NULL OR
             gp.primary_society = society_filter OR
             society_filter = ANY(gp.societies))
        AND (handicap_min IS NULL OR
             (gp.handicap IS NOT NULL AND gp.handicap::numeric >= handicap_min))
        AND (handicap_max IS NULL OR
             (gp.handicap IS NOT NULL AND gp.handicap::numeric <= handicap_max))
        AND (home_course_filter IS NULL OR
             gp.home_course_name ILIKE '%' || home_course_filter || '%')
    ORDER BY
        CASE WHEN sort_by = 'name' THEN gp.player_name ELSE NULL END ASC,
        CASE WHEN sort_by = 'handicap' THEN gp.handicap::numeric ELSE NULL END ASC NULLS LAST,
        CASE WHEN sort_by = 'rounds' THEN gp.total_rounds ELSE NULL END DESC NULLS LAST,
        CASE WHEN sort_by = 'last_played' THEN gp.last_round_date ELSE NULL END DESC NULLS LAST,
        gp.player_name ASC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. GET PLAYER PROFILE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_player_profile(target_player_id TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'player_id', gp.player_id,
        'player_name', gp.player_name,
        'handicap', gp.handicap,
        'home_course', jsonb_build_object(
            'name', gp.home_course_name,
            'id', gp.home_course_id
        ),
        'societies', jsonb_build_object(
            'primary', gp.primary_society,
            'all', gp.societies,
            'count', gp.society_count
        ),
        'statistics', jsonb_build_object(
            'total_rounds', gp.total_rounds,
            'last_round_date', gp.last_round_date,
            'avg_score', gp.avg_score
        ),
        'profile_data', gp.profile_data,
        'recent_rounds', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'course_name', COALESCE(r.course_name, r.course_id, 'Unknown Course'),
                    'created_at', r.created_at,
                    'total_gross', r.total_gross
                )
                ORDER BY r.created_at DESC
            ), '[]'::jsonb)
            FROM (
                SELECT id, course_name, course_id, created_at, total_gross
                FROM rounds
                WHERE golfer_id = target_player_id
                ORDER BY created_at DESC
                LIMIT 10
            ) r
        ),
        'society_details', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'society_id', sm.society_id,
                    'society_name', s.name,
                    'status', sm.status,
                    'member_number', sm.member_number,
                    'is_primary', sm.is_primary_society,
                    'joined_at', sm.joined_at
                )
            ), '[]'::jsonb)
            FROM society_members sm
            LEFT JOIN societies s ON s.id = sm.society_id
            WHERE (sm.golfer_id = target_player_id OR sm.user_id::text = target_player_id)
            AND sm.status = 'active'
        ),
        'buddies_count', COALESCE((
            SELECT COUNT(*)
            FROM golf_buddies gb
            WHERE gb.user_id = target_player_id
        ), 0),
        'created_at', gp.created_at,
        'updated_at', gp.updated_at
    )
    INTO result
    FROM global_players gp
    WHERE gp.player_id = target_player_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. FIND SIMILAR PLAYERS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION find_similar_players(
    reference_player_id TEXT,
    similarity_type TEXT DEFAULT 'handicap',
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    player_id TEXT,
    player_name TEXT,
    handicap TEXT,
    home_course TEXT,
    primary_society TEXT,
    societies TEXT[],
    similarity_score NUMERIC,
    reason TEXT
) AS $$
DECLARE
    ref_handicap NUMERIC;
    ref_home_course TEXT;
    ref_societies TEXT[];
BEGIN
    SELECT gp.handicap::numeric, gp.home_course_name, gp.societies
    INTO ref_handicap, ref_home_course, ref_societies
    FROM global_players gp
    WHERE gp.player_id = reference_player_id;

    RETURN QUERY
    SELECT
        gp.player_id,
        gp.player_name,
        gp.handicap,
        gp.home_course_name as home_course,
        gp.primary_society,
        gp.societies,
        CASE
            WHEN similarity_type = 'handicap' AND ref_handicap IS NOT NULL AND gp.handicap IS NOT NULL
            THEN (100 - ABS(ref_handicap - gp.handicap::numeric) * 5)::numeric
            WHEN similarity_type = 'home_course' AND ref_home_course IS NOT NULL
            THEN CASE WHEN gp.home_course_name = ref_home_course THEN 100 ELSE 0 END::numeric
            WHEN similarity_type = 'society' AND ref_societies IS NOT NULL
            THEN (SELECT COUNT(*) * 20 FROM unnest(ref_societies) rs WHERE rs = ANY(gp.societies))::numeric
            ELSE 0
        END as similarity_score,
        CASE
            WHEN similarity_type = 'handicap'
            THEN 'Similar handicap'
            WHEN similarity_type = 'home_course'
            THEN 'Same home course'
            WHEN similarity_type = 'society'
            THEN 'Common societies'
            ELSE 'Unknown'
        END as reason
    FROM global_players gp
    WHERE gp.player_id != reference_player_id
    ORDER BY similarity_score DESC, gp.player_name ASC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. GET TOP PLAYERS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_top_players(
    society_filter TEXT DEFAULT NULL,
    metric TEXT DEFAULT 'rounds',
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    rank INTEGER,
    player_id TEXT,
    player_name TEXT,
    handicap TEXT,
    primary_society TEXT,
    total_rounds BIGINT,
    avg_score NUMERIC,
    metric_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY
                CASE
                    WHEN metric = 'rounds' THEN gp.total_rounds::numeric
                    WHEN metric = 'avg_score' THEN -gp.avg_score
                    WHEN metric = 'handicap' THEN gp.handicap::numeric
                    ELSE 0
                END DESC NULLS LAST
        )::INTEGER as rank,
        gp.player_id,
        gp.player_name,
        gp.handicap,
        gp.primary_society,
        gp.total_rounds,
        gp.avg_score,
        CASE
            WHEN metric = 'rounds' THEN gp.total_rounds::numeric
            WHEN metric = 'avg_score' THEN gp.avg_score
            WHEN metric = 'handicap' THEN gp.handicap::numeric
            ELSE 0
        END as metric_value
    FROM global_players gp
    WHERE (society_filter IS NULL OR gp.primary_society = society_filter OR society_filter = ANY(gp.societies))
      AND (
          (metric = 'rounds' AND gp.total_rounds > 0)
          OR (metric = 'avg_score' AND gp.avg_score IS NOT NULL)
          OR (metric = 'handicap' AND gp.handicap IS NOT NULL)
      )
    ORDER BY rank
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. DIRECTORY ANALYTICS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION get_directory_analytics()
RETURNS JSONB AS $$
BEGIN
    RETURN jsonb_build_object(
        'total_players', (SELECT COUNT(*) FROM global_players),
        'total_societies', (SELECT COUNT(DISTINCT society_id) FROM society_members WHERE status = 'active'),
        'players_with_handicap', (SELECT COUNT(*) FROM global_players WHERE handicap IS NOT NULL),
        'players_with_rounds', (SELECT COUNT(*) FROM global_players WHERE total_rounds > 0),
        'avg_rounds_per_player', (SELECT COALESCE(AVG(total_rounds)::numeric(10,2), 0) FROM global_players WHERE total_rounds > 0),
        'total_rounds_played', (SELECT COUNT(*) FROM rounds),
        'active_players_30_days', (
            SELECT COUNT(DISTINCT gp.player_id)
            FROM global_players gp
            WHERE gp.last_round_date > NOW() - INTERVAL '30 days'
        )
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_name_trgm ON user_profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_user_profiles_society ON user_profiles(society_id, society_name);
CREATE INDEX IF NOT EXISTS idx_society_members_golfer ON society_members(golfer_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_rounds_golfer_stats ON rounds(golfer_id, created_at DESC);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON global_players TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_players_global TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_player_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_similar_players TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_top_players TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_directory_analytics TO anon, authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'GLOBAL_PLAYER_DIRECTORY_FIXED.sql deployed successfully' as status;

-- Test the view
SELECT COUNT(*) as total_players FROM global_players;
