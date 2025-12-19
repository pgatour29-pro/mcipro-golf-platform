-- ============================================================================
-- FIX MISSING COLUMNS
-- ============================================================================
-- Run this FIRST before running other SQL scripts
-- Ensures all required columns exist in tables
-- ============================================================================

BEGIN;

-- Add course_name to rounds if missing
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS course_name TEXT;

-- Add home_course columns to user_profiles if missing
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_course_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS home_course_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS society_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS society_name TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rounds_course_name ON rounds(course_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_home_course_id ON user_profiles(home_course_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_society ON user_profiles(society_id, society_name);

COMMIT;

SELECT 'FIX_MISSING_COLUMNS.sql completed successfully' as status;
