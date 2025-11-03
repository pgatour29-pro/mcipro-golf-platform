-- Fix Missing Columns in Production Database
-- Date: 2025-11-03
-- Issue: event_registrations.handicap and schema cache errors

-- 1. Add handicap column to event_registrations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'handicap'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN handicap REAL;

        RAISE NOTICE 'Added handicap column to event_registrations';
    ELSE
        RAISE NOTICE 'handicap column already exists in event_registrations';
    END IF;
END $$;

-- 2. Verify society_members.golfer_id exists (should already be there)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'society_members'
        AND column_name = 'golfer_id'
    ) THEN
        ALTER TABLE society_members
        ADD COLUMN golfer_id TEXT;

        RAISE NOTICE 'Added golfer_id column to society_members';
    ELSE
        RAISE NOTICE 'golfer_id column already exists in society_members';
    END IF;
END $$;

-- 3. Verify all required columns in event_registrations
DO $$
BEGIN
    -- Check for player_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'player_id'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN player_id TEXT;
        RAISE NOTICE 'Added player_id column';
    END IF;

    -- Check for total_fee
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'total_fee'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN total_fee INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_fee column';
    END IF;

    -- Check for payment_status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
        RAISE NOTICE 'Added payment_status column';
    END IF;

    -- Check for want_transport
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'want_transport'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN want_transport BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added want_transport column';
    END IF;

    -- Check for want_competition
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'want_competition'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN want_competition BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added want_competition column';
    END IF;

    -- Check for partner_prefs
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'partner_prefs'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN partner_prefs TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE 'Added partner_prefs column';
    END IF;
END $$;

-- 4. Show final schema for verification
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('event_registrations', 'society_members')
ORDER BY table_name, ordinal_position;
