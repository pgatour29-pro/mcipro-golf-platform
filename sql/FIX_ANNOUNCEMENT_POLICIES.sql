-- =====================================================
-- FIX ANNOUNCEMENT RLS POLICIES
-- Add missing UPDATE and DELETE policies
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add UPDATE policy for announcements
CREATE POLICY "Anyone can update announcements" ON announcements
FOR UPDATE USING (true);

-- Add DELETE policy for announcements
CREATE POLICY "Anyone can delete announcements" ON announcements
FOR DELETE USING (true);

-- Add DELETE policy for announcement_reads (needed to delete reads before announcement)
CREATE POLICY "Anyone can delete announcement_reads" ON announcement_reads
FOR DELETE USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('announcements', 'announcement_reads')
ORDER BY tablename, cmd;
