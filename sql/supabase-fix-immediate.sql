-- =====================================================
-- IMMEDIATE FIX - Run this RIGHT NOW in Supabase
-- =====================================================

-- 1. ADD MISSING DELETE POLICY (critical!)
CREATE POLICY IF NOT EXISTS "Bookings are deletable by everyone" ON bookings
  FOR DELETE USING (true);

-- 2. ADD ROLE FIELDS TO USER_PROFILES
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'golfer';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_proshop BOOLEAN DEFAULT FALSE;

-- 3. ADD PRIVACY FIELDS TO BOOKINGS
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS society_event_title TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS show_event_title BOOLEAN DEFAULT FALSE;

-- 4. CREATE BOOKING ACCESS KEYS TABLE
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

-- 5. ENABLE RLS ON NEW TABLE
ALTER TABLE booking_access_keys ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read access keys (for validation)
CREATE POLICY "Access keys readable" ON booking_access_keys
  FOR SELECT USING (true);

-- Allow anyone to create access keys (app will validate)
CREATE POLICY "Access keys insertable" ON booking_access_keys
  FOR INSERT WITH CHECK (true);

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_bookings_golfer_id ON bookings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(user_role);

SELECT 'Immediate fixes applied! Deletions should now work.' as status;
