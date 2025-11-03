-- Fix Payment Status CHECK Constraint
-- Date: 2025-11-03
-- Issue: event_registrations_payment_status_check constraint violation

-- 1. Drop existing constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'event_registrations_payment_status_check'
        AND table_name = 'event_registrations'
    ) THEN
        ALTER TABLE event_registrations
        DROP CONSTRAINT event_registrations_payment_status_check;
        RAISE NOTICE 'Dropped existing payment_status constraint';
    END IF;
END $$;

-- 2. Ensure payment_status column exists with correct type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_registrations'
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE event_registrations
        ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
        RAISE NOTICE 'Added payment_status column';
    ELSE
        -- Update existing column to ensure correct default
        ALTER TABLE event_registrations
        ALTER COLUMN payment_status SET DEFAULT 'unpaid';
        RAISE NOTICE 'Updated payment_status default';
    END IF;
END $$;

-- 3. Add the CHECK constraint with correct values
ALTER TABLE event_registrations
ADD CONSTRAINT event_registrations_payment_status_check
CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- 4. Verify the constraint
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'event_registrations_payment_status_check';
