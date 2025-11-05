-- =====================================================================
-- INTELLIGENT LINE SIGNUP FOR EXISTING SOCIETY MEMBERS
-- =====================================================================
-- Date: 2025-11-05
-- Purpose: Link LINE accounts to existing society_members records
--          Example: Rocky Jones exists in society_members but has no LINE account
--          When he logs in with LINE, match him to his existing record
-- =====================================================================

-- =====================================================
-- TABLE: pending_member_links
-- Stores potential matches between LINE users and existing members
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_member_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- LINE user who just signed in
    line_user_id TEXT NOT NULL,
    line_display_name TEXT,
    line_picture_url TEXT,

    -- Potential society_members match
    society_name TEXT NOT NULL,
    existing_golfer_id TEXT NOT NULL,
    existing_member_data JSONB,

    -- Match confidence (0.0 - 1.0)
    match_confidence DECIMAL(3,2) DEFAULT 0.5,
    match_reason TEXT,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_links_line_user ON pending_member_links(line_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_links_status ON pending_member_links(status);
CREATE INDEX IF NOT EXISTS idx_pending_links_expires ON pending_member_links(expires_at);

-- Enable RLS
ALTER TABLE pending_member_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pending links viewable by everyone" ON pending_member_links
    FOR SELECT USING (true);

CREATE POLICY "Pending links manageable by everyone" ON pending_member_links
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FUNCTION: Find potential matches for LINE user
-- =====================================================

CREATE OR REPLACE FUNCTION find_existing_member_matches(
    p_line_user_id TEXT,
    p_line_display_name TEXT
)
RETURNS TABLE(
    society_name TEXT,
    golfer_id TEXT,
    member_number TEXT,
    member_data JSONB,
    match_confidence DECIMAL(3,2),
    match_reason TEXT
) AS $$
BEGIN
    -- Find society_members with similar names who don't have user_profiles yet
    RETURN QUERY
    SELECT
        sm.society_name,
        sm.golfer_id,
        sm.member_number,
        sm.member_data,
        CASE
            -- Exact name match (case insensitive)
            WHEN LOWER(sm.member_data->>'name') = LOWER(p_line_display_name) THEN 0.95
            -- Partial match (contains name)
            WHEN LOWER(sm.member_data->>'name') LIKE '%' || LOWER(p_line_display_name) || '%' THEN 0.75
            WHEN LOWER(p_line_display_name) LIKE '%' || LOWER(sm.member_data->>'name') || '%' THEN 0.75
            -- Name parts match
            WHEN LOWER(SPLIT_PART(sm.member_data->>'name', ' ', 1)) = LOWER(SPLIT_PART(p_line_display_name, ' ', 1)) THEN 0.60
            ELSE 0.40
        END::DECIMAL(3,2) as match_confidence,
        CASE
            WHEN LOWER(sm.member_data->>'name') = LOWER(p_line_display_name) THEN 'Exact name match'
            WHEN LOWER(sm.member_data->>'name') LIKE '%' || LOWER(p_line_display_name) || '%' THEN 'Name contains LINE display name'
            WHEN LOWER(p_line_display_name) LIKE '%' || LOWER(sm.member_data->>'name') || '%' THEN 'LINE display name contains member name'
            WHEN LOWER(SPLIT_PART(sm.member_data->>'name', ' ', 1)) = LOWER(SPLIT_PART(p_line_display_name, ' ', 1)) THEN 'First name matches'
            ELSE 'Possible match'
        END as match_reason
    FROM society_members sm
    LEFT JOIN user_profiles up ON up.line_user_id = sm.golfer_id
    WHERE
        -- Member doesn't have a linked user_profile yet
        up.line_user_id IS NULL
        AND
        -- Member has a name in member_data
        sm.member_data->>'name' IS NOT NULL
        AND
        -- Some similarity in names
        (
            LOWER(sm.member_data->>'name') LIKE '%' || LOWER(p_line_display_name) || '%'
            OR LOWER(p_line_display_name) LIKE '%' || LOWER(sm.member_data->>'name') || '%'
            OR LOWER(SPLIT_PART(sm.member_data->>'name', ' ', 1)) = LOWER(SPLIT_PART(p_line_display_name, ' ', 1))
        )
    ORDER BY match_confidence DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_existing_member_matches TO authenticated;
GRANT EXECUTE ON FUNCTION find_existing_member_matches TO anon;

-- =====================================================
-- FUNCTION: Link LINE account to existing member
-- =====================================================

CREATE OR REPLACE FUNCTION link_line_account_to_member(
    p_line_user_id TEXT,
    p_line_display_name TEXT,
    p_line_picture_url TEXT,
    p_society_name TEXT,
    p_existing_golfer_id TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_profile_id TEXT
) AS $$
DECLARE
    v_member_data JSONB;
    v_society_id UUID;
    v_new_profile_id TEXT;
BEGIN
    -- Get existing member data
    SELECT member_data INTO v_member_data
    FROM society_members
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Member not found'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Get society ID
    SELECT id INTO v_society_id
    FROM society_profiles
    WHERE society_name = p_society_name
    LIMIT 1;

    -- Create user_profile with LINE account linked
    INSERT INTO user_profiles (
        line_user_id,
        name,
        username,
        role,
        email,
        phone,
        society_name,
        society_id,
        profile_data
    ) VALUES (
        p_line_user_id,
        COALESCE(v_member_data->>'name', p_line_display_name),
        LOWER(REPLACE(COALESCE(v_member_data->>'name', p_line_display_name), ' ', '')),
        COALESCE(v_member_data->>'role', 'golfer'),
        v_member_data->>'email',
        v_member_data->>'phone',
        p_society_name,
        v_society_id,
        jsonb_build_object(
            'username', LOWER(REPLACE(COALESCE(v_member_data->>'name', p_line_display_name), ' ', '')),
            'linePictureUrl', p_line_picture_url,
            'personalInfo', jsonb_build_object(
                'firstName', SPLIT_PART(COALESCE(v_member_data->>'name', p_line_display_name), ' ', 1),
                'lastName', SPLIT_PART(COALESCE(v_member_data->>'name', p_line_display_name), ' ', 2),
                'email', COALESCE(v_member_data->>'email', ''),
                'phone', COALESCE(v_member_data->>'phone', '')
            ),
            'golfInfo', jsonb_build_object(
                'handicap', COALESCE((v_member_data->>'handicap')::numeric, 0),
                'homeClub', COALESCE(v_member_data->>'homeClub', ''),
                'experienceLevel', COALESCE(v_member_data->>'experienceLevel', 'intermediate')
            ),
            'professionalInfo', jsonb_build_object(),
            'skills', jsonb_build_object(),
            'preferences', jsonb_build_object('language', 'en'),
            'media', jsonb_build_object(),
            'privacy', jsonb_build_object()
        )
    )
    ON CONFLICT (line_user_id) DO UPDATE SET
        name = EXCLUDED.name,
        society_name = EXCLUDED.society_name,
        society_id = EXCLUDED.society_id,
        profile_data = EXCLUDED.profile_data,
        updated_at = NOW()
    RETURNING line_user_id INTO v_new_profile_id;

    -- Update society_members to use the LINE user ID
    UPDATE society_members
    SET
        golfer_id = p_line_user_id,
        member_data = jsonb_set(
            member_data,
            '{linkedAt}',
            to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    -- Mark any pending_member_links as accepted
    UPDATE pending_member_links
    SET
        status = 'accepted',
        resolved_at = NOW()
    WHERE line_user_id = p_line_user_id
      AND existing_golfer_id = p_existing_golfer_id
      AND status = 'pending';

    RETURN QUERY SELECT
        true,
        'Successfully linked LINE account to existing member'::TEXT,
        v_new_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION link_line_account_to_member TO authenticated;
GRANT EXECUTE ON FUNCTION link_line_account_to_member TO anon;

-- =====================================================
-- FUNCTION: Store member data in society_members
-- =====================================================

CREATE OR REPLACE FUNCTION update_society_member_data(
    p_golfer_id TEXT,
    p_society_name TEXT,
    p_name TEXT DEFAULT NULL,
    p_handicap NUMERIC DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE society_members
    SET
        member_data = jsonb_build_object(
            'name', COALESCE(p_name, member_data->>'name'),
            'handicap', COALESCE(p_handicap, (member_data->>'handicap')::numeric),
            'email', COALESCE(p_email, member_data->>'email'),
            'phone', COALESCE(p_phone, member_data->>'phone'),
            'updatedAt', NOW()
        ),
        updated_at = NOW()
    WHERE golfer_id = p_golfer_id
      AND society_name = p_society_name;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_society_member_data TO authenticated;
GRANT EXECUTE ON FUNCTION update_society_member_data TO anon;

-- =====================================================
-- CLEANUP: Expire old pending links
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_pending_links()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE pending_member_links
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION expire_old_pending_links TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_pending_links TO anon;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ INTELLIGENT LINE SIGNUP SYSTEM CREATED!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 COMPONENTS CREATED:';
    RAISE NOTICE '   1. pending_member_links table';
    RAISE NOTICE '   2. find_existing_member_matches() function';
    RAISE NOTICE '   3. link_line_account_to_member() function';
    RAISE NOTICE '   4. update_society_member_data() function';
    RAISE NOTICE '   5. expire_old_pending_links() function';
    RAISE NOTICE '';
    RAISE NOTICE '💡 HOW IT WORKS:';
    RAISE NOTICE '   1. User logs in with LINE (e.g., Rocky Jones)';
    RAISE NOTICE '   2. System calls find_existing_member_matches()';
    RAISE NOTICE '   3. Shows matches: "Are you Rocky Jones, member of Pleasant Valley CC?"';
    RAISE NOTICE '   4. User confirms → calls link_line_account_to_member()';
    RAISE NOTICE '   5. LINE account linked, all data (handicap, society) carried over';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 EXAMPLE USAGE:';
    RAISE NOTICE '   -- Find matches for LINE user';
    RAISE NOTICE '   SELECT * FROM find_existing_member_matches(''U1234567'', ''Rocky Jones'');';
    RAISE NOTICE '';
    RAISE NOTICE '   -- Link confirmed match';
    RAISE NOTICE '   SELECT * FROM link_line_account_to_member(';
    RAISE NOTICE '       ''U1234567'',';
    RAISE NOTICE '       ''Rocky Jones'',';
    RAISE NOTICE '       ''https://pic.url'',';
    RAISE NOTICE '       ''pleasant_valley'',';
    RAISE NOTICE '       ''temp_golfer_123''';
    RAISE NOTICE '   );';
END $$;
