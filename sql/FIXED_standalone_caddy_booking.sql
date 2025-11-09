-- ============================================================
-- STANDALONE CADDY BOOKING SYSTEM - Database Schema
-- ============================================================
-- FIXED FOR LINE OAUTH - Uses TEXT for user IDs, not UUID
-- Run this in your Supabase SQL Editor
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
    golfer_id TEXT NOT NULL, -- LINE user ID (TEXT not UUID)
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

-- Caddies: Anyone can view available caddies
CREATE POLICY "Anyone can view available caddies" ON caddies
    FOR SELECT
    USING (availability_status = 'available');

-- Caddies: Allow insert/update (app handles permissions)
CREATE POLICY "Allow caddy management" ON caddies
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Bookings: Public access (app handles user filtering)
CREATE POLICY "Public can view bookings" ON caddy_bookings
    FOR SELECT
    USING (true);

CREATE POLICY "Public can create bookings" ON caddy_bookings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public can update bookings" ON caddy_bookings
    FOR UPDATE
    USING (true);

-- Sample Data (Uncomment to insert test caddies)
/*
INSERT INTO caddies (caddy_number, name, home_club_id, home_club_name, rating, experience_years, languages, specialty, personality)
VALUES
    ('C001', 'Somchai Prayoon', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 4.8, 10, ARRAY['Thai', 'English'], 'Championship Play', 'Professional and detail-oriented'),
    ('C002', 'Niran Suksai', 'phoenix-gold', 'Phoenix Gold Golf & Country Club', 4.9, 15, ARRAY['Thai', 'English', 'Japanese'], 'Course Management', 'Friendly and experienced'),
    ('C003', 'Wichit Thongchai', 'khao-kheow', 'Khao Kheow Country Club', 4.7, 8, ARRAY['Thai', 'English'], 'Beginner Support', 'Patient and encouraging'),
    ('C004', 'Manee Kamolrat', 'khao-kheow', 'Khao Kheow Country Club', 4.6, 6, ARRAY['Thai', 'English', 'Chinese'], 'Ladies Golf', 'Attentive and supportive'),
    ('C005', 'Prasert Boonmee', 'phuket-cc', 'Phuket Country Club', 4.9, 12, ARRAY['Thai', 'English', 'Korean'], 'Business Golf', 'Professional and discreet')
ON CONFLICT (caddy_number) DO NOTHING;
*/

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Standalone Caddy Booking tables created successfully';
    RAISE NOTICE '✅ Tables: caddies, caddy_bookings';
    RAISE NOTICE '✅ RLS policies enabled (simplified for LINE OAuth)';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTE: Uncomment sample data INSERT if you want test caddies';
    RAISE NOTICE 'NOTE: RLS is permissive - app code handles user filtering via LINE user IDs';
END $$;
