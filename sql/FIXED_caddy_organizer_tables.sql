-- CADDY ORGANIZER FEATURE - FIXED FOR LINE OAUTH
-- Personal caddy inventory and booking management
-- Created: 2025-11-07
-- FIXED: Removed auth.uid() comparisons since this uses LINE OAuth, not Supabase Auth

-- =====================================================
-- TABLE 1: caddy_profiles (Master caddy database)
-- =====================================================
CREATE TABLE IF NOT EXISTS caddy_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Basic Info
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,

    -- Golf Course Association
    course_id TEXT, -- Links to golf courses
    course_name TEXT NOT NULL,

    -- Professional Info
    experience_years INTEGER DEFAULT 0,
    languages TEXT[], -- ['English', 'Thai', 'Japanese']
    rating NUMERIC(3,2) DEFAULT 0.00, -- 0.00 to 5.00
    total_rounds INTEGER DEFAULT 0,

    -- Specialties & Skills
    specialties TEXT[], -- ['Reading greens', 'Club selection', 'Course knowledge']
    certifications TEXT[], -- ['Professional Caddy License', 'First Aid']

    -- Availability
    is_active BOOLEAN DEFAULT true,
    availability_days TEXT[], -- ['Monday', 'Tuesday', ...]

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT, -- LINE user ID who added caddy to system

    -- Notes
    bio TEXT,
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course ON caddy_profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course_name ON caddy_profiles(course_name);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_active ON caddy_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_rating ON caddy_profiles(rating DESC);

