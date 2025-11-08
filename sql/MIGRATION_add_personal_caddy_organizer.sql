-- =====================================================
-- MIGRATION: Add Personal Caddy Organizer Tables
-- =====================================================
-- This adds ONLY the Personal Caddy Organizer tables
-- (caddies and caddy_bookings already exist from Golf Course Admin system)
-- =====================================================

-- =====================================================
-- TABLE 1: caddy_profiles (Master caddy database for Personal Organizer)
-- =====================================================
CREATE TABLE IF NOT EXISTS caddy_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Basic Info
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,

    -- Golf Course Association
    course_id TEXT,
    course_name TEXT NOT NULL,

    -- Professional Info
    experience_years INTEGER DEFAULT 0,
    languages TEXT[],
    rating NUMERIC(3,2) DEFAULT 0.00,
    total_rounds INTEGER DEFAULT 0,

    -- Specialties & Skills
    specialties TEXT[],
    certifications TEXT[],

    -- Availability
    is_active BOOLEAN DEFAULT true,
    availability_days TEXT[],

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT,

    -- Notes
    bio TEXT,
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course ON caddy_profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course_name ON caddy_profiles(course_name);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_active ON caddy_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_rating ON caddy_profiles(rating DESC);

-- =====================================================
-- TABLE 2: user_caddy_preferences (Personal caddy lists)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_caddy_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Links
    user_id TEXT NOT NULL,
    caddy_id UUID NOT NULL REFERENCES caddy_profiles(id) ON DELETE CASCADE,

    -- Preference Flags
    is_favorite BOOLEAN DEFAULT false,
    is_regular BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,

    -- Personal Notes
    personal_notes TEXT,
    private_rating NUMERIC(3,2),

    -- Booking History
    times_booked INTEGER DEFAULT 0,
    last_booked_date DATE,
    first_booked_date DATE,

    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(user_id, caddy_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_user ON user_caddy_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_caddy ON user_caddy_preferences(caddy_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_favorite ON user_caddy_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_regular ON user_caddy_preferences(is_regular) WHERE is_regular = true;

-- =====================================================
-- RLS POLICIES (Simplified - app handles user filtering)
-- =====================================================

ALTER TABLE caddy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_caddy_preferences ENABLE ROW LEVEL SECURITY;

-- Everyone can view/manage (app handles user filtering via LINE IDs)
CREATE POLICY "Public access to caddy profiles" ON caddy_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to preferences" ON user_caddy_preferences FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_favorite_caddies(p_user_id TEXT)
RETURNS TABLE (
    caddy_id UUID,
    name TEXT,
    course_name TEXT,
    photo_url TEXT,
    rating NUMERIC,
    experience_years INTEGER,
    languages TEXT[],
    is_favorite BOOLEAN,
    is_regular BOOLEAN,
    times_booked INTEGER,
    last_booked_date DATE,
    personal_notes TEXT
)
LANGUAGE SQL STABLE AS $$
    SELECT
        cp.id, cp.name, cp.course_name, cp.photo_url,
        cp.rating, cp.experience_years, cp.languages,
        ucp.is_favorite, ucp.is_regular,
        ucp.times_booked, ucp.last_booked_date, ucp.personal_notes
    FROM caddy_profiles cp
    INNER JOIN user_caddy_preferences ucp ON cp.id = ucp.caddy_id
    WHERE ucp.user_id = p_user_id
        AND ucp.is_favorite = true
        AND cp.is_active = true
    ORDER BY ucp.last_booked_date DESC NULLS LAST, cp.rating DESC;
$$;

CREATE OR REPLACE FUNCTION get_course_caddies(p_course_name TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS TABLE (
    caddy_id UUID,
    name TEXT,
    course_name TEXT,
    photo_url TEXT,
    rating NUMERIC,
    experience_years INTEGER,
    languages TEXT[],
    is_favorite BOOLEAN,
    is_regular BOOLEAN,
    is_in_my_list BOOLEAN,
    times_booked INTEGER
)
LANGUAGE SQL STABLE AS $$
    SELECT
        cp.id, cp.name, cp.course_name, cp.photo_url,
        cp.rating, cp.experience_years, cp.languages,
        COALESCE(ucp.is_favorite, false),
        COALESCE(ucp.is_regular, false),
        (ucp.id IS NOT NULL),
        COALESCE(ucp.times_booked, 0)
    FROM caddy_profiles cp
    LEFT JOIN user_caddy_preferences ucp ON cp.id = ucp.caddy_id AND ucp.user_id = p_user_id
    WHERE cp.course_name = p_course_name
        AND cp.is_active = true
        AND (ucp.is_blocked IS NULL OR ucp.is_blocked = false)
    ORDER BY
        COALESCE(ucp.is_favorite, false) DESC,
        COALESCE(ucp.is_regular, false) DESC,
        cp.rating DESC,
        cp.name ASC;
$$;

-- Sample data
INSERT INTO caddy_profiles (name, course_name, phone, experience_years, languages, rating, bio)
VALUES
    ('Somchai Khunpol', 'Phoenix Gold Golf & Country Club', '+66-81-234-5678', 8, ARRAY['Thai', 'English'], 4.8, 'Expert in reading greens'),
    ('Niran Thanasit', 'Phoenix Gold Golf & Country Club', '+66-89-876-5432', 5, ARRAY['Thai', 'English', 'Japanese'], 4.5, 'Friendly and professional'),
    ('Wichit Suriyong', 'Phoenix Gold Golf & Country Club', '+66-82-345-6789', 12, ARRAY['Thai', 'English'], 4.9, 'Veteran caddy'),
    ('Manee Thepsiri', 'Khao Kheow Country Club', '+66-84-567-8901', 6, ARRAY['Thai', 'English'], 4.6, 'Patient and helpful'),
    ('Prasert Kaewmala', 'Khao Kheow Country Club', '+66-86-789-0123', 10, ARRAY['Thai', 'English', 'Korean'], 4.7, 'Experienced with tournaments')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Personal Caddy Organizer tables added successfully';
    RAISE NOTICE '✅ Tables: caddy_profiles, user_caddy_preferences';
    RAISE NOTICE '✅ Sample data: 5 caddies inserted';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: caddies and caddy_bookings tables already exist (from Golf Course Admin)';
    RAISE NOTICE 'NOTE: Both systems can work together!';
END $$;
