-- ============================================================
-- GOLFER CADDY BOOKING SYSTEM - Database Schema
-- ============================================================
-- This SQL creates the necessary tables for the GolferCaddyBooking module
-- Run this in your Supabase SQL Editor if these tables don't already exist
-- ============================================================

-- Table: caddies
-- Stores caddy profiles managed by Golf Course Admins
CREATE TABLE IF NOT EXISTS caddies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caddy_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    home_club_id VARCHAR(255) NOT NULL,
    home_club_name VARCHAR(255),
    photo_url TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    experience_years INTEGER DEFAULT 0,
    languages TEXT[], -- Array of languages (e.g., ['English', 'Thai', 'Chinese'])
    specialty TEXT,
    personality TEXT,
    strengths TEXT[], -- Array of strengths
    availability_status VARCHAR(50) DEFAULT 'available', -- 'available', 'booked', 'unavailable'
    total_rounds INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: caddy_bookings
-- Stores caddy booking requests from golfers
CREATE TABLE IF NOT EXISTS caddy_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caddy_id UUID REFERENCES caddies(id) ON DELETE CASCADE,
    golfer_id UUID NOT NULL, -- References auth.users or golfer_profiles
    golfer_name VARCHAR(255),
    booking_date DATE NOT NULL,
    tee_time TIME NOT NULL,
    holes INTEGER NOT NULL, -- 9 or 18
    course_id VARCHAR(255) NOT NULL,
    course_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    special_requests TEXT,
    booking_source VARCHAR(50) DEFAULT 'golfer_app', -- 'golfer_app', 'admin', 'phone'
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_caddies_home_club ON caddies(home_club_id);
CREATE INDEX IF NOT EXISTS idx_caddies_availability ON caddies(availability_status);
CREATE INDEX IF NOT EXISTS idx_caddies_rating ON caddies(rating DESC);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy ON caddy_bookings(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_golfer ON caddy_bookings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date ON caddy_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_status ON caddy_bookings(status);

-- Row Level Security (RLS) Policies
-- Enable RLS on both tables
ALTER TABLE caddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE caddy_bookings ENABLE ROW LEVEL SECURITY;

-- Caddies: Everyone can view available caddies
CREATE POLICY "Anyone can view available caddies" ON caddies
    FOR SELECT
    USING (availability_status = 'available');

-- Caddies: Golf course admins can manage all caddies
CREATE POLICY "Admins can manage caddies" ON caddies
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'golf_course_admin'
        )
    );

-- Caddy Bookings: Golfers can view their own bookings
CREATE POLICY "Golfers can view own bookings" ON caddy_bookings
    FOR SELECT
    USING (golfer_id = auth.uid());

-- Caddy Bookings: Golfers can create bookings
CREATE POLICY "Golfers can create bookings" ON caddy_bookings
    FOR INSERT
    WITH CHECK (golfer_id = auth.uid());

-- Caddy Bookings: Golfers can update/cancel their own pending bookings
CREATE POLICY "Golfers can cancel own bookings" ON caddy_bookings
    FOR UPDATE
    USING (golfer_id = auth.uid() AND status = 'pending');

-- Caddy Bookings: Admins can view/manage all bookings
CREATE POLICY "Admins can manage bookings" ON caddy_bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'golf_course_admin'
        )
    );

-- Optional: Sample data for testing
-- Uncomment to insert test caddies

/*
INSERT INTO caddies (caddy_number, name, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality, availability_status)
VALUES
    ('C001', 'Somchai Pattana', 'phuket-cc', 'Phuket Country Club', 4.9, 15, ARRAY['Thai', 'English', 'Chinese'], 'Championship Golf', 'Professional, calm, excellent course knowledge', 'available'),
    ('C002', 'Nong Kim', 'phuket-cc', 'Phuket Country Club', 4.8, 12, ARRAY['Thai', 'English', 'Japanese'], 'Ladies Golf', 'Friendly, patient, great with beginners', 'available'),
    ('C003', 'Chai Prasert', 'phuket-cc', 'Phuket Country Club', 4.7, 10, ARRAY['Thai', 'English'], 'Business Golf', 'Experienced, discrete, excellent etiquette', 'available'),
    ('C004', 'Pranee Sawan', 'phuket-cc', 'Phuket Country Club', 4.9, 18, ARRAY['Thai', 'English', 'Korean'], 'Championship Golf', 'Expert green reading, tournament experience', 'booked'),
    ('C005', 'Boonmee Yim', 'phuket-cc', 'Phuket Country Club', 4.6, 8, ARRAY['Thai', 'English'], 'Beginner Support', 'Patient, encouraging, teaching-focused', 'available');
*/

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the tables were created correctly:

-- 1. Check if tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('caddies', 'caddy_bookings');

-- 2. View caddies
-- SELECT * FROM caddies;

-- 3. View bookings
-- SELECT * FROM caddy_bookings;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. The 'caddies' table should be populated by Golf Course Admins
--    using the CourseAdminSystem module (separate system)
--
-- 2. The 'caddy_bookings' table will be populated automatically
--    when golfers book caddies through the GolferCaddyBooking module
--
-- 3. RLS policies ensure:
--    - Golfers can only see/manage their own bookings
--    - Admins can see/manage all caddies and bookings
--    - Everyone can view available caddies
--
-- 4. The 'languages' and 'strengths' columns use PostgreSQL arrays
--    In JavaScript, these will be accessed as normal arrays
--
-- 5. Update the RLS policies if your auth.users structure is different
--    (e.g., if you use a separate golfer_profiles table for roles)
