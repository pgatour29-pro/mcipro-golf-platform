-- =====================================================
-- GOLF COURSE CADDY MANAGEMENT SYSTEM
-- Complete database schema for caddy booking and management
-- =====================================================
--
-- PURPOSE:
-- Allow golf courses to manage caddies alongside existing tee time systems
-- while golfers can book caddies through MyCaddiPro platform
--
-- GOLF COURSES (First Rollout - 9 courses):
-- 1. Pattana Golf Resort
-- 2. Burapha Golf Club
-- 3. Pattaya Country Club
-- 4. Bangpakong Riverside Golf
-- 5. Royal Lakeside Golf
-- 6. Hermes Golf
-- 7. Phoenix Golf
-- 8. GreenWood Golf
-- 9. Pattavia Golf
-- =====================================================

-- =====================================================
-- STEP 1: CREATE CADDIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS caddies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caddy_number TEXT NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    home_club_id TEXT NOT NULL, -- Links to courses.id
    home_club_name TEXT,
    rating DECIMAL(2,1) DEFAULT 4.0,
    experience_years INTEGER DEFAULT 0,
    languages TEXT[] DEFAULT ARRAY['Thai', 'English'],
    specialty TEXT,
    personality TEXT,
    strengths TEXT[],
    availability_status TEXT DEFAULT 'available', -- available, booked, off_duty, on_break
    total_rounds INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: caddy number must be unique per course
    UNIQUE(home_club_id, caddy_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddies_home_club ON caddies(home_club_id);
CREATE INDEX IF NOT EXISTS idx_caddies_availability ON caddies(availability_status);
CREATE INDEX IF NOT EXISTS idx_caddies_rating ON caddies(rating DESC);

-- =====================================================
-- STEP 2: CREATE CADDY BOOKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS caddy_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caddy_id UUID REFERENCES caddies(id) ON DELETE CASCADE,
    golfer_id TEXT NOT NULL, -- LINE user ID
    golfer_name TEXT,
    booking_date DATE NOT NULL,
    tee_time TIME,
    holes INTEGER DEFAULT 18, -- 9 or 18
    course_id TEXT NOT NULL,
    course_name TEXT,
    status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    special_requests TEXT,
    booking_source TEXT DEFAULT 'golfer_app', -- golfer_app, course_admin, phone
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    confirmed_by TEXT, -- course_admin user_id who confirmed
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy ON caddy_bookings(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_golfer ON caddy_bookings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date ON caddy_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_course ON caddy_bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_status ON caddy_bookings(status);

-- =====================================================
-- STEP 3: CREATE CADDY WAITLIST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS caddy_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caddy_id UUID REFERENCES caddies(id) ON DELETE CASCADE,
    golfer_id TEXT NOT NULL,
    golfer_name TEXT,
    requested_date DATE NOT NULL,
    requested_time TIME,
    holes INTEGER DEFAULT 18,
    course_id TEXT NOT NULL,
    course_name TEXT,
    status TEXT DEFAULT 'waiting', -- waiting, approved, denied, expired
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by TEXT, -- course_admin user_id
    notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddy_waitlist_caddy ON caddy_waitlist(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_waitlist_date ON caddy_waitlist(requested_date);
CREATE INDEX IF NOT EXISTS idx_caddy_waitlist_status ON caddy_waitlist(status);

-- =====================================================
-- STEP 4: ADD COURSE_ADMIN ROLE TO USER_PROFILES
-- =====================================================

-- Add new columns to user_profiles for course admins
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_course_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS managed_course_id TEXT; -- Which course they manage
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS managed_course_name TEXT;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_course_admin ON user_profiles(is_course_admin) WHERE is_course_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_managed_course ON user_profiles(managed_course_id) WHERE managed_course_id IS NOT NULL;

-- =====================================================
-- STEP 5: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE caddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddy_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddy_waitlist ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CADDIES TABLE POLICIES
-- =====================================================

-- Everyone can view caddies (public information)
CREATE POLICY "Caddies - Public read access"
ON caddies FOR SELECT
USING (true);

-- Only course admins can insert/update/delete caddies for their course
CREATE POLICY "Caddies - Course admins can manage their caddies"
ON caddies FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE line_user_id = auth.uid()::text
        AND is_course_admin = true
        AND managed_course_id = caddies.home_club_id
    )
);

-- =====================================================
-- CADDY BOOKINGS TABLE POLICIES
-- =====================================================

-- Golfers can view their own bookings
-- Course admins can view all bookings for their course
CREATE POLICY "Caddy Bookings - View own or managed course"
ON caddy_bookings FOR SELECT
USING (
    golfer_id = auth.uid()::text
    OR
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE line_user_id = auth.uid()::text
        AND is_course_admin = true
        AND managed_course_id = caddy_bookings.course_id
    )
);

