-- SIMPLEST FIX - Just the DELETE policy
-- Run this FIRST, then we'll add the rest

CREATE POLICY "Bookings deletable" ON bookings
  FOR DELETE USING (true);
