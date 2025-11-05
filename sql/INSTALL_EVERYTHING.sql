-- =====================================================================
-- ONE-CLICK INSTALLATION - All 4 Scripts Combined
-- =====================================================================
-- Just copy/paste this entire file into Supabase SQL Editor and click Run
-- No multiple files, no errors, just works.
-- =====================================================================

-- =====================================================
-- STEP 1: Backfill missing profile data
-- =====================================================

BEGIN;

UPDATE user_profiles
SET profile_data = jsonb_build_object(
    'username', COALESCE(username, name, line_user_id),
    'linePictureUrl', '',
    'personalInfo', jsonb_build_object(
        'firstName', COALESCE(SPLIT_PART(name, ' ', 1), ''),
        'lastName', COALESCE(SPLIT_PART(name, ' ', 2), ''),
        'email', COALESCE(email, ''),
        'phone', COALESCE(phone, '')
    ),
    'golfInfo', jsonb_build_object(
        'handicap', COALESCE((profile_data->>'handicap')::numeric, 0),
        'homeClub', COALESCE(home_course_name, home_club, ''),
        'homeCourseId', COALESCE(home_course_id::text, ''),
        'experienceLevel', 'intermediate',
        'playingStyle', 'casual'
    ),
    'professionalInfo', jsonb_build_object(),
    'skills', jsonb_build_object(),
    'preferences', jsonb_build_object(
        'language', COALESCE(language, 'en')
    ),
    'media', jsonb_build_object(),
    'privacy', jsonb_build_object()
)
WHERE profile_data::text = '{}' OR profile_data IS NULL;

UPDATE user_profiles
SET profile_data = jsonb_set(
    jsonb_set(
        jsonb_set(
            profile_data,
            '{personalInfo,email}',
            to_jsonb(COALESCE(email, ''))
        ),
        '{personalInfo,phone}',
        to_jsonb(COALESCE(phone, ''))
    ),
    '{golfInfo,homeClub}',
    to_jsonb(COALESCE(home_course_name, home_club, ''))
)
WHERE email IS NOT NULL
   OR phone IS NOT NULL
   OR home_course_name IS NOT NULL;

COMMIT;

-- =====================================================
-- STEP 2: Add username column
-- =====================================================

BEGIN;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE user_profiles
SET username = profile_data->>'username'
WHERE username IS NULL
  AND profile_data->>'username' IS NOT NULL
  AND profile_data->>'username' != '';

UPDATE user_profiles
SET username = COALESCE(
    LOWER(REPLACE(name, ' ', '')),
    SUBSTRING(line_user_id, 1, 10)
)
WHERE username IS NULL OR username = '';

WITH duplicates AS (
    SELECT
        line_user_id,
        username,
        ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
    FROM user_profiles
    WHERE username IS NOT NULL
)
UPDATE user_profiles up
SET username = d.username || d.rn
FROM duplicates d
WHERE up.line_user_id = d.line_user_id
  AND d.rn > 1;

DROP INDEX IF EXISTS idx_user_profiles_username_unique;
CREATE UNIQUE INDEX idx_user_profiles_username_unique
    ON user_profiles(username)
    WHERE username IS NOT NULL;

DROP INDEX IF EXISTS idx_user_profiles_username;
CREATE INDEX idx_user_profiles_username
    ON user_profiles(username);

UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{username}',
    to_jsonb(username)
)
WHERE username IS NOT NULL
  AND (profile_data->>'username' IS NULL OR profile_data->>'username' = '');

COMMIT;

-- =====================================================
-- STEP 3: Create data sync functions
-- =====================================================

