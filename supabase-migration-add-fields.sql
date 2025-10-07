-- Migration: Add missing fields to existing bookings table
-- Run this in Supabase SQL Editor to add the new columns

-- Add new columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS golfer_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS golfer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS course TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tee_sheet_course TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tee_number INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_min INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS caddie_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS caddie_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS caddie_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS caddy_confirmation_required BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Update existing bookings to have default values
UPDATE bookings SET group_id = id WHERE group_id IS NULL;
UPDATE bookings SET kind = 'tee' WHERE kind IS NULL;
UPDATE bookings SET booking_type = 'regular' WHERE booking_type IS NULL;

-- Now make group_id and kind NOT NULL
ALTER TABLE bookings ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN kind SET NOT NULL;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_bookings_group_id ON bookings(group_id);
CREATE INDEX IF NOT EXISTS idx_bookings_kind ON bookings(kind);
CREATE INDEX IF NOT EXISTS idx_bookings_golfer_id ON bookings(golfer_id);

-- Done!
SELECT 'Migration complete! Added new fields to bookings table.' AS result;
