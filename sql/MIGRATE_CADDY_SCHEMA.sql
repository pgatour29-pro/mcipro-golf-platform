-- ============================================================================
-- CADDY SCHEMA MIGRATION - Upgrade to Consolidated Schema
-- ============================================================================
-- This script safely migrates existing caddy tables to the new consolidated schema
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: Backup existing data (optional but recommended)
-- ============================================================================
-- Uncomment to create backup:
-- CREATE TABLE IF NOT EXISTS caddy_profiles_backup AS SELECT * FROM caddy_profiles;

-- ============================================================================
-- STEP 2: Add missing columns to caddy_profiles
-- ============================================================================

-- Add availability_status if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_profiles'
        AND column_name = 'availability_status'
    ) THEN
        ALTER TABLE caddy_profiles
        ADD COLUMN availability_status TEXT DEFAULT 'available';

        RAISE NOTICE '✅ Added availability_status column';
    ELSE
        RAISE NOTICE 'ℹ️  availability_status column already exists';
    END IF;
END $$;

-- Add caddy_number if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_profiles'
        AND column_name = 'caddy_number'
    ) THEN
        ALTER TABLE caddy_profiles
        ADD COLUMN caddy_number TEXT;

        RAISE NOTICE '✅ Added caddy_number column';
    ELSE
        RAISE NOTICE 'ℹ️  caddy_number column already exists';
    END IF;
END $$;

-- Add personality if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_profiles'
        AND column_name = 'personality'
    ) THEN
        ALTER TABLE caddy_profiles
        ADD COLUMN personality TEXT;

        RAISE NOTICE '✅ Added personality column';
    ELSE
        RAISE NOTICE 'ℹ️  personality column already exists';
    END IF;
END $$;

-- Add strengths array if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_profiles'
        AND column_name = 'strengths'
    ) THEN
        ALTER TABLE caddy_profiles
        ADD COLUMN strengths TEXT[];

        RAISE NOTICE '✅ Added strengths column';
    ELSE
        RAISE NOTICE 'ℹ️  strengths column already exists';
    END IF;
END $$;

-- Add total_reviews if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_profiles'
        AND column_name = 'total_reviews'
    ) THEN
        ALTER TABLE caddy_profiles
        ADD COLUMN total_reviews INTEGER DEFAULT 0;

        RAISE NOTICE '✅ Added total_reviews column';
    ELSE
        RAISE NOTICE 'ℹ️  total_reviews column already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Add missing columns to caddy_bookings
-- ============================================================================

-- Add holes if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'holes'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN holes INTEGER DEFAULT 18;

        RAISE NOTICE '✅ Added holes column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  holes column already exists in caddy_bookings';
    END IF;
END $$;

-- Add golfer_name if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'golfer_name'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN golfer_name TEXT;

        RAISE NOTICE '✅ Added golfer_name column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  golfer_name column already exists in caddy_bookings';
    END IF;
END $$;

-- Add booking_source if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'booking_source'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN booking_source TEXT DEFAULT 'golfer_app';

        RAISE NOTICE '✅ Added booking_source column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  booking_source column already exists in caddy_bookings';
    END IF;
END $$;

-- Add confirmed_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'confirmed_at'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN confirmed_at TIMESTAMPTZ;

        RAISE NOTICE '✅ Added confirmed_at column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  confirmed_at column already exists in caddy_bookings';
    END IF;
END $$;

-- Add confirmed_by if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'confirmed_by'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN confirmed_by TEXT;

        RAISE NOTICE '✅ Added confirmed_by column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  confirmed_by column already exists in caddy_bookings';
    END IF;
END $$;

-- Add cancelled_at if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN cancelled_at TIMESTAMPTZ;

        RAISE NOTICE '✅ Added cancelled_at column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  cancelled_at column already exists in caddy_bookings';
    END IF;
END $$;

-- Add cancellation_reason if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caddy_bookings'
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE caddy_bookings
        ADD COLUMN cancellation_reason TEXT;

        RAISE NOTICE '✅ Added cancellation_reason column to caddy_bookings';
    ELSE
        RAISE NOTICE 'ℹ️  cancellation_reason column already exists in caddy_bookings';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add missing indexes
-- ============================================================================

