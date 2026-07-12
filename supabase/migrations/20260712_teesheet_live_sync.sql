ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_data jsonb;

DROP POLICY IF EXISTS tmp_delete ON bookings;
CREATE POLICY tmp_delete ON bookings FOR DELETE TO anon, authenticated USING (true);

ALTER TABLE golf_course_settings ADD COLUMN IF NOT EXISTS teesheet_config jsonb;