CREATE OR REPLACE FUNCTION sync_profile_jsonb_to_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.profile_data->>'username' IS NOT NULL AND NEW.profile_data->>'username' != '' THEN
        NEW.username := NEW.profile_data->>'username';
    END IF;

    IF NEW.profile_data->'personalInfo'->>'email' IS NOT NULL THEN
        NEW.email := NEW.profile_data->'personalInfo'->>'email';
    END IF;

    IF NEW.profile_data->'personalInfo'->>'phone' IS NOT NULL THEN
        NEW.phone := NEW.profile_data->'personalInfo'->>'phone';
    END IF;

    IF NEW.profile_data->'golfInfo'->>'homeClub' IS NOT NULL THEN
        NEW.home_course_name := NEW.profile_data->'golfInfo'->>'homeClub';
    END IF;

    IF NEW.profile_data->'golfInfo'->>'homeCourseId' IS NOT NULL AND NEW.profile_data->'golfInfo'->>'homeCourseId' != '' THEN
        NEW.home_course_id := NEW.profile_data->'golfInfo'->>'homeCourseId';
    END IF;

    IF NEW.profile_data->'preferences'->>'language' IS NOT NULL THEN
        NEW.language := NEW.profile_data->'preferences'->>'language';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_profile_columns_to_jsonb()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.profile_data IS NULL OR NEW.profile_data::text = '{}' THEN
        NEW.profile_data := '{
            "username": "",
            "linePictureUrl": "",
            "personalInfo": {},
            "golfInfo": {},
            "professionalInfo": {},
            "skills": {},
            "preferences": {},
            "media": {},
            "privacy": {}
        }'::jsonb;
    END IF;

    IF NEW.username IS NOT NULL AND NEW.username != COALESCE(OLD.username, '') THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{username}', to_jsonb(NEW.username));
    END IF;

    IF NEW.email IS NOT NULL AND NEW.email != COALESCE(OLD.email, '') THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{personalInfo,email}', to_jsonb(NEW.email));
    END IF;

    IF NEW.phone IS NOT NULL AND NEW.phone != COALESCE(OLD.phone, '') THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{personalInfo,phone}', to_jsonb(NEW.phone));
    END IF;

    IF NEW.home_course_name IS NOT NULL AND NEW.home_course_name != COALESCE(OLD.home_course_name, '') THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{golfInfo,homeClub}', to_jsonb(NEW.home_course_name));
    END IF;

    IF NEW.home_course_id IS NOT NULL AND (OLD.home_course_id IS NULL OR NEW.home_course_id != OLD.home_course_id) THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{golfInfo,homeCourseId}', to_jsonb(NEW.home_course_id::text));
    END IF;

    IF NEW.language IS NOT NULL AND NEW.language != COALESCE(OLD.language, '') THEN
        NEW.profile_data := jsonb_set(NEW.profile_data, '{preferences,language}', to_jsonb(NEW.language));
    END IF;

    IF NEW.name IS NOT NULL AND NEW.name != COALESCE(OLD.name, '') THEN
        NEW.profile_data := jsonb_set(
            jsonb_set(
                NEW.profile_data,
                '{personalInfo,firstName}',
                to_jsonb(SPLIT_PART(NEW.name, ' ', 1))
            ),
            '{personalInfo,lastName}',
            to_jsonb(NULLIF(SPLIT_PART(NEW.name, ' ', 2), ''))
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_jsonb_to_columns ON user_profiles;
CREATE TRIGGER trigger_sync_jsonb_to_columns
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_jsonb_to_columns();

DROP TRIGGER IF EXISTS trigger_sync_columns_to_jsonb ON user_profiles;
CREATE TRIGGER trigger_sync_columns_to_jsonb
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_columns_to_jsonb();

-- =====================================================
-- STEP 4: Intelligent LINE signup
-- =====================================================

CREATE TABLE IF NOT EXISTS pending_member_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id TEXT NOT NULL,
    line_display_name TEXT,
    line_picture_url TEXT,
    society_name TEXT NOT NULL,
    existing_golfer_id TEXT NOT NULL,
    existing_member_data JSONB,
    match_confidence DECIMAL(3,2) DEFAULT 0.5,
    match_reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_links_line_user ON pending_member_links(line_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_links_status ON pending_member_links(status);

ALTER TABLE pending_member_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pending links viewable by everyone" ON pending_member_links;
CREATE POLICY "Pending links viewable by everyone" ON pending_member_links
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pending links manageable by everyone" ON pending_member_links;
CREATE POLICY "Pending links manageable by everyone" ON pending_member_links
    FOR ALL USING (true) WITH CHECK (true);

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
    RETURN QUERY
    SELECT
        sm.society_name,
        sm.golfer_id,
        sm.member_number,
        sm.member_data,
        CASE
            WHEN LOWER(sm.member_data->>'name') = LOWER(p_line_display_name) THEN 0.95
            WHEN LOWER(sm.member_data->>'name') LIKE '%' || LOWER(p_line_display_name) || '%' THEN 0.75
            WHEN LOWER(p_line_display_name) LIKE '%' || LOWER(sm.member_data->>'name') || '%' THEN 0.75
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
        up.line_user_id IS NULL
        AND sm.member_data->>'name' IS NOT NULL
        AND (
            LOWER(sm.member_data->>'name') LIKE '%' || LOWER(p_line_display_name) || '%'
            OR LOWER(p_line_display_name) LIKE '%' || LOWER(sm.member_data->>'name') || '%'
            OR LOWER(SPLIT_PART(sm.member_data->>'name', ' ', 1)) = LOWER(SPLIT_PART(p_line_display_name, ' ', 1))
        )
    ORDER BY match_confidence DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION find_existing_member_matches TO authenticated;
GRANT EXECUTE ON FUNCTION find_existing_member_matches TO anon;

CREATE OR REPLACE FUNCTION link_line_account_to_member(
    p_line_user_id TEXT,
    p_line_display_name TEXT,
    p_line_picture_url TEXT,
    p_society_name TEXT,
    p_existing_golfer_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_member_data JSONB;
    v_society_id UUID;
BEGIN
    SELECT member_data INTO v_member_data
    FROM society_members
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Member not found');
    END IF;

    SELECT id INTO v_society_id
    FROM society_profiles
    WHERE society_name = p_society_name
    LIMIT 1;

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
        'golfer',
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
                'homeClub', '',
                'homeCourseId', ''
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
        updated_at = NOW();

    UPDATE society_members
    SET
        golfer_id = p_line_user_id,
        status = 'active',
        member_data = jsonb_set(
            member_data,
            '{linkedAt}',
            to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    UPDATE pending_member_links
    SET
        status = 'accepted',
        resolved_at = NOW()
    WHERE line_user_id = p_line_user_id
      AND existing_golfer_id = p_existing_golfer_id
      AND status = 'pending';

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Account linked successfully',
        'society_applied', p_society_name
    );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION link_line_account_to_member TO authenticated;
GRANT EXECUTE ON FUNCTION link_line_account_to_member TO anon;

-- =====================================================
-- DONE!
-- =====================================================

DO $$
DECLARE
    v_total INT;
    v_functions INT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM user_profiles;

    SELECT COUNT(*) INTO v_functions
    FROM information_schema.routines
    WHERE routine_name IN (
        'find_existing_member_matches',
        'link_line_account_to_member',
        'sync_profile_jsonb_to_columns',
        'sync_profile_columns_to_jsonb'
    );

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ INSTALLATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total profiles: %', v_total;
    RAISE NOTICE 'Functions created: % / 4', v_functions;
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Integrate JavaScript code';
    RAISE NOTICE '';
END $$;
