-- Fix missing DELETE policy for bookings
-- Run this in Supabase SQL Editor NOW

-- Add DELETE policy for bookings (was missing!)
CREATE POLICY "Bookings are deletable by everyone" ON bookings
  FOR DELETE USING (true);

-- Verify policy was created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY cmd;
