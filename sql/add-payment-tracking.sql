-- =====================================================
-- ADD PAYMENT TRACKING TO EVENT BOOKINGS
-- =====================================================

-- Add payment fields to event_bookings table
ALTER TABLE event_bookings
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_by TEXT;  -- Who marked it as paid (organizer LINE ID)

-- Index for payment queries
CREATE INDEX IF NOT EXISTS idx_event_bookings_payment ON event_bookings(event_id, payment_status);

-- Update existing records to calculate total_fee from individual fees
UPDATE event_bookings
SET total_fee = COALESCE(base_fee, 0) + COALESCE(cart_fee, 0) + COALESCE(caddy_fee, 0) + COALESCE(transport_fee, 0) + COALESCE(competition_fee, 0)
WHERE total_fee = 0;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Payment tracking fields added to event_bookings!';
    RAISE NOTICE 'Fields: payment_status, amount_paid, total_fee, paid_at, paid_by';
END $$;
