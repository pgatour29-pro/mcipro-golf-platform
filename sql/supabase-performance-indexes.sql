-- PERFORMANCE INDEXES FOR SUPABASE
-- Run this in Supabase SQL Editor to speed up queries

-- =====================================================
-- BOOKINGS TABLE INDEXES
-- =====================================================

-- Index on date for date-range queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date DESC);

-- Composite index for date + status queries
CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(date DESC, status);

-- Index on golfer_id for user-specific bookings
CREATE INDEX IF NOT EXISTS idx_bookings_golfer_id ON bookings(golfer_id);

-- Index on tee_time for tee sheet display
CREATE INDEX IF NOT EXISTS idx_bookings_tee_time ON bookings(tee_time);

-- Composite index for date + tee_time (tee sheet queries)
CREATE INDEX IF NOT EXISTS idx_bookings_date_teetime ON bookings(date, tee_time);

-- =====================================================
-- USER_PROFILES TABLE INDEXES
-- =====================================================

-- Index on line_user_id for LINE login lookups (PRIMARY KEY already indexed)
-- Not needed - line_user_id is PRIMARY KEY and automatically indexed

-- Index on name for search lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_name ON user_profiles(name);

-- Index on user_role for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);

-- Index on is_staff for staff filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_staff ON user_profiles(is_staff) WHERE is_staff = true;

-- Index on is_manager for manager filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_manager ON user_profiles(is_manager) WHERE is_manager = true;

-- =====================================================
-- VERIFY INDEXES
-- =====================================================

-- Check that all indexes were created successfully
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('bookings', 'user_profiles')
ORDER BY tablename, indexname;

-- DONE
SELECT 'Performance indexes created successfully' as status;
