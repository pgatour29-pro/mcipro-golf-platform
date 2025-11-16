-- ============================================================================
-- CONSOLIDATED CADDY BOOKING & MANAGEMENT SYSTEM
-- ============================================================================
-- Version: 1.0 - Production Ready
-- Created: 2025-11-16
-- Purpose: Complete caddy booking system with admin management
-- Auth: LINE OAuth (TEXT user IDs, not UUID)
--
-- FEATURES:
-- ✅ Caddy profiles with comprehensive data
-- ✅ Golfer booking system with status tracking
-- ✅ User caddy preferences (favorites, regulars, notes)
-- ✅ Course admin management capabilities
-- ✅ Helper functions for common queries
-- ✅ Performance indexes
-- ✅ Row Level Security (RLS) for LINE OAuth
-- ============================================================================

-- ============================================================================
-- TABLE 1: caddy_profiles (Master Caddy Database)
-- ============================================================================
-- Stores all caddy information managed by golf courses
-- ============================================================================

CREATE TABLE IF NOT EXISTS caddy_profiles (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Identification
    caddy_number TEXT, -- e.g., "C001", unique per course
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,

    -- Golf Course Association
    course_id TEXT, -- Links to golf courses table
    course_name TEXT NOT NULL,

    -- Professional Info
    experience_years INTEGER DEFAULT 0,
    languages TEXT[] DEFAULT ARRAY['Thai', 'English'], -- e.g., ['Thai', 'English', 'Japanese']
    rating NUMERIC(3,2) DEFAULT 0.00, -- 0.00 to 5.00
    total_rounds INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,

    -- Specialties & Skills
    specialty TEXT, -- e.g., 'Championship Play', 'Beginner Support'
    specialties TEXT[], -- Array: ['Reading greens', 'Club selection', 'Course knowledge']
    certifications TEXT[], -- ['Professional Caddy License', 'First Aid']
    personality TEXT, -- e.g., 'Professional and detail-oriented'
    strengths TEXT[], -- ['Course Knowledge', 'Club Selection', 'Reading Greens']

    -- Availability
    is_active BOOLEAN DEFAULT true,
    availability_status TEXT DEFAULT 'available', -- 'available', 'booked', 'unavailable', 'off_duty'
    availability_days TEXT[], -- ['Monday', 'Tuesday', 'Wednesday', ...]

    -- Additional Info
    bio TEXT,
    notes TEXT, -- Internal notes for course admins

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT, -- LINE user ID of course admin who added caddy

    -- Constraints
    UNIQUE(course_id, caddy_number) -- Caddy number must be unique per course
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course ON caddy_profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course_name ON caddy_profiles(course_name);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_active ON caddy_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_availability ON caddy_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_rating ON caddy_profiles(rating DESC);

-- ============================================================================
-- TABLE 2: user_caddy_preferences (Personal Caddy Lists)
-- ============================================================================
-- Stores golfer's personal caddy preferences, favorites, and booking history
-- Supports "Caddy Organizer" feature
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_caddy_preferences (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Links
    user_id TEXT NOT NULL, -- LINE user ID
    caddy_id UUID NOT NULL REFERENCES caddy_profiles(id) ON DELETE CASCADE,

    -- Preference Flags
    is_favorite BOOLEAN DEFAULT false, -- User's favorite caddies
    is_regular BOOLEAN DEFAULT false, -- Regularly booked caddies
    is_blocked BOOLEAN DEFAULT false, -- Don't show this caddy to user

    -- Personal Notes & Rating
    personal_notes TEXT, -- Private notes about this caddy
    private_rating NUMERIC(3,2), -- User's personal rating (0-5), separate from public rating

    -- Booking History Tracking
    times_booked INTEGER DEFAULT 0, -- How many times user booked this caddy
    last_booked_date DATE, -- Most recent booking date
    first_booked_date DATE, -- First time user booked this caddy

    -- Metadata
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, caddy_id) -- One preference entry per user per caddy
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_user ON user_caddy_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_caddy ON user_caddy_preferences(caddy_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_favorite ON user_caddy_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_regular ON user_caddy_preferences(is_regular) WHERE is_regular = true;

-- ============================================================================
-- TABLE 3: caddy_bookings (Caddy Reservation Tracking)
-- ============================================================================
-- Stores all caddy booking requests and their status
-- ============================================================================

CREATE TABLE IF NOT EXISTS caddy_bookings (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Links
    user_id TEXT NOT NULL, -- LINE user ID (golfer)
    caddy_id UUID REFERENCES caddy_profiles(id) ON DELETE SET NULL,
    booking_id TEXT, -- Links to tee time booking if exists

    -- Golfer Info (denormalized for convenience)
    golfer_name TEXT,

    -- Booking Details
    course_id TEXT NOT NULL,
    course_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    tee_time TIME,
    holes INTEGER DEFAULT 18, -- 9 or 18

    -- Status Tracking
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    booking_source TEXT DEFAULT 'golfer_app', -- 'golfer_app', 'admin', 'phone', 'walk_in'

    -- Special Requests
    special_requests TEXT,

    -- Pricing (for future payment integration)
    caddy_fee NUMERIC(10,2),
    tip_amount NUMERIC(10,2),

    -- Rating & Review (after round completion)
    rating NUMERIC(3,2), -- 0-5 stars
    review_text TEXT,
    reviewed_at TIMESTAMPTZ,

    -- Admin Actions
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT, -- LINE user ID of course admin who confirmed
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_user ON caddy_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy ON caddy_bookings(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date ON caddy_bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_course ON caddy_bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_status ON caddy_bookings(status);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_pending ON caddy_bookings(status, course_id) WHERE status = 'pending';

-- ============================================================================
-- COURSE ADMIN SUPPORT: Add fields to user_profiles
-- ============================================================================
-- Allows designating users as course admins with specific course access
-- ============================================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_course_admin BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS managed_course_id TEXT; -- Which course they manage
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS managed_course_name TEXT;

-- Indexes for course admin lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_course_admin ON user_profiles(is_course_admin) WHERE is_course_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_managed_course ON user_profiles(managed_course_id) WHERE managed_course_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Configured for LINE OAuth (permissive, app handles user filtering)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE caddy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_caddy_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddy_bookings ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- CADDY PROFILES: Public viewing, managed insert/update
-- -----------------------------------------------------------------------------

-- Anyone can view active caddies
CREATE POLICY "caddy_profiles_public_select"
ON caddy_profiles FOR SELECT
USING (is_active = true);

-- Anyone can insert caddies (app handles course admin validation)
CREATE POLICY "caddy_profiles_public_insert"
ON caddy_profiles FOR INSERT
WITH CHECK (true);

-- Anyone can update caddies (app handles course admin validation)
CREATE POLICY "caddy_profiles_public_update"
ON caddy_profiles FOR UPDATE
USING (true);

-- Anyone can delete caddies (app handles course admin validation)
CREATE POLICY "caddy_profiles_public_delete"
ON caddy_profiles FOR DELETE
USING (true);

-- -----------------------------------------------------------------------------
-- USER CADDY PREFERENCES: Public access (app filters by user_id)
-- -----------------------------------------------------------------------------

CREATE POLICY "user_caddy_prefs_select"
ON user_caddy_preferences FOR SELECT
USING (true);

CREATE POLICY "user_caddy_prefs_insert"
ON user_caddy_preferences FOR INSERT
WITH CHECK (true);

CREATE POLICY "user_caddy_prefs_update"
ON user_caddy_preferences FOR UPDATE
USING (true);

CREATE POLICY "user_caddy_prefs_delete"
ON user_caddy_preferences FOR DELETE
USING (true);

-- -----------------------------------------------------------------------------
-- CADDY BOOKINGS: Public access (app filters by user_id/course_id)
-- -----------------------------------------------------------------------------

CREATE POLICY "caddy_bookings_select"
ON caddy_bookings FOR SELECT
USING (true);

CREATE POLICY "caddy_bookings_insert"
ON caddy_bookings FOR INSERT
WITH CHECK (true);

CREATE POLICY "caddy_bookings_update"
ON caddy_bookings FOR UPDATE
USING (true);

CREATE POLICY "caddy_bookings_delete"
ON caddy_bookings FOR DELETE
USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- FUNCTION: Get user's favorite caddies
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- FUNCTION: Get caddies for a specific course (with user preferences)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_course_caddies(p_course_name TEXT, p_user_id TEXT DEFAULT NULL)
RETURNS TABLE (
    caddy_id UUID,
    caddy_number TEXT,
    name TEXT,
    course_name TEXT,
    photo_url TEXT,
    rating NUMERIC,
    experience_years INTEGER,
    languages TEXT[],
    specialty TEXT,
    personality TEXT,
    strengths TEXT[],
    availability_status TEXT,
    total_rounds INTEGER,
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
        cp.caddy_number,
        cp.name,
        cp.course_name,
        cp.photo_url,
        cp.rating,
        cp.experience_years,
        cp.languages,
        cp.specialty,
        cp.personality,
        cp.strengths,
        cp.availability_status,
        cp.total_rounds,
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

-- -----------------------------------------------------------------------------
-- FUNCTION: Get available caddies for date/time (for booking)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_available_caddies(
    p_course_id TEXT,
    p_date DATE,
    p_time TIME DEFAULT NULL
)
RETURNS TABLE (
    caddy_id UUID,
    caddy_number TEXT,
    name TEXT,
    photo_url TEXT,
    rating NUMERIC,
    experience_years INTEGER,
    languages TEXT[],
    specialty TEXT,
    total_rounds INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.caddy_number,
        c.name,
        c.photo_url,
        c.rating,
        c.experience_years,
        c.languages,
        c.specialty,
        c.total_rounds
    FROM caddy_profiles c
    WHERE c.course_id = p_course_id
        AND c.is_active = true
        AND c.availability_status = 'available'
        AND c.id NOT IN (
            -- Exclude caddies already booked for this date/time
            SELECT cb.caddy_id
            FROM caddy_bookings cb
            WHERE cb.booking_date = p_date
                AND cb.status IN ('confirmed', 'pending')
                AND (p_time IS NULL OR cb.tee_time = p_time)
                AND cb.caddy_id IS NOT NULL
        )
    ORDER BY c.rating DESC, c.total_rounds DESC;
END;
$$;

-- -----------------------------------------------------------------------------
-- FUNCTION: Add/Update user caddy preference
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- FUNCTION: Get pending bookings for course admin
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_bookings_for_course(p_course_id TEXT)
RETURNS TABLE (
    booking_id UUID,
    caddy_id UUID,
    caddy_number TEXT,
    caddy_name TEXT,
    golfer_id TEXT,
    golfer_name TEXT,
    booking_date DATE,
    tee_time TIME,
    holes INTEGER,
    special_requests TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cb.id,
        cb.caddy_id,
        cp.caddy_number,
        cp.name,
        cb.user_id,
        cb.golfer_name,
        cb.booking_date,
        cb.tee_time,
        cb.holes,
        cb.special_requests,
        cb.created_at
    FROM caddy_bookings cb
    LEFT JOIN caddy_profiles cp ON cb.caddy_id = cp.id
    WHERE cb.course_id = p_course_id
        AND cb.status = 'pending'
    ORDER BY cb.booking_date ASC, cb.tee_time ASC, cb.created_at ASC;
$$;

-- -----------------------------------------------------------------------------
-- FUNCTION: Get today's bookings for course
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_todays_caddy_bookings(p_course_id TEXT)
RETURNS TABLE (
    booking_id UUID,
    caddy_number TEXT,
    caddy_name TEXT,
    golfer_name TEXT,
    tee_time TIME,
    holes INTEGER,
    status TEXT,
    special_requests TEXT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        cb.id,
        cp.caddy_number,
        cp.name,
        cb.golfer_name,
        cb.tee_time,
        cb.holes,
        cb.status,
        cb.special_requests
    FROM caddy_bookings cb
    LEFT JOIN caddy_profiles cp ON cb.caddy_id = cp.id
    WHERE cb.course_id = p_course_id
        AND cb.booking_date = CURRENT_DATE
    ORDER BY cb.tee_time NULLS LAST, cb.created_at;
$$;

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_caddy_profiles_updated_at
BEFORE UPDATE ON caddy_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_caddy_prefs_updated_at
BEFORE UPDATE ON user_caddy_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caddy_bookings_updated_at
BEFORE UPDATE ON caddy_bookings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONSOLIDATED CADDY SYSTEM CREATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  ✅ caddy_profiles (with caddy_number support)';
    RAISE NOTICE '  ✅ user_caddy_preferences (favorites, regulars, notes)';
    RAISE NOTICE '  ✅ caddy_bookings (comprehensive booking tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Course Admin Support:';
    RAISE NOTICE '  ✅ user_profiles extended (is_course_admin, managed_course_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Functions:';
    RAISE NOTICE '  ✅ get_user_favorite_caddies(user_id)';
    RAISE NOTICE '  ✅ get_course_caddies(course_name, user_id)';
    RAISE NOTICE '  ✅ get_available_caddies(course_id, date, time)';
    RAISE NOTICE '  ✅ upsert_caddy_preference(user_id, caddy_id, ...)';
    RAISE NOTICE '  ✅ get_pending_bookings_for_course(course_id)';
    RAISE NOTICE '  ✅ get_todays_caddy_bookings(course_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Security:';
    RAISE NOTICE '  ✅ RLS enabled (LINE OAuth compatible)';
    RAISE NOTICE '  ✅ Permissive policies (app handles filtering)';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance:';
    RAISE NOTICE '  ✅ 15+ indexes for fast queries';
    RAISE NOTICE '  ✅ Auto-update timestamp triggers';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Populate caddies using sample data SQL';
    RAISE NOTICE '  2. Update app code to use caddy_profiles table';
    RAISE NOTICE '  3. Build admin UI for booking management';
    RAISE NOTICE '  4. Integrate notification system';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