-- Golfers can create bookings
CREATE POLICY "Caddy Bookings - Golfers can create"
ON caddy_bookings FOR INSERT
WITH CHECK (golfer_id = auth.uid()::text);

-- Course admins can update/cancel bookings for their course
-- Golfers can cancel their own pending bookings
CREATE POLICY "Caddy Bookings - Update/cancel access"
ON caddy_bookings FOR UPDATE
USING (
    (golfer_id = auth.uid()::text AND status = 'pending')
    OR
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE line_user_id = auth.uid()::text
        AND is_course_admin = true
        AND managed_course_id = caddy_bookings.course_id
    )
);

-- Only course admins can delete bookings
CREATE POLICY "Caddy Bookings - Course admins can delete"
ON caddy_bookings FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE line_user_id = auth.uid()::text
        AND is_course_admin = true
        AND managed_course_id = caddy_bookings.course_id
    )
);

-- =====================================================
-- CADDY WAITLIST TABLE POLICIES
-- =====================================================

-- Similar policies to bookings
CREATE POLICY "Caddy Waitlist - View own or managed course"
ON caddy_waitlist FOR SELECT
USING (
    golfer_id = auth.uid()::text
    OR
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE line_user_id = auth.uid()::text
        AND is_course_admin = true
        AND managed_course_id = caddy_waitlist.course_id
    )
);

CREATE POLICY "Caddy Waitlist - Golfers can create"
ON caddy_waitlist FOR INSERT
WITH CHECK (golfer_id = auth.uid()::text);

CREATE POLICY "Caddy Waitlist - Course admins can manage"
ON caddy_waitlist FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_profiles
        WHERE line_user_id = auth.uid()::text
        AND is_course_admin = true
        AND managed_course_id = caddy_waitlist.course_id
    )
);

-- =====================================================
-- STEP 6: HELPER FUNCTIONS
-- =====================================================

-- Function to get available caddies for a course on a specific date/time
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
    rating DECIMAL,
    experience_years INTEGER,
    languages TEXT[],
    specialty TEXT,
    total_rounds INTEGER
) AS $$
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
    FROM caddies c
    WHERE c.home_club_id = p_course_id
    AND c.availability_status = 'available'
    AND c.id NOT IN (
        -- Exclude caddies already booked for this date/time
        SELECT cb.caddy_id
        FROM caddy_bookings cb
        WHERE cb.booking_date = p_date
        AND cb.status IN ('confirmed', 'pending')
        AND (p_time IS NULL OR cb.tee_time = p_time)
    )
    ORDER BY c.rating DESC, c.total_rounds DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's bookings for a course
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cb.id,
        c.caddy_number,
        c.name,
        cb.golfer_name,
        cb.tee_time,
        cb.holes,
        cb.status,
        cb.special_requests
    FROM caddy_bookings cb
    JOIN caddies c ON c.id = cb.caddy_id
    WHERE cb.course_id = p_course_id
    AND cb.booking_date = CURRENT_DATE
    ORDER BY cb.tee_time NULLS LAST, cb.created_at;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 7: UPDATE TIMESTAMP TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_caddies_updated_at BEFORE UPDATE ON caddies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caddy_bookings_updated_at BEFORE UPDATE ON caddy_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETE!
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Migrate hardcoded caddies to database
-- 3. Create course admin accounts
-- 4. Build dashboard UI
-- =====================================================