-- caddy_profiles indexes
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course ON caddy_profiles(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_course_name ON caddy_profiles(course_name);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_active ON caddy_profiles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_availability ON caddy_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_caddy_profiles_rating ON caddy_profiles(rating DESC);

-- caddy_bookings indexes
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_user ON caddy_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy ON caddy_bookings(caddy_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date ON caddy_bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_course ON caddy_bookings(course_id);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_status ON caddy_bookings(status);
CREATE INDEX IF NOT EXISTS idx_caddy_bookings_pending ON caddy_bookings(status, course_id) WHERE status = 'pending';

-- ============================================================================
-- STEP 5: Create user_caddy_preferences table if missing
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_caddy_preferences (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Links
    user_id TEXT NOT NULL, -- LINE user ID
    caddy_id UUID NOT NULL REFERENCES caddy_profiles(id) ON DELETE CASCADE,

    -- Preference Flags
    is_favorite BOOLEAN DEFAULT false,
    is_regular BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,

    -- Personal Notes & Rating
    personal_notes TEXT,
    private_rating NUMERIC(3,2),

    -- Booking History Tracking
    times_booked INTEGER DEFAULT 0,
    last_booked_date DATE,
    first_booked_date DATE,

    -- Metadata
    added_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, caddy_id)
);

-- Indexes for user_caddy_preferences
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_user ON user_caddy_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_caddy ON user_caddy_preferences(caddy_id);
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_favorite ON user_caddy_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_caddy_prefs_regular ON user_caddy_preferences(is_regular) WHERE is_regular = true;

-- Enable RLS
ALTER TABLE user_caddy_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_caddy_preferences'
        AND policyname = 'user_caddy_prefs_select'
    ) THEN
        CREATE POLICY user_caddy_prefs_select ON user_caddy_preferences FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_caddy_preferences'
        AND policyname = 'user_caddy_prefs_insert'
    ) THEN
        CREATE POLICY user_caddy_prefs_insert ON user_caddy_preferences FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_caddy_preferences'
        AND policyname = 'user_caddy_prefs_update'
    ) THEN
        CREATE POLICY user_caddy_prefs_update ON user_caddy_preferences FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_caddy_preferences'
        AND policyname = 'user_caddy_prefs_delete'
    ) THEN
        CREATE POLICY user_caddy_prefs_delete ON user_caddy_preferences FOR DELETE USING (true);
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Add course admin support to user_profiles
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'is_course_admin'
    ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN is_course_admin BOOLEAN DEFAULT false;

        RAISE NOTICE '✅ Added is_course_admin column to user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️  is_course_admin column already exists in user_profiles';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'managed_course_id'
    ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN managed_course_id TEXT;

        RAISE NOTICE '✅ Added managed_course_id column to user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️  managed_course_id column already exists in user_profiles';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = 'managed_course_name'
    ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN managed_course_name TEXT;

        RAISE NOTICE '✅ Added managed_course_name column to user_profiles';
    ELSE
        RAISE NOTICE 'ℹ️  managed_course_name column already exists in user_profiles';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_course_admin ON user_profiles(is_course_admin) WHERE is_course_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_managed_course ON user_profiles(managed_course_id) WHERE managed_course_id IS NOT NULL;

-- ============================================================================
-- STEP 7: Fix caddy_id data type mismatch if needed
-- ============================================================================

-- Check and fix caddy_bookings.caddy_id type (TEXT -> UUID)
DO $$
DECLARE
    v_caddy_id_type TEXT;
BEGIN
    -- Get current data type of caddy_id
    SELECT data_type INTO v_caddy_id_type
    FROM information_schema.columns
    WHERE table_name = 'caddy_bookings'
    AND column_name = 'caddy_id';

    IF v_caddy_id_type = 'text' OR v_caddy_id_type = 'character varying' THEN
        RAISE NOTICE '⚠️  caddy_id is TEXT, converting to UUID...';

        -- Drop foreign key constraint if exists
        ALTER TABLE caddy_bookings DROP CONSTRAINT IF EXISTS caddy_bookings_caddy_id_fkey;

        -- Convert column type (this will fail if data is not valid UUID)
        BEGIN
            ALTER TABLE caddy_bookings
            ALTER COLUMN caddy_id TYPE UUID USING caddy_id::UUID;

            -- Re-add foreign key constraint
            ALTER TABLE caddy_bookings
            ADD CONSTRAINT caddy_bookings_caddy_id_fkey
            FOREIGN KEY (caddy_id) REFERENCES caddy_profiles(id) ON DELETE SET NULL;

            RAISE NOTICE '✅ Converted caddy_id from TEXT to UUID';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ Could not convert caddy_id to UUID: %', SQLERRM;
            RAISE NOTICE 'ℹ️  Will use type casting in queries instead';
        END;
    ELSE
        RAISE NOTICE 'ℹ️  caddy_id is already UUID type';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Create/Update Helper Functions
-- ============================================================================

-- Function: Get pending bookings for course admin
-- Handles both TEXT and UUID caddy_id types with casting
CREATE OR REPLACE FUNCTION get_pending_bookings_for_course(p_course_id TEXT)
RETURNS TABLE (
    booking_id UUID,
    caddy_id TEXT,
    caddy_number TEXT,
    caddy_name TEXT,
    golfer_id TEXT,
    golfer_name TEXT,
    booking_date DATE,
    tee_time TIME,
    holes INTEGER,
    special_requests TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cb.id::UUID,
        cb.caddy_id::TEXT,
        cp.caddy_number,
        cp.name,
        cb.user_id,
        cb.golfer_name,
        cb.booking_date,
        cb.tee_time,
        cb.holes,
        cb.special_requests,
        cb.created_at
    FROM caddy_bookings cb
    LEFT JOIN caddy_profiles cp ON (
        CASE
            WHEN cb.caddy_id IS NULL THEN false
            WHEN cb.caddy_id::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN cb.caddy_id::UUID = cp.id
            ELSE false
        END
    )
    WHERE cb.course_id = p_course_id
        AND cb.status = 'pending'
    ORDER BY cb.booking_date ASC, cb.tee_time ASC, cb.created_at ASC;
END;
$$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CADDY SCHEMA MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Updated:';
    RAISE NOTICE '  ✅ caddy_profiles (columns + indexes)';
    RAISE NOTICE '  ✅ caddy_bookings (columns + indexes)';
    RAISE NOTICE '  ✅ user_caddy_preferences (created if missing)';
    RAISE NOTICE '  ✅ user_profiles (admin columns added)';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Functions:';
    RAISE NOTICE '  ✅ get_pending_bookings_for_course()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Verify tables: SELECT * FROM caddy_profiles LIMIT 1;';
    RAISE NOTICE '  2. Test admin dashboard';
    RAISE NOTICE '  3. Test golfer booking flow';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;
