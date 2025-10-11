-- Step 1: Add DELETE policy
CREATE POLICY IF NOT EXISTS "Bookings deletable" ON bookings FOR DELETE USING (true);

-- Step 2: Add role fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'golfer';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_manager BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_proshop BOOLEAN DEFAULT FALSE;

-- Step 3: Add privacy fields to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS society_event_title TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS show_event_title BOOLEAN DEFAULT FALSE;

-- Step 4: Create booking access keys table
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

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_access_keys_key ON booking_access_keys(access_key);
CREATE INDEX IF NOT EXISTS idx_booking_access_keys_booking ON booking_access_keys(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_golfer_id ON bookings(golfer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(user_role);

-- Step 6: Enable RLS on access keys table
ALTER TABLE booking_access_keys ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies for access keys
CREATE POLICY IF NOT EXISTS "Access keys readable" ON booking_access_keys FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Access keys insertable" ON booking_access_keys FOR INSERT WITH CHECK (true);

-- Done
SELECT 'All fixes applied successfully' as status;
