-- ============================================================================
-- CADDY SCHEMA MIGRATION - Simple Version (No Nested Blocks)
-- ============================================================================
-- Adds missing columns to existing tables
-- Safe to run - uses IF NOT EXISTS checks
-- ============================================================================

-- Add missing columns to caddy_profiles
ALTER TABLE caddy_profiles ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';
ALTER TABLE caddy_profiles ADD COLUMN IF NOT EXISTS caddy_number TEXT;
ALTER TABLE caddy_profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE caddy_profiles ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE caddy_profiles ADD COLUMN IF NOT EXISTS strengths TEXT[];
ALTER TABLE caddy_profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add missing columns to caddy_bookings
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS holes INTEGER DEFAULT 18;
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS golfer_name TEXT;
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'golfer_app';
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE caddy_bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add course admin columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_course_admin BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS managed_course_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS managed_course_name TEXT;

-- Create indexes for caddy_profiles
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course ON caddy_profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course_name ON caddy_profiles(course_name);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_active ON caddy_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_availability ON caddy_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_rating ON caddy_profiles(rating DESC);

-- Create indexes for caddy_bookings
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_user ON caddy_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy ON caddy_bookings(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date ON caddy_bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_course ON caddy_bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_status ON caddy_bookings(status);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_pending ON caddy_bookings(status, course_id) WHERE status = 'pending';

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_course_admin ON user_profiles(is_course_admin) WHERE is_course_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_managed_course ON user_profiles(managed_course_id) WHERE managed_course_id IS NOT NULL;

-- Create user_caddy_preferences table
CREATE TABLE IF NOT EXISTS user_caddy_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    caddy_id UUID NOT NULL REFERENCES caddy_profiles(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT false,
    is_regular BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    personal_notes TEXT,
    private_rating NUMERIC(3,2),
    times_booked INTEGER DEFAULT 0,
    last_booked_date DATE,
    first_booked_date DATE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, caddy_id)
);

-- Create indexes for user_caddy_preferences
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_user ON user_caddy_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_caddy ON user_caddy_preferences(caddy_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_favorite ON user_caddy_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_regular ON user_caddy_preferences(is_regular) WHERE is_regular = true;

-- Enable RLS on user_caddy_preferences
ALTER TABLE user_caddy_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_caddy_preferences (drop first if exists)
DROP POLICY IF EXISTS user_caddy_prefs_select ON user_caddy_preferences;
DROP POLICY IF EXISTS user_caddy_prefs_insert ON user_caddy_preferences;
DROP POLICY IF EXISTS user_caddy_prefs_update ON user_caddy_preferences;
DROP POLICY IF EXISTS user_caddy_prefs_delete ON user_caddy_preferences;

CREATE POLICY user_caddy_prefs_select ON user_caddy_preferences FOR SELECT USING (true);
CREATE POLICY user_caddy_prefs_insert ON user_caddy_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY user_caddy_prefs_update ON user_caddy_preferences FOR UPDATE USING (true);
CREATE POLICY user_caddy_prefs_delete ON user_caddy_preferences FOR DELETE USING (true);

-- ============================================================================
-- Success - Schema migration complete
-- ============================================================================
