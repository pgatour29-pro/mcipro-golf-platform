-- =====================================================
-- ADD PAYMENT TRACKING TO EVENT REGISTRATIONS
-- =====================================================

-- Add payment fields to event_registrations table
ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_by TEXT;  -- Who marked it as paid (organizer LINE ID)

-- Index for payment queries
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment ON event_registrations(event_id, payment_status);

-- Note: total_fee will default to 0.00 for existing records
-- Organizers will set the fee when marking players as paid

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payment tracking fields added to event_registrations!';
    RAISE NOTICE 'Fields: payment_status, amount_paid, total_fee, paid_at, paid_by';
END $$;