-- =====================================================
-- TABLE 2: user_caddy_preferences (Personal caddy list)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_caddy_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Links
    user_id TEXT NOT NULL, -- LINE user ID
    caddy_id UUID NOT NULL REFERENCES caddy_profiles(id) ON DELETE CASCADE,

    -- Preference Flags
    is_favorite BOOLEAN DEFAULT false,
    is_regular BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false, -- Don't show this caddy

    -- Personal Notes
    personal_notes TEXT,
    private_rating NUMERIC(3,2), -- User's personal rating (0-5)

    -- Booking History
    times_booked INTEGER DEFAULT 0,
    last_booked_date DATE,
    first_booked_date DATE,

    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one preference entry per user per caddy
    UNIQUE(user_id, caddy_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_user ON user_caddy_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_caddy ON user_caddy_preferences(caddy_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_favorite ON user_caddy_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_regular ON user_caddy_preferences(is_regular) WHERE is_regular = true;

-- =====================================================
-- TABLE 3: caddy_bookings (Track caddy reservations)
-- =====================================================
CREATE TABLE IF NOT EXISTS caddy_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Links
    user_id TEXT NOT NULL, -- LINE user ID
    caddy_id UUID REFERENCES caddy_profiles(id) ON DELETE SET NULL,
    booking_id TEXT, -- Links to tee time booking if exists

    -- Booking Details
    course_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    tee_time TIME,

    -- Status
    status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled

    -- Pricing
    caddy_fee NUMERIC(10,2),
    tip_amount NUMERIC(10,2),

    -- Rating & Review (after round)
    rating NUMERIC(3,2),
    review_text TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_user ON caddy_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy ON caddy_bookings(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date ON caddy_bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_status ON caddy_bookings(status);

-- =====================================================
-- RLS POLICIES - SIMPLIFIED (No auth.uid() since using LINE OAuth)
-- =====================================================

-- caddy_profiles: Everyone can view, insert allowed
ALTER TABLE caddy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active caddies"
ON caddy_profiles FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can add caddies"
ON caddy_profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update caddies"
ON caddy_profiles FOR UPDATE
USING (true);

-- user_caddy_preferences: Public access (app handles user filtering)
ALTER TABLE user_caddy_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all preferences"
ON user_caddy_preferences FOR SELECT
USING (true);

CREATE POLICY "Users can insert preferences"
ON user_caddy_preferences FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update preferences"
ON user_caddy_preferences FOR UPDATE
USING (true);

CREATE POLICY "Users can delete preferences"
ON user_caddy_preferences FOR DELETE
USING (true);

-- caddy_bookings: Public access (app handles user filtering)
ALTER TABLE caddy_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bookings"
ON caddy_bookings FOR SELECT
USING (true);

CREATE POLICY "Users can insert bookings"
ON caddy_bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update bookings"
ON caddy_bookings FOR UPDATE
USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get user's favorite caddies with full details
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
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cp.id as caddy_id,
        cp.name,
        cp.course_name,
        cp.photo_url,
        cp.rating,
        cp.experience_years,
        cp.languages,
        ucp.is_favorite,
        ucp.is_regular,
        ucp.times_booked,
        ucp.last_booked_date,
        ucp.personal_notes
    FROM caddy_profiles cp
    INNER JOIN user_caddy_preferences ucp ON cp.id = ucp.caddy_id
    WHERE ucp.user_id = p_user_id
        AND ucp.is_favorite = true
        AND cp.is_active = true
    ORDER BY ucp.last_booked_date DESC NULLS LAST, cp.rating DESC;
$$;

-- Function: Get caddies for a specific course
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
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cp.id as caddy_id,
        cp.name,
        cp.course_name,
        cp.photo_url,
        cp.rating,
        cp.experience_years,
        cp.languages,
        COALESCE(ucp.is_favorite, false) as is_favorite,
        COALESCE(ucp.is_regular, false) as is_regular,
        (ucp.id IS NOT NULL) as is_in_my_list,
        COALESCE(ucp.times_booked, 0) as times_booked
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

-- Function: Add/Update caddy preference
CREATE OR REPLACE FUNCTION upsert_caddy_preference(
    p_user_id TEXT,
    p_caddy_id UUID,
    p_is_favorite BOOLEAN DEFAULT false,
    p_is_regular BOOLEAN DEFAULT false,
    p_personal_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_pref_id UUID;
BEGIN
    INSERT INTO user_caddy_preferences (
        user_id,
        caddy_id,
        is_favorite,
        is_regular,
        personal_notes,
        added_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_caddy_id,
        p_is_favorite,
        p_is_regular,
        p_personal_notes,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, caddy_id)
    DO UPDATE SET
        is_favorite = EXCLUDED.is_favorite,
        is_regular = EXCLUDED.is_regular,
        personal_notes = COALESCE(EXCLUDED.personal_notes, user_caddy_preferences.personal_notes),
        updated_at = NOW()
    RETURNING id INTO v_pref_id;

    RETURN v_pref_id;
END;
$$;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample caddies for Phoenix Gold
INSERT INTO caddy_profiles (name, course_name, phone, experience_years, languages, rating, bio)
VALUES
    ('Somchai Khunpol', 'Phoenix Gold Golf & Country Club', '+66-81-234-5678', 8, ARRAY['Thai', 'English'], 4.8, 'Expert in reading greens, knows every break on Phoenix Gold.'),
    ('Niran Thanasit', 'Phoenix Gold Golf & Country Club', '+66-89-876-5432', 5, ARRAY['Thai', 'English', 'Japanese'], 4.5, 'Friendly and professional, great with beginners.'),
    ('Wichit Suriyong', 'Phoenix Gold Golf & Country Club', '+66-82-345-6789', 12, ARRAY['Thai', 'English'], 4.9, 'Veteran caddy, 12 years at Phoenix Gold. Best course knowledge.')
ON CONFLICT DO NOTHING;

-- Insert sample caddies for Khao Kheow
INSERT INTO caddy_profiles (name, course_name, phone, experience_years, languages, rating, bio)
VALUES
    ('Manee Thepsiri', 'Khao Kheow Country Club', '+66-84-567-8901', 6, ARRAY['Thai', 'English'], 4.6, 'Patient and helpful, great at club selection.'),
    ('Prasert Kaewmala', 'Khao Kheow Country Club', '+66-86-789-0123', 10, ARRAY['Thai', 'English', 'Korean'], 4.7, 'Experienced with tournament play, very professional.')
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Caddy Organizer tables created successfully';
    RAISE NOTICE '✅ Tables: caddy_profiles, user_caddy_preferences, caddy_bookings';
    RAISE NOTICE '✅ RLS policies enabled (simplified for LINE OAuth)';
    RAISE NOTICE '✅ Helper functions created for easy queries';
    RAISE NOTICE '✅ Sample caddy data inserted';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: RLS policies are permissive - app code handles user filtering';
    RAISE NOTICE 'This is because the system uses LINE OAuth, not Supabase Auth';
END $$;
