-- =====================================================
-- COMPLETE SUPABASE SCHEMA FOR MCIPRO GOLF PLATFORM
-- This replaces the incomplete migration
-- =====================================================

-- First, drop existing policies to start fresh
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON bookings;
DROP POLICY IF EXISTS "Bookings are insertable by everyone" ON bookings;
DROP POLICY IF EXISTS "Bookings are updatable by everyone" ON bookings;
DROP POLICY IF EXISTS "Bookings are deletable by everyone" ON bookings;

-- =====================================================
-- 1. ADD MISSING FIELDS TO USER_PROFILES
-- =====================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'golfer';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_proshop BOOLEAN DEFAULT FALSE;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(user_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff ON user_profiles(is_staff);

-- =====================================================
-- 2. ADD BOOKING ACCESS KEYS TABLE (for sharing bookings)
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  access_key TEXT UNIQUE NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT NULL,
  use_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_booking_access_keys_key ON booking_access_keys(access_key);
CREATE INDEX IF NOT EXISTS idx_booking_access_keys_booking ON booking_access_keys(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_access_keys_group ON booking_access_keys(group_id);

-- =====================================================
-- 3. ADD PRIVACY FIELDS TO BOOKINGS
-- =====================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS show_event_title BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS society_event_title TEXT;

-- =====================================================
-- 4. PROPER RLS POLICIES - ROLE-BASED ACCESS
-- =====================================================

-- BOOKINGS TABLE POLICIES
-- -------------------------------------------------------

-- SELECT (Read) Policy: Role-based visibility
CREATE POLICY "Bookings - Staff and Managers can view all" ON bookings
  FOR SELECT
  USING (
    -- Allow if user is staff or manager (check via user_profiles table)
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (is_staff = true OR is_manager = true OR is_proshop = true)
    )
    OR
    -- Allow golfers to view their own bookings
    golfer_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    -- Allow if user has access key for this booking
    EXISTS (
      SELECT 1 FROM booking_access_keys
      WHERE booking_id = bookings.id
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (max_uses IS NULL OR use_count < max_uses)
    )
  );

-- INSERT Policy: Only staff/managers and golfers (for their own bookings)
CREATE POLICY "Bookings - Insert with restrictions" ON bookings
  FOR INSERT
  WITH CHECK (
    -- Staff/managers can insert any booking
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (is_staff = true OR is_manager = true OR is_proshop = true)
    )
    OR
    -- Golfers can only insert bookings for themselves
    golfer_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- UPDATE Policy: Staff/managers can update all, golfers only their own
CREATE POLICY "Bookings - Update with restrictions" ON bookings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (is_staff = true OR is_manager = true OR is_proshop = true)
    )
    OR
    golfer_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- DELETE Policy: Only staff/managers can delete
CREATE POLICY "Bookings - Delete only by staff" ON bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (is_staff = true OR is_manager = true OR is_proshop = true)
    )
  );

-- USER PROFILES POLICIES
-- -------------------------------------------------------

DROP POLICY IF EXISTS "User profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "User profiles are insertable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "User profiles are updatable by everyone" ON user_profiles;

-- Users can view their own profile + staff can view all
CREATE POLICY "User profiles - Selective viewing" ON user_profiles
  FOR SELECT
  USING (
    line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (up.is_staff = true OR up.is_manager = true)
    )
  );

-- Users can insert/update their own profile
CREATE POLICY "User profiles - Self insert" ON user_profiles
  FOR INSERT
  WITH CHECK (line_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "User profiles - Self update" ON user_profiles
  FOR UPDATE
  USING (
    line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (up.is_staff = true OR up.is_manager = true)
    )
  );

-- BOOKING ACCESS KEYS POLICIES
-- -------------------------------------------------------

ALTER TABLE booking_access_keys ENABLE ROW LEVEL SECURITY;

-- Anyone can read access keys (to validate them)
CREATE POLICY "Access keys - Public read" ON booking_access_keys
  FOR SELECT
  USING (true);

-- Only booking owner or staff can create access keys
CREATE POLICY "Access keys - Owner or staff create" ON booking_access_keys
  FOR INSERT
  WITH CHECK (
    created_by = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE line_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      AND (is_staff = true OR is_manager = true)
    )
  );

-- =====================================================
-- 5. FUNCTIONS FOR ACCESS KEY VALIDATION
-- =====================================================

-- Function to generate random access key
CREATE OR REPLACE FUNCTION generate_booking_access_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
BEGIN
  -- Generate 8-character alphanumeric key (e.g., "A7B2XF9K")
  key := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN key;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and use access key
CREATE OR REPLACE FUNCTION use_booking_access_key(access_key_input TEXT)
RETURNS TABLE (
  booking_id TEXT,
  group_id TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  -- Check if key exists and is valid
  RETURN QUERY
  UPDATE booking_access_keys
  SET use_count = use_count + 1
  WHERE access_key = access_key_input
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR use_count < max_uses)
  RETURNING
    booking_access_keys.booking_id,
    booking_access_keys.group_id,
    TRUE as is_valid;

  -- If no rows updated, key is invalid
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::TEXT, NULL::TEXT, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. VIEW FOR GOLFER DASHBOARD (Limited Info)
-- =====================================================

CREATE OR REPLACE VIEW bookings_public_view AS
SELECT
  b.id,
  b.date,
  b.time,
  b.tee_time,
  b.course,
  b.course_name,
  -- Show limited info for other people's bookings
  CASE
    WHEN b.golfer_id = current_setting('request.jwt.claims', true)::json->>'sub' THEN b.name
    WHEN b.show_event_title = true THEN b.society_event_title
    ELSE 'Booked'
  END as display_name,
  CASE
    WHEN b.golfer_id = current_setting('request.jwt.claims', true)::json->>'sub' THEN b.phone
    ELSE NULL
  END as phone,
  CASE
    WHEN b.golfer_id = current_setting('request.jwt.claims', true)::json->>'sub' THEN b.email
    ELSE NULL
  END as email,
  b.players,
  b.status,
  -- Always show if booking is available or booked
  CASE
    WHEN b.status = 'cancelled' THEN 'available'
    ELSE 'booked'
  END as slot_status
FROM bookings b
WHERE b.deleted = FALSE OR b.deleted IS NULL;

-- Grant access to the view
GRANT SELECT ON bookings_public_view TO anon, authenticated;

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookings_golfer_id ON bookings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_bookings_date_time ON bookings(date, time);

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'Complete Supabase schema with role-based security deployed successfully!' as status;
